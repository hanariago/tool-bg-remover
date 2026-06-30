// 배경 제거 — 100% 브라우저 처리. 이미지는 어디로도 전송되지 않습니다.
//   1) AI 자동  : @imgly/background-removal (AGPL). 로컬 모델, 아무 사진이나.
//   2) 단색 배경 : 크로마키. 모델 다운로드 없이 즉시. 단색 배경에만 적합.
// 라이브러리·모델·wasm은 외부 CDN이 아니라 이 repo(vendor/)에서 자가호스팅 → 공급망 위험 제거.
// vendor/는 `npm run vendor`(scripts/vendor.mjs)로 생성. 버전 업그레이드 방법도 그 스크립트 참고.

import { removeBackground } from "./vendor/background-removal.mjs";

// 자가호스팅: 라이브러리·모델·wasm 모두 같은 도메인(이 repo)에서 로드. 외부 CDN 없음.
const PUBLIC_PATH = new URL("vendor/imgly-data/", document.baseURI).href;
const AI_CONFIG = { model: "isnet_fp16", publicPath: PUBLIC_PATH };
const HISTORY_LIMIT = 10;
const SUPPORTED = ["ko", "en", "ja", "zh", "es"];

// ── i18n ──
const I18N = {
  ko: {
    lang_label: "언어",
    brand_h1: "배경 제거", brand_sub: "업로드하면 브라우저에서 바로 배경을 지웁니다",
    badge_noserver: "서버 전송 없음", badge_unlimited: "무제한 · 무료", badge_res: "원본 해상도",
    mode_ai: "AI 자동", mode_ai_sub: "아무 사진이나", mode_color: "단색 배경", mode_color_sub: "즉시 · 다운로드 0",
    dz_title: "이미지를 끌어다 놓거나", pick: "파일 선택", dz_hint: "JPG · PNG · WEBP · 여러 장 가능",
    first_run: "💡 처음 실행할 땐 AI 모델(약 40MB)을 한 번 내려받느라 몇 초~수십 초 걸릴 수 있어요. 이후엔 빨라집니다.",
    download: "PNG 다운로드", reset: "새 이미지",
    cap_original: "원본", cap_result: "결과", cap_result_sub: "(투명 배경)",
    cc_bgcolor: "배경색", cc_hint: "원본 사진에서 지울 배경을 클릭해 색을 고르세요", cc_auto: "모서리 자동 감지", cc_strength: "강도",
    hist_title: "최근 작업", hist_note: "이 기기에만 저장돼요. 최근 10개까지 보관하고, 클릭하면 다시 다운로드할 수 있어요.", hist_clear: "전체 삭제",
    about_title: "이미지 배경 제거, 어떻게 동작하나요?",
    about_body: "이 무료 온라인 도구는 사진의 배경을 지워 투명 PNG로 만들어 줍니다. 모든 처리는 여러분의 브라우저 안에서 이루어지며, 이미지는 어떤 서버로도 전송되지 않습니다. AI 자동 모드는 인물·제품·복잡한 배경 등 어떤 사진이든 처리하고, 단색 배경 모드는 모델 다운로드 없이 즉시 단색 배경을 제거합니다. 결과는 원본 해상도 그대로, 횟수 제한 없이 무료로 내려받을 수 있습니다.",
    lic_title: "오픈소스 · AGPL-3.0 라이선스", lic_body: "이 도구는 자유 소프트웨어입니다. 누구나 소스 코드를 보고, 사용하고, 수정하고, 재배포할 수 있습니다.",
    footer_source: "소스 코드 (GitHub)", footer_privacy: "이미지는 서버로 전송되지 않고 브라우저에서만 처리됩니다.", made_by: "만든 사람", hub_link: "다른 도구 모음",
    guide_title: "배경 제거에 오신 걸 환영해요", guide_lead: "이미지를 올리면 브라우저에서 바로 배경을 지워 투명 PNG로 만들어 드려요.",
    guide_p1: "✨ AI 자동 — 인물·상품·복잡한 배경 등 아무 사진이나", guide_p2: "🎨 단색 배경 — 단색 배경을 모델 다운로드 없이 즉시",
    guide_p3: "⬇ 원본 해상도로 무제한·무료 다운로드 · 이미지는 서버로 전송되지 않아요",
    guide_dont_today: "오늘 다시 보지 않기", guide_close: "닫기", guide_aria_close: "닫기",
    about_use: "프로필 사진과 상품 사진의 누끼를 따거나, 투명 배경 PNG를 만들거나, 쇼핑몰·블로그·유튜브 썸네일용 이미지를 손쉽게 만들 수 있습니다. 사진 배경 지우기, 누끼 따기가 클릭 몇 번으로 끝납니다.",
    faq_title: "자주 묻는 질문",
    faq_q1: "사진이 서버로 업로드되나요?", faq_a1: "아니요. 모든 처리는 여러분의 브라우저 안에서만 이루어지며, 이미지는 어떤 서버로도 전송되지 않습니다.",
    faq_q2: "AI 자동 모드와 단색 모드의 차이는 무엇인가요?", faq_a2: "AI 자동 모드는 로컬 AI 모델로 인물·상품·복잡한 배경 등 어떤 사진이든 처리합니다(첫 실행 시 모델 1회 다운로드). 단색 모드는 모델 없이 즉시 동작하며, 배경이 단색일 때 가장 깔끔합니다.",
    faq_q3: "결과 이미지 형식은 무엇인가요?", faq_a3: "배경이 투명하게 처리된 PNG 파일로, 원본 해상도 그대로 저장됩니다.",
    faq_q4: "무료인가요? 사용 횟수 제한이 있나요?", faq_a4: "완전 무료이며 사용 횟수·해상도 제한이 없습니다. 로그인이나 워터마크도 없습니다.",
    faq_q5: "어떤 이미지에서 잘 되나요?", faq_a5: "인물, 상품, 로고처럼 피사체가 배경과 뚜렷이 구분될 때 가장 잘 됩니다. AI 모드는 복잡한 배경도 처리합니다.",
    meta_title: "배경 제거 - 무료 온라인 이미지 배경 제거 (투명 PNG) | Background Remover",
    meta_desc: "이미지 배경을 브라우저에서 바로 제거하는 무료 온라인 도구. 서버 업로드 없이 완전 로컬 처리, 원본 해상도 투명 PNG 무제한 다운로드. AI 자동 + 단색 배경 모드 지원.",
    og_locale: "ko_KR",
    pr_prep: "준비 중…", pr_model_prep: "AI 모델 준비 중… (첫 실행은 조금 걸려요)", pr_model_dl: "AI 모델 내려받는 중… {p}%",
    pr_removing: "배경 제거 중… {p}%", pr_done: "완료",
    transparent_png: "투명 PNG", mono: "단색",
    err_imageonly: "이미지 파일만 올릴 수 있어요 (JPG, PNG, WEBP 등).",
    err_fail: "배경 제거에 실패했어요: {msg}. 잠시 후 다시 시도하거나 다른 이미지를 올려보세요.",
    hist_card_title: "클릭하면 결과를 다시 봅니다", hist_dl_title: "다운로드", key_title: "현재 배경색",
  },
  en: {
    lang_label: "Language",
    brand_h1: "Background Remover", brand_sub: "Erase image backgrounds right in your browser",
    badge_noserver: "No server upload", badge_unlimited: "Unlimited · Free", badge_res: "Full resolution",
    mode_ai: "AI auto", mode_ai_sub: "any photo", mode_color: "Solid color", mode_color_sub: "instant · 0 download",
    dz_title: "Drag & drop an image, or", pick: "Choose file", dz_hint: "JPG · PNG · WEBP · multiple files OK",
    first_run: "💡 On first run the AI model (~40MB) downloads once, which can take a few seconds. It's fast after that.",
    download: "Download PNG", reset: "New image",
    cap_original: "Original", cap_result: "Result", cap_result_sub: "(transparent)",
    cc_bgcolor: "Background", cc_hint: "Click the background in the original photo to pick its color", cc_auto: "Auto-detect corners", cc_strength: "Strength",
    hist_title: "Recent", hist_note: "Saved on this device only. Keeps the last 10 — click to download again.", hist_clear: "Clear all",
    about_title: "How does background removal work?",
    about_body: "This free online tool erases the background from your photos and gives you a transparent PNG. Everything runs inside your browser — your images are never uploaded to any server. The AI auto mode handles any photo (people, products, complex backgrounds), while the solid-color mode removes plain backgrounds instantly with no model download. Download the result at full original resolution, unlimited and free.",
    lic_title: "Open source · AGPL-3.0", lic_body: "This is free software. Anyone may view, use, modify, and redistribute the source code.",
    footer_source: "Source code (GitHub)", footer_privacy: "Images are processed only in your browser and never sent to a server.", made_by: "Made by", hub_link: "More tools",
    guide_title: "Welcome to Background Remover", guide_lead: "Upload an image and we'll erase its background right in your browser, giving you a transparent PNG.",
    guide_p1: "✨ AI auto — any photo (people, products, complex backgrounds)", guide_p2: "🎨 Solid color — remove plain backgrounds instantly, no model download",
    guide_p3: "⬇ Unlimited free downloads at full resolution · images never leave your browser",
    guide_dont_today: "Don't show again today", guide_close: "Got it", guide_aria_close: "Close",
    about_use: "Cut out profile pictures and product photos, create transparent-background PNGs, or prep images for shop listings, blogs, and YouTube thumbnails — removing a photo background takes just a couple of clicks.",
    faq_title: "FAQ",
    faq_q1: "Are my photos uploaded to a server?", faq_a1: "No. All processing happens entirely in your browser — your images are never sent to any server.",
    faq_q2: "What's the difference between AI auto mode and solid-color mode?", faq_a2: "AI auto mode uses a local AI model to handle any photo (people, products, complex backgrounds); the model downloads once on first use. Solid-color mode works instantly with no model and is cleanest when the background is a single solid color.",
    faq_q3: "What format is the result?", faq_a3: "A PNG with a transparent background, saved at the original resolution.",
    faq_q4: "Is it free? Is there a usage limit?", faq_a4: "It's completely free with no usage or resolution limits — no login and no watermark.",
    faq_q5: "What images work best?", faq_a5: "It works best when the subject stands out clearly from the background, like people, products, or logos. AI mode also handles complex backgrounds.",
    meta_title: "Background Remover - Free Online Image Background Removal (Transparent PNG)",
    meta_desc: "Free online tool to remove image backgrounds right in your browser. No server upload — fully local. Unlimited full-resolution transparent PNG downloads. AI auto + solid-color modes.",
    og_locale: "en_US",
    pr_prep: "Preparing…", pr_model_prep: "Preparing AI model… (first run takes a moment)", pr_model_dl: "Downloading AI model… {p}%",
    pr_removing: "Removing background… {p}%", pr_done: "Done",
    transparent_png: "Transparent PNG", mono: "solid",
    err_imageonly: "Only image files are supported (JPG, PNG, WEBP, etc.).",
    err_fail: "Background removal failed: {msg}. Please try again or use another image.",
    hist_card_title: "Click to view the result again", hist_dl_title: "Download", key_title: "Current background color",
  },
  ja: {
    lang_label: "言語",
    brand_h1: "背景除去", brand_sub: "アップロードするとブラウザで背景をすぐ消します",
    badge_noserver: "サーバー送信なし", badge_unlimited: "無制限・無料", badge_res: "原寸解像度",
    mode_ai: "AI自動", mode_ai_sub: "どんな写真でも", mode_color: "単色背景", mode_color_sub: "即時・DL不要",
    dz_title: "画像をドラッグ＆ドロップ、または", pick: "ファイルを選択", dz_hint: "JPG・PNG・WEBP・複数可",
    first_run: "💡 初回はAIモデル（約40MB）を一度ダウンロードするため数秒〜数十秒かかることがあります。以降は高速です。",
    download: "PNGをダウンロード", reset: "新しい画像",
    cap_original: "元画像", cap_result: "結果", cap_result_sub: "(透過)",
    cc_bgcolor: "背景色", cc_hint: "元の写真で消したい背景をクリックして色を選択", cc_auto: "四隅から自動検出", cc_strength: "強さ",
    hist_title: "最近の作業", hist_note: "この端末にのみ保存。最新10件まで保持、クリックで再ダウンロード。", hist_clear: "すべて削除",
    about_title: "背景除去はどのように動作しますか？",
    about_body: "この無料オンラインツールは写真の背景を消して透過PNGにします。すべての処理はブラウザ内で行われ、画像がサーバーに送信されることはありません。AI自動モードは人物・商品・複雑な背景などあらゆる写真に対応し、単色背景モードはモデルのダウンロードなしで単色背景を即座に除去します。結果は原寸解像度のまま、回数制限なく無料でダウンロードできます。",
    lic_title: "オープンソース・AGPL-3.0", lic_body: "本ツールは自由ソフトウェアです。誰でもソースコードの閲覧・使用・改変・再配布ができます。",
    footer_source: "ソースコード (GitHub)", footer_privacy: "画像はサーバーに送信されず、ブラウザ内でのみ処理されます。", made_by: "制作", hub_link: "他のツール",
    guide_title: "背景除去へようこそ", guide_lead: "画像をアップロードすると、ブラウザ内で背景を消して透過PNGにします。",
    guide_p1: "✨ AI自動 — 人物・商品・複雑な背景などどんな写真でも", guide_p2: "🎨 単色背景 — 単色の背景をモデル不要で即座に",
    guide_p3: "⬇ 原寸解像度で無制限・無料ダウンロード・画像はブラウザ外に出ません",
    guide_dont_today: "今日は表示しない", guide_close: "閉じる", guide_aria_close: "閉じる",
    about_use: "プロフィール写真や商品写真の切り抜き、透過背景PNGの作成、ショップ・ブログ・YouTubeサムネイル用の画像づくりが数クリックで完了します。",
    faq_title: "よくある質問",
    faq_q1: "写真はサーバーにアップロードされますか？", faq_a1: "いいえ。すべての処理はブラウザ内だけで行われ、画像がサーバーに送信されることはありません。",
    faq_q2: "AI自動モードと単色モードの違いは？", faq_a2: "AI自動モードはローカルのAIモデルで人物・商品・複雑な背景などあらゆる写真に対応します（初回のみモデルを1回ダウンロード）。単色モードはモデル不要で即時に動作し、背景が単色のときに最もきれいに仕上がります。",
    faq_q3: "結果画像の形式は？", faq_a3: "背景が透過されたPNGで、元の解像度のまま保存されます。",
    faq_q4: "無料ですか？使用回数の制限はありますか？", faq_a4: "完全無料で、使用回数・解像度の制限はありません。ログインもウォーターマークもありません。",
    faq_q5: "どんな画像でうまくいきますか？", faq_a5: "人物・商品・ロゴのように被写体が背景とはっきり区別できるときに最適です。AIモードは複雑な背景にも対応します。",
    meta_title: "背景除去 - 無料オンライン画像背景除去（透過PNG）",
    meta_desc: "ブラウザで画像の背景をすぐ除去できる無料オンラインツール。サーバー送信なしの完全ローカル処理、原寸解像度の透過PNGを無制限ダウンロード。AI自動＋単色背景モード。",
    og_locale: "ja_JP",
    pr_prep: "準備中…", pr_model_prep: "AIモデルを準備中…（初回は少し時間がかかります）", pr_model_dl: "AIモデルをダウンロード中… {p}%",
    pr_removing: "背景を除去中… {p}%", pr_done: "完了",
    transparent_png: "透過PNG", mono: "単色",
    err_imageonly: "画像ファイルのみ対応しています（JPG, PNG, WEBP など）。",
    err_fail: "背景除去に失敗しました：{msg}。しばらくして再試行するか、別の画像をお試しください。",
    hist_card_title: "クリックで結果を再表示", hist_dl_title: "ダウンロード", key_title: "現在の背景色",
  },
  zh: {
    lang_label: "语言",
    brand_h1: "背景移除", brand_sub: "上传后在浏览器中即刻去除背景",
    badge_noserver: "不上传服务器", badge_unlimited: "无限制 · 免费", badge_res: "原始分辨率",
    mode_ai: "AI 自动", mode_ai_sub: "任意照片", mode_color: "纯色背景", mode_color_sub: "即时 · 免下载",
    dz_title: "拖放图片，或", pick: "选择文件", dz_hint: "JPG · PNG · WEBP · 支持多张",
    first_run: "💡 首次运行需下载一次 AI 模型（约 40MB），可能需要数秒到数十秒，之后会很快。",
    download: "下载 PNG", reset: "新图片",
    cap_original: "原图", cap_result: "结果", cap_result_sub: "(透明背景)",
    cc_bgcolor: "背景色", cc_hint: "在原图上点击要去除的背景以选取颜色", cc_auto: "四角自动识别", cc_strength: "强度",
    hist_title: "最近", hist_note: "仅保存在本设备。保留最近 10 个，点击可再次下载。", hist_clear: "全部清除",
    about_title: "背景移除是如何工作的？",
    about_body: "这个免费在线工具可以去除照片背景并生成透明 PNG。所有处理都在你的浏览器中完成，图片不会上传到任何服务器。AI 自动模式可处理人物、商品、复杂背景等任意照片；纯色背景模式无需下载模型即可即时去除纯色背景。结果以原始分辨率提供，可无限次免费下载。",
    lic_title: "开源 · AGPL-3.0 许可", lic_body: "本工具是自由软件。任何人都可以查看、使用、修改和再分发源代码。",
    footer_source: "源代码 (GitHub)", footer_privacy: "图片仅在浏览器中处理，绝不发送到服务器。", made_by: "制作", hub_link: "更多工具",
    guide_title: "欢迎使用背景移除", guide_lead: "上传图片，即可在浏览器中去除背景并生成透明 PNG。",
    guide_p1: "✨ AI 自动 — 人物、商品、复杂背景等任意照片", guide_p2: "🎨 纯色背景 — 无需下载模型，即时去除纯色背景",
    guide_p3: "⬇ 原始分辨率无限免费下载 · 图片不会离开你的浏览器",
    guide_dont_today: "今天不再显示", guide_close: "关闭", guide_aria_close: "关闭",
    about_use: "可用于抠出人像和商品照片、制作透明背景 PNG，或为网店、博客和 YouTube 缩略图准备图片——去除照片背景只需点击几下。",
    faq_title: "常见问题",
    faq_q1: "照片会上传到服务器吗？", faq_a1: "不会。所有处理都在你的浏览器中完成，图片绝不会发送到任何服务器。",
    faq_q2: "AI 自动模式和纯色模式有什么区别？", faq_a2: "AI 自动模式使用本地 AI 模型处理人物、商品、复杂背景等任意照片（首次使用时下载一次模型）。纯色模式无需模型即可即时运行，背景为单一纯色时效果最佳。",
    faq_q3: "结果图片是什么格式？", faq_a3: "背景透明的 PNG 文件，并以原始分辨率保存。",
    faq_q4: "免费吗？有使用次数限制吗？", faq_a4: "完全免费，没有使用次数或分辨率限制，也没有登录和水印。",
    faq_q5: "哪些图片效果最好？", faq_a5: "当主体与背景区分明显时效果最好，例如人物、商品或徽标。AI 模式也能处理复杂背景。",
    meta_title: "背景移除 - 免费在线图片去背景（透明 PNG）",
    meta_desc: "在浏览器中即刻去除图片背景的免费在线工具。不上传服务器、完全本地处理，无限下载原始分辨率透明 PNG。AI 自动 + 纯色背景模式。",
    og_locale: "zh_CN",
    pr_prep: "准备中…", pr_model_prep: "正在准备 AI 模型…（首次运行需稍候）", pr_model_dl: "正在下载 AI 模型… {p}%",
    pr_removing: "正在去除背景… {p}%", pr_done: "完成",
    transparent_png: "透明 PNG", mono: "纯色",
    err_imageonly: "仅支持图片文件（JPG、PNG、WEBP 等）。",
    err_fail: "背景移除失败：{msg}。请稍后重试或更换图片。",
    hist_card_title: "点击重新查看结果", hist_dl_title: "下载", key_title: "当前背景色",
  },
  es: {
    lang_label: "Idioma",
    brand_h1: "Quitar fondo", brand_sub: "Elimina el fondo de tus imágenes directamente en el navegador",
    badge_noserver: "Sin subir a servidor", badge_unlimited: "Ilimitado · Gratis", badge_res: "Resolución original",
    mode_ai: "IA automática", mode_ai_sub: "cualquier foto", mode_color: "Fondo sólido", mode_color_sub: "al instante · sin descarga",
    dz_title: "Arrastra y suelta una imagen, o", pick: "Elegir archivo", dz_hint: "JPG · PNG · WEBP · varias a la vez",
    first_run: "💡 En el primer uso se descarga una vez el modelo de IA (~40MB), lo que puede tardar unos segundos. Después es rápido.",
    download: "Descargar PNG", reset: "Nueva imagen",
    cap_original: "Original", cap_result: "Resultado", cap_result_sub: "(transparente)",
    cc_bgcolor: "Fondo", cc_hint: "Haz clic en el fondo de la foto original para elegir su color", cc_auto: "Detectar esquinas", cc_strength: "Intensidad",
    hist_title: "Recientes", hist_note: "Se guarda solo en este dispositivo. Conserva los últimos 10; haz clic para volver a descargar.", hist_clear: "Borrar todo",
    about_title: "¿Cómo funciona la eliminación de fondo?",
    about_body: "Esta herramienta en línea gratuita elimina el fondo de tus fotos y genera un PNG transparente. Todo el procesamiento ocurre dentro de tu navegador: tus imágenes nunca se suben a ningún servidor. El modo IA automática funciona con cualquier foto (personas, productos, fondos complejos), y el modo de fondo sólido elimina fondos planos al instante sin descargar ningún modelo. Descarga el resultado a resolución original, sin límites y gratis.",
    lic_title: "Código abierto · AGPL-3.0", lic_body: "Este es software libre. Cualquiera puede ver, usar, modificar y redistribuir el código fuente.",
    footer_source: "Código fuente (GitHub)", footer_privacy: "Las imágenes se procesan solo en tu navegador y nunca se envían a un servidor.", made_by: "Hecho por", hub_link: "Más herramientas",
    guide_title: "Te damos la bienvenida a Quitar fondo", guide_lead: "Sube una imagen y eliminaremos su fondo en tu navegador, dándote un PNG transparente.",
    guide_p1: "✨ IA automática — cualquier foto (personas, productos, fondos complejos)", guide_p2: "🎨 Fondo sólido — quita fondos planos al instante, sin descargar modelo",
    guide_p3: "⬇ Descargas gratis e ilimitadas a resolución original · las imágenes nunca salen de tu navegador",
    guide_dont_today: "No mostrar hoy de nuevo", guide_close: "Cerrar", guide_aria_close: "Cerrar",
    about_use: "Recorta fotos de perfil y de productos, crea PNG con fondo transparente o prepara imágenes para tiendas, blogs y miniaturas de YouTube: quitar el fondo de una foto toma solo un par de clics.",
    faq_title: "Preguntas frecuentes",
    faq_q1: "¿Mis fotos se suben a un servidor?", faq_a1: "No. Todo el procesamiento ocurre por completo en tu navegador; tus imágenes nunca se envían a ningún servidor.",
    faq_q2: "¿Cuál es la diferencia entre el modo IA automática y el modo de fondo sólido?", faq_a2: "El modo IA automática usa un modelo de IA local para cualquier foto (personas, productos, fondos complejos); el modelo se descarga una vez en el primer uso. El modo de fondo sólido funciona al instante sin modelo y queda mejor cuando el fondo es de un solo color.",
    faq_q3: "¿En qué formato queda el resultado?", faq_a3: "Un PNG con fondo transparente, guardado a la resolución original.",
    faq_q4: "¿Es gratis? ¿Hay límite de uso?", faq_a4: "Es totalmente gratis, sin límites de uso ni de resolución, sin inicio de sesión ni marca de agua.",
    faq_q5: "¿Con qué imágenes funciona mejor?", faq_a5: "Funciona mejor cuando el sujeto se distingue claramente del fondo, como personas, productos o logotipos. El modo IA también maneja fondos complejos.",
    meta_title: "Quitar fondo - Eliminar el fondo de imágenes online gratis (PNG transparente)",
    meta_desc: "Herramienta online gratuita para quitar el fondo de imágenes en el navegador. Sin subir a servidor, totalmente local. Descargas ilimitadas de PNG transparente a resolución original. Modos IA y fondo sólido.",
    og_locale: "es_ES",
    pr_prep: "Preparando…", pr_model_prep: "Preparando el modelo de IA… (el primer uso tarda un poco)", pr_model_dl: "Descargando el modelo de IA… {p}%",
    pr_removing: "Eliminando el fondo… {p}%", pr_done: "Listo",
    transparent_png: "PNG transparente", mono: "sólido",
    err_imageonly: "Solo se admiten archivos de imagen (JPG, PNG, WEBP, etc.).",
    err_fail: "No se pudo eliminar el fondo: {msg}. Inténtalo de nuevo o usa otra imagen.",
    hist_card_title: "Haz clic para ver el resultado de nuevo", hist_dl_title: "Descargar", key_title: "Color de fondo actual",
  },
};

// html lang / hreflang 태그용 (zh는 간체이므로 zh-Hans로 표기)
const LANG_TAG = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hans", es: "es" };

let lang = "ko";
function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.ko[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "")) : s;
}
function detectLang() {
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
  try { const saved = localStorage.getItem("bg_lang"); if (saved && SUPPORTED.includes(saved)) return saved; } catch (e) {}
  const nav = (navigator.language || "ko").toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  const hit = SUPPORTED.find((l) => nav.startsWith(l));
  return hit || "ko";
}
function setMeta(sel, content) {
  const el = document.querySelector(sel);
  if (el) el.setAttribute("content", content);
}
function applyI18n() {
  document.documentElement.lang = LANG_TAG[lang] || lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
  document.title = t("meta_title");
  setMeta('meta[name="description"]', t("meta_desc"));
  setMeta('meta[property="og:title"]', t("meta_title"));
  setMeta('meta[property="og:description"]', t("meta_desc"));
  setMeta('meta[property="og:locale"]', t("og_locale"));
  setMeta('meta[name="twitter:title"]', t("meta_title"));
  setMeta('meta[name="twitter:description"]', t("meta_desc"));
  origImg.alt = t("cap_original");
  resultImg.alt = t("cap_result");
  if (langSelect) langSelect.value = lang;
  if (guideX) guideX.setAttribute("aria-label", t("guide_aria_close"));
  if (colorState) syncKeyUI();
}
function setLang(next) {
  if (!SUPPORTED.includes(next)) return;
  lang = next;
  try { localStorage.setItem("bg_lang", next); } catch (e) {}
  try { const u = new URL(location.href); u.searchParams.set("lang", next); history.replaceState(null, "", u); } catch (e) {}
  applyI18n();
  renderHistory();
}

// ── DOM ──
const $ = (id) => document.getElementById(id);
const dropzone = $("dropzone");
const fileInput = $("fileInput");
const pickBtn = $("pickBtn");
const firstRunNote = $("firstRunNote");
const modeAiBtn = $("modeAi");
const modeColorBtn = $("modeColor");
const langSelect = $("langSelect");
const guideOverlay = $("guideOverlay");
const guideX = $("guideX");
const guideClose = $("guideClose");
const guideDont = $("guideDont");

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
let mode = "ai";
let current = null;
let lastFile = null;
let modelWarmed = false;
let busy = false;
const objectUrls = new Set();
let colorState = null;

// ── 유틸 ──
const trackUrl = (u) => { objectUrls.add(u); return u; };
const revokeAll = () => { objectUrls.forEach((u) => URL.revokeObjectURL(u)); objectUrls.clear(); };
const baseName = (n) => (n || "image").replace(/\.[^.]+$/, "");
const outName = (n) => `${baseName(n)}-bg-removed.png`;
const dimsMeta = (w, h, isColor) => `${w} × ${h}px · ${t("transparent_png")}${isColor ? ` · ${t("mono")}` : ""}`;

function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }
function setProgress(pct, label) {
  bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (label) progressLabel.textContent = label;
}
function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}
function canvasToBlob(canvas) { return new Promise((r) => canvas.toBlob(r, "image/png")); }

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
  if (lastFile) handleFiles([lastFile]);
}

function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) { showError(t("err_imageonly")); return; }
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
  stageMeta.textContent = t("pr_prep");
  setProgress(4, modelWarmed ? t("pr_prep") : t("pr_model_prep"));

  try {
    const blob = await removeBackground(file, {
      ...AI_CONFIG,
      progress: (key, cur, total) => {
        const pct = total ? Math.round((cur / total) * 100) : 0;
        if (key.startsWith("fetch")) setProgress(Math.max(8, pct * 0.7), t("pr_model_dl", { p: pct }));
        else if (key.startsWith("compute")) { modelWarmed = true; setProgress(70 + pct * 0.3, t("pr_removing", { p: pct })); }
      },
    });
    modelWarmed = true;
    setProgress(100, t("pr_done"));
    await showResult(blob, outName(file.name), origUrl, false);
  } catch (err) {
    console.error(err);
    progress.hidden = true;
    showError(t("err_fail", { msg: err?.message || err }));
  }
}

// ── 단색(크로마키) 모드 ──
async function processColor(files) {
  beginStage();
  progress.hidden = true;
  for (let i = 0; i < files.length - 1; i++) await autoColorToHistory(files[i]);

  const file = files[files.length - 1];
  lastFile = file;
  const url = trackUrl(URL.createObjectURL(file));
  const img = await loadImage(url);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
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
  await applyChroma(true);
}

function detectCornerColor(imgData) {
  const { data, width, height } = imgData;
  const pts = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  let r = 0, g = 0, b = 0;
  for (const [x, y] of pts) { const i = (y * width + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return { r: Math.round(r / 4), g: Math.round(g / 4), b: Math.round(b / 4) };
}

function syncKeyUI() {
  if (!colorState) return;
  const { r, g, b } = colorState.key;
  keySwatch.style.background = `rgb(${r},${g},${b})`;
  keySwatch.title = t("key_title");
}

async function applyChroma(save = false) {
  if (!colorState) return;
  const { imgData, w, h, key } = colorState;
  const tol = Number(toleranceInput.value);
  const feather = Math.max(8, tol * 0.4);
  const src = imgData.data;
  const out = new ImageData(w, h);
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const dr = src[i] - key.r, dg = src[i + 1] - key.g, db = src[i + 2] - key.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2];
    let a = src[i + 3];
    if (dist <= tol - feather) a = 0;
    else if (dist < tol) a = Math.round(a * ((dist - (tol - feather)) / feather));
    dst[i + 3] = a;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").putImageData(out, 0, 0);
  const blob = await canvasToBlob(canvas);

  if (current?.url) URL.revokeObjectURL(current.url);
  const url = URL.createObjectURL(blob);
  resultImg.src = url;
  const filename = outName(colorState.file.name);
  current = { blob, filename, url };
  downloadBtn.disabled = false;
  stageMeta.textContent = dimsMeta(w, h, true);

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
    const tol = Number(toleranceInput.value), feather = Math.max(8, tol * 0.4);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - key.r, dg = d[i + 1] - key.g, db = d[i + 2] - key.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist <= tol - feather) d[i + 3] = 0;
      else if (dist < tol) d[i + 3] = Math.round(d[i + 3] * ((dist - (tol - feather)) / feather));
    }
    ctx.putImageData(imgData, 0, 0);
    const blob = await canvasToBlob(canvas);
    const thumb = await makeThumb(url);
    await saveHistory({ name: outName(file.name), ts: Date.now(), origThumb: thumb, blob, w: canvas.width, h: canvas.height });
    URL.revokeObjectURL(url);
  } catch (e) { console.warn("color batch skipped:", e); }
}

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

// ── 결과 표시(AI) ──
async function showResult(blob, filename, origUrl, isColor) {
  const resultUrl = trackUrl(URL.createObjectURL(blob));
  resultImg.src = resultUrl;
  current = { blob, filename };
  progress.hidden = true;
  compare.hidden = false;
  downloadBtn.disabled = false;
  const dims = await imageDims(blob);
  stageMeta.textContent = dims ? dimsMeta(dims.w, dims.h, isColor) : t("transparent_png");
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
  stage.hidden = true; compare.hidden = true; progress.hidden = true; colorControls.hidden = true;
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
    const t2 = db.transaction("items", mode);
    const req = fn(t2.objectStore("items"));
    t2.oncomplete = () => resolve(req?.result);
    t2.onerror = () => reject(t2.error);
    t2.onabort = () => reject(t2.error);
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
  try { items = (await getAll(await openDB())).sort((a, b) => b.ts - a.ts); } catch (e) { console.warn(e); }
  histUrls.forEach((u) => URL.revokeObjectURL(u)); histUrls.clear();

  if (!items.length) { historySection.hidden = true; return; }
  historySection.hidden = false;
  historyCount.textContent = `(${items.length})`;
  historyGrid.innerHTML = "";

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "hist-card";
    card.title = t("hist_card_title");
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
    dl.className = "hist-dl"; dl.type = "button"; dl.textContent = "↓"; dl.title = t("hist_dl_title");
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
  stage.hidden = false; progress.hidden = true; colorControls.hidden = true; compare.hidden = false;
  colorState = null;
  origImg.classList.remove("pickable");
  origImg.src = it.origThumb || "";
  const url = trackUrl(URL.createObjectURL(it.blob));
  resultImg.src = url;
  stageName.textContent = it.name;
  stageMeta.textContent = it.w && it.h ? dimsMeta(it.w, it.h, false) : t("transparent_png");
  current = { blob: it.blob, filename: it.name };
  downloadBtn.disabled = false;
  stage.scrollIntoView({ behavior: "smooth", block: "start" });
}
async function clearHistory() {
  try { await tx(await openDB(), "readwrite", (s) => s.clear()); } catch (e) { console.warn(e); }
  await renderHistory();
}

// ── 이벤트 ──
modeAiBtn.addEventListener("click", () => setMode("ai"));
modeColorBtn.addEventListener("click", () => setMode("color"));
langSelect.addEventListener("change", (e) => setLang(e.target.value));

pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => { if (e.target.files?.length) handleFiles(e.target.files); });

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "dragleave" && dropzone.contains(e.relatedTarget)) return; dropzone.classList.remove("drag"); }));
dropzone.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files); });
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => { if (e.target.closest("#dropzone")) return; e.preventDefault(); if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files); });

toleranceInput.addEventListener("input", () => { toleranceVal.textContent = toleranceInput.value; applyChroma(false); });
toleranceInput.addEventListener("change", () => applyChroma(true));
autoDetectBtn.addEventListener("click", () => { if (colorState) { colorState.key = detectCornerColor(colorState.imgData); syncKeyUI(); applyChroma(true); } });
origImg.addEventListener("click", pickColorFromOriginal);

downloadBtn.addEventListener("click", () => { if (current) downloadBlob(current.blob, current.filename); });
resetBtn.addEventListener("click", reset);
clearHistoryBtn.addEventListener("click", clearHistory);

// ── 첫 방문 가이드 팝업 ──
const todayStr = () => new Date().toISOString().slice(0, 10);
function maybeShowGuide() {
  let hiddenDate = null;
  try { hiddenDate = localStorage.getItem("bg_guide_hidden_date"); } catch (e) {}
  if (hiddenDate === todayStr()) return; // '오늘 다시 보지 않기'를 누른 날이면 표시 안 함
  guideOverlay.hidden = false;
}
function closeGuide() {
  if (guideDont.checked) { try { localStorage.setItem("bg_guide_hidden_date", todayStr()); } catch (e) {} }
  guideOverlay.hidden = true;
}
guideX.addEventListener("click", closeGuide);
guideClose.addEventListener("click", closeGuide);
guideOverlay.addEventListener("click", (e) => { if (e.target === guideOverlay) closeGuide(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !guideOverlay.hidden) closeGuide(); });

// ── 시작 ──
lang = detectLang();
applyI18n();
renderHistory();
maybeShowGuide();
