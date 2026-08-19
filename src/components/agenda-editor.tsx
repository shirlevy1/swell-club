"use client";

import type { AgendaStep } from "@/lib/agenda";
import { Input, Textarea } from "./ui";

/**
 * שדה השעה הוא טקסט חופשי ולא input מסוג time בכוונה — בורח מהבאג
 * שכבר תפסנו עם תאריך הלידה (בקרה מובנית שמרנדרת "עקום" בלי דרך
 * לבדוק את זה מרחוק). זה גם מה שהתצוגה כבר עושה: מחרוזת לתצוגה בלבד.
 */
export function AgendaEditor({
  steps,
  onStepsChange,
  closing,
  onClosingChange,
}: {
  steps: AgendaStep[];
  onStepsChange: (steps: AgendaStep[]) => void;
  closing: string;
  onClosingChange: (closing: string) => void;
}) {
  function updateStep(i: number, patch: Partial<AgendaStep>) {
    onStepsChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeStep(i: number) {
    onStepsChange(steps.filter((_, idx) => idx !== i));
  }

  function addStep() {
    onStepsChange([...steps, { time: "", label: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              dir="ltr"
              value={step.time}
              onChange={(e) => updateStep(i, { time: e.target.value })}
              placeholder="07:00"
              className="w-20 shrink-0 text-center"
            />
            <Input
              value={step.label}
              onChange={(e) => updateStep(i, { label: e.target.value })}
              placeholder="מה קורה בשלב הזה"
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => removeStep(i)}
              aria-label="הסרת שלב"
              className="flex size-11 shrink-0 items-center justify-center text-(--color-ink-faint) hover:text-(--color-fail)"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStep}
        className="min-h-11 text-sm font-semibold text-(--color-sea)"
      >
        + הוספת שלב
      </button>

      <div className="space-y-1.5 pt-1">
        <label className="block text-sm font-semibold text-(--color-ink)">
          שורת סיום (אופציונלי)
        </label>
        <Textarea
          value={closing}
          onChange={(e) => onClosingChange(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
