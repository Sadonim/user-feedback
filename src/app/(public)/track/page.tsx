import { Suspense } from "react";
import { TrackingViewWrapper } from "@/components/feedback/TrackingViewWrapper";

export const metadata = {
  title: "피드백 조회",
  description: "제출한 피드백의 처리 상태를 확인하세요.",
};

export default function TrackPage() {
  return (
    <main id="main-content" className="container mx-auto px-4 py-12">
      <Suspense fallback={<div className="text-center text-muted-foreground">불러오는 중...</div>}>
        <TrackingViewWrapper />
      </Suspense>
    </main>
  );
}
