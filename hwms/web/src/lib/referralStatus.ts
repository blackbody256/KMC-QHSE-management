import type { Status } from "../components/StatusIndicator";
import type { ReferralStatus } from "./api";

/**
 * How a referral's lifecycle state is shown.
 *
 * Declared once, because the list, the detail page and the patient record all
 * show it and three separate mappings would eventually disagree about what
 * "returned" looks like.
 *
 * Every state carries a glyph and a word before it carries a colour, per
 * NFR-UX-01. None of these are failures. A drafted referral is not a problem,
 * it is a referral someone is still writing, so none of them are styled as
 * one. "Reviewed" is the only within-target state because it is the only one
 * where nothing further is owed.
 */
export const referralStatusPresentation: Record<
  ReferralStatus,
  { status: Status; label: string; description: string }
> = {
  drafted: {
    // Informational, not "no data". A draft is a referral somebody is still
    // writing. The record exists and says so. The No data treatment made a
    // written referral look like a missing one.
    status: "informational",
    label: "Drafted",
    description: "Written, but not yet authorised.",
  },
  authorised: {
    status: "provisional",
    label: "Authorised",
    description: "Section C recorded. Not yet handed to the patient.",
  },
  issued: {
    status: "informational",
    label: "Issued",
    description: "With the patient or the receiving facility. Awaiting their feedback.",
  },
  returned: {
    status: "provisional",
    label: "Returned",
    description: "The facility has reported back. Awaiting the clinic's review.",
  },
  reviewed: {
    status: "within",
    label: "Reviewed",
    description: "Closed. Nothing further is outstanding on this referral.",
  },
};

/** The action that moves a referral to the given next state. */
export const nextStateAction: Record<ReferralStatus, string> = {
  drafted: "Return to draft",
  authorised: "Record authorisation",
  issued: "Mark as issued",
  returned: "Record facility feedback",
  reviewed: "Record follow-up review",
};
