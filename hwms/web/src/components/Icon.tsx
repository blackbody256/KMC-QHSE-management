import dashboard from "@material-symbols/svg-400/outlined/dashboard.svg?raw";
import clinicalNotes from "@material-symbols/svg-400/outlined/clinical_notes.svg?raw";
import accessibility from "@material-symbols/svg-400/outlined/accessibility_new.svg?raw";
import monitorHeart from "@material-symbols/svg-400/outlined/monitor_heart.svg?raw";
import report from "@material-symbols/svg-400/outlined/report.svg?raw";
import eco from "@material-symbols/svg-400/outlined/eco.svg?raw";
import factCheck from "@material-symbols/svg-400/outlined/fact_check.svg?raw";
import assignment from "@material-symbols/svg-400/outlined/assignment.svg?raw";
import manageAccounts from "@material-symbols/svg-400/outlined/manage_accounts.svg?raw";
import logout from "@material-symbols/svg-400/outlined/logout.svg?raw";
import login from "@material-symbols/svg-400/outlined/login.svg?raw";
import visibility from "@material-symbols/svg-400/outlined/visibility.svg?raw";
import chevronRight from "@material-symbols/svg-400/outlined/chevron_right.svg?raw";
import arrowBack from "@material-symbols/svg-400/outlined/arrow_back.svg?raw";
import help from "@material-symbols/svg-400/outlined/help.svg?raw";
import helpCenter from "@material-symbols/svg-400/outlined/help_center.svg?raw";
import info from "@material-symbols/svg-400/outlined/info.svg?raw";
import error from "@material-symbols/svg-400/outlined/error.svg?raw";
import checkCircle from "@material-symbols/svg-400/outlined/check_circle.svg?raw";
import lock from "@material-symbols/svg-400/outlined/lock.svg?raw";

/**
 * Icons are imported one at a time rather than through the Material Symbols
 * webfont.
 *
 * The variable font carries every symbol in the set and costs about 3.4 MB.
 * This registry costs roughly a kilobyte per icon, and it is deployed on
 * premise where a first load has no CDN to fall back on. Adding an icon means
 * adding a line here, which is a small and deliberate cost.
 */
const registry = {
  dashboard,
  clinical_notes: clinicalNotes,
  accessibility_new: accessibility,
  monitor_heart: monitorHeart,
  report,
  eco,
  fact_check: factCheck,
  assignment,
  manage_accounts: manageAccounts,
  logout,
  login,
  visibility,
  chevron_right: chevronRight,
  arrow_back: arrowBack,
  help,
  help_center: helpCenter,
  info,
  error,
  check_circle: checkCircle,
  lock,
} as const;

export type IconName = keyof typeof registry;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /**
   * Icons are decorative by default. An icon that carries meaning on its own
   * has already broken the rule that status is a glyph plus a word — so where
   * a label is genuinely absent, pass one here and it is announced.
   */
  label?: string;
}

export function Icon({ name, size = 20, className = "", label }: IconProps) {
  return (
    <span
      className={`icon ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      dangerouslySetInnerHTML={{ __html: registry[name] }}
    />
  );
}
