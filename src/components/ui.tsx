import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ Button

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[0.95rem] font-bold " +
  "transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-sea)";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--color-sea) text-white hover:bg-(--color-deep)",
  secondary:
    "border border-(--color-line) bg-(--color-surface) text-(--color-ink) hover:bg-(--color-haze)",
  ghost: "text-(--color-ink-soft) hover:text-(--color-ink)",
  danger: "bg-(--color-fail) text-white hover:brightness-110",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: ButtonVariant }) {
  return (
    <a
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
    />
  );
}

// ---------------------------------------------------------------- BackLink

/**
 * חזרה אחורה. הריפוד אינו קישוט — טקסט בגובה 20px הוא מטרת מגע
 * שנכשלת בחוף, וזה הקישור שנועד להוציא אותך ממסך שנתקעת בו.
 * ה-`-ms-2` מקזז את הריפוד כדי שהטקסט יישאר מיושר לשאר העמוד.
 */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-ms-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-(--color-ink-faint)"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------- Field

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold text-(--color-ink)">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-(--color-fail)">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-(--color-ink-faint)">{hint}</span>
      ) : null}
    </label>
  );
}

const INPUT_CLASS =
  "w-full min-h-12 rounded-xl border border-(--color-line) bg-(--color-surface) px-4 " +
  "text-base text-(--color-ink) placeholder:text-(--color-ink-faint) " +
  "focus:border-(--color-sea) focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cx(INPUT_CLASS, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea {...props} className={cx(INPUT_CLASS, "py-3", className)} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cx(INPUT_CLASS, className)} />;
}

// -------------------------------------------------------------------- Card

export function Card({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-2xl border border-(--color-line) bg-(--color-surface) p-5 shadow-[0_1px_2px_rgba(21,40,58,0.04),0_8px_24px_-16px_rgba(21,40,58,0.18)]",
        className,
      )}
    />
  );
}

// ------------------------------------------------------------------ Notice

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "good";
  children: ReactNode;
}) {
  const tones = {
    info: "border-(--color-line) bg-(--color-haze) text-(--color-ink-soft)",
    warn: "border-(--color-warn)/40 bg-(--color-warn)/10 text-(--color-warn)",
    error: "border-(--color-fail)/40 bg-(--color-fail)/10 text-(--color-fail)",
    good: "border-(--color-verified)/40 bg-(--color-verified)/10 text-(--color-verified)",
  };
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------- PageHeader

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-(--color-ink-soft)">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

// -------------------------------------------------------------- EmptyState

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-(--color-line) px-6 py-12 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-(--color-ink-soft)">
        {title}
      </p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-(--color-ink-faint)">
          {body}
        </p>
      )}
    </div>
  );
}

export { cx };
