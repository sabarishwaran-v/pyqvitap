import { type IPaper, type TransformedPaper } from "../../interface";

export function transformPapersToSubjectSlots(papers: IPaper[]): TransformedPaper[] {
  if (!papers || papers.length === 0) {
    return [];
  }

  const subjectMap = new Map<string, { slotsSet: Set<string>; slotsList: string[] }>();
  const result: TransformedPaper[] = [];

  for (const paper of papers) {
    if (!paper) continue;
    const subject = paper.subject;
    const slot = paper.slot;

    const entry = subjectMap.get(subject);
    if (!entry) {
      const slotsList: string[] = [slot];
      const slotsSet = new Set<string>([slot]);
      subjectMap.set(subject, { slotsSet, slotsList });
      result.push({ subject, slots: slotsList });
    } else if (!entry.slotsSet.has(slot)) {
      entry.slotsSet.add(slot);
      entry.slotsList.push(slot);
    }
  }

  return result;
}