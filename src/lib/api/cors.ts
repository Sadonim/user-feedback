import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

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
