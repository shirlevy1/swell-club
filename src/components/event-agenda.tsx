import type { EventAgenda } from "@/lib/agenda";

export function EventAgendaView({ agenda }: { agenda: EventAgenda }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">לו״ז המפגש</p>

      <ol className="space-y-2.5">
        {agenda.steps.map((step) => (
          <li key={step.label} className="flex items-baseline gap-3">
            <span className="ltr-nums w-12 shrink-0 font-bold text-(--color-sea)">
              {step.time}
            </span>
            <span className="text-(--color-ink-soft)">{step.label}</span>
          </li>
        ))}
      </ol>

      <p className="text-sm leading-relaxed text-(--color-ink-soft)">
        {agenda.closingLine}
      </p>
    </div>
  );
}
