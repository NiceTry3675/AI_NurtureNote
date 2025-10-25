# AI NurtureNote

AI 기반 육아 일기(Parenting Diary)와 분석 도우미입니다. FastAPI 백엔드와 React 프런트엔드를 사용하며, OpenAI Assistants API를 통해 최근 기록을 요약하고 관찰/조언을 생성합니다.

## 주요 기능
- 일기 기록 저장: 감정과 자유 기록을 저장 (SQLite 또는 Postgres)
- 일기 목록 보기: 저장된 일기와 AI 분석 결과를 한눈에 확인
- 기간 분석: 최근 N일 기록을 요약하고 관찰/조언/근거/인용을 반환
- 백그라운드 AI 분석: 기록 저장은 즉시 완료되고, 분석이 완료되면 자동으로 일기에 반영
- OpenAI Assistants API 연동: 파일 검색(Vector Store) 리소스 사용 가능
- 로깅: JSON 라인 형태 로그 및 모델 응답 보관

## 폴더 구조
- `app/` — FastAPI 백엔드 (엔드포인트, DB, OpenAI 연동)
- `frontend/` — React UI (CRA 기반)
- `logs/` — 애플리케이션 로그 및 모델 응답 JSON 보관
- `entries.db` — 기본 SQLite DB 파일 (개발 기본값)
- `.env` — 환경 변수 파일 (비공개 키 저장; 커밋 금지)
- `requirements.txt` — 백엔드 파이썬 의존성 목록

## 빠른 시작
### 1) 백엔드 (FastAPI)
필수 사전 준비: Python 3.10+ 권장

```bash
# 1) 가상환경 생성 및 활성화
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2) 의존성 설치
pip install -r requirements.txt

# 3) 환경 변수 설정 (.env 파일 생성 권장)
# 아래 "환경 변수" 섹션 참고

# 4) 개발 서버 실행 (자동으로 DB 테이블 초기화)
uvicorn app.main:app --reload --port 8000
# 브라우저에서 문서 확인: http://127.0.0.1:8000/docs
```

CLI 헬퍼(선택):
```bash
# 최근 기록 나열 및 DB 초기화 확인
python -m app.main --list

# 기간 분석 실행 (기본 14일)
python -m app.main --analyze --range 14 --question "최근 패턴과 개선 팁?"

# 실행 중인 서버로 데모 기록 1건 전송
python -m app.main --demo-entry --server http://127.0.0.1:8000
```

### 2) 프런트엔드 (React)
필수 사전 준비: Node.js (LTS 권장)

```bash
cd frontend
npm install
npm start
# http://localhost:3000 접속
```

현재 기본 UI 스켈레톤이 포함되어 있으며, 백엔드 API 연동은 추후 확장할 수 있습니다.

프런트엔드-백엔드 연동(개발):
- CRA 개발 서버에서 CORS 없이 호출되도록 `frontend/package.json` 에 `proxy: "http://localhost:8000"`가 설정되어 있습니다.
- 프로덕션 배포 시에는 프런트엔드 환경변수 `REACT_APP_API_BASE`를 백엔드 Origin으로 설정하세요(예: `https://api.example.com`). 설정이 없으면 상대경로로 호출합니다.
- 일기 작성 화면에서 저장하면 즉시 완료되고, AI 분석은 백그라운드에서 처리되어 목록 화면에 자동 반영됩니다.
- 목록 화면은 분석이 완료되지 않은 일기에 대해 5초 간격으로 자동 새로고침을 수행합니다.

## 환경 변수
`.env` 파일(루트)에 아래 값을 설정하세요. 비밀 키는 절대 커밋하지 마세요.

필수
```env
OPENAI_API_KEY=sk-...             # OpenAI API 키
```

선택
```env
OPENAI_API_BASE=https://api.openai.com/v1  # OpenAI API Base (프록시/Azure 사용 시 변경)
OPENAI_MODEL=gpt-5                         # 사용할 모델명 (기본값 gpt-5)
VECTOR_STORE_ID=vs_xxx                     # Assistants 파일 검색용 Vector Store ID
OPENAI_ASSISTANT_ID=asst_xxx               # 기존 Assistant 재사용 시 지정(없으면 자동 생성 후 캐시)
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # Postgres 사용 시
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000  # 추가 허용 Origin (쉼표 구분)
REACT_APP_API_BASE=https://your-api-host     # (프런트) 프로덕션에서 사용
```

비고
- 기본 DB는 SQLite(`entries.db`)이며, `DATABASE_URL`을 설정하면 Postgres로 전환됩니다.
- OpenAI SDK는 Assistants 베타 엔드포인트를 사용합니다. `openai>=1.51.0` 필요.
- 일부 프록시 환경 변수는 안전을 위해 무시됩니다(`OPENAI_*`, `HTTP(S)_PROXY`, `ALL_PROXY` 등).

## API 개요
기본 URL: `http://127.0.0.1:8000`

- POST `/entries` — 일기 1건 저장 + 단건 분석(가능 시)
  요청 예시
  ```json
  {
    "mood": "피곤하지만 뿌듯",
    "body": "아침에 함께 산책하고 낮잠 전 자장가를 불러줌"
  }
  ```

- GET `/entries` — 최근 일기 목록 조회 (기본 20건)

- POST `/analyze` — 최근 N일 분석 요약
  요청 예시
  ```json
  {
    "range_days": 14,
    "question": "수면 패턴 개선에 도움이 될 팁?"
  }
  ```

상세 스키마는 Swagger UI(`/docs`)에서 확인하세요.

## 로그와 데이터
- 애플리케이션 로그: `logs/app.log` (JSON 라인 포맷)
- 모델 응답 보관: `logs/responses/*.json` (요청/응답 및 메타데이터)
- 로컬 개발 DB: `entries.db` (SQLite)

## Docker & Railway 배포

백엔드 FastAPI 서버는 단일 컨테이너로 실행할 수 있도록 `Dockerfile`이 준비되어 있습니다. Railway에 업로드하면 자동으로 `PORT` 환경 변수를 주입하므로 별도 설정이 필요 없습니다.

### 로컬에서 이미지 빌드/실행

```bash
# 1) 이미지 빌드
docker build -t ai-nurturenote .

# 2) 컨테이너 실행 (호스트 8000 → 컨테이너 ${PORT:-8000})
docker run --rm -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  ai-nurturenote
# http://localhost:8000/docs
```

### Railway 배포 팁

- Railway 프로젝트 생성 후 **Deploy from GitHub** → 이 저장소 선택 → 기본 `Dockerfile` 사용.
- 환경 변수:
  - `OPENAI_API_KEY` (필수)
  - 필요 시 `OPENAI_MODEL`, `VECTOR_STORE_ID`, `DATABASE_URL`, `CORS_ORIGINS` 등.
- Postgres를 함께 사용하려면 Railway Postgres 애드온을 추가하고 연결 정보를 `DATABASE_URL`로 주입하세요.
- 컨테이너 내 기본 커맨드는 `uvicorn app.main:app --host 0.0.0.0 --port ${PORT}` 입니다.

프런트엔드는 별도 정적 호스팅(예: Vercel, Netlify) 또는 Railway의 또 다른 서비스로 배포한 뒤 `REACT_APP_API_BASE`를 백엔드 도메인으로 지정하면 됩니다.

## 트러블슈팅
- 401/403 등 OpenAI 오류: `OPENAI_API_KEY`, `OPENAI_API_BASE` 확인
- 모델/어시스턴트 관련 오류: OpenAI SDK 버전(`openai>=1.51.0`), `OPENAI_MODEL`, `OPENAI_ASSISTANT_ID` 확인
- DB 연결 오류: `DATABASE_URL` 형식/접근성 확인 (Postgres 사용 시), 또는 `entries.db` 쓰기 권한 확인

## 주의사항
- 본 서비스는 의료 진단이나 전문 상담이 아닌 일반 정보 제공을 목적으로 합니다.
- 비밀 키(.env)는 소스 저장소에 절대 커밋하지 마세요.
