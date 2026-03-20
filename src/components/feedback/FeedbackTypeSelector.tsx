"use client";

import type { FeedbackType } from "@/types";

const FEEDBACK_TYPES: {
  value: FeedbackType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { value: "BUG", label: "버그 신고", emoji: "🐛", description: "뭔가 작동하지 않아요" },
  { value: "FEATURE", label: "기능 요청", emoji: "✨", description: "개선 사항을 제안해요" },
  { value: "GENERAL", label: "일반 문의", emoji: "💬", description: "기타 문의사항이에요" },
];

interface FeedbackTypeSelectorProps {
  value: FeedbackType | null;
  onChange: (type: FeedbackType) => void;
}

export function FeedbackTypeSelector({ value, onChange }: FeedbackTypeSelectorProps) {
  return (
    /* SUB-10: group label so SR knows these buttons pick a feedback category */
    <div role="group" aria-labelledby="feedback-type-label">
      <p id="feedback-type-label" className="sr-only">Select feedback type</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEEDBACK_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            /* SUB-02: aria-pressed communicates selected state beyond CSS */
            aria-pressed={value === type.value}
            className={[
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center",
              "transition-all duration-150 ease-out",
              "hover:scale-[1.03] hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              "active:scale-[0.98]",
              value === type.value
                ? "border-primary bg-primary/8 shadow-sm scale-[1.03]"
                : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
            ].join(" ")}
          >
            {/* SUB-03: emoji is decorative — hide from SR */}
            <span
              aria-hidden="true"
              className={[
                "flex size-11 items-center justify-center rounded-full text-xl",
                "transition-transform duration-150",
                value === type.value ? "scale-110" : "",
                value === type.value ? "bg-primary/12" : "bg-muted",
              ].join(" ")}
            >
              {type.emoji}
            </span>
            <span className="text-sm font-semibold">{type.label}</span>
            <span className="text-xs text-muted-foreground leading-snug">{type.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
