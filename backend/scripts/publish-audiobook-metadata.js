const fs = require("node:fs/promises");
const path = require("node:path");
const {
  createR2ClientFromEnv,
} = require("../src/config/r2");
const {
  createR2MetadataReader,
} = require("../src/ingestion/r2-metadata-reader");
const {
  validateMetadataArtifact,
} = require("../src/ingestion/audiobook-metadata-artifact");
const {
  publishMetadataArtifact,
} = require("../src/ingestion/audiobook-metadata-publisher");

const DEFAULT_ARTIFACT_PATH = path.resolve(
  __dirname,
  "../../database/audiobook-metadata.v1.json",
);

function parseArgs(argv) {
  const options = {
    artifact: DEFAULT_ARTIFACT_PATH,
    concurrency: 4,
    only: null,
    report: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (
      !["--artifact", "--concurrency", "--only", "--report"].includes(flag)
    )
      throw new Error(
        "Usage: npm run db:audiobooks:publish -- [--artifact <path>] [--only <slug[,slug...]>] [--concurrency <1..16>] [--report <path>]",
      );
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    index += 1;
    if (flag === "--artifact") options.artifact = path.resolve(value);
    else if (flag === "--report") options.report = path.resolve(value);
    else if (flag === "--only")
      options.only = value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);
    else {
      const concurrency = Number(value);
      if (
        !Number.isInteger(concurrency) ||
        concurrency < 1 ||
        concurrency > 16
      )
        throw new Error("--concurrency must be an integer between 1 and 16");
      options.concurrency = concurrency;
    }
  }
  return options;
}

async function writeReport(reportPath, report) {
  if (!reportPath) return;
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const temporaryPath = `${reportPath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.rename(temporaryPath, reportPath);
}

async function runMetadataPublication(options, dependencies = {}) {
  const readFile = dependencies.readFile || fs.readFile;
  const document = JSON.parse(
    await readFile(options.artifact, "utf8"),
  );
  const env = dependencies.env || process.env;
  const artifact = validateMetadataArtifact(document, {
    expectedPrefix: env.CLOUDFLARE_S3_FOLDER_NAME,
  });
  const selected = options.only?.length
    ? new Set(options.only)
    : null;
  const books = selected
    ? artifact.books.filter((book) => selected.has(book.slug))
    : artifact.books;
  if (selected && books.length !== selected.size) {
    const found = new Set(books.map((book) => book.slug));
    const missing = [...selected].filter((slug) => !found.has(slug));
    throw new Error(`Unknown artifact slug(s): ${missing.join(", ")}`);
  }
  const selectedArtifact = { ...artifact, books };
  const createR2 = dependencies.createR2Client || createR2ClientFromEnv;
  const r2 = createR2(env);
  if (!r2.client || !r2.bucket || !r2.prefix || r2.missing?.length)
    throw new Error(
      `Missing read-only R2 configuration: ${(r2.missing || []).join(", ")}`,
    );
  const createStorage =
    dependencies.createStorage || createR2MetadataReader;
  const storage = createStorage({
    client: r2.client,
    bucket: r2.bucket,
    prefix: r2.prefix,
  });
  const database =
    dependencies.database || require("../src/config/database");
  const report = {
    version: 1,
    artifactPath: options.artifact,
    artifactDigest: artifact.artifactDigest,
    mode: "metadata-publication",
    createdAt: new Date().toISOString(),
    state: "running",
    books: {},
    summary: {
      selectedBooks: books.length,
      expectedParts: books.reduce(
        (total, book) => total + book.parts.length,
        0,
      ),
      expectedChapters: books.reduce(
        (total, book) =>
          total +
          book.parts.reduce(
            (bookTotal, part) =>
              bookTotal + part.chapters.length,
            0,
          ),
        0,
      ),
      expectedObjects: books.reduce(
        (total, book) => total + book.objects.length,
        0,
      ),
      published: 0,
      alreadyPublished: 0,
      failed: 0,
    },
  };
  await writeReport(options.report, report);
  try {
    const results = await (
      dependencies.publishMetadata || publishMetadataArtifact
    )({
      artifact: selectedArtifact,
      database,
      storage,
      concurrency: options.concurrency,
      publisher: dependencies.publisher,
      async onBook(result) {
        report.books[result.slug] = result;
        report.summary.published += Number(result.status === "published");
        report.summary.alreadyPublished += Number(
          result.status === "already_published",
        );
        report.updatedAt = new Date().toISOString();
        await writeReport(options.report, report);
      },
    });
    report.state = "completed";
    report.updatedAt = new Date().toISOString();
    await writeReport(options.report, report);
    return { artifact, report, results };
  } catch (error) {
    report.state = "failed";
    report.summary.failed += 1;
    report.error = {
      name: error.name || "Error",
      message: error.message || String(error),
    };
    report.updatedAt = new Date().toISOString();
    await writeReport(options.report, report);
    throw error;
  } finally {
    if (!dependencies.keepDatabaseOpen && database?.end)
      await database.end();
  }
}

async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  const options = (dependencies.parseArgs || parseArgs)(argv);
  const result = await runMetadataPublication(options, dependencies);
  const summary = result.report.summary;
  (dependencies.stdout || console.log)(
    `Published audiobook metadata for ${summary.selectedBooks} books: ${summary.published} changed, ${summary.alreadyPublished} already current.`,
  );
  return result;
}

if (require.main === module)
  runCli().catch((error) => {
    console.error(`Audiobook metadata publication failed: ${error.message}`);
    process.exitCode = 1;
  });

module.exports = {
  DEFAULT_ARTIFACT_PATH,
  parseArgs,
  runCli,
  runMetadataPublication,
  writeReport,
};
