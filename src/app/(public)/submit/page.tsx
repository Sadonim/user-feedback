import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata = {
  title: "Submit Feedback",
  description: "Submit a bug report, feature request, or general inquiry.",
};

export default function SubmitPage() {
  return (
    <main id="main-content" className="container mx-auto px-4 py-12">
      <FeedbackForm />
    </main>
  );
}
