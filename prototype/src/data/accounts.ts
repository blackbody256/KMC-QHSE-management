import type { DemoUser } from "../types";

export interface DemoAccount extends DemoUser {
  password: string;
  description: string;
}

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-health-wellness-officer",
    name: "Miriam K.",
    title: "Health and Wellness Officer",
    identifier: "officer@kmc.demo",
    password: "Officer#2026",
    role: "health-wellness-officer",
    description: "Patient history, visits, operational registers, incidents and attestations.",
  },
  {
    id: "demo-manager",
    name: "Sarah N.",
    title: "QHSE Manager",
    identifier: "manager@kmc.demo",
    password: "Manager#2026",
    role: "manager",
    description: "Read-only operational summaries and privacy-controlled unit drilldowns.",
  },
  {
    id: "demo-director",
    name: "David A.",
    title: "QHSE Director",
    identifier: "director@kmc.demo",
    password: "Director#2026",
    role: "director",
    description: "Read-only company-level executive dashboard and trends.",
  },
];

export const authenticateDemoAccount = (
  identifier: string,
  password: string,
): DemoUser | null => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const account = demoAccounts.find(
    (item) =>
      item.identifier.toLowerCase() === normalizedIdentifier && item.password === password,
  );
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    title: account.title,
    identifier: account.identifier,
    role: account.role,
  };
};
