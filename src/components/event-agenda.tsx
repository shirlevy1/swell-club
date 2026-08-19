export function EventAgendaView({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">לו״ז המפגש</p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-ink-soft)">
        {text}
      </p>
    </div>
  );
}
