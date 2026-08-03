# Review of the QHSE Prototype v0.3 Revision Plan

**Date:** 3 August 2026
**Reviewing:** QHSE Prototype v0.3 Revision Plan (prototype track)
**Against:** KMC_HWMS_Production_Build_Plan_v1.1.md, KMC_HWMS_SRS_v1.0.md, KMC_HWMS_SRS_v1.1_DRAFT.md, KMC_HWMS_Agent_Build_Brief_v1.0.md
**Verdict:** Approve with the changes in Sections 2 and 3. Section 1 records where the plan is better than the production plan was, and those corrections have already been applied to the production plan at v1.1.

---

# 1. Where this plan is right and the production plan was wrong

These are not concessions of style. Each one was a real defect in the production plan v1.0, now corrected.

## 1.1 Manual recordability determination

The production plan computed recordability from a fixed ladder: death, days away, restricted work, medical treatment beyond first aid. That ladder is a foreign jurisdiction's rule applied to a Ugandan workplace, and the Occupational Safety and Health Act, 2006 works in different terms — occupational accident, occupational disease, dangerous occurrence.

It also broke Rule 1 of the build brief. A recordability threshold is a threshold. A system that refuses to hard-code an air quality limit cannot hard-code an injury classification rule and call it different.

Storing the determination, its basis, the determining officer and the timestamp is correct. When KMC issues a written rule it becomes an effective-dated reference row that pre-fills the determination and stays overridable, which is the pattern already used for every other configurable rule.

## 1.2 Period attestation

This is the strongest single idea in the plan and the production plan had nothing equivalent.

Zero is ambiguous in a way percentages are not. "Zero fatalities" means either nothing happened or nobody entered anything, and both render identically. Every other metric in this system already distinguishes those cases; a count metric quietly loses the distinction. Attestation restores it, and blocking closure while a work-related status or recordability determination is pending is exactly right — a figure that could still move is not something a person should be asked to attest to.

This is ADR-06 applied to a new domain. The Division already accepted that "monitoring completed as scheduled" is a different question from "readings within limit". "The register is complete" is a different question from "the count is zero", and the same reasoning applies.

## 1.3 Shared monitoring register with required context

Better than the production plan's P-09, which asked whether industrial hygiene belongs to Health and Wellness or to Environment and deferred the answer. Storing the reading once with a required context of occupational exposure, indoor workplace or ambient, then giving each unit a view, resolves the question instead of postponing it.

It also makes the dangerous error structurally impossible. Judging a worker-exposure reading against an ambient limit produces a plausible number that is wrong in the direction of false reassurance, and nothing on the screen would reveal it. This is the correction already flagged as required at ENV-05 in SRS v1.1.

## 1.4 Investigations measured against required, not reported

Correct, and the production plan's denominator was wrong. Treating every first-aid report as an outstanding investigation produces a permanently failing metric, and a permanently failing metric is one nobody looks at within two months.

## 1.5 Naming, and counting people versus events

The module is Health and Wellness; the role is Health and Wellness Officer. The minutes conflated them and the plan is right to correct the minutes rather than the naming.

"Fatality and injury metrics count affected people, while recordable incidents count events" is a sharper distinction than the production plan drew. One event injuring three people is one recordable incident and three injuries. It now appears in the production plan's field names, because leaving it to whoever writes the query is how the two silently diverge.

## 1.6 Sourcing

The citations were checked. ISO 14001:2026 was published on 15 April 2026, ISO 10012:2026 supersedes the 2003 edition, and the short-form `iso.org/standard/NNNNN` URLs resolve correctly. The distinction the plan draws — Uganda's Act as the local starting point, ILO and OSHA material as field-design benchmarks and not as claims about Ugandan legal recordability — is exactly the right framing and should survive into the SRS wording verbatim.

---

# 2. Required changes

## 2.1 The licence removal is not established as a stakeholder decision

The plan lists under **locked stakeholder decisions**: "Completely remove medical licence/certification tracking, expiry alerts, data types, routes, and K6/K7."

Nothing in the 31 July minutes supports this. The minutes cover the module rename, public viewing, placeholders for the other units, and the four safety metrics. Licences are not mentioned. The item's actual status in the record is F01 in the stakeholder register, which asks whether KMC needs the register at all and answers "keep it only if these expiry records are required and are not already controlled elsewhere" — an open question, not a decision.

This matters because of what removal does downstream. KVP Infirmary Licence Compliance and Occupational Health Practitioner Licence Compliance are numbers 6 and 7 of the seven KPIs in the Division's own approved reporting template, and KPI-01 in SRS v1.1 records the seven-KPI set as **Confirmed**. Removing them takes the executive dashboard from seven primary indicators to five, and the dashboard stops matching the document the Division circulates to management every month.

**Required.** One of the following, not a silent deletion.

- If a named person did confirm removal, record it as a dated withdrawal of two approved-template KPIs, with the reason, in the decision register. The dashboard then needs a visible note explaining why it shows five where the template shows seven, or the first executive to compare them will assume the system is broken.
- If nobody confirmed it, restore the module and mark F01 unresolved. Deleting an approved KPI is the kind of change a prototype must not make on its own initiative, precisely because it is the sort of thing that looks like tidying.

**Separately, and regardless: do not delete the expiry-tracking pattern.** Environmental permits and consents need renewal tracking, and calibration due dates need it too — both appear in the plan's own research cards for units 3 and 4. Retire the medical certifications module if it is confirmed; keep the component.

## 2.2 The safety-to-clinical boundary is missing

The plan gives the safety incident an "optional affected-person reference visible only to the Health and Wellness Officer". In the prototype that is acceptable, because one person holds both roles. In the specification it is a gap, and the gap is load-bearing.

An injured employee produces two records: a safety incident and a clinical encounter. They are not the same record, and once a dedicated Safety Officer role exists, the rule must already be written down:

> The safety incident may carry a reference to a clinical encounter. From that reference the safety module may read exactly one fact: whether the person was treated at the Infirmary, yes or no. It may not read the encounter. The safety officer sees "treated at Infirmary: yes"; the diagnosis, narrative and examination remain as inaccessible to them as they are to the Division Head.

This is ADR-03 holding at a boundary ADR-03 never anticipated. Write it into SRS v1.2 now, while it is free. Retrofitting it after a safety officer has been reading injury detail for six months is a different and much harder conversation.

## 2.3 De-identification by name removal is not de-identification

The plan gives the Manager "de-identified incident details". At the plan's own seeded volume — six events in a month — an incident row reading *laceration, paint shop, night shift, 14 July* identifies one person to anyone who works there. Removing the name accomplishes very little.

The system already has the right machinery and the right precedent: minimum cell size suppression, at FR-KPI-10, adopted so that a single case in a small unit cannot be attributed to an individual. **Apply the same discipline to incident drilldowns.** Suppress or coarsen location, shift and date where the combination is identifying, exactly as clinical aggregates are suppressed. If that makes the Manager view too coarse to be useful, that is a real finding worth putting to the Data Protection Officer, and better discovered in a prototype than in production.

## 2.4 Add a near-miss indicator

The plan captures near misses in the event classification but reports none of them.

This matters more given the decision that S2 counts any injury including first aid, against a target of zero. If every first-aid case counts against zero and nothing rewards reporting, the cheapest way to hit the target is to stop reporting first aid, and the register degrades exactly where early warning lives. Two safeguards, both cheap:

- Show S2 **banded by severity** rather than as one number, so four first-aid cases are visibly different from one lost-time injury.
- Add **S5, near-miss and dangerous-occurrence reports, higher is better**, as an informational card. Label the direction explicitly so a rising number is not misread as deterioration.

The plan already introduces an informational dashboard status for counts that are not pass/fail, so S5 costs almost nothing to add.

## 2.5 Resolve the specifications rather than adding to them

The plan proposes SRS v1.2 while "preserving earlier documents as historical records". The problem is that v1.0 and v1.1 are not historical — they are both live and they contradict each other on retention, hosting, patient categories, minimum cell size and now architecture. A third document alongside two that disagree produces three.

**Required.** SRS v1.2 opens with a superseded-documents table stating that it replaces v1.0 and v1.1 in their entirety, and that where any earlier document differs, v1.2 governs. Keep the earlier files for the record, mark them superseded at the top of each. Carry forward v1.1's confirmed / proposed / open labelling discipline applied to v1.0's completeness, plus ADR-13 for the microservice topology, the safety unit, the read-only roles and the unit structure.

## 2.6 Put it under version control

There is no Git repository in this project — `.git` exists as an empty directory. Nothing is committed anywhere.

The registered principal delivery risk is handover. The larger and more mundane risk today is that the entire project exists in one filesystem. This costs ten minutes and should precede everything else in the v0.3 plan.

---

# 3. Recommended additions

Not blocking, in descending order of value.

**Seed an unattested period.** The attestation design is the plan's best idea and the walkthrough currently cannot show it. Seed July 2026 attested as specified, and August 2026 open with no events, so the stakeholder sees "No data" and an attested zero side by side. That contrast is the entire argument for the mechanism and it takes one seed record to demonstrate.

**Enumerate the severity values explicitly.** The plan lists "highest severity" without its values. Specify them — fatality, lost-time, restricted work or job transfer, medical treatment, first aid only, no injury — because S2's banding depends on them and an under-specified enum is where two developers quietly disagree.

**Add hours worked to the monthly return.** One optional field, clearly labelled as not feeding any v0.3 metric. Its purpose is to ask the stakeholder a question at the moment they are looking at the return screen: can HR supply monthly man-hours? That answer determines whether rate-based safety metrics are ever possible, and P-07 stays open until someone asks.

**State why the Director sees less than the Manager.** Director gets executive summaries, Manager gets unit drilldowns. That is defensible — the Director is the executive consumer, the Manager the operational one — but it inverts the usual hierarchy, and the first director to notice will read it as a bug rather than a design. One sentence of rationale in the spec prevents that conversation.

**Decide where the monthly return lives in the new navigation.** The plan places absenteeism under Occupational Health but does not say where the return screen itself sits. It feeds surveillance and absenteeism, and would later carry hours worked for safety, so it is cross-cutting rather than clinical. Recommend a top-level item, as in the production plan's navigation.

**Add the greyscale check to verification.** The verification list is thorough on behaviour and silent on the one design rule most easily lost: status is never carried by colour alone. Build Brief Section 1.2 makes `filter: grayscale(100%)` part of the definition of done. The four new safety cards and the informational and not-applicable statuses are new status types and are exactly where this slips.

**Verify that the research cards contain no figures.** The plan states it as an intent. Make it a checked item, because a chart with plausible axes is the single most likely thing to be mistaken for a working capability.

---

# 4. What the two tracks must keep straight

| Question | Prototype track | Production track |
|---|---|---|
| Authentication | Demo accounts, one module, deletable whole | Keycloak, OIDC, backend-for-frontend session |
| Roles | Labels driving navigation | Keycloak roles enforced at handler and service layer, proved by test |
| Storage | Browser local storage, schema v2 | Postgres per service, clinical on a separate instance |
| Recordability rule | Manual determination | Manual determination, later pre-filled from an effective-dated reference row |
| Attestation | Blocks period close in the interface | Blocks period close in the service layer, audited |
| Research cards | Benchmark proposals, no data entry | Become real modules only when the unit owner confirms scope |
| Safety data entry | Health and Wellness Officer, temporarily | Dedicated safety officer role, with 2.2 and 2.3 enforced |

The prototype's enduring output is three things: confirmed decisions, the design language, and the React components that express it. Its code is not migrated. Say so wherever the prototype is described, or someone will eventually ask why production is "starting again".

---

# 5. Second-pass review of the revised plan

The revised plan resolves every required change in Sections 2 and 3. The K6 and K7 withdrawal is now properly attributed and dated, the safety-to-clinical boundary is specified, suppression is applied to drilldowns, S5 is added, and SRS v2.0 supersedes rather than joins. The six consistency corrections requested of the production plan were valid and are applied at v1.2. What follows is what remains.

## 5.1 Suppression by cell alone is defeated by subtraction

**The most important finding in this pass.** The plan suppresses any breakdown cell below five while keeping company-level totals visible. Those two rules are in tension, and the tension is arithmetic rather than procedural, so the verification item "cannot be reconstructed through filters" does not catch it.

If total injuries are 12, unit A shows 8, and unit B is suppressed, then unit B is 4 — the reader subtracts. Suppressing one cell in a breakdown that sums to a published total suppresses nothing. This is a well-understood problem in statistical disclosure and it has a standard answer: **complementary suppression**. When one cell in a row or column is suppressed, a second must be suppressed as well, chosen so that no cell is recoverable by subtraction from any published margin.

Three options, in order of preference for this system:

1. Implement complementary suppression in the aggregation guard, which is the single function all clinical- and incident-derived aggregates already pass through. One implementation, tested directly against the subtraction case.
2. Publish the breakdown without the total, so there is no margin to subtract from.
3. Coarsen the breakdown until every cell clears the threshold, accepting that some months yield a single row.

Whichever is chosen, add a verification item that constructs the subtraction attack explicitly and asserts it fails. A suppression rule that has not been tested against arithmetic is decoration.

## 5.2 At the seeded volume, the Manager view is suppressed almost entirely

With six events, three injuries, two recordable and three near misses, every identifying breakdown falls below five. The Manager drilldown in the demonstration will be a table of "<5".

That is the correct behaviour and it should not be softened. It is also a finding, and it needs to be presented as one rather than discovered live: **at this plant's incident volume, meaningful unit-level safety breakdowns cannot be shown to management without identifying individuals.** The Data Protection Officer has a genuine decision to make — accept coarse reporting, approve a lower threshold with reasons, or restrict the drilldown to the safety function.

Prepare it as a talking point in the walkthrough. Without one, a stakeholder sees a screen of "<5" and concludes the prototype is broken.

## 5.3 Verification omits the attestation behaviour

The earlier plan asserted that empty unattested periods show "No data" while attested zero-event periods show zero. The revision seeds both July and August to demonstrate exactly this, then drops the assertion from the verification list.

Restore it. Attestation is the strongest idea in the plan and the distinction it creates is the one most easily lost to a well-meaning refactor that treats an absent record as a zero.

## 5.4 Ten primary cards is more than an executive dashboard carries

Five Health and Wellness indicators plus five safety indicators is ten cards in a three-across grid: four rows, with the tenth alone on the last. Nothing is wrong with the metrics; the arrangement will read as a wall.

Group them under unit headings — Health and Wellness, then Workplace Safety — so the eye lands on two blocks rather than ten tiles, and so the structure of the dashboard mirrors the structure of the department it reports on. This also leaves an obvious place for units 3 and 4 when their metrics exist.

## 5.5 Two small consistency items

**The `recordedBy` rename is withdrawn but the withdrawal is not stated.** The earlier plan renamed `PatientVisit.clinician`; the revision retains `clinician` internally. Both readings are defensible and the revision's is better, but say the earlier instruction is withdrawn or an agent working from both documents will do both.

**The Git baseline is no longer "the untouched v0.2 project".** The working tree already contains the production build plan, this review, and edits to the SRS drafts. Either commit the current state as the baseline and say so in the commit message, or stage the prototype directory alone for the first commit and the planning documents for the second. The distinction only matters because the plan's own wording promises something the tree can no longer provide.

## 5.6 One governance point carried into the production plan

The K6 and K7 withdrawal now rests on a verbal decision, recorded second-hand, by a person whose title is not known to the project, omitted from the minutes of the meeting at which it was given — and it withdraws two indicators from a template that goes to Executive Management every month.

The attribution is the right fix and it is enough to proceed on. It is not enough to hand over on. Obtain it in writing, with the confirmer's role, before the attachment ends. This is recorded as the residual action on P-11.

---

**End of review**
