import UpcomingSlot from "@/db/upcoming-slot";
import UpcomingSubject from "@/db/upcoming-paper";
import UpcomingSchedule from "@/db/upcoming-schedule";
import CourseCount, { Course } from "@/db/course";
import examScheduleData from "@/data/exam_schedule_courses.json";
import slotToSubjectsData from "@/data/slot_to_subjects.json";
import { getTodayDateInIST, isAtOrAfterCutoffInIST } from "@/lib/utils/time";

const slotToSubjectsMap = slotToSubjectsData as Record<string, string[]>;
const examScheduleMap = examScheduleData as Record<
  string,
  Record<string, string[]> | string[]
>;

const SLOT_ORDER = ["A", "B", "C", "D", "E", "F", "G"] as const;
type SlotKey = (typeof SLOT_ORDER)[number];

function isSlotKey(value: string): value is SlotKey {
  return SLOT_ORDER.includes(value as SlotKey);
}

function getSelectedGroupKeys(slot: SlotKey): SlotKey[] {
  const index = SLOT_ORDER.indexOf(slot);
  if (index === -1) return [];
  const current = SLOT_ORDER[index];
  if (!current) return [];
  if (current === "G") return ["G"];
  const next = SLOT_ORDER[index + 1];
  return next ? [current, next] : [current];
}

export async function checkAndSyncUpcomingSlots(): Promise<void> {
  const today = getTodayDateInIST();
  if (!today) return;

  const currentSlotDoc = await UpcomingSlot.findOne();

  // Read syncMode ("CAT" or "FAT") set once on UpcomingSlot
  const syncMode = currentSlotDoc?.syncMode ?? "CAT";
  const pastCutoff = isAtOrAfterCutoffInIST(syncMode);

  // If today is at or after cutoff, today's exam session is done, so look for the next exam date strictly > today.
  // If before cutoff, look for today's exam or the first upcoming exam date >= today.
  const targetDateFilter = pastCutoff
    ? { date: { $gt: today } }
    : { date: { $gte: today } };

  const scheduleDoc = await UpcomingSchedule.findOne(
    targetDateFilter,
    { _id: 0, date: 1, slot: 1, courseCodes: 1, sessions: 1 },
  )
    .sort({ date: 1 })
    .lean<{
      date: string;
      slot: string;
      courseCodes?: string[];
      sessions?: Record<string, string[]>;
    } | null>();

  // If there are no future exam schedules in the database (e.g. all exams finished):
  if (!scheduleDoc) {
    if (currentSlotDoc?.lastSyncedDate !== "COMPLETED") {
      await UpcomingSubject.deleteMany({});
      await UpcomingSlot.findOneAndUpdate(
        {},
        { $set: { slot: "NONE", lastSyncedDate: "COMPLETED" } },
        { upsert: true },
      );
    }
    return;
  }

  const scheduledSlotRaw = scheduleDoc.slot;
  if (!scheduledSlotRaw || !isSlotKey(scheduledSlotRaw)) return;
  const scheduledSlot = scheduledSlotRaw;

  // Cache key combines the exam date and slot, plus cutoff flag, so it only recomputes when slot changes
  const syncKey = `${scheduleDoc.date}:${scheduledSlot}:${pastCutoff ? "POST" : "PRE"}`;
  if (currentSlotDoc?.lastSyncedDate === syncKey) {
    return; // Already synced for this exact slot! Fast return.
  }

  // Resolve target course codes and their sub-slot tags for this scheduled slot
  const codeToSlots = new Map<string, Set<string>>();

  // Priority 1: Sub-slot sessions directly in MongoDB document (e.g. { "A1": [...], "A2": [...] })
  if (scheduleDoc?.sessions && typeof scheduleDoc.sessions === "object") {
    for (const [subSlotKey, codes] of Object.entries(scheduleDoc.sessions)) {
      if (Array.isArray(codes)) {
        for (const code of codes) {
          const clean = code.replace("*", "").trim().toUpperCase();
          if (!clean) continue;
          if (!codeToSlots.has(clean)) codeToSlots.set(clean, new Set());
          codeToSlots.get(clean)!.add(subSlotKey);
        }
      }
    }
  }

  // Priority 2: Flat courseCodes directly in MongoDB document (e.g. ["CSE2018", ...])
  if (
    scheduleDoc?.courseCodes &&
    Array.isArray(scheduleDoc.courseCodes) &&
    scheduleDoc.courseCodes.length > 0
  ) {
    for (const code of scheduleDoc.courseCodes) {
      const clean = code.replace("*", "").trim().toUpperCase();
      if (!clean) continue;
      if (!codeToSlots.has(clean)) codeToSlots.set(clean, new Set());
      codeToSlots.get(clean)!.add(`Slot ${scheduledSlot}`);
    }
  }

  // Priority 3: Fallback to exam_schedule_courses.json if MongoDB document didn't specify course codes
  if (codeToSlots.size === 0) {
    const slotConfig = examScheduleMap[scheduledSlot];
    if (slotConfig) {
      if (Array.isArray(slotConfig)) {
        for (const code of slotConfig) {
          const clean = code.replace("*", "").trim().toUpperCase();
          if (!clean) continue;
          if (!codeToSlots.has(clean)) codeToSlots.set(clean, new Set());
          codeToSlots.get(clean)!.add(`Slot ${scheduledSlot}`);
        }
      } else if (typeof slotConfig === "object") {
        for (const [subSlotKey, codes] of Object.entries(slotConfig)) {
          if (Array.isArray(codes)) {
            for (const code of codes) {
              const clean = code.replace("*", "").trim().toUpperCase();
              if (!clean) continue;
              if (!codeToSlots.has(clean)) codeToSlots.set(clean, new Set());
              codeToSlots.get(clean)!.add(subSlotKey);
            }
          }
        }
      }
    }
  }

  // Fetch all existing courses from DB to match course codes against actual DB courses
  const allCourses = await Course.find({}, { _id: 0, name: 1 }).lean<
    Array<{ name: string }>
  >();

  const courseMap = new Map<string, string>(); // courseCode -> full name in DB
  for (const c of allCourses) {
    const match = c.name.match(/\[(.*?)\]/);
    if (match?.[1]) {
      const code = match[1].trim().toUpperCase();
      courseMap.set(code, c.name);
    }
  }

  // Fetch paper frequencies from CourseCount
  const frequencyRows = await CourseCount.find(
    {},
    { _id: 0, name: 1, count: 1 },
  ).lean<Array<{ name: string; count: number }>>();

  const countMap = new Map<string, number>();
  for (const row of frequencyRows) {
    countMap.set(row.name, row.count);
  }

  let finalSubjects: Array<{ subject: string; slots: string[]; count: number }> = [];

  if (codeToSlots.size > 0) {
    // Exact Course-Code Mode: Match scheduled course codes against courses existing in the DB
    for (const [code, slotSet] of codeToSlots.entries()) {
      const fullCourseName = courseMap.get(code);
      // ONLY include courses that exist in the database!
      if (fullCourseName) {
        finalSubjects.push({
          subject: fullCourseName,
          slots: Array.from(slotSet).sort(),
          count: countMap.get(fullCourseName) ?? 0,
        });
      }
    }

    // Sort by paper count descending, then alphabetically by subject name
    finalSubjects.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.subject.localeCompare(b.subject);
    });
  } else {
    // Fallback: Legacy slot_to_subjects.json mapping if no course codes are configured
    const selectedGroupKeys = getSelectedGroupKeys(scheduledSlot);
    const candidateSubjects = new Set<string>();
    for (const groupKey of selectedGroupKeys) {
      const subSlots = [`${groupKey}1`, `${groupKey}2`];
      for (const subSlot of subSlots) {
        const subjects = slotToSubjectsMap[subSlot] ?? [];
        for (const subject of subjects) {
          candidateSubjects.add(subject);
        }
      }
    }

    finalSubjects = Array.from(candidateSubjects).map((subject) => ({
      subject,
      count: countMap.get(subject) ?? 0,
      slots: Object.entries(slotToSubjectsMap)
        .filter(([, subjects]) => subjects.includes(subject))
        .map(([token]) => token),
    }));

    finalSubjects.sort((a, b) => b.count - a.count);
  }

  await UpcomingSlot.findOneAndUpdate(
    {},
    { $set: { slot: scheduledSlot, lastSyncedDate: syncKey } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await UpcomingSubject.deleteMany({});
  if (finalSubjects.length > 0) {
    await UpcomingSubject.insertMany(
      finalSubjects.map((item) => ({
        subject: item.subject,
        slots: item.slots,
      })),
    );
  }
}
