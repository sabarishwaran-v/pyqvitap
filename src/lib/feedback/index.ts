import type { FeedbackCampaignPayload } from "./types";

export const STORAGE_KEY_COMPLETED_VERSION = "pyq_feedback_completed_v";
export const STORAGE_KEY_DISMISSED_AT = "pyq_feedback_dismissed_at";
export const STORAGE_KEY_PAPERS_COUNT = "pyq_feedback_papers_count";
export const STORAGE_KEY_FIRST_SEEN = "pyq_feedback_first_seen";

export const DEFAULT_VERSION = 1;
export const DEFAULT_MIN_PAPERS = 2;
export const DEFAULT_MIN_DURATION_SECONDS = 60;
export const DEFAULT_COOLDOWN_DAYS = 3;
export const DEFAULT_GITHUB_REPO = "https://github.com/sabarishwaran-v/pyqvitap";
export const DEFAULT_UPI_ID = "sabarishvenkat@ptsbi";
export const DEFAULT_UPI_NAME = "Sabarishwaran V";

/**
 * Increments the local paper engagement counter (views or downloads)
 * and dispatches a window event so active listeners can immediately evaluate triggers.
 */
export function incrementPaperEngagementCount(): number {
  if (typeof window === "undefined") return 0;

  try {
    const current = Number(localStorage.getItem(STORAGE_KEY_PAPERS_COUNT) || 0);
    const updated = current + 1;
    localStorage.setItem(STORAGE_KEY_PAPERS_COUNT, String(updated));

    if (!localStorage.getItem(STORAGE_KEY_FIRST_SEEN)) {
      localStorage.setItem(STORAGE_KEY_FIRST_SEEN, String(Date.now()));
    }

    window.dispatchEvent(
      new CustomEvent("pyq_paper_engaged", { detail: { count: updated } })
    );

    return updated;
  } catch {
    return 0;
  }
}

/**
 * Returns current count of papers engaged with.
 */
export function getPaperEngagementCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(STORAGE_KEY_PAPERS_COUNT) || 0);
  } catch {
    return 0;
  }
}

/**
 * Evaluates whether the current student is eligible to see the feedback prompt.
 */
export function isEligibleForFeedback(payload?: FeedbackCampaignPayload): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. Explicit disable check
    if (payload?.enabled === false) {
      return false;
    }

    const targetVersion = payload?.version ?? DEFAULT_VERSION;

    // 2. Check if student already completed this specific campaign version
    const completedVersion = Number(
      localStorage.getItem(STORAGE_KEY_COMPLETED_VERSION) || 0
    );
    if (completedVersion >= targetVersion) {
      return false;
    }

    // 3. Check 14-day dismissal cooldown
    const dismissedAt = Number(
      localStorage.getItem(STORAGE_KEY_DISMISSED_AT) || 0
    );
    const cooldownDays = payload?.cooldown_days ?? DEFAULT_COOLDOWN_DAYS;
    if (
      dismissedAt > 0 &&
      Date.now() - dismissedAt < cooldownDays * 24 * 60 * 60 * 1000
    ) {
      return false;
    }

    // 4. Value-moment engagement checks
    const papersCount = getPaperEngagementCount();
    const minPapers = payload?.min_papers ?? DEFAULT_MIN_PAPERS;

    if (papersCount >= minPapers) {
      return true;
    }

    // Secondary time-on-site check
    let firstSeen = Number(localStorage.getItem(STORAGE_KEY_FIRST_SEEN) || 0);
    if (!firstSeen) {
      firstSeen = Date.now();
      localStorage.setItem(STORAGE_KEY_FIRST_SEEN, String(firstSeen));
    }

    const durationSeconds = (Date.now() - firstSeen) / 1000;
    const minDuration = payload?.min_duration_seconds ?? DEFAULT_MIN_DURATION_SECONDS;

    // Must have viewed at least 1 paper and spent threshold time
    if (papersCount >= 1 && durationSeconds >= minDuration) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Records that the student has completed the feedback prompt for this version.
 */
export function recordFeedbackCompletion(version: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED_VERSION, String(version));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Records that the student dismissed the prompt, activating the 14-day cooldown.
 */
export function recordFeedbackDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED_AT, String(Date.now()));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Generates an official NPCI compliant UPI deep-link URL.
 */
export function generateUpiUrl(
  upiId: string,
  name: string,
  amount: number,
  note = "Support PyqVitAp"
): string {
  const cleanPa = encodeURIComponent(upiId.trim());
  const cleanPn = encodeURIComponent(name.trim());
  const cleanTn = encodeURIComponent(note.trim());
  const cleanAm = Math.max(1, Math.floor(amount));

  return `upi://pay?pa=${cleanPa}&pn=${cleanPn}&am=${cleanAm}&cu=INR&tn=${cleanTn}`;
}
