# Agent prompt — v0.4 refocus on Occupational Health

Paste everything below the line into the agent session, with these files attached:

- `docs/KMC_HWMS_Production_Build_Plan_v1.2.md`
- `docs/KMC_HWMS_Prototype_v0.3_Plan_Review.md`
- the current SRS
- `MEDICAL_REFERRAL_TREATMENT_FORM (2).pdf`
- `Meeting started 2026_08_04 11_17 UTC - Notes by Gemini.pdf`
- the client's dashboard summary image

---

You are revising the KMC prototype and its documentation after a client meeting on 4 August 2026 and a scope decision taken immediately after it.

## 1. What changed

The client reviewed the prototype and was satisfied with the direction. He then consulted his superiors and established that **the other divisions already run their own systems**. The scope therefore narrows.

This system now covers the **Health and Wellness division only**, which the client defined in the meeting as three units:

1. **Occupational Health** — clinic visits and laboratory testing
2. **Ergonomics and Wellness**
3. **Industrial Hygiene**

**Remove entirely:** Quality Inspection and Testing, and Environment and Sustainability. Delete their routes, navigation entries, research cards, types, seed data and documentation sections. Do not leave them as disabled placeholders — they belong to systems this project does not own, and a placeholder for a module that will never be built is worse than no placeholder at all.

Removing them is a deletion of work already done. Record it in the decision register with the date and the reason, so that a future reader can see the scope was cut deliberately rather than forgotten.

## 2. The dashboard

The client supplied a summary graphic. Treat it as the specification for **which** indicators exist, their targets and their directions. Do **not** treat its numbers as data to seed — those are his June 2026 figures, not ours.

Of its five panels, only the second is in scope. Build this KPI set exactly:

| KPI | Target | Direction |
|---|---|---|
| Fatality | 0 | Lower is better |
| Total Recordable Incidents | 0 | Lower is better |
| Total Recordable Injuries | 0 | Lower is better |
| Reportable Near Misses | **≥ 200** | **Higher is better** |
| Health-Related Absenteeism | < 0.5 days per person per month | Lower is better |

Alongside these, retain the occupational health indicators already built: surveillance compliance, occupational disease cases, industrial hygiene compliance, and ergonomic risk control.

Three requirements from the graphic's layout:

- **Two value columns per KPI: the reporting month and the year-to-date average.** The prototype holds monthly returns, so the year-to-date column is computed from them. Where the history is incomplete, the year-to-date cell says so rather than averaging whatever happens to exist.
- **Three status states, not two.** The graphic uses a green tick for on target, an amber warning for approaching, and a red cross for off target. This matches the existing StatusIndicator; keep using it and do not introduce a second way to render a status.
- **A summary band at the top** giving the count of KPIs on target, in the form the graphic uses. With one division in scope this is a single card, not four.

**Note the near-miss target and get its direction right.** The client's own target is at least 200 reportable near misses, and his June figure of 20 is marked as a failure. More near-miss reports is better, because it means people are reporting. Label the direction explicitly on the card. A reader who assumes every safety number should fall will read that card backwards, and a dashboard that appears to punish reporting will produce silence.

## 3. New feature — laboratory testing

Occupational Health covers clinic visits **and laboratory testing**. Build laboratory test entry.

The client has undertaken to obtain the actual laboratory forms from his laboratory staff, and has not yet supplied them. Until he does, build against a generic occupational health panel and **mark every field as a proposal awaiting the real forms**, in the same way unconfirmed unit scopes were marked before.

Two records, not one:

**Test request** — requesting officer, date and time, patient, specimen type, tests requested, clinical indication, whether the request is routine or urgent, and whether it relates to pre-employment, periodic surveillance, exit, or an incident. That last field matters: it links a test to the surveillance programme that KPI 1 measures.

**Test result** — one row per analyte, carrying the value, the unit, the reference range applied, an abnormality flag, the verifying practitioner, and the result date.

Candidate panels for the generic template: full blood count, liver function, renal function, random or fasting blood sugar, urinalysis, lipid profile, and the occupational screens — audiometry, spirometry, vision screening, and exposure monitoring such as blood lead where relevant.

**Reference ranges are effective-dated reference data, exactly like the environmental limits.** They are not constants in the source. A result stores the range it was evaluated against, and the abnormality flag is written once and never recomputed when a range is later revised. This is the same rule that governs environmental standards, and for the same reason: changing a range must not silently rewrite the history of which results were abnormal.

An abnormal result warns; it never blocks entry.

## 4. New feature — medical referral

Digitise `KMC.DQHSE.02/26-FM004`, the KMC Referral Medical Form. Two capabilities: data entry, and download as a PDF that reproduces the printed form.

Capture the form's own sections and fields:

- **Section A, preliminary information** — referred to, name, position, age, sex, department, division, unit, contact number, supervisor's name, date, time.
- **Clinical features** — free text.
- **Clinical findings** — blood pressure, pulse rate, respiratory rate, temperature, oxygen saturation, pain score, weight, height, and a derived body mass index.
- **General examination** — stable, sick-looking, pale, jaundiced, dehydrated, other.
- **Past medical history** — hypertension, diabetes, asthma, epilepsy, peptic ulcer disease, tuberculosis, HIV, mental health condition, none, other.
- **Occupational consideration** — work-related as yes, no or suspected; suspected exposure; investigations done at the infirmary; provisional diagnosis; treatment given.
- **Reason for referral** — further evaluation, specialist management, diagnostic imaging or laboratory investigations, emergency care, other.
- **Section B, infirmary clearance** — officer, position, signature, contact, date, time.
- **Section C, official authorisation** — Head of Division and Chief of Staff, each with name, signature, date and remarks.
- **External medical facility feedback** — facility, attending practitioner, diagnosis, treatment provided, recommended follow-up, recommended sick leave with a day count and date range, practitioner signature and stamp, date.
- **KMC infirmary follow-up review** — review comments, reviewed by, position, signature, date.

Design notes:

- The referral is raised **from a patient visit** and pre-fills from it. Re-keying vital signs that were recorded ten minutes earlier is how the two records come to disagree.
- Recommended sick leave from the returning form feeds health-related absenteeism. Wire that link, or the referral becomes a document store rather than part of the system.
- The external feedback and follow-up review sections are completed **after** the referral is issued, so the record has a lifecycle: drafted, authorised, issued, returned, reviewed. Show it.
- The generated PDF must reproduce the printed layout closely enough to be recognised by someone who uses the paper form, including the form number and the confidentiality declaration.

## 5. Raise these; do not resolve them yourself

Four problems are present in the source documents. Each is the kind that is cheap to raise now and expensive to discover later. Put each in the decision register with a proposed answer, and implement the proposal only where it is safe to do so.

**5.1 The referral form breaks the clinical confidentiality rule.** Section C requires the Head of Division and the Chief of Staff to sign a document that contains a provisional diagnosis, HIV status and mental health condition. The governing decision in this project is that no management role sees an individual clinical record. These cannot both stand.

Do not quietly implement management authorisation over a clinical document. Propose instead that the authorisation view exposes only what an authoriser needs — the patient, the destination facility, the reason for referral and the cost implication — while the clinical detail remains with the clinician and the receiving facility. Then ask the client and the data protection owner which they want. If KMC decides that authorisers do see the clinical content, that is their decision to make knowingly, and it must be recorded as one.

**5.2 The form has a numbering defect.** There are two sections labelled "Section E" and no Section D. Follow the form as printed, flag the defect, and propose the correction.

**5.3 The form says "KMC infirmary officer".** The role was renamed to Health and Wellness Officer. The printed form is the client's document, not ours — do not silently change it. Flag the discrepancy and ask whether the form should be reissued or the printed wording retained.

**5.4 Ask who owns the safety figures now.** Fatalities, recordable incidents, recordable injuries and near misses sit under Workplace Safety, which is a separate division that may already have its own system. If it does, these numbers belong to that system and should enter here as attributed monthly returns or through an integration seam — not through a full incident register this project maintains in parallel.

This matters more than it looks. Building an incident register whose data is authoritatively held elsewhere creates two sources for one number, and the first time they disagree, nobody will know which is right. Establish where the figures come from before building the capture screens for them. Until the client answers, keep the metrics on the dashboard and mark their provenance honestly.

## 6. Naming

The 4 August meeting set the system name to the DQHSE Dashboard, covering four divisions. The scope decision taken after that meeting reduced it to one division. A name claiming departmental coverage now overstates what the system does, and the first person from another division who opens it will expect their data.

Propose a name matching the actual scope and ask the client to confirm. Note in the register that the DQHSE naming decision was overtaken by the scope decision that followed it.

## 7. Documentation

Update, and keep each document's supersession explicit:

- **The SRS** — new version. Remove the two divisions from scope, add laboratory testing and medical referral as requirement sets, revise the KPI catalogue to the table in section 2 above, and add the confidentiality conflict at 5.1 as a decision item with a proposed answer.
- **The prototype specification** — new version, matching what is actually built.
- **The stakeholder decision register** — add every item in section 5, plus the scope reduction and the naming question, each with an owner.
- **The production build plan** — revise the phase order. Laboratory testing and referral are now part of the clinical phase rather than later releases, and the removed divisions come out of the expansion section.

Preserve superseded documents, marked as superseded at the top. Do not delete history.

## 8. Rules that have not changed

1. KMC red is brand chrome only. It never indicates status.
2. Status is a glyph, then a word, then a colour. Apply `filter: grayscale(100%)` before calling any screen finished.
3. Measured values render in the mono face with tabular figures.
4. No limit, target, threshold or reference range in application source. All of them are effective-dated reference data.
5. Missing data renders as "no data", never as zero, and never styled as a failure.
6. Individual clinical records remain accessible to the Health and Wellness Officer only.
7. Synthetic data only, visibly labelled.
8. An abnormal clinical value warns and never blocks.
9. The system records what a clinician decided. It does not diagnose, recommend or suggest.

## 9. Done when

- Quality and Environment are gone from the interface, the types, the seed data and the documentation, with the removal recorded.
- The five occupational health and safety KPIs render with the client's targets, both value columns, and the near-miss card explicitly labelled higher-is-better.
- A laboratory request can be raised from a visit, results entered against reference ranges held as reference data, and an abnormal result flagged without blocking.
- A referral can be raised from a visit, pre-filled, taken through its lifecycle, and downloaded as a PDF a paper user would recognise.
- Recommended sick leave from a returned referral reaches health-related absenteeism.
- Every item in section 5 appears in the decision register with an owner and a proposed answer, and none of them has been silently resolved in code.
- The greyscale check passes on every changed screen.
- Tests and the production build pass.
