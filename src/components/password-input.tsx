"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { EyeIcon, EyeOffIcon } from "./social-icons";
import { Input } from "./ui";

/**
 * שדה סיסמה עם אייקון הצגה/הסתרה — לא input type="password" רגיל.
 * ה-wrapper עצמו LTR (כמו השדה בתוכו), כדי שהאייקון יישב בקצה הנכון
 * גם בעמוד RTL.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative" dir="ltr">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={`pe-11 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
        className="absolute inset-y-0 end-2 flex w-9 items-center justify-center text-(--color-ink-faint) transition hover:text-(--color-ink)"
      >
        {visible ? (
          <EyeOffIcon className="size-5" />
        ) : (
          <EyeIcon className="size-5" />
        )}
      </button>
    </div>
  );
}
