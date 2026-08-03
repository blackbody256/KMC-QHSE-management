export function CircleProgress({
  value,
  label,
  size = 92,
}: {
  value?: number;
  label: string;
  size?: number;
}) {
  const normalized = Math.min(100, Math.max(0, value ?? 0));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="circle-progress" style={{ width: size, height: size }}>
      <svg viewBox="0 0 92 92" role="img" aria-label={label}>
        <circle className="circle-track" cx="46" cy="46" r={radius} />
        {value !== undefined && (
          <circle
            className="circle-value"
            cx="46"
            cy="46"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <span className="circle-text">{value === undefined ? "—" : `${Math.round(value)}%`}</span>
    </div>
  );
}
