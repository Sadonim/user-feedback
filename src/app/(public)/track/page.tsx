import { Suspense } from "react";
import { TrackingViewWrapper } from "@/components/feedback/TrackingViewWrapper";

export const metadata = {
  title: "Track Feedback",
  description: "Track the status of your submitted feedback.",
};

export default function TrackPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
        <TrackingViewWrapper />
      </Suspense>
    </main>
  );
}
