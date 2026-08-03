import type { DemoUser } from "../types";

export interface DemoAccount extends DemoUser {
  password: string;
  description: string;
}

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-doctor",
    name: "Dr. Miriam K.",
    title: "Infirmary doctor",
    identifier: "doctor@kmc.demo",
    password: "Doctor#2026",
    role: "doctor",
    description: "Clinical records, patient history, visits, and operational registers.",
  },
  {
    id: "demo-manager",
    name: "Sarah N.",
    title: "Health & Wellness Manager",
    identifier: "manager@kmc.demo",
    password: "Manager#2026",
    role: "management",
    description: "Aggregate dashboard and operational data without patient-level records.",
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
