interface DataValueProps {
  /**
   * The measured, counted or computed value. Null renders as an em dash and
   * never as zero — an absent figure and a figure of zero are different
   * statements and the difference is frequently the whole finding.
   */
  value: number | string | null;
  unit?: string;
  /** Rendered beneath, for example "limit 35 µg/m³" or "target 100%". */
  context?: string;
  size?: "kpi" | "lg" | "base";
  className?: string;
}

const sizeClass: Record<NonNullable<DataValueProps["size"]>, string> = {
  kpi: "text-kpi",
  lg: "text-xl",
  base: "text-base",
};

/**
 * Every measured value in the system renders through this component, in the
 * mono face with tabular figures. Columns of readings then align on the
 * decimal, a value is scannable against the limit in the row beneath, and
 * digit transposition becomes less likely — which matters when someone is
 * reading back a blood pressure or comparing 35 against 3.5.
 */
export function DataValue({ value, unit, context, size = "base", className = "" }: DataValueProps) {
  const absent = value === null || value === "";
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`data-value font-medium ${sizeClass[size]}`} style={{ color: absent ? "var(--ink-faint)" : "var(--ink)" }}>
        {absent ? "—" : value}
        {!absent && unit ? <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span> : null}
      </span>
      {context ? <span className="mt-1 text-xs text-ink-muted">{context}</span> : null}
    </span>
  );
}
