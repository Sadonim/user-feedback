"use client";

import { useState, useRef } from "react";
import { useFocusOnMount } from "@/lib/a11y/focus-utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FeedbackTypeSelector } from "./FeedbackTypeSelector";
import type { FeedbackType } from "@/types";

type Step = "type" | "details" | "success";

const STEP_ANNOUNCEMENTS: Record<Step, string> = {
  type: "Step 1 of 3: Select feedback type",
  details: "Step 2 of 3: Enter feedback details",
  success: "Feedback submitted successfully",
};

export function FeedbackForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  /* SUB-08: focus success card on step transition */
  const successRef = useRef<HTMLDivElement>(null);
  useFocusOnMount(successRef, step === "success");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    nickname: "",
    email: "",
  });

  function handleTypeSelect(type: FeedbackType) {
    setSelectedType(type);
    setStep("details");
  }

  function handleChange(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, ...formData }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Submission failed. Please try again.");
        return;
      }

      setTrackingId(json.data.trackingId);
      setStep("success");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* SUB-05: live region announces step transitions to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {STEP_ANNOUNCEMENTS[step]}
      </div>

      {step === "success" && trackingId ? (
        /* SUB-08: tabIndex={-1} makes div programmatically focusable */
        <Card
          ref={successRef}
          tabIndex={-1}
          className="mx-auto max-w-lg outline-none"
        >
          <CardHeader className="text-center">
            {/* SUB-09: decorative emoji hidden from SR */}
            <div aria-hidden="true" className="mx-auto mb-2 text-4xl">✅</div>
            {/* SUB-01: h1 for proper heading hierarchy (CardTitle is a div; render h1 directly) */}
            <h1
              data-slot="card-title"
              className="text-base leading-snug font-medium"
            >
              Feedback Submitted!
            </h1>
            <CardDescription>Your feedback has been received.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Your tracking ID:</p>
            <div className="rounded-md bg-muted px-4 py-3">
              <code className="text-lg font-bold tracking-wider">{trackingId}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this ID to check your feedback status later.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                onClick={() => router.push(`/track?id=${trackingId}`)}
              >
                Track Status
              </button>
              <button
                className={cn(buttonVariants(), "flex-1")}
                onClick={() => {
                  setStep("type");
                  setSelectedType(null);
                  setFormData({ title: "", description: "", nickname: "", email: "" });
                  setTrackingId(null);
                }}
              >
                Submit Another
              </button>
            </div>
          </CardContent>
        </Card>
      ) : step === "type" ? (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            {/* SUB-01: h1 so page has a heading landmark */}
            <h1
              data-slot="card-title"
              className="text-base leading-snug font-medium"
            >
              Submit Feedback
            </h1>
            <CardDescription>What type of feedback do you have?</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackTypeSelector value={selectedType} onChange={handleTypeSelect} />
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            {/* SUB-04: raw ← replaced with accessible pattern */}
            <button
              type="button"
              onClick={() => setStep("type")}
              className="mb-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">Back to type selection</span>
              <span aria-hidden="true"> Back</span>
            </button>
            {/* SUB-01: h1 for proper heading hierarchy */}
            <h1
              data-slot="card-title"
              className="text-base leading-snug font-medium"
            >
              Tell us more
            </h1>
            <CardDescription>
              {selectedType === "BUG" && "Describe the bug you encountered"}
              {selectedType === "FEATURE" && "Describe the feature you'd like to see"}
              {selectedType === "GENERAL" && "Share your thoughts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* SUB-07: aria-busy communicates pending state to SR */}
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                {/* SUB-06: aria-describedby links character counter to textarea */}
                <Textarea
                  id="description"
                  placeholder="Provide details..."
                  rows={4}
                  maxLength={5000}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  aria-describedby="desc-counter"
                  required
                />
                <p id="desc-counter" className="text-right text-xs text-muted-foreground">
                  {formData.description.length}/5000
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nickname">Nickname *</Label>
                {/* SUB-11: autoComplete for cognitive accessibility */}
                <Input
                  id="nickname"
                  placeholder="How should we call you?"
                  maxLength={100}
                  autoComplete="nickname"
                  value={formData.nickname}
                  onChange={(e) => handleChange("nickname", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground">(optional)</span>
                </Label>
                {/* SUB-11: autoComplete for cognitive accessibility */}
                <Input
                  id="email"
                  type="email"
                  placeholder="Get notified on status updates"
                  maxLength={255}
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={cn(buttonVariants(), "w-full")}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
