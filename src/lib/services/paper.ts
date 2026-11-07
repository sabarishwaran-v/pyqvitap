import Paper from "@/db/papers";
import { type IPaper } from "@/interface";
import { escapeRegExp } from "@/lib/utils/regex";
import { extractUniqueValues } from "@/lib/utils/paper-aggregation";
import { withDatabase } from "../database/mongoose";
import CourseCount from "@/db/course";
import PaperRequest from "@/db/paperRequest";
import { type StoredSubjects } from "@/interface";
import { transformPapersToSubjectSlots } from "@/lib/services/paper-transform";

export interface CreatePaperInputType {
  subject: string;
  exam: string;
  slot: string;
  year: string;
}

export async function getPapersBySubject(subject: string) {
	if (!subject){
		throw new Error("Subject query parameter is required");
	}
	return await withDatabase(async () => {
		const escapedSubject = escapeRegExp(subject);
		console.log("[getPapersBySubject] querying for subject:", subject);
		console.log("[getPapersBySubject] escaped subject:", escapedSubject);
		// 1. Fast indexed exact match probe (O(1) B-tree lookup without regex engine overhead)
		let papers: IPaper[] = await Paper.find({
			subject: subject,
		}).lean<IPaper[]>();

		// 2. Exact match with case-insensitive boundary regex fallback
		if (papers.length === 0) {
			papers = await Paper.find({
				subject: { $regex: new RegExp(`^${escapedSubject}$`, "i") },
			}).lean<IPaper[]>();
		}

		let finalPapers = papers;
		if (papers.length === 0) {
			// Fallback to searching without exact boundary
			finalPapers = await Paper.find({
				subject: { $regex: new RegExp(`${escapedSubject}`, "i") },
			}).lean<IPaper[]>();
		}
		if (finalPapers.length === 0) {
			// Fallback to code search if subject is like 'NAME [CODE]'
			const codeMatch = subject.match(/\[([A-Z0-9]+)\]/);
			if (codeMatch && codeMatch[1]) {
				finalPapers = await Paper.find({
					subject: { $regex: new RegExp(`\\[${codeMatch[1]}\\]`, "i") },
				}).lean<IPaper[]>();
			}
		}

		const uniqueValues = extractUniqueValues(finalPapers);

		return {
			papers: finalPapers,
			...uniqueValues,
		};
	});
}

export async function getPaperById(id: string) {
	return await withDatabase(async () => {
		const paper = await Paper.findById(id).lean<IPaper | null>();

		if (!paper) {
			throw new Error("Paper not found"); // 404
		}

		return paper;
	});
}

export async function getCourseCounts(){
	return await withDatabase(async () => {
		const count = await CourseCount.find().lean();

		const formatted = count.map((item) => ({
			name: item.name,
			count: item.count,
		}));

		return formatted;
	});
}

export async function createPaperRequest({ subject, exam, slot, year} : CreatePaperInputType){
	return await withDatabase(async () => {
		const request = await PaperRequest.create({ subject, exam, slot, year });
		return request.toObject();
	});
}

export async function getSelectedPapers() {
	return await withDatabase(async () => {
		return await Paper.find({ isSelected: true }).limit(8).lean();
	});
}

interface CachedSubjectsPapers {
	data: ReturnType<typeof transformPapersToSubjectSlots>;
	expiresAt: number;
}
const papersBySubjectsCache = new Map<string, CachedSubjectsPapers>();
const PAPERS_BY_SUBJECTS_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export async function getPapersBySubjects(subjects: StoredSubjects) {
	if (!Array.isArray(subjects) || subjects.length === 0) {
		return [];
	}

	const cacheKey = subjects.slice().sort().join("::");
	const cached = papersBySubjectsCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	return await withDatabase(async () => {
		const usersPapers = await Paper.find({
			subject: { $in: subjects },
		}).lean<IPaper[]>();

		const transformed = transformPapersToSubjectSlots(usersPapers);

		if (papersBySubjectsCache.size > 500) {
			papersBySubjectsCache.clear();
		}
		papersBySubjectsCache.set(cacheKey, {
			data: transformed,
			expiresAt: Date.now() + PAPERS_BY_SUBJECTS_TTL_MS,
		});

		return transformed;
	});
}