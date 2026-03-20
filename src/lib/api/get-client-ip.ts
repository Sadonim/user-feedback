import type { NextRequest } from "next/server";

/**
 * 클라이언트 IP를 헤더에서 추출한다.
 *
 * 우선순위:
 *  1. X-Real-IP  — nginx / Cloudflare가 설정하는 단일 IP 헤더
 *  2. X-Forwarded-For 마지막 항목 — Vercel이 플랫폼 레벨에서 append하는 신뢰 IP
 *  3. "anonymous" — 헤더가 모두 없는 경우 폴백
 *
 * 최대 45자로 cap → Redis 키 크기 남용 방지 (IPv6 최대 39자 + 여유)
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 45);

  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded?.split(",").at(-1)?.trim() ?? "anonymous").slice(0, 45);
}
