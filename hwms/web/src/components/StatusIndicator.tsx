/**
 * The only way to render a status in this system.
 *
 * Every status carries three signals in this order of importance: a glyph, a
 * text label, then a colour. Roughly one in twelve men has a colour vision
 * deficiency, red and green are the pair most commonly confused, and a screen
 * reader announces no colour at all.
 *
 * Two states here deserve their reasoning stated, because both are routinely
 * got wrong:
 *
 * "No data" is not a failure state and must never be styled as one. A month
 * with no data is a different problem from a month that failed, and merging
 * them produces exactly the wrong management response.
 *
 * "Informational" exists for counts that are not pass or fail. Showing a
 * recordable-incident count against an invented threshold would imply KMC has
 * set one when it has not.
 *
 * Test before shipping any screen: apply filter: grayscale(100%). If any
 * status becomes ambiguous, the screen is not finished.
 */
export type Status =
  | "within"
  | "approaching"
  | "breach"
  | "no-data"
  | "informational"
  | "not-applicable"
  | "provisional";

const presentation: Record<Status, { glyph: string; label: string; fg: string; bg: string }> = {
  within: { glyph: "✓", label: "Within target", fg: "var(--ok)", bg: "var(--ok-wash)" },
  approaching: { glyph: "~", label: "Approaching limit", fg: "var(--caution)", bg: "var(--caution-wash)" },
  breach: { glyph: "✗", label: "Outside limit", fg: "var(--breach)", bg: "var(--breach-wash)" },
  "no-data": { glyph: "—", label: "No data", fg: "var(--neutral)", bg: "var(--neutral-wash)" },
  informational: { glyph: "i", label: "Informational", fg: "var(--info)", bg: "var(--info-wash)" },
  "not-applicable": { glyph: "·", label: "Not applicable", fg: "var(--neutral)", bg: "var(--neutral-wash)" },
  provisional: { glyph: "~", label: "Provisional", fg: "var(--caution)", bg: "var(--caution-wash)" },
};

interface StatusIndicatorProps {
  status: Status;
  /** Overrides the default label. The glyph and colour are never overridable. */
  label?: string;
  className?: string;
}

export function StatusIndicator({ status, label, className = "" }: StatusIndicatorProps) {
  const shown = presentation[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold ${className}`}
      style={{ color: shown.fg, background: shown.bg }}
    >
      <span aria-hidden="true" className="data-value">
        {shown.glyph}
      </span>
      <span>{label ?? shown.label}</span>
    </span>
  );
}
