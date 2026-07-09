'use strict';
// Generate placeholder icon assets: PNG (512x512), ICNS, ICO
// Color palette mirrors the tray brass color #B7996E used in main.cjs

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'packages', 'desktop', 'assets');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BRAND = {
  primary: [0xb7, 0x99, 0x6e],
  dark:    [0x7d, 0x63, 0x47],
  light:   [0xef, 0xd9, 0xb1],
  bg:      [0x1f, 0x24, 0x2c],
  accent:  [0xff, 0xc1, 0x07],
};

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.18);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = Math.max(Math.abs(x - cx) - (size / 2 - radius), 0);
      const dy = Math.max(Math.abs(y - cy) - (size / 2 - radius), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        buf[idx + 3] = 0;
        continue;
      }
      const maxDist = Math.sqrt((size / 2) ** 2 + (size / 2) ** 2);
      const t = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const bgR = Math.round(BRAND.bg[0] * (1 - t * 0.3) + BRAND.dark[0] * t * 0.3);
      const bgG = Math.round(BRAND.bg[1] * (1 - t * 0.3) + BRAND.dark[1] * t * 0.3);
      const bgB = Math.round(BRAND.bg[2] * (1 - t * 0.3) + BRAND.dark[2] * t * 0.3);
      buf[idx] = bgR;
      buf[idx + 1] = bgG;
      buf[idx + 2] = bgB;
      buf[idx + 3] = 255;
    }
  }

  const ringOuter = size * 0.32;
  const ringInner = size * 0.24;
  const ringCenterY = size * 0.52;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (buf[idx + 3] === 0) continue;
      const dx = x - cx;
      const dy = y - ringCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= ringInner && dist <= ringOuter) {
        const t = (dist - ringInner) / (ringOuter - ringInner);
        buf[idx]     = Math.round(BRAND.light[0] * (1 - t) + BRAND.primary[0] * t);
        buf[idx + 1] = Math.round(BRAND.light[1] * (1 - t) + BRAND.primary[1] * t);
        buf[idx + 2] = Math.round(BRAND.light[2] * (1 - t) + BRAND.primary[2] * t);
        buf[idx + 3] = 255;
      }
    }
  }

  const dotR = size * 0.16;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (buf[idx + 3] === 0) continue;
      const dx = x - cx;
      const dy = y - ringCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= dotR) {
        buf[idx]     = BRAND.primary[0];
        buf[idx + 1] = BRAND.primary[1];
        buf[idx + 2] = BRAND.primary[2];
        buf[idx + 3] = 255;
      }
      const ax = x - (cx + size * 0.26);
      const ay = y - (cy - size * 0.26);
      const adist = Math.sqrt(ax * ax + ay * ay);
      if (adist <= size * 0.06) {
        buf[idx]     = BRAND.accent[0];
        buf[idx + 1] = BRAND.accent[1];
        buf[idx + 2] = BRAND.accent[2];
        buf[idx + 3] = 255;
      }
    }
  }
  return buf;
}

let CRC_TABLE = null;
function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
}
function crc32(buf) {
  if (!CRC_TABLE) buildCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}
function encodePng(rgba, w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const filtered = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    filtered[y * (w * 4 + 1)] = 0;
    rgba.copy(filtered, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(filtered, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const png512 = encodePng(renderIcon(512), 512, 512);
fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), png512);
console.log('Wrote icon.png: ' + png512.length + ' bytes');

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
const pngBySize = {};
for (const s of sizes) {
  pngBySize[s] = encodePng(renderIcon(s), s, s);
}

function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  for (let i = 0; i < pngs.length; i++) {
    const p = pngs[i];
    dir[i * 16 + 0] = p.size >= 256 ? 0 : p.size;
    dir[i * 16 + 1] = p.size >= 256 ? 0 : p.size;
    dir[i * 16 + 2] = 0;
    dir[i * 16 + 3] = 0;
    dir.writeUInt16LE(1, i * 16 + 4);
    dir.writeUInt16LE(32, i * 16 + 6);
    dir.writeUInt32LE(p.data.length, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += p.data.length;
  }
  return Buffer.concat([header, dir].concat(pngs.map(p => p.data)));
}
const icoData = encodeIco([
  { size: 16, data: pngBySize[16] },
  { size: 24, data: pngBySize[24] },
  { size: 32, data: pngBySize[32] },
  { size: 48, data: pngBySize[48] },
  { size: 64, data: pngBySize[64] },
  { size: 128, data: pngBySize[128] },
  { size: 256, data: pngBySize[256] },
]);
fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), icoData);
console.log('Wrote icon.ico: ' + icoData.length + ' bytes');

function icnsType(t, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length + 8, 0);
  return Buffer.concat([Buffer.from(t, 'ascii'), len, data]);
}
const blocks = [];
blocks.push(icnsType('ic07', pngBySize[128]));
blocks.push(icnsType('ic08', pngBySize[256]));
blocks.push(icnsType('ic09', pngBySize[512]));
blocks.push(icnsType('ic10', pngBySize[16]));
blocks.push(icnsType('ic11', pngBySize[32]));
blocks.push(icnsType('ic12', pngBySize[64]));
blocks.push(icnsType('ic13', pngBySize[128]));
blocks.push(icnsType('ic14', pngBySize[256]));
const body = Buffer.concat(blocks);
const icnsHeader = Buffer.from('icns', 'ascii');
const totalLen = Buffer.alloc(4);
totalLen.writeUInt32BE(body.length + 8, 0);
const icnsData = Buffer.concat([icnsHeader, totalLen, body]);
fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icnsData);
console.log('Wrote icon.icns: ' + icnsData.length + ' bytes');

const png1024 = encodePng(renderIcon(1024), 1024, 1024);
fs.writeFileSync(path.join(OUT_DIR, 'icon-1024.png'), png1024);
console.log('Wrote icon-1024.png: ' + png1024.length + ' bytes');

console.log('All assets generated.');
