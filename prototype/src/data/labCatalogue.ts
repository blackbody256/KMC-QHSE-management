import type { LabSpecimenType, LabTestCode, LabTestGroup } from "../types";

/**
 * The investigations on KMC.DQHSE.05/26-FM008, exactly as the form lists them.
 *
 * This replaces the generic occupational health panel the prototype carried
 * before the form was supplied. That panel was a placeholder — liver function,
 * lipids, audiometry, spirometry and the rest — and none of it appears on the
 * form the clinic actually uses. Digitise the form, do not improve it.
 *
 * Anything added beyond the form is marked as such where it appears, so that a
 * reviewer can tell in one pass what KMC asked for from what we proposed.
 */
export interface LabTestDefinition {
  code: LabTestCode;
  /** The abbreviation as printed on the form. */
  shortName: string;
  /** The expansion as printed on the form. */
  fullName: string;
  group: LabTestGroup;
  /** Printed on the form against FBS. It is a patient instruction, not a note. */
  preparationNote?: string;
}

export const labTestGroups: LabTestGroup[] = [
  "Malaria & Parasitology",
  "Gastrointestinal & Serology",
  "Hematology",
  "Blood Glucose Monitoring",
];

export const labTestCatalogue: LabTestDefinition[] = [
  {
    code: "BS",
    shortName: "B/S",
    fullName: "Blood Smear for Malaria Parasites",
    group: "Malaria & Parasitology",
  },
  {
    code: "MRDT",
    shortName: "mRDT",
    fullName: "Malaria Rapid Diagnostic Test",
    group: "Malaria & Parasitology",
  },
  {
    code: "TYPHOID_AG",
    shortName: "Typhoid Ag",
    fullName: "Typhoid Antigen Test",
    group: "Gastrointestinal & Serology",
  },
  {
    code: "HPYLORI_AG",
    shortName: "Stool Ag H.pylori",
    fullName: "Helicobacter pylori Stool Antigen",
    group: "Gastrointestinal & Serology",
  },
  {
    code: "CBC",
    shortName: "CBC",
    fullName: "Complete Blood Count",
    group: "Hematology",
  },
  {
    code: "RBS",
    shortName: "RBS",
    fullName: "Random Blood Sugar",
    group: "Blood Glucose Monitoring",
  },
  {
    code: "FBS",
    shortName: "FBS",
    fullName: "Fasting Blood Sugar",
    group: "Blood Glucose Monitoring",
    preparationNote: "Requires 8–12 hours of fasting.",
  },
];

/** Specimen options in the For Laboratory Use Only block. */
export const labSpecimenTypes: LabSpecimenType[] = ["Whole Blood", "Serum/Plasma", "Stool"];

export const labTestByCode = (code: LabTestCode): LabTestDefinition | undefined =>
  labTestCatalogue.find((test) => test.code === code);

export const labTestsInGroup = (group: LabTestGroup): LabTestDefinition[] =>
  labTestCatalogue.filter((test) => test.group === group);

export const labTestLabel = (code: LabTestCode): string => {
  const test = labTestByCode(code);
  return test ? `${test.shortName} (${test.fullName})` : code;
};
