/**
 * Génère assets/icon.png et assets/adaptive-icon.png
 * Aucune dépendance externe — Node.js uniquement.
 * Usage : node generate-icon.js
 */
const zlib = require('zlib');
const fs   = require('fs');

const SIZE = 1024;

// ── PNG writer ────────────────────────────────────────────────

function makeCRCTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
}
const CRC = makeCRCTable();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function buildPNG(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 2; // bit-depth=8, RGB

  // Scanlines with filter byte 0 (None)
  const row = 1 + SIZE * 3;
  const raw = Buffer.alloc(SIZE * row);
  for (let y = 0; y < SIZE; y++) {
    raw[y * row] = 0;
    pixels.copy(raw, y * row + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Pixel buffer + helpers ────────────────────────────────────

const px = Buffer.alloc(SIZE * SIZE * 3);

function set(x, y, r, g, b) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

function fillCircle(cx, cy, rad, r, g, b) {
  const r2 = rad * rad;
  for (let y = cy - rad; y <= cy + rad; y++)
    for (let x = cx - rad; x <= cx + rad; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) set(x, y, r, g, b);
}

function fillRoundedRect(x0, y0, w, h, rad, r, g, b) {
  const x1 = x0 + w - 1, y1 = y0 + h - 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nearL = x < x0 + rad, nearR = x > x1 - rad;
      const nearT = y < y0 + rad, nearB = y > y1 - rad;
      if ((nearL || nearR) && (nearT || nearB)) {
        const cx = nearL ? x0 + rad : x1 - rad;
        const cy = nearT ? y0 + rad : y1 - rad;
        if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
      }
      set(x, y, r, g, b);
    }
  }
}

function fillDiamond(cx, cy, half, r, g, b) {
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++)
      if (Math.abs(x - cx) + Math.abs(y - cy) <= half) set(x, y, r, g, b);
}

// ── Icon design ───────────────────────────────────────────────
//
//  Fond : dégradé #1a1a2e → #16213e
//  Carte blanche arrondie (ombre portée sombre)
//  Gros diamant rouge ♦ centré
//  Petits diamants en coins (style carte à jouer)

// 1. Dégradé de fond
for (let y = 0; y < SIZE; y++) {
  const t = y / (SIZE - 1);
  const R = Math.round(26  + t * (22  - 26));
  const G = Math.round(26  + t * (33  - 26));
  const B = Math.round(46  + t * (62  - 46));
  for (let x = 0; x < SIZE; x++) set(x, y, R, G, B);
}

// 2. Ombre de la carte
fillRoundedRect(92, 102, 840, 840, 112, 10, 10, 22);

// 3. Carte blanche
fillRoundedRect(80, 80, 840, 840, 112, 248, 248, 248);

// 4. Liseré intérieur subtil (gris très clair)
fillRoundedRect(96, 96, 808, 808, 100, 230, 230, 230);

// 5. Remplissage blanc intérieur
fillRoundedRect(100, 100, 800, 800, 96, 255, 255, 255);

// 6. Grand diamant ♦ central  #e74c3c
fillDiamond(512, 512, 268, 231, 76, 60);

// Reflet sur le diamant (coin supérieur gauche plus clair)
for (let y = 244; y < 512; y++) {
  for (let x = 244; x < 512; x++) {
    const d = Math.abs(x - 512) + Math.abs(y - 512);
    if (d <= 268) {
      const t = 1 - (d / 268);
      const light = Math.round(t * 30);
      const idx = (y * SIZE + x) * 3;
      px[idx]     = Math.min(255, px[idx]     + light);
      px[idx + 1] = Math.min(255, px[idx + 1] + Math.round(light * 0.3));
      px[idx + 2] = Math.min(255, px[idx + 2] + Math.round(light * 0.3));
    }
  }
}

// 7. Petits diamants en coins (style vrai carte à jouer)
fillDiamond(188, 198, 58, 231, 76, 60); // haut-gauche
fillDiamond(836, 826, 58, 231, 76, 60); // bas-droite

// ── Export ────────────────────────────────────────────────────

if (!fs.existsSync('assets')) fs.mkdirSync('assets');

const pngData = buildPNG(px);
fs.writeFileSync('assets/icon.png', pngData);
fs.writeFileSync('assets/adaptive-icon.png', pngData);
fs.writeFileSync('assets/splash.png', pngData);

console.log('✓ assets/icon.png');
console.log('✓ assets/adaptive-icon.png');
console.log('✓ assets/splash.png');
console.log('\nRelancez : npx.cmd expo start --web');
