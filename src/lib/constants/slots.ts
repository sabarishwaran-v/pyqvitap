export const AUTHORITATIVE_SLOTS = [
  "A1", "A2", "B1", "B2", "C1", "C2",
  "D1", "D2", "E1", "E2", "F1", "F2",
  "G1", "G2",
] as const;

export type AuthoritativeSlot = typeof AUTHORITATIVE_SLOTS[number];

export const MIN_SLOT_CONTRIBUTIONS = 10;
export const MIN_SLOT_CONSENSUS = 0.70;

export function isValidSlot(slot: unknown): slot is AuthoritativeSlot {
  if (typeof slot !== "string") return false;
  const normalized = slot.trim().toUpperCase();
  return (AUTHORITATIVE_SLOTS as readonly string[]).includes(normalized);
}

export function normalizeSlot(slot: string): AuthoritativeSlot {
  const normalized = slot.trim().toUpperCase();
  if (!isValidSlot(normalized)) {
    throw new Error(`Invalid slot value: "${slot}". Allowed values: ${AUTHORITATIVE_SLOTS.join(", ")}`);
  }
  return normalized;
}

export function isValidContributorId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  // Validates non-empty string, accepts standard UUID or alphanumeric tokens up to 128 chars
  return trimmed.length >= 8 && trimmed.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}
