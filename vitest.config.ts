import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    // 단위 테스트: 빠름, 통합 테스트: DB 왕복 시간 고려
    testTimeout: 30_000,
    // beforeAll/afterAll도 동일 한도 (기본값 10s는 커버리지 계측 하에 부족)
    hookTimeout: 30_000,
    // 통합 테스트에서 병렬 파일 실행 시 DB 연결 고갈 방지
    // 각 파일은 독립 Worker에서 실행되므로 파일 간 순서는 보장되지 않음
    // (파일 내부 테스트는 항상 순차 실행됨)
    // 통합 테스트 파일 간 Supabase 연결 풀 고갈 방지 — 순차 실행
    // Vitest 4: poolOptions는 top-level로 이동됨
    pool: 'forks',
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/validators/**',
        'src/lib/api/**',
        'src/widget/**',
        // src/app/api/** 와 src/server/services/** 는 실제 DB가 필요한 통합 테스트에서만
        // 커버되므로 단위 테스트 커버리지 범위에서 제외. CI에서 통합 테스트 job 분리 권장.
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
