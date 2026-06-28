// 배경 제거 — 100% 브라우저 처리. 이미지는 어디로도 전송되지 않습니다.
// 두 가지 방식:
//   1) AI 자동  : @imgly/background-removal (AGPL). 로컬 모델, 아무 사진이나.
//   2) 단색 배경 : 크로마키. 모델 다운로드 없이 즉시. 단색 배경에만 적합.

import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm";

const AI_CONFIG = { model: "isnet_fp16" }; // publicPath 기본값(imgly CDN)에서 모델 1회 다운로드
const HISTORY_LIMIT = 10;

// ── DOM ──
const $ = (id) => document.getElementById(id);
const dropzone = $("dropzone");
const fileInput = $("fileInput");
const pickBtn = $("pickBtn");
const firstRunNote = $("firstRunNote");
const modeAiBtn = $("modeAi");
const modeColorBtn = $("modeColor");

const stage = $("stage");
const stageName = $("stageName");
const stageMeta = $("stageMeta");
const downloadBtn = $("downloadBtn");
const resetBtn = $("resetBtn");

const progress = $("progress");
const progressLabel = $("progressLabel");
const bar = $("bar");

const compare = $("compare");
const origImg = $("origImg");
const resultImg = $("resultImg");
const errorBox = $("errorBox");

const colorControls = $("colorControls");
const keySwatch = $("keySwatch");
const toleranceInput = $("tolerance");
const toleranceVal = $("toleranceVal");
const autoDetectBtn = $("autoDetect");

const historySection = $("historySection");
const historyGrid = $("historyGrid");
const historyCount = $("historyCount");
const clearHistoryBtn = $("clearHistory");

// ── 상태 ──
let mode = "ai"; // 'ai' | 'color'
let current = null; // { blob, filename }  — 현재 다운로드 대상
let lastFile = null; // 가장 최근 업로드 원본(모드 전환 시 재처리용)
let modelWarmed = false;
let busy = false;
const objectUrls = new Set();

// 단색 모드 작업 상태
let colorState = null; // { file, w, h, imgData, key:{r,g,b} }

// ── 유틸 ──
const trackUrl = (u) => { objectUrls.add(u); return u; };
const revokeAll = () => { objectUrls.forEach((u) => URL.revokeObjectURL(u)); objectUrls.clear(); };
const baseName = (n) => (n || "image").replace(/\.[^.]+$/, "");
const outName = (n) => `${baseName(n)}-bg-removed.png`;

function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }
function setProgress(pct, label) {
  bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (label) progressLabel.textContent = label;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function canvasToBlob(canvas) {
  return new Promise((r) => canvas.toBlob(r, "image/png"));
}

// ── 모드 ──
function setMode(next) {
  if (mode === next) return;
  mode = next;
  modeAiBtn.classList.toggle("is-active", next === "ai");
  modeColorBtn.classList.toggle("is-active", next === "color");
  modeAiBtn.setAttribute("aria-selected", next === "ai");
  modeColorBtn.setAttribute("aria-selected", next === "color");
  origImg.classList.toggle("pickable", next === "color");
  firstRunNote.style.display = next === "ai" ? "" : "none";
  if (next !== "color") colorControls.hidden = true;
  // 이미 올린 이미지가 있으면 새 모드로 재처리
  if (lastFile) handleFiles([lastFile]);
}

// ── 파일 진입점 ──
function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) { showError("이미지 파일만 올릴 수 있어요 (JPG, PNG, WEBP 등)."); return; }
  if (mode === "ai") processQueueAI(files);
  else processColor(files);
}

function beginStage() {
  clearError();
  firstRunNote.hidden = true;
  stage.hidden = false;
  stage.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── AI 모드 ──
async function processQueueAI(files) {
  if (busy) return;
  busy = true;
  beginStage();
  colorControls.hidden = true;
  for (let i = 0; i < files.length; i++) {
    lastFile = files[i];
    const counter = files.length > 1 ? ` (${i + 1}/${files.length})` : "";
    await processOneAI(files[i], counter);
  }
  busy = false;
}

async function processOneAI(file, counter) {
  revokeAll();
  compare.hidden = true;
  progress.hidden = false;
  downloadBtn.disabled = true;
  current = null;

  const origUrl = trackUrl(URL.createObjectURL(file));
  origImg.src = origUrl;
  stageName.textContent = `${file.name}${counter}`;
  stageMeta.textContent = "준비 중…";
  setProgress(4, modelWarmed ? "배경 제거 준비 중…" : "AI 모델 준비 중… (첫 실행은 조금 걸려요)");

  try {
    const blob = await removeBackground(file, {
      ...AI_CONFIG,
      progress: (key, cur, total) => {
        const pct = total ? Math.round((cur / total) * 100) : 0;
        if (key.startsWith("fetch")) setProgress(Math.max(8, pct * 0.7), `AI 모델 내려받는 중… ${pct}%`);
        else if (key.startsWith("compute")) { modelWarmed = true; setProgress(70 + pct * 0.3, `배경 제거 중… ${pct}%`); }
      },
    });

    modelWarmed = true;
    setProgress(100, "완료");
    await showResult(blob, outName(file.name), origUrl);
  } catch (err) {
    console.error(err);
    progress.hidden = true;
    showError(`배경 제거에 실패했어요: ${err?.message || err}. 잠시 후 다시 시도하거나 다른 이미지를 올려보세요.`);
  }
}

// ── 단색(크로마키) 모드 ──
async function processColor(files) {
  beginStage();
  progress.hidden = true;

  // 여러 장이면 마지막 1장만 인터랙티브 편집, 나머지는 자동 키로 히스토리에 저장
  for (let i = 0; i < files.length - 1; i++) await autoColorToHistory(files[i]);

  const file = files[files.length - 1];
  lastFile = file;
  const url = trackUrl(URL.createObjectURL(file));
  const img = await loadImage(url);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  colorState = { file, w: canvas.width, h: canvas.height, imgData, key: detectCornerColor(imgData) };

  origImg.src = url;
  origImg.classList.add("pickable");
  stageName.textContent = file.name;
  compare.hidden = false;
  colorControls.hidden = false;
  syncKeyUI();
  await applyChroma(true); // 초기 결과 + 히스토리 저장
}

function detectCornerColor(imgData) {
  const { data, width, height } = imgData;
  const pts = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  let r = 0, g = 0, b = 0;
  for (const [x, y] of pts) {
    const i = (y * width + x) * 4;
    r += data[i]; g += data[i + 1]; b += data[i + 2];
  }
  return { r: Math.round(r / 4), g: Math.round(g / 4), b: Math.round(b / 4) };
}

function syncKeyUI() {
  if (!colorState) return;
  const { r, g, b } = colorState.key;
  keySwatch.style.background = `rgb(${r},${g},${b})`;
}

// 키 색과의 거리로 알파 결정 → 투명 PNG
async function applyChroma(save = false) {
  if (!colorState) return;
  const { imgData, w, h, key } = colorState;
  const t = Number(toleranceInput.value);
  const feather = Math.max(8, t * 0.4);
  const src = imgData.data;

  const out = new ImageData(w, h);
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const dr = src[i] - key.r, dg = src[i + 1] - key.g, db = src[i + 2] - key.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2];
    let a = src[i + 3];
    if (dist <= t - feather) a = 0;
    else if (dist < t) a = Math.round(a * ((dist - (t - feather)) / feather));
    dst[i + 3] = a;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").putImageData(out, 0, 0);
  const blob = await canvasToBlob(canvas);

  // 미리보기 갱신(기존 결과 URL만 정리)
  if (current?.url) URL.revokeObjectURL(current.url);
  const url = URL.createObjectURL(blob);
  resultImg.src = url;
  const filename = outName(colorState.file.name);
  current = { blob, filename, url };
  downloadBtn.disabled = false;
  stageMeta.textContent = `${w} × ${h}px · 투명 PNG · 단색`;

  if (save) {
    const thumb = await makeThumb(URL.createObjectURL(colorState.file));
    await saveHistory({ name: filename, ts: Date.now(), origThumb: thumb, blob, w, h });
    await renderHistory();
  }
}

async function autoColorToHistory(file) {
  try {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const key = detectCornerColor(imgData);
    const t = Number(toleranceInput.value), feather = Math.max(8, t * 0.4);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - key.r, dg = d[i + 1] - key.g, db = d[i + 2] - key.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist <= t - feather) d[i + 3] = 0;
      else if (dist < t) d[i + 3] = Math.round(d[i + 3] * ((dist - (t - feather)) / feather));
    }
    ctx.putImageData(imgData, 0, 0);
    const blob = await canvasToBlob(canvas);
    const thumb = await makeThumb(url);
    await saveHistory({ name: outName(file.name), ts: Date.now(), origThumb: thumb, blob, w: canvas.width, h: canvas.height });
    URL.revokeObjectURL(url);
  } catch (e) { console.warn("color batch skipped:", e); }
}

// 원본 클릭 → 그 지점 색을 배경색으로
async function pickColorFromOriginal(ev) {
  if (mode !== "color" || !colorState) return;
  const rect = origImg.getBoundingClientRect();
  const { w, h } = colorState;
  const scale = Math.min(rect.width / w, rect.height / h);
  const dispW = w * scale, dispH = h * scale;
  const offX = (rect.width - dispW) / 2, offY = (rect.height - dispH) / 2;
  let px = Math.round((ev.clientX - rect.left - offX) / scale);
  let py = Math.round((ev.clientY - rect.top - offY) / scale);
  px = Math.max(0, Math.min(w - 1, px));
  py = Math.max(0, Math.min(h - 1, py));
  const i = (py * w + px) * 4;
  const d = colorState.imgData.data;
  colorState.key = { r: d[i], g: d[i + 1], b: d[i + 2] };
  syncKeyUI();
  await applyChroma(true);
}

// ── 공통 결과 표시(AI) ──
async function showResult(blob, filename, origUrl) {
  const resultUrl = trackUrl(URL.createObjectURL(blob));
  resultImg.src = resultUrl;
  current = { blob, filename };
  progress.hidden = true;
  compare.hidden = false;
  downloadBtn.disabled = false;
  const dims = await imageDims(blob);
  stageMeta.textContent = dims ? `${dims.w} × ${dims.h}px · 투명 PNG` : "투명 PNG";
  const thumb = await makeThumb(origUrl);
  await saveHistory({ name: filename, ts: Date.now(), origThumb: thumb, blob, w: dims?.w, h: dims?.h });
  await renderHistory();
}

function imageDims(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function makeThumb(srcUrl, max = 240) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = srcUrl;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function reset() {
  revokeAll();
  if (current?.url) URL.revokeObjectURL(current.url);
  stage.hidden = true;
  compare.hidden = true;
  progress.hidden = true;
  colorControls.hidden = true;
  current = null; lastFile = null; colorState = null;
  fileInput.value = "";
  firstRunNote.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── 히스토리 (IndexedDB) ──
let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open("bgremover", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("items")) {
        const store = db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        store.createIndex("ts", "ts");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction("items", mode);
    const req = fn(t.objectStore("items"));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
function getAll(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("items").objectStore("items").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function saveHistory(item) {
  try {
    const db = await openDB();
    await tx(db, "readwrite", (s) => s.add(item));
    const all = (await getAll(db)).sort((a, b) => b.ts - a.ts);
    const extra = all.slice(HISTORY_LIMIT);
    if (extra.length) await tx(db, "readwrite", (s) => { extra.forEach((it) => s.delete(it.id)); });
  } catch (e) { console.warn("history save skipped:", e); }
}

const histUrls = new Set();
async function renderHistory() {
  let items = [];
  try { items = (await getAll(await openDB())).sort((a, b) => b.ts - a.ts); }
  catch (e) { console.warn(e); }
  histUrls.forEach((u) => URL.revokeObjectURL(u)); histUrls.clear();

  if (!items.length) { historySection.hidden = true; return; }
  historySection.hidden = false;
  historyCount.textContent = `(${items.length})`;
  historyGrid.innerHTML = "";

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "hist-card";
    card.title = "클릭하면 결과를 다시 봅니다";

    const thumb = document.createElement("div");
    thumb.className = "hist-thumb";
    const tImg = document.createElement("img");
    const u = URL.createObjectURL(it.blob); histUrls.add(u);
    tImg.src = u; tImg.alt = it.name;
    thumb.appendChild(tImg);

    const meta = document.createElement("div");
    meta.className = "hist-meta";
    const nm = document.createElement("span");
    nm.className = "hist-name"; nm.textContent = it.name;
    const dl = document.createElement("button");
    dl.className = "hist-dl"; dl.type = "button"; dl.textContent = "↓"; dl.title = "다운로드";
    dl.addEventListener("click", (e) => { e.stopPropagation(); downloadBlob(it.blob, it.name); });
    meta.append(nm, dl);

    card.addEventListener("click", () => loadFromHistory(it));
    card.append(thumb, meta);
    historyGrid.appendChild(card);
  }
}

function loadFromHistory(it) {
  clearError();
  firstRunNote.hidden = true;
  stage.hidden = false;
  progress.hidden = true;
  colorControls.hidden = true;
  compare.hidden = false;
  colorState = null;
  origImg.classList.remove("pickable");
  origImg.src = it.origThumb || "";
  const url = trackUrl(URL.createObjectURL(it.blob));
  resultImg.src = url;
  stageName.textContent = it.name;
  stageMeta.textContent = it.w && it.h ? `${it.w} × ${it.h}px · 투명 PNG` : "투명 PNG";
  current = { blob: it.blob, filename: it.name };
  downloadBtn.disabled = false;
  stage.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function clearHistory() {
  try { await tx(await openDB(), "readwrite", (s) => s.clear()); }
  catch (e) { console.warn(e); }
  await renderHistory();
}

// ── 이벤트 ──
modeAiBtn.addEventListener("click", () => setMode("ai"));
modeColorBtn.addEventListener("click", () => setMode("color"));

pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => { if (e.target.files?.length) handleFiles(e.target.files); });

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "dragleave" && dropzone.contains(e.relatedTarget)) return; dropzone.classList.remove("drag"); }));
dropzone.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files); });
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  if (e.target.closest("#dropzone")) return;
  e.preventDefault();
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});

// 단색 컨트롤
toleranceInput.addEventListener("input", () => { toleranceVal.textContent = toleranceInput.value; applyChroma(false); });
toleranceInput.addEventListener("change", () => applyChroma(true));
autoDetectBtn.addEventListener("click", () => { if (colorState) { colorState.key = detectCornerColor(colorState.imgData); syncKeyUI(); applyChroma(true); } });
origImg.addEventListener("click", pickColorFromOriginal);

downloadBtn.addEventListener("click", () => { if (current) downloadBlob(current.blob, current.filename); });
resetBtn.addEventListener("click", reset);
clearHistoryBtn.addEventListener("click", clearHistory);

renderHistory();
