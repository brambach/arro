import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("public", import.meta.url));
const allowed = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
const files = walk(publicDir);
const named = (ext) => files.filter((f) => f.endsWith(ext));
const rel = (f) => relative(publicDir, f);

const chunkTypes = (png) => {
  assert.ok(png.subarray(0, 8).equals(signature), "PNG signature");
  const types = [];
  for (let at = 8; at < png.length; at += 12 + png.readUInt32BE(at)) {
    types.push(png.toString("latin1", at + 4, at + 8));
  }
  return types;
};
const extraChunks = (png) => chunkTypes(png).filter((t) => !allowed.has(t));

const icoImages = (ico) =>
  Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const entry = 6 + i * 16;
    const start = ico.readUInt32LE(entry + 12);
    return ico.subarray(start, start + ico.readUInt32LE(entry + 8));
  });

const chunk = (type, data = Buffer.alloc(0)) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
};

test("the chunk check flags a text chunk", () => {
  const png = Buffer.concat([signature, chunk("IHDR", Buffer.alloc(13)), chunk("tEXt", Buffer.from("Software\0x")), chunk("IDAT"), chunk("IEND")]);
  assert.deepEqual(extraChunks(png), ["tEXt"]);
});

test("PNGs in public/ carry no metadata chunks", () => {
  const pngs = named(".png");
  assert.ok(pngs.length > 0, "found PNGs");
  const found = pngs.map((f) => [rel(f), extraChunks(readFileSync(f))]).filter(([, extra]) => extra.length);
  assert.deepEqual(found, [], "strip these chunks (only IHDR, PLTE, tRNS, IDAT, IEND allowed)");
});

test("favicon.ico holds plain bitmaps or PNGs without metadata chunks", () => {
  const icons = icoImages(readFileSync(join(publicDir, "favicon.ico")));
  assert.ok(icons.length > 0, "found icon images");
  for (const img of icons) {
    if (img.subarray(0, 8).equals(signature)) assert.deepEqual(extraChunks(img), []);
    else assert.equal(img.readUInt32LE(0), 40, "a BITMAPINFOHEADER, which has no metadata fields");
  }
});

test("SVGs in public/ carry no metadata or generator notes", () => {
  const svgs = named(".svg");
  assert.ok(svgs.length > 0, "found SVGs");
  const found = svgs.filter((f) => /<metadata|generator/i.test(readFileSync(f, "utf8"))).map(rel);
  assert.deepEqual(found, []);
});
