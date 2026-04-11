/**
 * Génère assets/icon.png - Kounter
 * Design : carte blanche + trophée doré
 * Aucune dépendance externe — node generate-icon.js
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
  ihdr[8] = 8; ihdr[9] = 2;

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

// ── Pixel helpers ─────────────────────────────────────────────

const px = Buffer.alloc(SIZE * SIZE * 3);

function set(x, y, r, g, b) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

function fillRect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      set(x, y, r, g, b);
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

// Rectangle pivoté (pour la carte en biais)
function fillRotatedRoundedRect(cx, cy, w, h, rad, angle, r, g, b) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const hw = w / 2, hh = h / 2;
  const bx = Math.ceil(Math.abs(hw * cos) + Math.abs(hh * sin)) + 2;
  const by = Math.ceil(Math.abs(hw * sin) + Math.abs(hh * cos)) + 2;
  for (let dy = -by; dy <= by; dy++) {
    for (let dx = -bx; dx <= bx; dx++) {
      const lx =  dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      if (lx < -hw || lx > hw || ly < -hh || ly > hh) continue;
      const nearL = lx < -hw + rad, nearR = lx > hw - rad;
      const nearT = ly < -hh + rad, nearB = ly > hh - rad;
      if ((nearL || nearR) && (nearT || nearB)) {
        const ccx = nearL ? -hw + rad : hw - rad;
        const ccy = nearT ? -hh + rad : hh - rad;
        if ((lx - ccx) ** 2 + (ly - ccy) ** 2 > rad * rad) continue;
      }
      set(cx + dx, cy + dy, r, g, b);
    }
  }
}

// Diamant ♦
function fillDiamond(cx, cy, half, r, g, b) {
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++)
      if (Math.abs(x - cx) + Math.abs(y - cy) <= half) set(x, y, r, g, b);
}

// Trophée doré
function drawTrophy(cx, cy, size, r, g, b) {
  const s = size;

  // Dôme (demi-cercle supérieur de la coupe)
  const domeR  = Math.round(s * 0.30);
  const domeY  = cy - Math.round(s * 0.20);
  for (let dy = -domeR; dy <= 0; dy++)
    for (let dx = -domeR; dx <= domeR; dx++)
      if (dx * dx + dy * dy <= domeR * domeR) set(cx + dx, domeY + dy, r, g, b);

  // Corps de la coupe (trapèze : large en haut, plus étroit en bas)
  const cupTopY  = domeY;
  const cupBotY  = cy + Math.round(s * 0.18);
  const cupTopHW = domeR;
  const cupBotHW = Math.round(s * 0.18);
  for (let y = cupTopY; y <= cupBotY; y++) {
    const t  = (y - cupTopY) / (cupBotY - cupTopY);
    const hw = Math.round(cupTopHW + (cupBotHW - cupTopHW) * t);
    for (let x = cx - hw; x <= cx + hw; x++) set(x, y, r, g, b);
  }

  // Anses (demi-cercles sur les côtés de la coupe)
  const handleY   = domeY - Math.round(s * 0.02);
  const handleOR  = Math.round(s * 0.14);
  const handleIR  = Math.round(s * 0.08);
  const handleCXL = cx - cupTopHW;
  const handleCXR = cx + cupTopHW;
  [-1, 1].forEach((side) => {
    const hcx = side === -1 ? handleCXL : handleCXR;
    for (let dy = 0; dy <= handleOR; dy++) {
      for (let dx = -handleOR; dx <= handleOR; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= handleOR * handleOR && d2 >= handleIR * handleIR) {
          // Seulement le côté extérieur
          if (side === -1 && hcx + dx > cx - cupTopHW + 4) continue;
          if (side ===  1 && hcx + dx < cx + cupTopHW - 4) continue;
          set(hcx + dx, handleY + dy, r, g, b);
        }
      }
    }
  });

  // Tige
  const stemHW  = Math.round(s * 0.06);
  const stemTop = cupBotY;
  const stemBot = cy + Math.round(s * 0.44);
  for (let y = stemTop; y <= stemBot; y++)
    for (let x = cx - stemHW; x <= cx + stemHW; x++)
      set(x, y, r, g, b);

  // Socle
  const baseHW  = Math.round(s * 0.36);
  const baseTop = stemBot;
  const baseH   = Math.round(s * 0.14);
  fillRoundedRect(cx - baseHW, baseTop, baseHW * 2, baseH, 10, r, g, b);
}

// ── Dessin du logo ────────────────────────────────────────────

// 1. Fond dégradé #1a1a2e → #0f3460
for (let y = 0; y < SIZE; y++) {
  const t = y / (SIZE - 1);
  const R = Math.round(26  + t * (15  - 26));
  const G = Math.round(26  + t * (52  - 26));
  const B = Math.round(46  + t * (96  - 46));
  for (let x = 0; x < SIZE; x++) set(x, y, R, G, B);
}

// 2. Carte de derrière (légèrement pivotée, couleur foncée)
fillRotatedRoundedRect(510, 515, 720, 840, 90, -0.22, 30, 35, 65);
fillRotatedRoundedRect(505, 510, 700, 820, 86, -0.22, 45, 50, 95);

// 3. Carte principale blanche (droite)
// Ombre portée
fillRoundedRect(88, 100, 820, 820, 108, 12, 12, 28);
// Carte
fillRoundedRect(80, 88, 820, 820, 108, 250, 250, 255);
// Bordure intérieure subtile
fillRoundedRect(95, 103, 790, 790, 96, 225, 225, 235);
// Fond blanc
fillRoundedRect(100, 108, 780, 780, 92, 255, 255, 255);

// 4. Trophée doré — couleur principale #f39c12
// Ombre du trophée (décalée, sombre)
drawTrophy(518, 532, 390, 160, 110, 20);
// Trophée doré
drawTrophy(512, 525, 390, 243, 156, 18);
// Reflet sur la coupe (zone plus claire en haut à gauche)
for (let dy = -117; dy <= 0; dy++) {
  for (let dx = -117; dx <= 0; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 <= 117 * 117) {
      const bx = 512 + dx, by = 525 - 78 + dy;
      const idx = (Math.round(by) * SIZE + Math.round(bx)) * 3;
      if (idx >= 0 && idx < px.length - 2) {
        const t = 1 - Math.sqrt(d2) / 117;
        px[idx]     = Math.min(255, px[idx]     + Math.round(t * 45));
        px[idx + 1] = Math.min(255, px[idx + 1] + Math.round(t * 28));
        px[idx + 2] = Math.min(255, px[idx + 2] + Math.round(t * 5));
      }
    }
  }
}

// 5. Diamant rouge ♦ en haut de la carte (au-dessus du trophée)
fillDiamond(512, 164, 55, 220, 50, 50);   // grand diamant
fillDiamond(168, 160, 38, 220, 50, 50);   // coin haut-gauche
fillDiamond(856, 840, 38, 220, 50, 50);   // coin bas-droite

// ── Export ────────────────────────────────────────────────────

if (!fs.existsSync('assets')) fs.mkdirSync('assets');

const pngData = buildPNG(px);
fs.writeFileSync('assets/icon.png', pngData);
fs.writeFileSync('assets/adaptive-icon.png', pngData);
fs.writeFileSync('assets/splash.png', pngData);

console.log('✓ assets/icon.png');
console.log('✓ assets/adaptive-icon.png');
console.log('✓ assets/splash.png');
