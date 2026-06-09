# Turn City 인트라넷 봇

## 설치 및 실행

```bash
npm install
cp .env.example .env
# .env 값 채우기
node deploy-commands.js  # 최초 1회 슬래시 커맨드 등록
npm start
```

## Railway 배포

1. Railway → New Project → Deploy from GitHub
2. 환경변수 설정 (`.env.example` 참고)
3. Start Command: `node index.js`

## 슬래시 커맨드

| 커맨드 | 권한 | 설명 |
|--------|------|------|
| `/인트라넷코드 발급 @유저 팩션명` | 관리자 | 코드 생성 + DM 발송 |
| `/인트라넷코드 취소 @유저` | 관리자 | 미사용 코드 삭제 |
| `/인트라넷코드 목록` | 관리자 | 활성 코드 조회 |
