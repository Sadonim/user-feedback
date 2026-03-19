-- AlterTable: Feedback에 소프트 삭제 컬럼 추가
ALTER TABLE "Feedback" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: SSE 스트림 삭제 감지 및 deletedAt 필터링용
CREATE INDEX "Feedback_deletedAt_idx" ON "Feedback"("deletedAt");
