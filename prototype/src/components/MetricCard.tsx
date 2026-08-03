import type { DashboardMetric } from "../types";
import { CircleProgress } from "./CircleProgress";
import { ProvenanceChip, StatusPill } from "./StatusPill";

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const isCircle = ["K1", "K4", "K5"].includes(metric.id);
  const isAbsenteeism = metric.id === "K3";
  const absenteeismWidth =
    isAbsenteeism && metric.numericValue !== undefined
      ? Math.min(100, (metric.numericValue / 0.5) * 100)
      : 0;

  return (
    <article className="metric-card">
      <div className="metric-heading">
        <span className="metric-id">{metric.id}</span>
        <ProvenanceChip provenance={metric.provenance} proposed={metric.proposed} />
      </div>
      <div className="metric-main">
        <div>
          <h3>{metric.name}</h3>
          {!isCircle && <div className="metric-value">{metric.displayValue}</div>}
          <div className="metric-target">Target {metric.target}</div>
        </div>
        {isCircle && (
          <CircleProgress
            value={metric.numericValue}
            label={`${metric.name}: ${metric.displayValue}; target ${metric.target}`}
          />
        )}
      </div>
      {isAbsenteeism && (
        <div className="bullet-chart" aria-label={`${metric.displayValue} against target 0.5`}>
          <div className="bullet-track">
            <div
              className={`bullet-value bullet-${metric.status}`}
              style={{ width: `${absenteeismWidth}%` }}
            />
            <div className="bullet-target" title="Target 0.5" />
          </div>
          <div className="bullet-labels">
            <span>0</span>
            <span>Target 0.5</span>
          </div>
        </div>
      )}
      <p className="metric-note">{metric.note}</p>
      {metric.bands && metric.bands.length > 0 && (
        <div className="severity-bands" aria-label="Injury severity bands">
          {metric.bands.map((band) => (
            <span key={band.label}>
              <strong>{band.value}</strong> {band.label}
            </span>
          ))}
        </div>
      )}
      {metric.directionNote && <p className="metric-direction">↗ {metric.directionNote}</p>}
      {metric.companion && (
        <div className="companion-row">
          <span>{metric.companion.label}</span>
          <strong>{metric.companion.displayValue}</strong>
          <StatusPill status={metric.companion.status} compact />
        </div>
      )}
      <div className="metric-footer">
        <StatusPill status={metric.status} />
      </div>
    </article>
  );
}
