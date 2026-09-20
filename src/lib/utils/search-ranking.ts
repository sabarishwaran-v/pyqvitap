import type { ICourseWithCount } from "@/interface";
import type Fuse from "fuse.js";

/**
 * Normalizes query and course title text:
 * - Lowercase
 * - Trim leading and trailing whitespace
 * - Collapse multiple whitespace characters into a single space
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parses a course name into its display title, course code, and full name.
 * Typical format: "Calculus for Engineers [MAT1001]"
 */
export function parseCourse(name: string): { title: string; code: string; fullName: string } {
  if (!name) return { title: "", code: "", fullName: "" };
  const trimmed = name.trim();
  const codeMatch = /\[([^\]]+)\]\s*$/.exec(trimmed);
  const code = codeMatch && codeMatch[1] ? codeMatch[1].trim() : "";
  const title = trimmed.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
  return { title, code, fullName: trimmed };
}

/**
 * Calculates the relevance tier of a course given a normalized query.
 *
 * Ranking priority:
 * 1. Exact course title match
 * 2. Course title starts with the query
 * 3. A word/token in the course title starts with the query (or phrase at word boundary)
 * 4. Exact word/token match
 * 5. Course code starts with the query
 * 6. Course code contains the query
 * 7. General substring match anywhere in the course title or full name
 * 8. Fuzzy match fallback (Fuse.js)
 */
export function getCourseRelevanceTier(
  course: ICourseWithCount,
  normQuery: string,
  fuseScore?: number
): number {
  if (!normQuery) return 999;

  const { title, code, fullName } = parseCourse(course.name);
  const normTitle = normalizeSearchText(title);
  const normCode = normalizeSearchText(code);
  const normFullName = normalizeSearchText(fullName);

  // 1. Exact course title match
  if (normTitle === normQuery || normFullName === normQuery) {
    return 1;
  }

  // 2. Course title starts with the query
  if (normTitle.startsWith(normQuery)) {
    return 2;
  }

  // Tokenize title into alphanumeric words
  const titleWords = normTitle.split(/[^a-z0-9]+/).filter(Boolean);
  const queryWords = normQuery.split(/[^a-z0-9]+/).filter(Boolean);

  // 3. A word/token starts with the query
  // For single-word query: check if any title word starts with query
  // For multi-word query: check if the phrase matches starting at a word boundary
  const escapedQuery = normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordBoundaryRegex = new RegExp(`(^|\\s)${escapedQuery}`, "i");

  const wordStartsWithQuery = titleWords.some((word) => word.startsWith(normQuery));
  const phraseMatchesWordBoundary = wordBoundaryRegex.test(normTitle);

  // Multi-word token prefix match: e.g. "fundamentals of el"
  let multiWordPrefixMatch = false;
  if (queryWords.length > 1) {
    let titleIdx = 0;
    let allFound = true;
    for (const qWord of queryWords) {
      const matchIdx = titleWords.slice(titleIdx).findIndex((w) => w.startsWith(qWord));
      if (matchIdx === -1) {
        allFound = false;
        break;
      }
      titleIdx += matchIdx + 1;
    }
    multiWordPrefixMatch = allFound;
  }

  if (wordStartsWithQuery || phraseMatchesWordBoundary || multiWordPrefixMatch) {
    return 3;
  }

  // 4. Exact word/token match
  const exactWordMatch = titleWords.some((word) => word === normQuery);
  if (exactWordMatch) {
    return 4;
  }

  // 5. Course code starts with the query
  if (normCode && normCode.startsWith(normQuery)) {
    return 5;
  }

  // 6. Course code contains the query
  if (normCode && normCode.includes(normQuery)) {
    return 6;
  }

  // 7. General substring match anywhere in the course title or full name
  if (normTitle.includes(normQuery) || normFullName.includes(normQuery)) {
    return 7;
  }

  // 8. Fuzzy match fallback
  if (fuseScore !== undefined && fuseScore < 0.4) {
    return 8;
  }

  return 999;
}

/**
 * Filters and ranks courses based on relevance.
 *
 * Deterministic tie-breaking:
 * 1. Relevance tier (ascending: 1 is best, 8 is lowest)
 * 2. Higher paper count (descending)
 * 3. Course title alphabetically (ascending)
 */
export function rankCourses(
  courses: ICourseWithCount[],
  query: string,
  fuseInstance?: Fuse<ICourseWithCount>
): ICourseWithCount[] {
  const normQuery = normalizeSearchText(query);
  if (!normQuery || normQuery.length <= 1 || courses.length === 0) {
    return [];
  }

  const fuseMap = new Map<string, number>();
  if (fuseInstance) {
    const fuseResults = fuseInstance.search(query);
    for (const res of fuseResults) {
      fuseMap.set(res.item.name, res.score ?? 0.5);
    }
  }

  const scoredResults: {
    item: ICourseWithCount;
    tier: number;
    fuseScore: number;
  }[] = [];

  for (const course of courses) {
    const fuseScore = fuseMap.get(course.name);
    const tier = getCourseRelevanceTier(course, normQuery, fuseScore);

    if (tier <= 8) {
      scoredResults.push({
        item: course,
        tier,
        fuseScore: fuseScore ?? 1,
      });
    }
  }

  // Deterministic sorting
  scoredResults.sort((a, b) => {
    // 1. Primary: Relevance tier
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    // 2. Secondary: Higher paper count
    const countA = a.item.count ?? 0;
    const countB = b.item.count ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }

    // 3. Tertiary: Alphabetical course title
    return a.item.name.localeCompare(b.item.name);
  });

  return scoredResults.map((r) => r.item);
}
