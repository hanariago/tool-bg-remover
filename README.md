# 배경 제거 (Background Remover)

이미지를 업로드하면 **브라우저에서 바로** 배경을 제거합니다. 서버로 이미지를 보내지 않습니다.

🔗 **바로 쓰기**: https://hanariago.github.io/tool-bg-remover

![green](https://img.shields.io/badge/100%25-browser-3D6B5E) ![license](https://img.shields.io/badge/license-AGPL--3.0-3D6B5E)

## 기능
- **두 가지 제거 방식**
  - ✨ **AI 자동** — 로컬 AI 모델로 아무 사진이나 (인물·사물·복잡한 배경). remove.bg 수준 품질.
  - 🎨 **단색 배경** — 크로마키 방식. 모델 다운로드 0, 즉시 처리. 단색 배경에 적합하고 강도 조절·배경색 스포이드 지원.
- 이미지 업로드 (파일 선택 / 드래그앤드롭 / 여러 장 한 번에)
- 업로드 즉시 배경 자동 제거
- 원본 / 결과(투명 배경) 나란히 비교
- **PNG 원본 해상도 다운로드 (무제한, 무료)**
- 이미지 외부 전송 없음 — 완전 로컬 처리
- 최근 작업 10개 로컬 보관(IndexedDB) → 새로고침 후에도 다시 다운로드
- 모바일 지원
- **다국어 지원** (한국어·English·日本語·中文·Español, 브라우저 언어 자동 감지 + `?lang=`)
- SEO/AEO 최적화 (OG·Twitter 카드, JSON-LD, `robots.txt`·`sitemap.xml`·`llms.txt`)

## 사용법
1. 이미지를 업로드하거나 드래그앤드롭
2. 자동으로 배경 제거 실행 (첫 실행 시 AI 모델 다운로드로 수초 소요)
3. 결과 확인 후 **PNG 다운로드**

## 기술 스택
- 순수 HTML / CSS / JS (빌드 도구 없음)
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) — AGPL License
- AI 모델·WASM은 jsDelivr CDN에서 1회 다운로드 후 브라우저 캐시
- 서버 없음, 브라우저에서만 동작 (GitHub Pages 정적 호스팅)

## 프라이버시
이미지는 브라우저 메모리 안에서만 처리됩니다. 어떤 서버로도 업로드되지 않으며,
히스토리는 사용자의 기기(IndexedDB)에만 저장됩니다. "전체 삭제"로 언제든 지울 수 있습니다.

## 로컬 실행
CDN 모듈 로딩 때문에 `file://` 직접 열기 대신 로컬 서버로 실행하세요.

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## 라이선스
이 프로젝트는 **AGPL-3.0** 라이선스 하에 배포됩니다 (사용 라이브러리 라이선스 준수).
소스코드: https://github.com/hanariago/tool-bg-remover

---
Made by [Lena](https://github.com/hanariago)
