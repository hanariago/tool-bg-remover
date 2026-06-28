// 자가호스팅 벤더링 스크립트
// 실행: npm run vendor   (또는 node scripts/vendor.mjs)
// 하는 일:
//   1) @imgly/background-removal(+의존성)을 esbuild로 단일 ESM(vendor/background-removal.mjs)으로 번들
//   2) 모델/wasm 자산(@imgly/background-removal-data)을 imgly CDN에서 vendor/imgly-data/로 미러링
// 버전 올릴 때: 아래 VER + package.json의 @imgly/background-removal 버전만 바꾸고 다시 실행.

import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const VER = "1.5.5";
const DATA = `https://staticimgly.com/@imgly/background-removal-data/${VER}/dist`;
const OUT = "vendor";
const ASSETS = `${OUT}/imgly-data`;

// 다운로드할 자산: 우리가 쓰는 모델(isnet_fp16) + CPU용 onnx wasm 3종.
// (webgpu(jsep)/training 변종은 device:'cpu'에서 안 쓰므로 제외 → 용량 절약)
const KEEP = new Set([
  "/models/isnet_fp16",
  "/onnxruntime-web/ort-wasm.wasm",
  "/onnxruntime-web/ort-wasm-simd.wasm",
  "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
]);

// ── 1) 라이브러리 번들 ──
console.log("· esbuild 번들링…");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/.tmp`, { recursive: true });
writeFileSync(`${OUT}/.tmp/entry.js`, 'export { removeBackground } from "@imgly/background-removal";\n');
await build({
  entryPoints: [`${OUT}/.tmp/entry.js`],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: `${OUT}/background-removal.mjs`,
  minify: true,
  legalComments: "none",
  target: "es2020",
  logLevel: "warning",
});
rmSync(`${OUT}/.tmp`, { recursive: true, force: true });
console.log("  → vendor/background-removal.mjs");

// ── 2) 자산 미러링 ──
console.log("· 자산 미러링…");
mkdirSync(ASSETS, { recursive: true });
const res = await (await fetch(`${DATA}/resources.json`)).json();
await writeFile(`${ASSETS}/resources.json`, JSON.stringify(res));

const hashes = new Set();
for (const [key, val] of Object.entries(res)) {
  if (KEEP.has(key)) for (const c of val.chunks) hashes.add(c.hash);
}
const all = [...hashes];
let i = 0, bytes = 0;
for (const h of all) {
  const buf = Buffer.from(await (await fetch(`${DATA}/${h}`)).arrayBuffer());
  await writeFile(`${ASSETS}/${h}`, buf);
  bytes += buf.length;
  console.log(`  [${++i}/${all.length}] ${h.slice(0, 12)}… ${(buf.length / 1048576).toFixed(1)}MB`);
}
console.log(`✓ 완료: 청크 ${all.length}개, 총 ${(bytes / 1048576).toFixed(1)}MB → ${ASSETS}/`);
