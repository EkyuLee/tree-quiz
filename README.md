# 조경기능사 수목감별 학습 PWA

조경기능사 실기 **수목감별**(공식 120 표준수종) 대비용 무료·비상업 웹 앱입니다.
사진을 보고 수종을 맞히는 인출 연습과 간격 반복(FSRS)으로, 이 앱만으로 수목감별을 대비할 수
있도록 설계했습니다. 백엔드·로그인이 없고 학습 기록은 브라우저(IndexedDB)에 저장되며, PWA로
오프라인에서도 동작합니다.

## 모드

- **오늘의 학습**: FSRS가 오늘 볼 복습/새 카드를 배정. 객관식 인출 연습.
- **실전 모의고사**: 공개문제 형식(기본 20문항)으로 이름을 직접 입력해 채점. 문항당 시간 조절 가능.
- **약점 집중**: 많이 틀린 수종과 자주 헷갈린 쌍을 한 세션에 섞어 교차 학습.
- **도감**: 과·상록/낙엽·부위·이름으로 거르고 상세 정보(형태·구분 포인트·출처) 열람.
- **대시보드**: 수종별 숙달도, 학습 범위, 합격 가능성(FSRS 회상률 기반 추정), 연속 학습일,
  학습 기록 JSON 내보내기/가져오기.

## 개발

```bash
npm install
npm run dev          # 개발 서버
npm run test:run     # 단위 테스트(vitest)
npm run lint         # eslint
npm run build        # 타입체크 + 프로덕션 빌드
npm run data:validate  # 데이터 검증(공식목록 대조/라이선스/사진 수)
```

### 사진 데이터 수집(파이프라인)

```bash
# 공개 API(iNaturalist, Wikimedia Commons, GBIF)만 사용. 수종당 최대 8장.
CONTACT_EMAIL="you@example.org" npm run data:fetch
# 옵션: ONLY=sonamu,gomsol  LIMIT=8  RATE_MS=1200  DRY=1
```

- 다시 실행해도 결과가 같고(idempotent), 중간에 끊겨도 `scripts/.cache`와 기존 WebP를 이용해
  이어서 받습니다.
- 허용 라이선스(CC0/CC BY/CC BY-SA/CC BY-NC/CC BY-NC-SA)만 저장하고, ND 계열·저작권 전부
  보유 사진은 제외합니다.
- `nature.go.kr`의 사진·텍스트·데이터는 사용하지 않습니다.

## 배포 (운영비 0원)

### GitHub Pages
- `.github/workflows/deploy.yml`가 `main` 푸시 시 자동 빌드·배포합니다.
- 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정하세요.
- 하위 경로(`/<저장소명>/`)로 서비스되므로 워크플로가 `BASE_PATH`를 저장소명으로 넣습니다.

### Cloudflare Pages
- 빌드 명령: `npm run build`, 출력 디렉터리: `dist`.
- 루트(`/`)로 서비스되면 `BASE_PATH`는 비워 둡니다(기본값 `/`).
- 무료 플랜 한도(파일당 25MB, 2만 개)를 넘지 않도록 사진은 WebP로 압축(긴 변 800px)합니다.

## 라이선스 / 주의

- **비상업 전용**: NC(비상업) 라이선스 사진이 포함되어 있어 이 서비스는 비상업 목적으로만
  운영합니다.
- 수종 설명 텍스트는 시험 대비용으로 직접 작성했습니다(위키백과 등 원문 복제 아님). 일부 항목은
  사람 검수가 필요하며 도감의 "검수 필요" 표시와 `data/species.json`의 `review` 필드로
  표시했습니다.
- 사진마다 작성자·라이선스·원본 링크를 화면과 "출처" 페이지에 표시합니다.
- 수종 목록 출처: Q-net 공개문제 "2020년 조경기능사 수목감별 표준수종 목록"(120종).
