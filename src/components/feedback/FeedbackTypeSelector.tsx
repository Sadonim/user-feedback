"use client";

import type { FeedbackType } from "@/types";

const FEEDBACK_TYPES: {
  value: FeedbackType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { value: "BUG", label: "Bug Report", emoji: "🐛", description: "Something isn't working" },
  { value: "FEATURE", label: "Feature Request", emoji: "✨", description: "Suggest an improvement" },
  { value: "GENERAL", label: "General", emoji: "💬", description: "General inquiry" },
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
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
              "hover:border-primary hover:bg-primary/5",
              value === type.value
                ? "border-primary bg-primary/10"
                : "border-border bg-background",
            ].join(" ")}
          >
            {/* SUB-03: emoji is decorative — hide from SR */}
            <span aria-hidden="true" className="text-2xl">{type.emoji}</span>
            <span className="text-sm font-semibold">{type.label}</span>
            <span className="text-xs text-muted-foreground">{type.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
