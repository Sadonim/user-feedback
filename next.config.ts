import type { NextConfig } from "next";

/**
 * CORS / 정적 헤더 설정
 *
 * 역할 분리:
 *  - /api/v1/feedback : Route Handler(cors.ts)가 origin별 동적 CORS를 처리한다.
 *    next.config headers()는 CORS_PUBLIC_OPEN=true 일 때만 정적 헤더를 추가(캐시 적용).
 *    allowlist 모드(CORS_PUBLIC_OPEN=false)에서는 origin이 동적이므로 정적 헤더를 생략.
 *    Route Handler의 withPublicCors()가 올바른 origin별 헤더를 반환한다.
 *
 *  - /widget.js : 외부 사이트에서 <script> 태그로 로드하는 JS 번들.
 *    scripts는 Same-Origin 제한 없이 로드되지만 Cache-Control을 위해 헤더를 추가.
 *
 * [H3 fix] CORS_ALLOWED_ORIGINS 미설정 시 빈 문자열("")을 정적 헤더에 넣지 않는다.
 * 동적 핸들러(cors.ts)가 allowlist 처리를 담당하므로 정적 헤더 불필요.
 */
const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    const publicOpen = process.env.CORS_PUBLIC_OPEN === "true";

    return [
      // 공개 피드백 제출 엔드포인트
      // CORS_PUBLIC_OPEN=true: 정적 와일드카드 헤더 (캐시된 응답 포함)
      // CORS_PUBLIC_OPEN=false: Route Handler가 origin별 동적 헤더를 반환 (정적 헤더 없음)
      ...(publicOpen
        ? [
            {
              source: "/api/v1/feedback",
              headers: [
                { key: "Access-Control-Allow-Origin", value: "*" },
                { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
                { key: "Access-Control-Allow-Headers", value: "Content-Type" },
                { key: "Access-Control-Max-Age", value: "86400" },
              ],
            },
          ]
        : []),

      // widget.js 스크립트 서빙 — 외부 사이트 <script> 태그 로드
      {
        source: "/widget.js",
        headers: [
          // JS 번들은 CORS 제한 없이 로드되지만 명시적 허용으로 CDN 배포 대비
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
