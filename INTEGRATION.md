# 촉각 블랙잭 (Tactile Blackjack) — Tactile Worlds 연동 가이드

시각장애인(웹 + DotPad 촉각 디스플레이)과 비장애인(웹)이 **같은 방에서 함께** 즐기는 블랙잭 게임.
빌드 결과물이 순수 HTML/CSS/JS(정적 웹앱)라 별도 서버 없이 어느 웹 호스팅에도 올릴 수 있습니다.

---

## 0. 가장 쉽게 — 라이브 링크 그대로 쓰기

GitHub Pages를 켜면(README의 “GitHub Pages 켜기” 참고) push만 해도 자동 빌드·배포되어 아래 주소에서 바로 플레이됩니다:

```
https://baekjunjoo.github.io/tactile-blackjack/
```

Tactile Worlds 페이지에는 이 주소를 iframe으로 넣거나(아래 2번), 링크로 연결하면 됩니다.

---

## 1. 직접 호스팅 (dist 업로드)

자체 서버에 올리려면 빌드 후 `dist/` 폴더만 올리면 됩니다.

```bash
npm install
npm run build     # prebuild가 이미지 16종을 자동 다운로드 후 dist/ 생성
# 생성된 dist/ 내용을 웹 서버(또는 Tactile Worlds 정적 호스팅)에 업로드
```

- 모든 경로가 **상대 경로**(`./assets/...`)라 최상위 도메인이든 하위 경로(`/games/blackjack/`)든 그대로 동작.
- 서버 리라이트 규칙 불필요(단일 진입점).

> **로컬 미리보기**: `index.html`을 `file://`로 직접 열면 ES 모듈 정책상 동작하지 않습니다. 간단 서버로 열어주세요:
> ```bash
> npm run preview        # 빌드 결과를 미리보기
> # 또는  cd dist && python3 -m http.server 8080
> ```

---

## 2. Tactile Worlds에 임베드 (iframe)

기존 페이지 안에 넣으려면 iframe 한 줄이면 됩니다. `embed-example.html`에 동작 예시가 있습니다.

```html
<iframe
  src="https://baekjunjoo.github.io/tactile-blackjack/"
  title="촉각 블랙잭"
  style="width:100%;height:100vh;border:0;"
  allow="bluetooth; autoplay"
  allowfullscreen></iframe>
```

- `allow="bluetooth"` — DotPad 연결(Web Bluetooth)이 iframe 안에서 동작하려면 **반드시** 필요.
- 음성 안내(TTS)·효과음이 있으므로 `autoplay`도 허용 권장.
- iframe은 상위 페이지 스크린리더 흐름과 분리되니 `title`을 꼭 넣어주세요.
- 전체 화면(새 탭) 링크를 함께 제공하면 스크린리더 사용자 경험이 더 좋습니다.

---

## 3. 이미지 처리

이미지 16종(아바타·테이블 배경 등)은 용량이 커서 git에 커밋하지 않고(`.gitignore`), **빌드 시 자동 다운로드**됩니다(`npm run build`의 prebuild 단계, 또는 CI). 따라서:

- **GitHub Pages/CI 배포** → 배포된 사이트에 이미지 포함됨.
- **직접 빌드** → `npm run build`가 이미지를 받아 `dist/img/`에 포함.
- 만약 빌드 시점에 이미지 다운로드가 실패해도, 게임은 런타임에 CDN에서 자동으로 불러오고 카드·닷패드 화면은 코드로 그려 정상 동작합니다.

> 완전 오프라인/고정 번들이 필요하면 `npm run assets`로 이미지를 미리 받아 `public/img/`에 둘 수 있습니다.

---

## 4. 동작 요구사항

| 항목 | 내용 |
|---|---|
| 브라우저 | 최신 Chrome / Edge 권장. **DotPad 연결(Web Bluetooth)은 Chrome·Edge 데스크톱에서만** 지원. iOS Safari·Firefox는 미지원(단, 음성+화면 플레이는 모든 최신 브라우저에서 가능) |
| DotPad | 60×40 촉각 + 20셀 텍스트라인 모델. 공식 `DotPadSDK-3.0.0.js` 포함. 기기 없이 음성만으로도 완전 플레이 가능 |
| 온라인 멀티플레이 | Supabase Realtime 사용(아래 5번). 연결 실패 시 “같은 컴퓨터 데모 모드”로 자동 전환 |
| 오프라인/혼자 | 연습 모드·하이·로우는 서버 없이 동작 |

---

## 5. 설정 (Supabase / 멀티플레이)

온라인 방(초대 코드로 원격 참여)은 Supabase Realtime 채널을 씁니다. 기본 프로젝트 설정이 `src/config.js`에 포함되어 **그대로도 동작**합니다(anon 공개 키만 사용, 서버 비밀값 없음).

자체 Supabase 프로젝트로 바꾸려면 `src/config.js`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`만 교체 후 다시 빌드하세요. Realtime만 쓰므로 별도 테이블·스키마는 필요 없습니다.

> 학교/기관 방화벽에서 Supabase(WebSocket)가 막힐 경우 원격 방이 안 될 수 있습니다. 이 경우 “같은 컴퓨터 데모 모드”로 자동 전환되며, 원격 참여가 필요하면 네트워크 허용 목록에 Supabase 도메인 추가가 필요합니다.

---

## 6. 접근성 체크리스트 (담당자 확인용)

- [ ] 키보드만으로 처음부터 끝까지 플레이 가능(1~4=F1~F4, ←/→=팬, 5~0=이모트)
- [ ] 스크린리더(NVDA/VoiceOver)로 진행 상황이 음성으로 안내됨(aria-live 로그)
- [ ] 모든 조작 버튼에 레이블이 있고 화면 버튼으로도 동일 조작 가능
- [ ] DotPad 미연결/미지원 브라우저에서도 음성+화면으로 완전 플레이
- [ ] 로비 “게임 방법” 버튼으로 규칙·조작을 음성/텍스트로 안내
- [ ] 색상 외 정보 전달(형태·텍스트 병기), 메인 컴러 #ea5414

---

## 7. 저장소 구조

```
├─ index.html / package.json / vite.config.js
├─ src/            앱 소스 (React + Vite)
│   ├─ game/       순수 게임 로직 (블랙잭·테이블·하이로우)
│   ├─ net/        멀티플레이 (Supabase Realtime + 재접속·호스트승계)
│   ├─ dotpad/     DotPad BLE·프레임·점자 인코딩
│   └─ ui/         화면(로비·방·솔로·하이로우)
├─ public/         DotPad SDK (빌드 시 img/ 자동 생성)
├─ scripts/        fetch-assets.mjs (이미지 다운로드)
├─ test/           테스트 154개 (npm test)
├─ embed-example.html
└─ .github/workflows/deploy.yml   (Pages 자동 배포)
```

## 8. 검증

```bash
npm install && npm test   # 테스트 154개 (규칙·인슈어런스·하이로우·멀티 동기·DotPad BLE 계약·회귀)
```
