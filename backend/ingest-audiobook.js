const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const { XMLParser } = require("fast-xml-parser");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { createR2ClientFromEnv } = require("./src/config/r2");
dotenv.config();
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});
const array = (value) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
function decodeReference(value) {
  try {
    return decodeURIComponent(String(value));
  } catch {
    throw new Error(`Invalid percent-encoded DAISY reference: ${value}`);
  }
}
function resolveDaisyPath(source, reference) {
  const root = path.resolve(source);
  const resolved = path.resolve(root, reference);
  if (!resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`DAISY reference escapes source folder: ${reference}`);
  return resolved;
}
const text = (value) =>
  typeof value === "string"
    ? value
    : !value || typeof value !== "object"
      ? ""
      : Object.entries(value)
          .filter(([k]) => !k.startsWith("@_"))
          .map(([, v]) => array(v).map(text).join(" "))
          .join(" ");
function clock(value) {
  const parts = String(value).split(":").map(Number);
  if (parts.some(Number.isNaN))
    throw new Error(`Invalid DAISY clock: ${value}`);
  return Math.round(parts.reduce((sum, part) => sum * 60 + part, 0) * 1000);
}
function collectIds(node, map = new Map()) {
  if (!node || typeof node !== "object") return map;
  if (node["@_id"])
    map.set(node["@_id"], text(node).replace(/\s+/g, " ").trim());
  for (const [k, v] of Object.entries(node))
    if (!k.startsWith("@_"))
      array(v).forEach((child) => collectIds(child, map));
  return map;
}
function smilCues(doc) {
  const output = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    array(node.par).forEach((par) => {
      const audio = array(par.audio)[0];
      const target = array(par.text)[0];
      if (
        audio?.["@_src"] &&
        target?.["@_src"] &&
        audio["@_clipBegin"] &&
        audio["@_clipEnd"]
      )
        output.push({
          file: decodeReference(audio["@_src"]),
          target: decodeReference(target["@_src"]).split("#")[1],
          startMs: clock(audio["@_clipBegin"]),
          endMs: clock(audio["@_clipEnd"]),
        });
      visit(par);
    });
    for (const [k, v] of Object.entries(node))
      if (k !== "par" && !k.startsWith("@_")) array(v).forEach(visit);
  };
  visit(doc.smil?.body);
  return output;
}
function ncxChapters(doc) {
  const chapters = [];
  let sequence = 0;
  const visit = (points) =>
    array(points).forEach((point) => {
      const audio = array(point.navLabel?.audio)[0];
      const title = text(point.navLabel?.text).trim();
      if (audio?.["@_src"] && title)
        chapters.push({
          sequence: ++sequence,
          title,
          file: decodeReference(audio["@_src"]),
          startMs: clock(audio["@_clipBegin"]),
        });
      visit(point.navPoint);
    });
  visit(doc.ncx?.navMap?.navPoint);
  return chapters;
}
function slugify(value) {
  const slug = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Invalid --slug");
  return slug;
}
function args(argv) {
  const result = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dry-run") result.dryRun = true;
    else if (["--source", "--book-id", "--slug"].includes(argv[i]))
      result[argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] =
        argv[++i];
    else
      throw new Error(
        "Usage: npm run audiobook:ingest -- --source <DAISY-folder> --book-id <id> --slug <r2-slug> [--dry-run]",
      );
  }
  result.bookId = Number(result.bookId);
  if (
    !result.source ||
    !Number.isSafeInteger(result.bookId) ||
    result.bookId < 1 ||
    !result.slug
  )
    throw new Error("Missing/invalid --source, --book-id, or --slug");
  result.slug = slugify(result.slug);
  return result;
}
async function planFromFolder(source, slug, prefix) {
  const names = await fsp.readdir(source);
  const opfName = names.find((name) => name.endsWith(".opf"));
  if (!opfName) throw new Error("Missing .opf file");
  const opf = parser.parse(
    await fsp.readFile(path.join(source, opfName), "utf8"),
  ).package;
  const manifest = new Map(
    array(opf.manifest?.item).map((item) => [item["@_id"], item]),
  );
  const href = (type) => {
    const reference = array(opf.manifest?.item).find(
      (item) => item["@_media-type"] === type,
    )?.["@_href"];
    return reference && decodeReference(reference);
  };
  const dtbook = href("application/x-dtbook+xml");
  const ncx = href("application/x-dtbncx+xml");
  const spine = array(opf.spine?.itemref)
    .map((item) => manifest.get(item["@_idref"])?.["@_href"])
    .map((reference) => reference && decodeReference(reference))
    .filter((name) => name?.endsWith(".smil"));
  if (!dtbook || !ncx || !spine.length)
    throw new Error("OPF lacks DTBook, NCX, or SMIL spine");
  const ids = collectIds(
    parser.parse(await fsp.readFile(resolveDaisyPath(source, dtbook), "utf8")),
  );
  const parts = new Map();
  for (const smil of spine)
    for (const cue of smilCues(
      parser.parse(await fsp.readFile(resolveDaisyPath(source, smil), "utf8")),
    )) {
      if (!parts.has(cue.file))
        parts.set(cue.file, { file: cue.file, segments: [], durationMs: 0 });
      const part = parts.get(cue.file);
      part.durationMs = Math.max(part.durationMs, cue.endMs);
      const content = ids.get(cue.target);
      if (content)
        part.segments.push({
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: content,
        });
    }
  if (!parts.size)
    throw new Error("DAISY package contains no playable audio cues");
  const base = `${prefix}${slug}`;
  const materialized = [...parts.values()].map((part, index) => ({
    ...part,
    partNumber: index + 1,
    sourcePath: resolveDaisyPath(source, part.file),
    r2Key: `${base}/audio/${part.file}`,
    transcriptKey: `${base}/transcripts/${path.basename(part.file, path.extname(part.file))}.json`,
  }));
  for (const part of materialized) await fsp.access(part.sourcePath);
  return {
    base,
    parts: materialized,
    chapters: ncxChapters(
      parser.parse(await fsp.readFile(resolveDaisyPath(source, ncx), "utf8")),
    ),
    sourceFiles: names.filter((name) => !name.endsWith(".mp3")),
    language: opf.metadata?.["dc-metadata"]?.Language || "vi-VN",
  };
}
async function concurrent(items, fn) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (index < items.length) await fn(items[index++]);
    }),
  );
}
async function upload(r2, plan, source) {
  await concurrent(plan.parts, async (part) => {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: part.r2Key,
        Body: fs.createReadStream(part.sourcePath),
        ContentType: "audio/mpeg",
      }),
    );
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: part.transcriptKey,
        Body: JSON.stringify({ segments: part.segments }),
        ContentType: "application/json; charset=utf-8",
      }),
    );
  });
  await concurrent(plan.sourceFiles, (file) =>
    r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: `${plan.base}/source/${file}`,
        Body: fs.createReadStream(path.join(source, file)),
        ContentType: "application/xml",
      }),
    ),
  );
}
async function persist(plan, bookId) {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "daisy_library",
  });
  try {
    await db.beginTransaction();
    const ids = new Map();
    for (const part of plan.parts) {
      await db.query(
        "INSERT INTO audiobook_parts (book_id, part_number, title, r2_key, mime_type, duration_ms, language, transcript_r2_key, transcript_format, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE title=VALUES(title), r2_key=VALUES(r2_key), duration_ms=VALUES(duration_ms), language=VALUES(language), transcript_r2_key=VALUES(transcript_r2_key), transcript_format=VALUES(transcript_format), published_at=VALUES(published_at)",
        [
          bookId,
          part.partNumber,
          path.basename(part.file, ".mp3"),
          part.r2Key,
          "audio/mpeg",
          part.durationMs,
          plan.language,
          part.transcriptKey,
          "timed-text",
        ],
      );
      const [rows] = await db.query(
        "SELECT id FROM audiobook_parts WHERE book_id = ? AND part_number = ?",
        [bookId, part.partNumber],
      );
      ids.set(part.file, rows[0].id);
    }
    await db.query(
      `DELETE FROM audiobook_chapters WHERE part_id IN (${[...ids.values()].map(() => "?").join(",")})`,
      [...ids.values()],
    );
    for (const chapter of plan.chapters) {
      const part = plan.parts.find((item) => item.file === chapter.file);
      if (part)
        await db.query(
          "INSERT INTO audiobook_chapters (part_id, sequence, title, start_ms, end_ms) VALUES (?, ?, ?, ?, ?)",
          [
            ids.get(chapter.file),
            chapter.sequence,
            chapter.title,
            chapter.startMs,
            part.durationMs,
          ],
        );
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}
async function ingest(options) {
  const r2 = createR2ClientFromEnv();
  if (!r2.client || !r2.prefix)
    throw new Error(`Missing R2 configuration: ${r2.missing.join(", ")}`);
  const plan = await planFromFolder(options.source, options.slug, r2.prefix);
  if (!options.dryRun) {
    await upload(r2, plan, options.source);
    await persist(plan, options.bookId);
  }
  return plan;
}
if (require.main === module)
  (async () => {
    const options = args(process.argv.slice(2));
    const plan = await ingest(options);
    console.log(
      `${options.dryRun ? "Validated" : "Ingested"} ${plan.parts.length} parts and ${plan.chapters.length} chapters under ${plan.base}/`,
    );
  })().catch((error) => {
    console.error(`Audiobook ingestion failed: ${error.message}`);
    process.exitCode = 1;
  });
module.exports = { args, clock, ncxChapters, planFromFolder, smilCues };
