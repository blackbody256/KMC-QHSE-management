import type { DemoRole } from "../types";

const officerOnlyPrefixes = [
  "/patients",
  "/patient-visits",
  "/laboratory",
  "/referrals",
];

const operationalPrefixes = [
  "/monthly-returns",
  "/industrial-hygiene",
  "/ergonomics-wellness",
];

export const roleCanAccessPath = (role: DemoRole, path: string): boolean => {
  if (path === "/" || path === "/access-denied") return true;
  if (officerOnlyPrefixes.some((prefix) => path.startsWith(prefix))) {
    return role === "health-wellness-officer";
  }
  if (operationalPrefixes.some((prefix) => path.startsWith(prefix))) {
    return role === "health-wellness-officer" || role === "manager";
  }
  return true;
};

export const roleCanEdit = (role: DemoRole) => role === "health-wellness-officer";

export const roleDescription = (role: DemoRole) => {
  switch (role) {
    case "health-wellness-officer":
      return "Clinical and operational entry";
    case "manager":
      return "Read-only operational review";
    case "director":
      return "Read-only executive oversight";
  }
};
