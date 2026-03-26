# FEBC Live Platform MVP

FEBC 내부 보안 스트리밍 웹플랫폼의 로컬 개발용 모노레포입니다. OBS는 RTMP로 SRS에 송출하고, SRS는 HLS를 생성하며, Nginx가 웹과 API와 HLS를 한 도메인 아래에서 중계하는 구조입니다.

## 서비스 구성

- `frontend`: Next.js + TypeScript 사용자/관리자 웹 UI
- `backend`: NestJS + TypeScript 인증/정책/로그 API
- `postgres`: 서비스 데이터 저장소
- `redis`: 세션/캐시 저장소
- `nginx`: reverse proxy
- `srs`: RTMP 입력 + HLS 출력용 미디어 서버

## 주요 파일

- 루트 compose: [docker-compose.yml](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/docker-compose.yml)
- nginx 설정: [default.conf](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/infra/nginx/conf.d/default.conf)
- SRS 설정: [srs.conf](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/infra/srs/srs.conf)
- frontend Dockerfile: [Dockerfile](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/frontend/Dockerfile)
- backend Dockerfile: [Dockerfile](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/backend/Dockerfile)
- 루트 env 예시: [.env.example](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/.env.example)
- frontend env 예시: [.env.example](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/frontend/.env.example)
- backend env 예시: [.env.example](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/backend/.env.example)

## Reverse Proxy 동작

- `/api` -> `backend:4000`
- `/` -> `frontend:3000`
- `/hls` -> `srs:8080`

`/hls` 경로에는 TODO 주석을 남겨 두었습니다. 운영 환경에서는 `auth_request`, signed URL, 또는 backend 연동 검증으로 HLS 세그먼트 접근을 보호해야 합니다.

## SRS 동작

- OBS에서 RTMP 입력 수신
- SRS가 HLS 세그먼트와 `index.m3u8` 생성
- backend hook endpoint를 통해 publish / play / stop 이벤트 확장 가능

## Postgres 초기화

루트 `.env` 기준으로 다음 값이 사용됩니다.

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`

초기 SQL은 [001_extensions.sql](C:/Users/user/Desktop/한솔/9.%20Python/[극동방송]/4)%20febc_live/infra/postgres/init/001_extensions.sql)에서 `uuid-ossp` 확장을 생성합니다.

## 로컬 개발 실행 순서

1. 루트에서 환경변수 파일 생성

```powershell
Copy-Item .env.example .env
```

2. 필요하면 frontend / backend 예시 env도 참고

```powershell
Copy-Item .\frontend\.env.example .\frontend\.env.local
Copy-Item .\backend\.env.example .\backend\.env
```

3. 전체 스택 빌드 및 실행

```powershell
docker compose up --build
```

4. 로그 확인

```powershell
docker compose logs -f nginx
docker compose logs -f srs
docker compose logs -f backend
```

5. 종료

```powershell
docker compose down
```

## 개발 중 확인 포인트

- backend health: `http://localhost:4000/api/health`
- nginx 경유 웹: `http://localhost:8080`
- nginx 경유 API: `http://localhost:8080/api`
- nginx 경유 HLS: `http://localhost:8080/hls/live/main/index.m3u8`

## 인프라 TODO

- nginx `/hls` 보호 정책 추가
- backend와 SRS hook 서명 검증 연결
- Redis 기반 세션 강제 종료 처리
- 운영용 TLS / 도메인 / 보안 헤더 추가
- compose healthcheck 및 운영용 volume 전략 보강

## 포렌식 워터마크 운영 개념

FEBC 로고는 지사별로 겉보기에는 거의 동일하게 보이지만, 내부적으로는 `branch_code + profile_version` 기반 fingerprint profile을 가집니다.

- `visible watermark`: 운영자가 화면에서 직접 확인 가능한 로고 variant, 색상 tint, micro shift, session code
- `hidden forensic watermark`: v1에서는 메타데이터와 profile 구조만 저장
- `profile version`: 동일 지사라도 시간이 지나면서 로고 변형 규칙을 교체할 수 있도록 버전 관리
- `event assignment`: 특정 행사 / 송출 세션에 어떤 로고 profile이 배정되었는지 기록

현재 v1에서는 실제 고급 이미지 포렌식 생성보다 아래 구조를 먼저 반영했습니다.

- `branch_logo_fingerprint_profiles`
- `event_logo_assignments`
- session 단위 워터마크 payload 생성
- 관리자 UI에서 profile / assignment 조회
- 향후 유출 이미지 분석 모듈을 붙이기 위한 `LogoAnalysisService` 인터페이스

추후에는 캡처 이미지에서 로고의 미세 차이를 추출해 `identify branch from captured logo` 흐름으로 연결할 수 있습니다. 현재 해당 API는 placeholder 응답만 반환합니다.
