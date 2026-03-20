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

const STEPS: Step[] = ["type", "details", "success"];
const STEP_LABELS = ["유형", "내용", "완료"];

const STEP_ANNOUNCEMENTS: Record<Step, string> = {
  type: "1단계 / 3단계: 피드백 유형 선택",
  details: "2단계 / 3단계: 피드백 내용 입력",
  success: "피드백이 성공적으로 제출되었습니다",
};

function StepProgress({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current);

  return (
    <div className="flex items-center gap-0 mb-6" aria-hidden="true">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  isCompleted
                    ? "bg-primary text-primary-foreground scale-95"
                    : isActive
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[idx]}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-2 mb-4 transition-all duration-500",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function handleCopyId() {
    if (!trackingId) return;
    await navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        toast.error(json.error ?? "제출에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      setTrackingId(json.data.trackingId);
      setStep("success");
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.");
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
          className="mx-auto max-w-lg outline-none animate-in fade-in-0 zoom-in-95 duration-300"
        >
          <CardHeader className="text-center pb-2">
            <StepProgress current="success" />
            {/* Animated checkmark */}
            <div
              aria-hidden="true"
              className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-in zoom-in-50 duration-500"
            >
              <span className="text-3xl">✅</span>
            </div>
            {/* SUB-01: h1 for proper heading hierarchy */}
            <h1
              data-slot="card-title"
              className="text-lg font-semibold leading-snug"
            >
              제출 완료!
            </h1>
            <CardDescription>피드백이 접수되었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-2">접수 번호:</p>
              <button
                onClick={handleCopyId}
                className="group relative w-full rounded-lg bg-muted px-4 py-3 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={copied ? "복사됨!" : "클릭하여 접수 번호 복사"}
              >
                <code className="tabular-nums text-base font-bold tracking-wider">
                  {trackingId}
                </code>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-opacity group-hover:opacity-100">
                  {copied ? "✓ 복사됨" : "복사"}
                </span>
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                이 번호로 나중에 처리 상태를 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                onClick={() => router.push(`/track?id=${trackingId}`)}
              >
                상태 조회
              </button>
              <button
                className={cn(buttonVariants(), "flex-1")}
                onClick={() => {
                  setStep("type");
                  setSelectedType(null);
                  setFormData({ title: "", description: "", nickname: "", email: "" });
                  setTrackingId(null);
                  setCopied(false);
                }}
              >
                추가 제출
              </button>
            </div>
          </CardContent>
        </Card>
      ) : step === "type" ? (
        <Card className="mx-auto max-w-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <CardHeader>
            <StepProgress current="type" />
            {/* SUB-01: h1 so page has a heading landmark */}
            <h1
              data-slot="card-title"
              className="text-base leading-snug font-semibold"
            >
              피드백 제출
            </h1>
            <CardDescription>어떤 종류의 피드백인가요?</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackTypeSelector value={selectedType} onChange={handleTypeSelect} />
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-lg animate-in fade-in-0 slide-in-from-right-2 duration-200">
          <CardHeader>
            <StepProgress current="details" />
            {/* SUB-04: raw ← replaced with accessible pattern */}
            <button
              type="button"
              onClick={() => setStep("type")}
              className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">유형 선택으로 돌아가기</span>
              <span aria-hidden="true">뒤로</span>
            </button>
            {/* SUB-01: h1 for proper heading hierarchy */}
            <h1
              data-slot="card-title"
              className="text-base leading-snug font-semibold"
            >
              자세히 알려주세요
            </h1>
            <CardDescription>
              {selectedType === "BUG" && "경험하신 버그를 설명해 주세요"}
              {selectedType === "FEATURE" && "원하시는 기능을 설명해 주세요"}
              {selectedType === "GENERAL" && "하고 싶은 말씀을 자유롭게 적어주세요"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* SUB-07: aria-busy communicates pending state to SR */}
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
              <div className="space-y-1.5">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="한 줄로 요약해주세요"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">내용 *</Label>
                {/* SUB-06: aria-describedby links character counter to textarea */}
                <Textarea
                  id="description"
                  placeholder="자세한 내용을 입력해주세요..."
                  rows={4}
                  maxLength={5000}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  aria-describedby="desc-counter"
                  required
                />
                <div className="flex justify-end">
                  <p
                    id="desc-counter"
                    className={cn(
                      "text-xs tabular-nums transition-colors",
                      formData.description.length > 4500
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formData.description.length}/5000
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nickname">닉네임 *</Label>
                {/* SUB-11: autoComplete for cognitive accessibility */}
                <Input
                  id="nickname"
                  placeholder="어떻게 불러드릴까요?"
                  maxLength={100}
                  autoComplete="nickname"
                  value={formData.nickname}
                  onChange={(e) => handleChange("nickname", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  이메일{" "}
                  <span className="text-muted-foreground font-normal">(선택)</span>
                </Label>
                {/* SUB-11: autoComplete for cognitive accessibility */}
                <Input
                  id="email"
                  type="email"
                  placeholder="처리 상태 변경 시 알림을 받아보세요"
                  maxLength={255}
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={cn(
                  buttonVariants(),
                  "w-full transition-all",
                  isSubmitting && "opacity-70 cursor-not-allowed"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
                    />
                    제출 중…
                  </span>
                ) : (
                  "피드백 제출"
                )}
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
