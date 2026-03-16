import { NextResponse } from "next/server";

/**
 * [H3] 프로덕션 환경에서 CORS_ALLOWED_ORIGINS 미설정 시 경고.
 * Next.js 서버리스 환경에서 모듈 로드 시 1회 실행된다.
 */
if (process.env.NODE_ENV === "production" && !process.env.CORS_ALLOWED_ORIGINS) {
  console.error(
    "[CORS] CORS_ALLOWED_ORIGINS is not set in production. " +
      "Falling back to NEXT_PUBLIC_APP_URL. " +
      "Set CORS_ALLOWED_ORIGINS explicitly to avoid misconfiguration."
  );
}

const ALLOWED_ORIGINS = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function withCors(response: NextResponse, origin: string | null): NextResponse {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  return response;
}

export function corsPreflightResponse(origin: string | null): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res, origin);
}

/**
 * 공개 피드백 엔드포인트 전용 CORS 핸들러.
 * CORS_PUBLIC_OPEN=true 시 모든 출처(*)를 허용.
 * 관리자 API는 항상 기존 allowlist 방식 유지.
 *
 * 보안 노트: 피드백 제출 API는 인증 불필요 공개 엔드포인트이므로
 * 와일드카드 허용이 위젯 임베딩에 필요하다. Rate limit은 별도 적용.
 */

/** 와일드카드 공개 CORS 헤더를 응답에 적용 (내부 헬퍼) */
function applyPublicCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export function withPublicCors(response: NextResponse, origin: string | null): NextResponse {
  if (process.env.CORS_PUBLIC_OPEN === "true") return applyPublicCorsHeaders(response);
  return withCors(response, origin);
}

export function publicCorsPreflightResponse(origin: string | null): NextResponse {
  if (process.env.CORS_PUBLIC_OPEN === "true") {
    return applyPublicCorsHeaders(new NextResponse(null, { status: 204 }));
  }
  return corsPreflightResponse(origin);
}
