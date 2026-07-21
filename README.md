# 촉각 블랙잭 (Tactile Blackjack)

시각장애인(웹 + DotPad 촉각 디스플레이)과 비장애인(웹)이 **같은 방에서 함께** 즐기는 블랙잭 게임. Tactile Worlds 배포용.

## 몇 초 요약 (담당자용)
- **라이브 링크**: GitHub Pages가 켜지면 `https://baekjunjoo.github.io/tactile-blackjack/` 에서 바로 플레이 (아래 3번 참고).
- **임베드**: `<iframe src="…/index.html" allow="bluetooth" title="촉각 블랙잭">` — `embed-example.html` 참고.
- **자체 호스팅**: `npm install && npm run build` → 생성된 `dist/`를 웹 서버에 업로드 (이미지는 빌드 시 자동 다운로드).
- **자세한 안내**: [`INTEGRATION.md`](./INTEGRATION.md) (요구사항·Supabase·접근성 체크리스트).

## 빠른 시작 (개발/빌드)
```bash
npm install          # 의존성 설치
npm run dev          # 로캬 개발 서버
npm run build        # dist/ 생성 (prebuild이 이미지 자동 다운로드)
npm test             # 테스트 154개
```

## GitHub Pages 켜기 (최초 1회)
이 저장소에는 `.github/workflows/deploy.yml`이 포함되어 push 시 자동으로 빌드·배포합니다. 처음 한 번만:
1. 저장소 **Settings → Pages** 이동
2. **Build and deployment → Source** 를 **“GitHub Actions”** 로 설정
3. Actions 탭에서 배포 완료 후 `https://baekjunjoo.github.io/tactile-blackjack/` 접속

(Pages를 안 써도 `dist/`를 직접 원하는 호스팅에 올리면 됩니다.)

## 핵심 특징
- 음성(TTS) + 20셀 점자 텍스트라인 + 60×40 촉각 그래픽, 모든 조작 화면 버튼 중복
- 멀티 블랙잭(초대 코드), 하이·로우, 연습 모드 / 인슈어런스·스플릿·더블다운
- DotPad 없이 음성만으로도 완전 플레이 / iOS·Firefox는 DotPad 미지원(음성·화면은 가능)
- 메인 컴러 #ea5414

## 구조
```
├─ index.html / package.json / vite.config.js
├─ src/            앱 소스 (React + Vite)
│   ├─ game/       순수 게임 로직 (블랙잭·테이블·하이로우)
│   ├─ net/        멀티플레이 (Supabase Realtime + 재접속·호스트승계)
│   ├─ dotpad/     DotPad BLE·프레임·점자 인코딩
│   └─ ui/         화면(로비·방·솔로·하이로우)
├─ public/         DotPad SDK ( + 빌드 시 img/ 자동 생성)
├─ scripts/        fetch-assets.mjs (이미지 다운로드)
├─ test/           테스트 154개
├─ embed-example.html / INTEGRATION.md
└─ .github/workflows/deploy.yml   (Pages 자동 배포)
```
