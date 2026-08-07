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
    description: "Patients, visits, laboratory testing, referrals and Health and Wellness registers.",
  },
  {
    id: "demo-manager",
    name: "Sarah N.",
    title: "Health and Wellness Manager",
    identifier: "manager@kmc.demo",
    password: "Manager#2026",
    role: "manager",
    description: "Read-only Health and Wellness summaries without individual clinical records.",
  },
  {
    id: "demo-director",
    name: "David A.",
    title: "Director · demonstration viewer",
    identifier: "director@kmc.demo",
    password: "Director#2026",
    role: "director",
    description: "Read-only Health and Wellness dashboard and trends.",
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
