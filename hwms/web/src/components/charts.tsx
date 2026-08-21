import type { MetricStatus } from "../lib/api";

/**
 * The chart marks used on the dashboard.
 *
 * All inline SVG. This system is deployed on premise with no route to the
 * internet, so a charting library from a CDN is not an option and bundling one
 * to draw four shapes would cost more than it returns.
 *
 * Two rules from the design system govern everything here, and they point the
 * same way as good chart practice:
 *
 * Colour is never the only carrier of meaning. Every mark below is accompanied
 * by a figure and a word, so the screen survives greyscale and a reader with a
 * colour vision deficiency loses nothing. This matters more than usual here:
 * the palette's caution amber and breach red are close enough that a validator
 * flags them as hard to separate when adjacent, so they are never placed
 * adjacent without a gap and a label between them.
 *
 * KMC red is brand chrome and never appears in a mark. Status uses the status
 * tokens, which are deliberately not the brand red.
 */

const statusColour: Record<MetricStatus, string> = {
  within: "var(--ok)",
  approaching: "var(--caution)",
  outside: "var(--breach)",
  "no-data": "var(--neutral)",
};

/**
 * A ratio against a target, as a ring.
 *
 * The correct form for one ratio against one limit is a meter, and a ring is a
 * meter closed into a circle. It is used only where the figure genuinely is a
 * proportion of a whole, surveillance compliance, hygiene compliance,
 * ergonomic risk control. A count with a target of zero is not a proportion of
 * anything, and gets a figure rather than a ring.
 *
 * The target sits on the track as a tick, so "92%" is read against "95% needed"
 * without leaving the mark.
 */
export function RadialMeter({
  value,
  target,
  status,
  label,
}: {
  /** Percentage 0–100, or null where there is no figure. */
  value: number | null;
  /** The target as a percentage, drawn as a tick on the track. */
  target?: number;
  status: MetricStatus;
  /** Announced to a screen reader in place of the drawing. */
  label: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  const filled = (clamped / 100) * circumference;

  // Degrees clockwise from twelve o'clock.
  const targetAngle = target === undefined ? null : (Math.min(100, target) / 100) * 360 - 90;

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-[104px] w-[104px]"
      role="img"
      aria-label={label}
    >
      {/* The track. One shade off the surface, so it reads as the container
          for the value rather than as a second value. */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="var(--rule)"
        strokeWidth="7"
      />

      {value !== null ? (
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={statusColour[status]}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          // Start at twelve o'clock rather than three.
          transform="rotate(-90 50 50)"
        />
      ) : null}

      {targetAngle !== null ? (
        <line
          x1={50 + (radius - 6) * Math.cos((targetAngle * Math.PI) / 180)}
          y1={50 + (radius - 6) * Math.sin((targetAngle * Math.PI) / 180)}
          x2={50 + (radius + 6) * Math.cos((targetAngle * Math.PI) / 180)}
          y2={50 + (radius + 6) * Math.sin((targetAngle * Math.PI) / 180)}
          stroke="var(--ink-muted)"
          strokeWidth="2"
        />
      ) : null}

      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="data-value"
        fontSize={value === null ? "22" : "20"}
        fontWeight="500"
        fill={value === null ? "var(--ink-faint)" : "var(--ink)"}
      >
        {value === null ? "—" : `${value.toFixed(1)}%`}
      </text>
    </svg>
  );
}

/**
 * A value against a threshold, on a straight track.
 *
 * Used where a ring would mislead. Reportable near misses have a target of "at
 * least 200" and no ceiling: a ring capped at 100% would show a month of 260
 * as identical to a month of 200, hiding exactly the good news the indicator
 * exists to surface. A straight track can run past its target and show it.
 */
export function LinearMeter({
  value,
  target,
  status,
  higherIsBetter,
  label,
}: {
  value: number | null;
  target: number;
  status: MetricStatus;
  higherIsBetter: boolean;
  label: string;
}) {
  // The scale runs to whichever is larger, so a value beyond target stays on
  // the track and visibly beyond the marker.
  const ceiling = Math.max(target * (higherIsBetter ? 1.35 : 2), value ?? 0) || 1;
  const proportion = value === null ? 0 : Math.max(0, Math.min(1, value / ceiling));
  const targetAt = Math.max(0, Math.min(1, target / ceiling));

  return (
    <div className="w-full" role="img" aria-label={label}>
      <svg viewBox="0 0 200 14" className="h-[14px] w-full" preserveAspectRatio="none">
        <rect x="0" y="4" width="200" height="6" rx="3" fill="var(--rule)" />
        {value !== null ? (
          <rect
            x="0"
            y="4"
            width={Math.max(proportion * 200, proportion > 0 ? 3 : 0)}
            height="6"
            rx="3"
            fill={statusColour[status]}
          />
        ) : null}
        {/* The threshold. A solid hairline, never dashed, dashing reads as a
            projection when it is a hard limit. */}
        <line
          x1={targetAt * 200}
          y1="1"
          x2={targetAt * 200}
          y2="13"
          stroke="var(--ink-muted)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export interface TrendPoint {
  period: string;
  value?: number;
  status: MetricStatus;
}

/**
 * The months of the year to date, as a sparkline.
 *
 * A month with no figure breaks the line rather than being interpolated
 * across. A line that closes over a gap asserts a value nobody recorded, which
 * is the same failure as showing missing data as zero, and on a chart it is
 * far less obvious.
 *
 * Only the last point is labelled. A number against every month is chaos and
 * goes unread; the figure the reader wants is already the headline above.
 */
export function Sparkline({ points, label }: { points: TrendPoint[]; label: string }) {
  const width = 148;
  const height = 30;
  const values = points.map((point) => point.value).filter((v): v is number => v !== undefined);

  if (points.length < 2 || values.length === 0) {
    return (
      <div className="flex h-[30px] items-center text-xs text-ink-faint">
        Not enough history to show a trend
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero and, worse, would draw at the very top
  // or bottom of the box. Given a span, it sits on the centre line.
  const span = max - min || Math.abs(max) || 1;

  const x = (index: number) => (index / (points.length - 1)) * width;
  const y = (value: number) =>
    max === min ? height / 2 : height - 2 - ((value - min) / span) * (height - 4);

  // Contiguous runs, so gaps stay gaps.
  const runs: { index: number; value: number }[][] = [];
  let run: { index: number; value: number }[] = [];
  points.forEach((point, index) => {
    if (point.value === undefined) {
      if (run.length > 0) runs.push(run);
      run = [];
      return;
    }
    run.push({ index, value: point.value });
  });
  if (run.length > 0) runs.push(run);

  const last = points[points.length - 1];
  const missing = points.length - values.length;

  return (
    <div className="flex items-end gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[30px] w-[148px] shrink-0"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {runs.map((segment, index) =>
          segment.length === 1 ? (
            <circle
              key={index}
              cx={x(segment[0].index)}
              cy={y(segment[0].value)}
              r="2"
              fill="var(--ink-faint)"
            />
          ) : (
            <polyline
              key={index}
              points={segment.map((p) => `${x(p.index)},${y(p.value)}`).join(" ")}
              fill="none"
              stroke="var(--ink-faint)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
        {/* The endpoint carries the current status, so the sparkline agrees
            with the headline figure above it rather than reading as a second,
            differently-coloured opinion. */}
        {last.value !== undefined ? (
          <circle
            cx={x(points.length - 1)}
            cy={y(last.value)}
            r="2.75"
            fill={statusColour[last.status]}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ) : null}
      </svg>
      <span className="pb-0.5 text-xs leading-none text-ink-faint">
        {points[0].period.slice(5)}–{last.period.slice(5)}
        {missing > 0 ? (
          <span className="ml-1" title={`${missing} month(s) have no figure`}>
            · {missing} missing
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The nine indicators split by status, as one stacked track.
 *
 * Part-to-whole with four classes, which is the one case a stacked bar answers
 * better than the numbers alone: the reader sees the shape of the month before
 * reading anything.
 *
 * Segments are separated by a two-pixel surface gap and every one is named in
 * the legend beneath with its glyph, word and count. That is not decoration -
 * the caution amber and the breach red in this palette are close enough that a
 * validator reports them as hard to tell apart even with full colour vision,
 * so they must never sit edge to edge carrying meaning by colour alone.
 */
export function StatusBar({
  counts,
  total,
}: {
  counts: { status: MetricStatus; glyph: string; label: string; count: number }[];
  total: number;
}) {
  if (total === 0) return null;
  const present = counts.filter((entry) => entry.count > 0);

  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden">
        {present.map((entry) => (
          <span
            key={entry.status}
            className="first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(entry.count / total) * 100}%`,
              background: statusColour[entry.status],
            }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {counts.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: statusColour[entry.status] }}
            />
            <span aria-hidden="true" className="data-value" style={{ color: statusColour[entry.status] }}>
              {entry.glyph}
            </span>
            <span className="text-ink-muted">{entry.label}</span>
            <span className="data-value font-medium">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
