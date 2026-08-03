import type { ComplianceStatus, MetricProvenance, SectionStatus } from "../types";

const STATUS: Record<ComplianceStatus, { glyph: string; label: string }> = {
  within: { glyph: "✓", label: "Within target" },
  approaching: { glyph: "~", label: "Approaching limit" },
  outside: { glyph: "✕", label: "Outside target" },
  "no-data": { glyph: "—", label: "No data" },
  provisional: { glyph: "◷", label: "Provisional" },
  informational: { glyph: "i", label: "Informational" },
  "not-applicable": { glyph: "·", label: "Not applicable" },
};

export function StatusPill({
  status,
  compact = false,
  label,
}: {
  status: ComplianceStatus;
  compact?: boolean;
  label?: string;
}) {
  const item = STATUS[status];
  return (
    <span className={`status-pill status-${status}${compact ? " compact" : ""}`}>
      <span aria-hidden="true">{item.glyph}</span>
      <span>{label ?? item.label}</span>
    </span>
  );
}

const SECTION: Record<SectionStatus, { glyph: string; label: string }> = {
  "not-recorded": { glyph: "—", label: "Not recorded" },
  partial: { glyph: "~", label: "Partial" },
  complete: { glyph: "✓", label: "Complete" },
  "not-indicated": { glyph: "·", label: "Not clinically indicated" },
};

export function SectionStatusLabel({ status }: { status: SectionStatus }) {
  return (
    <span className={`section-status section-${status}`}>
      <span aria-hidden="true">{SECTION[status].glyph}</span>
      {SECTION[status].label}
    </span>
  );
}

export function ProvenanceChip({
  provenance,
  proposed = false,
}: {
  provenance: MetricProvenance;
  proposed?: boolean;
}) {
  return (
    <span className="provenance">
      {provenance}
      {proposed ? " · formula proposed" : ""}
    </span>
  );
}
