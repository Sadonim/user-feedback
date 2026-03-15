"use client";

import type { FeedbackType } from "@/types";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string; description: string }[] = [
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {FEEDBACK_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={[
            "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
            "hover:border-primary hover:bg-primary/5",
            value === type.value
              ? "border-primary bg-primary/10"
              : "border-border bg-background",
          ].join(" ")}
        >
          <span className="text-2xl">{type.emoji}</span>
          <span className="text-sm font-semibold">{type.label}</span>
          <span className="text-xs text-muted-foreground">{type.description}</span>
        </button>
      ))}
    </div>
  );
}
