const CONTRIBUTOR_KEY = "pyqvitap_anonymous_contributor_id";
const CONTRIBUTED_PAPERS_KEY = "pyqvitap_contributed_slot_papers";
const SKIPPED_PAPERS_KEY = "pyqvitap_skipped_slot_papers";

export function getOrCreateContributorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.localStorage.getItem(CONTRIBUTOR_KEY);
    if (existing && existing.trim().length >= 8) {
      return existing.trim();
    }

    let newId = "";
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      newId = crypto.randomUUID();
    } else {
      // Fallback using crypto.getRandomValues
      const bytes = new Uint8Array(16);
      if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < 16; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }
      newId = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    window.localStorage.setItem(CONTRIBUTOR_KEY, newId);
    return newId;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 12);
  }
}

export function hasContributedLocally(paperId: string): boolean {
  if (typeof window === "undefined" || !paperId) return false;
  try {
    const raw = window.localStorage.getItem(CONTRIBUTED_PAPERS_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(paperId);
  } catch {
    return false;
  }
}

export function markContributedLocally(paperId: string): void {
  if (typeof window === "undefined" || !paperId) return;
  try {
    const raw = window.localStorage.getItem(CONTRIBUTED_PAPERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(paperId)) {
      list.push(paperId);
      window.localStorage.setItem(CONTRIBUTED_PAPERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function hasSkippedLocally(paperId: string): boolean {
  if (typeof window === "undefined" || !paperId) return false;
  try {
    const raw = window.sessionStorage.getItem(SKIPPED_PAPERS_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(paperId);
  } catch {
    return false;
  }
}

export function markSkippedLocally(paperId: string): void {
  if (typeof window === "undefined" || !paperId) return;
  try {
    const raw = window.sessionStorage.getItem(SKIPPED_PAPERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(paperId)) {
      list.push(paperId);
      window.sessionStorage.setItem(SKIPPED_PAPERS_KEY, JSON.stringify(list));
    }
  } catch {}
}
