import type { IconName } from "../components/Icon";
import type { Role } from "./session";

/**
 * The navigation and route table for the whole system.
 *
 * This is the single declaration of who may open what. The rail renders from
 * it, the route guards read it, and the redirect after sign-in derives from
 * it. Two lists would eventually disagree, and the one that disagreed silently
 * would be the one governing access.
 *
 * Items are hidden entirely, never disabled, when a role has no access. A
 * disabled control tells someone there is something they are not allowed to
 * do, which invites a conversation about being allowed to do it.
 */
export interface NavItem {
  path: string;
  label: string;
  /** Must be registered in components/Icon.tsx. */
  icon: IconName;
  /** Roles that may open the route. */
  roles: Role[];
  /** Roles that see the route without any entry, approval or edit control. */
  readOnlyFor?: Role[];
  /** Short description used on the module scaffolds. */
  summary?: string;
  children?: NavItem[];
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const officer: Role = "hwms-officer";
const manager: Role = "hwms-manager";
const director: Role = "hwms-director";

export const navigation: NavGroup[] = [
  {
    label: null,
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
        roles: [officer, manager, director],
        summary:
          "Divisional performance against target, by reporting period, with the provenance of every figure.",
      },
    ],
  },
  {
    label: "Health and wellness",
    items: [
      {
        path: "/health-wellness/occupational-health",
        label: "Occupational health",
        icon: "clinical_notes",
        roles: [officer],
        summary:
          "Patient registry, visits, surveillance and occupational disease cases. Individual records are accessible to the Health and Wellness Officer only.",
      },
      {
        path: "/health-wellness/ergonomics",
        label: "Ergonomics and wellness",
        icon: "accessibility_new",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Workstation assessments with a compliant, partially compliant or non-compliant outcome, and the corrective actions raised from them.",
      },
      {
        path: "/health-wellness/industrial-hygiene",
        label: "Industrial hygiene",
        icon: "monitor_heart",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Occupational exposure and indoor workplace readings from the shared monitoring register, evaluated against the standard in force on the date of the reading.",
      },
    ],
  },
  {
    label: "Workplace safety",
    items: [
      {
        path: "/workplace-safety",
        label: "Incidents and investigations",
        icon: "report",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Incident register, severity and recordability determination, investigations and corrective actions, and the monthly attestation that makes a zero defensible.",
      },
    ],
  },
  {
    label: "Environment and quality",
    items: [
      {
        path: "/environment",
        label: "Environment and sustainability",
        icon: "eco",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Ambient monitoring, permits and consents, waste, water, emissions and energy. Scope is a benchmark proposal awaiting confirmation by the unit owner.",
      },
      {
        path: "/quality",
        label: "Quality inspection and testing",
        icon: "fact_check",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Incoming, in-process and final inspection, test results, non-conformity and calibration. Scope is a benchmark proposal awaiting confirmation by the unit owner.",
      },
    ],
  },
  {
    label: "Reporting",
    items: [
      {
        path: "/monthly-returns",
        label: "Monthly returns",
        icon: "assignment",
        roles: [officer, manager],
        readOnlyFor: [manager],
        summary:
          "Figures sourced outside this system, entered once a month with their source, entering user and date recorded against them.",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        path: "/accounts",
        label: "Accounts",
        icon: "manage_accounts",
        roles: [manager],
        summary:
          "Health and Wellness Officer and Director accounts. Every creation, enabling and disabling is written to the audit log.",
      },
    ],
  },
];

/** Every route in the table, flattened. */
export const allRoutes: NavItem[] = navigation.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

export function routeFor(path: string): NavItem | undefined {
  return allRoutes.find((item) => item.path === path);
}

export function canOpen(item: NavItem, role: Role | null): boolean {
  return role !== null && item.roles.includes(role);
}

export function isReadOnly(item: NavItem, role: Role | null): boolean {
  return role !== null && (item.readOnlyFor ?? []).includes(role);
}

/** Groups filtered to what this role may open. */
export function navigationFor(role: Role | null): NavGroup[] {
  if (!role) return [];
  return navigation
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => canOpen(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Where a role lands after signing in.
 *
 * The officer lands on the work rather than the dashboard, per UI-01. Someone
 * who opens this system to record a patient visit should not have to navigate
 * past a performance summary to reach it.
 */
export function homePathFor(role: Role | null): string {
  switch (role) {
    case "hwms-officer":
      return "/health-wellness/occupational-health";
    case "hwms-manager":
    case "hwms-director":
      return "/dashboard";
    default:
      return "/login";
  }
}
