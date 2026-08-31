import type { jsPDF } from "jspdf";

/**
 * The letterhead and footer shared by every document this system generates.
 *
 * Kept in one place because a laboratory requisition and a referral letter are
 * the same organisation's paper. Two letterheads maintained separately drift,
 * and the one that drifts is discovered when a form comes back from an external
 * facility looking like it came from somewhere else.
 *
 * Documents are generated in the browser rather than served from an endpoint.
 * That is deliberate for a clinical document: there is no PDF URL to guess, and
 * the content reaches the page only through the audited clinical API, so a
 * download is already a logged read of the record it prints.
 */

const LOGO_PATH = "/logo.png";
/** 1356 × 271 as supplied. Held here so the mark is never drawn distorted. */
const LOGO_ASPECT = 1356 / 271;

let markPromise: Promise<HTMLImageElement | null> | null = null;

/**
 * The mark, loaded once per session and reused for every document after.
 *
 * A failure to load resolves to null rather than rejecting. Someone waiting on
 * a referral letter for a patient in front of them should get the letter
 * without the logo, not an error where the document should have been.
 */
export function loadBrandMark(): Promise<HTMLImageElement | null> {
  if (!markPromise) {
    markPromise = new Promise((resolve) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => resolve(null));
      image.src = LOGO_PATH;
    });
  }
  return markPromise;
}

export interface LetterheadOptions {
  /** The document's own line, beneath the division. */
  subtitle: string;
  /** The controlled form number, printed exactly as the form prints it. */
  formNumber: string;
  margin: number;
}

/**
 * Draws the letterhead block and returns the y coordinate the body starts at.
 *
 * The lockup is 5:1, so it sits at the left of the block with the headings
 * ranged beside it rather than centred beneath it. Centring a mark that wide
 * would cost eight millimetres of every page for no gain in recognition.
 */
export async function drawLetterhead(doc: jsPDF, options: LetterheadOptions): Promise<number> {
  const { subtitle, formNumber, margin } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;

  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(0.35);
  doc.rect(margin, 8, contentWidth, 26);

  const mark = await loadBrandMark();
  const logoHeight = 7;
  const logoWidth = logoHeight * LOGO_ASPECT;
  const textX = mark ? margin + 3 + logoWidth + 6 : margin + 4;

  if (mark) {
    doc.addImage(mark, "PNG", margin + 3, 8 + (26 - logoHeight) / 2, logoWidth, logoHeight);
  }

  const textWidth = contentWidth - (textX - margin) - 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DEPARTMENT OF QUALITY HEALTH SAFETY AND ENVIRONMENT MANAGEMENT", textX, 14, {
    maxWidth: textWidth,
  });
  doc.text("HEALTH AND WELLNESS DIVISION", textX, 19.5, { maxWidth: textWidth });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(subtitle, textX, 25, { maxWidth: textWidth });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(formNumber, textX, 30.5, { maxWidth: textWidth });

  return 41;
}

/**
 * The confidentiality declaration and page number.
 *
 * The declaration is not decoration. These documents leave the building, a
 * referral goes to an external facility, and the restriction has to travel on
 * the paper, because the paper is the only part of the system that goes with it.
 */
export function drawDocumentFooter(doc: jsPDF, margin: number, declaration: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(declaration, margin, pageHeight - 9, { maxWidth: contentWidth - 20 });
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 9, {
    align: "right",
  });
}
