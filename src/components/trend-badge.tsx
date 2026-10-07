import { TriangleUpIcon } from "./social-icons";

/**
 * שפה משותפת לכל גרפי admin/insights: חישוב מגמה ותג התצוגה שלה.
 * משותף בין הגרפים (לא כפול בכל אחד מהם) כדי שכולם "ידברו אותה
 * שפה" - אותו חישוב, אותו עיצוב, אותו מיקום (מספר מימין, משולש
 * משמאלו), בלי לסטות גרף-גרף.
 */

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type Trend = { kind: "percent" | "diff"; value: number } | null;

/** השוואת ממוצע המחצית הראשונה מול השנייה - "האם זה עולה או יורד",
 * לא רק "מה הערך האחרון". null כשאין מספיק מפגשים כדי שזה יהיה בעל
 * משמעות. כשהבסיס להשוואה קטן (פחות מ-3, כמו בקהילה בשלב בדיקות) -
 * אחוז יהיה מטעה (1→3 זה "200%" שנשמע דרמטי בלי סיבה) - אז מציגים
 * את ההפרש הגולמי במקום ("↑2"), לא מסתירים את התג לגמרי. */
export function computeTrend(values: number[]): Trend {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = average(values.slice(0, mid));
  const second = average(values.slice(mid));
  if (first < 3) {
    const diff = Math.round(second - first);
    return diff === 0 ? null : { kind: "diff", value: diff };
  }
  return { kind: "percent", value: Math.round(((second - first) / first) * 100) };
}

/**
 * inline-flex עם סדר DOM קבוע (מספר קודם, משולש אחריו) - בעמוד RTL
 * זה ממקם את המספר מימין ואת המשולש משמאלו, כמו מספר+יחידה בעברית
 * ("70 ק״ג"). משולש SVG, לא תו "↑"/"↓": תו יוניקוד כזה מקבל גובה/קו-
 * בסיס שונה בגופנים שונים (בעיקר iOS) ולא ישב בעקביות לצד המספר גם
 * עם items-center - נבדק ויזואלית ונכשל. ל-SVG יש תיבת מידות קבועה
 * בכל פלטפורמה, אז היישור אמין.
 */
export function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === null) return null;
  const up = trend.value >= 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 font-bold " +
        (up ? "text-(--color-verified)" : "text-(--color-fail)")
      }
    >
      <span className="ltr-nums">
        {Math.abs(trend.value)}
        {trend.kind === "percent" && "%"}
      </span>
      <TriangleUpIcon className={up ? "size-2.5" : "size-2.5 rotate-180"} />
    </span>
  );
}
