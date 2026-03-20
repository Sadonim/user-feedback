import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata = {
  title: "피드백 제출",
  description: "버그 신고, 기능 요청, 일반 문의를 제출하세요.",
};

export default function SubmitPage() {
  return (
    <main id="main-content" className="container mx-auto px-4 py-12">
      <FeedbackForm />
    </main>
  );
}
