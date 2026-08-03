import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ResearchCards, type ResearchCardItem } from "../components/ResearchCards";

const qualityItems: ResearchCardItem[] = [
  { title: "Incoming, in-process and final inspection", records: "Candidate inspection plan, characteristic, result, accept/reject decision and evidence.", question: "Which inspection records already exist in manufacturing systems and must not be duplicated?", owner: "Quality Inspection and Testing" },
  { title: "Test and laboratory records", records: "Candidate test request, method, sample or vehicle reference, equipment, result, reviewer and release decision.", question: "Which tests and laboratory competence requirements are in scope?", owner: "Quality Inspection and Testing" },
  { title: "Nonconformity and corrective action", records: "Candidate nonconformity, containment, disposition, root cause, corrective action and effectiveness review.", question: "Which CAPA method and approval stages does KMC use?", owner: "Quality Inspection and Testing" },
  { title: "Calibration and measurement", records: "Candidate instrument owner, calibration status, due date, certificate reference and out-of-tolerance response.", question: "Who owns the calibration register and which instruments are authoritative?", owner: "Quality Inspection and Testing" },
  { title: "Supplier quality and audits", records: "Candidate supplier inspection, audit, finding, response and performance records.", question: "Which supplier-quality data belongs here rather than in ERP or procurement systems?", owner: "Quality Inspection and Testing" },
];

export function QualityResearchPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Quality Inspection and Testing"
        title="Scope research"
        description="Candidate manufacturing-quality functions for the unit owner to confirm before forms or metrics are built."
      />
      <section className="provenance-callout">
        <RefreshCw size={20} aria-hidden="true" />
        <div>
          <strong>The expiry pattern is preserved without retaining the medical module</strong>
          <span>Calibration due dates can later reuse the generic renewal component after the quality owner confirms instruments and authority.</span>
        </div>
      </section>
      <ResearchCards
        heading="Quality Inspection and Testing scope"
        description="The cards use quality, laboratory, measurement and audit standards as question-generating benchmarks; they are not approved KMC requirements."
        items={qualityItems}
      />
    </div>
  );
}
