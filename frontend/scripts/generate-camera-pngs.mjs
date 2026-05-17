/**
 * Tải ảnh sản phẩm, xóa nền đơn giản (góc sáng/tối), xuất PNG trong suốt.
 * Chạy: node scripts/generate-camera-pngs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/cameras");

const SOURCES = [
  {
    file: "fujifilm-xt5.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Fujifilm-X-T5.jpg",
  },
  {
    file: "canon-m50.png",
    url: "https://mayanh24h.com/upload/assets/thumb/catalog/san-pham-2019/may-anh-moi/canon/m50-mark-ii/canon-m50-mark-ii.jpg",
  },
  {
    file: "canon-r50.png",
    url: "https://kyma.vn/StoreData/images/Product/may-anh-canon-eos-r50-kit-rfs18-45mm-f45-63-is-stm(5).jpg",
  },
  {
    file: "dji-pocket-3.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/DJI_Osmo_Pocket_3_-_1.jpg/960px-DJI_Osmo_Pocket_3_-_1.jpg",
  },
];

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CameraSeed/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function samplePixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function removeSolidBackground(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const { width, height } = info;
      const corners = [
        samplePixel(data, width, 0, 0),
        samplePixel(data, width, width - 1, 0),
        samplePixel(data, width, 0, height - 1),
        samplePixel(data, width, width - 1, height - 1),
      ];
      const avg = corners.reduce(
        (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2]],
        [0, 0, 0],
      );
      const bgR = avg[0] / 4;
      const bgG = avg[1] / 4;
      const bgB = avg[2] / 4;
      const bgLum = luminance(bgR, bgG, bgB);
      const removeDark = bgLum < 90;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const pxLum = luminance(r, g, b);
          const colorDist = Math.hypot(r - bgR, g - bgG, b - bgB);
          const isBg = removeDark
            ? pxLum < 45
            : (pxLum > 220 && colorDist < 42) ||
              (pxLum > 200 && b >= g - 8 && b >= r - 8 && b - r < 35);
          if (isBg) data[i + 3] = 0;
        }
      }

      return sharp(data, {
        raw: { width, height, channels: 4 },
      })
        .trim()
        .png({ compressionLevel: 9 })
        .toBuffer();
    });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const { file, url } of SOURCES) {
    process.stdout.write(`→ ${file} … `);
    const raw = await fetchBuffer(url);
    const png = await removeSolidBackground(raw);
    const outPath = path.join(outDir, file);
    await fs.promises.writeFile(outPath, png);
    const meta = await sharp(outPath).metadata();
    console.log(`ok (${meta.width}×${meta.height})`);
  }

  console.log(`\nSaved to ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
