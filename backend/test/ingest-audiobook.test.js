const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, describe, it } = require("node:test");
const { planFromFolder } = require("../ingest-audiobook");

const directories = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function createDaisyFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "daisy-ingest-"));
  directories.push(directory);

  await Promise.all([
    fs.writeFile(
      path.join(directory, "book.opf"),
      `<?xml version="1.0"?><package><metadata><dc-metadata><dc:Language>vi-VN</dc:Language></dc-metadata></metadata><manifest><item id="book" href="book%20file.xml" media-type="application/x-dtbook+xml"/><item id="smil" href="part%20file.smil" media-type="application/smil"/><item id="ncx" href="navigation%20file.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine><itemref idref="smil"/></spine></package>`,
    ),
    fs.writeFile(
      path.join(directory, "book file.xml"),
      `<?xml version="1.0"?><dtbook><bodymatter><p id="sentence-1">Xin chào</p></bodymatter></dtbook>`,
    ),
    fs.writeFile(
      path.join(directory, "part file.smil"),
      `<?xml version="1.0"?><smil><body><seq><par><text src="book%20file.xml#sentence-1"/><audio src="part%200000.mp3" clipBegin="0:00:01.000" clipEnd="0:00:03.500"/></par></seq></body></smil>`,
    ),
    fs.writeFile(
      path.join(directory, "navigation file.ncx"),
      `<?xml version="1.0"?><ncx><navMap><navPoint><navLabel><text>Chương 1</text><audio src="part%200000.mp3" clipBegin="0:00:01.000" clipEnd="0:00:02.000"/></navLabel></navPoint></navMap></ncx>`,
    ),
    fs.writeFile(path.join(directory, "part 0000.mp3"), ""),
  ]);

  return directory;
}

describe("DAISY ingestion plan", () => {
  it("derives ordered audio, transcript, and chapter metadata without merging MP3 files", async () => {
    const source = await createDaisyFixture();

    const plan = await planFromFolder(source, "example-book", "audio-books/");

    assert.equal(plan.base, "audio-books/example-book");
    assert.equal(plan.language, "vi-VN");
    assert.deepEqual(plan.parts[0].segments, [
      { startMs: 1000, endMs: 3500, text: "Xin chào" },
    ]);
    assert.equal(
      plan.parts[0].r2Key,
      "audio-books/example-book/audio/part 0000.mp3",
    );
    assert.equal(
      plan.parts[0].transcriptKey,
      "audio-books/example-book/transcripts/part 0000.json",
    );
    assert.deepEqual(plan.chapters, [
      { sequence: 1, title: "Chương 1", file: "part 0000.mp3", startMs: 1000 },
    ]);
  });

  it("rejects decoded references that escape the DAISY folder", async () => {
    const source = await createDaisyFixture();
    await fs.writeFile(
      path.join(source, "book.opf"),
      `<?xml version="1.0"?><package><manifest><item href="..%2Foutside.xml" media-type="application/x-dtbook+xml"/><item href="navigation%20file.ncx" media-type="application/x-dtbncx+xml"/><item id="smil" href="part%20file.smil" media-type="application/smil"/></manifest><spine><itemref idref="smil"/></spine></package>`,
    );

    await assert.rejects(
      planFromFolder(source, "example-book", "audio-books/"),
      /DAISY reference escapes source folder/,
    );
  });
});
