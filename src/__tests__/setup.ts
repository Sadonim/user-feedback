/**
 * Vitest global setup
 *
 * - .env.test → .env.local → .env 순서로 환경 변수 로드
 * - NextAuth가 AUTH_SECRET을 요구하므로 테스트용 기본값 설정
 * - jest-axe toHaveNoViolations matcher 등록
 */
import { config } from 'dotenv';
import path from 'path';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

const root = path.resolve(__dirname, '../../..');

// .env.test가 있으면 우선 적용 (테스트 전용 DB URL)
config({ path: path.join(root, '.env.test'), override: false });
// 나머지는 .env.local, .env 에서 보완
config({ path: path.join(root, '.env.local'), override: false });
config({ path: path.join(root, '.env'), override: false });

// 최소 기본값 (파일에 없을 경우)
process.env.AUTH_SECRET ??= 'test-secret-minimum-32-chars-long!!';
process.env.NEXTAUTH_URL ??= 'http://localhost:3000';
