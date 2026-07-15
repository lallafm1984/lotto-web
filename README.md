# 로또 인생 공개 사이트

Next.js App Router + Tailwind CSS 기반의 Vercel 배포용 웹사이트다. 배포 대상 서브도메인은 `https://lotto.4ltree.com`이다.

## 구성

- `/` — 랜딩 페이지
- `/privacy` — 개인정보처리방침
- `/terms` — 이용약관
- `/support` — 고객지원
- `/delete-account` — 계정 및 데이터 삭제 안내
- `/robots.txt`, `/sitemap.xml` — Next.js 메타데이터 라우트

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인한다. Vercel 배포 전에는 `npm run build`를 통과해야 한다.

## Vercel 배포와 도메인 연결

1. Vercel에서 이 `lotto-web` 폴더를 새 프로젝트의 Root Directory로 지정한다.
2. Framework Preset은 Next.js로 둔다. Build Command는 기본값 `next build`를 사용한다.
3. Vercel 프로젝트의 Domains에 `lotto.4ltree.com`을 추가한다.
4. Vercel이 안내하는 DNS 레코드를 4ltree.com DNS 관리 화면에 추가한다. 기존 `www` 레코드는 변경하지 않는다.
5. 인증서 발급 뒤 `https://lotto.4ltree.com/robots.txt`, `/sitemap.xml`, 모든 공개 문서 URL을 점검한다.
6. 확정 URL을 Godot 앱의 `privacy_policy_url`, `support_url`과 Play Console의 관련 필드에 입력한다.

## 출시 전 필수 갱신

- 현재 모든 페이지는 출시 준비 상태임을 명시한다.
- Supabase 리전·백업 보존 기간·Google 서비스 실제 설정을 개인정보처리방침에 확정한다.
- 익명 Supabase 계정·랭킹 기록을 정확히 식별하고 삭제하는 앱 내 기능과 실제 운영 절차를 구현·검증한다.
- 그 이후에만 `/delete-account`를 Play Console의 계정 삭제 URL로 사용한다.
