import Paper from "@/db/papers";
import StudentPaper from "@/db/studentPaper";
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
		const codeMatch = subject.match(/\[([A-Z0-9]+)\]/);
		if (finalPapers.length === 0) {
			// Fallback to code search if subject is like 'NAME [CODE]'
			if (codeMatch && codeMatch[1]) {
				finalPapers = await Paper.find({
					subject: { $regex: new RegExp(`\\[${codeMatch[1]}\\]`, "i") },
				}).lean<IPaper[]>();
			}
		}

		// Query approved student papers from student_papers collection (production: true)
		let studentPapers = await StudentPaper.find({
			production: true,
			subject: subject,
		}).lean();

		if (studentPapers.length === 0) {
			studentPapers = await StudentPaper.find({
				production: true,
				subject: { $regex: new RegExp(`^${escapedSubject}$`, "i") },
			}).lean();
		}

		if (studentPapers.length === 0) {
			studentPapers = await StudentPaper.find({
				production: true,
				subject: { $regex: new RegExp(`${escapedSubject}`, "i") },
			}).lean();
		}

		if (studentPapers.length === 0 && codeMatch && codeMatch[1]) {
			studentPapers = await StudentPaper.find({
				production: true,
				subject: { $regex: new RegExp(`\\[${codeMatch[1]}\\]`, "i") },
			}).lean();
		}

		const approvedStudentPapers: IPaper[] = studentPapers.map((sp) => ({
			_id: sp._id.toString(),
			exam: (sp.exam || "CAT-1") as IPaper["exam"],
			file_url: sp.file_url,
			thumbnail_url: sp.thumbnail_url || "",
			semester: (sp.semester || "Fall Semester") as IPaper["semester"],
			campus: (sp.campus || "Andhra Pradesh") as IPaper["campus"],
			slot: sp.slot || "",
			subject: sp.subject || "",
			year: sp.year || "",
		}));

		const allPapers = [...finalPapers, ...approvedStudentPapers];
		const uniqueValues = extractUniqueValues(allPapers);

		return {
			papers: allPapers,
			...uniqueValues,
		};
	});
}

export async function getPaperById(id: string) {
	return await withDatabase(async () => {
		const paper = await Paper.findById(id).lean<IPaper | null>();

		if (paper) {
			return paper;
		}

		const studentPaper = await StudentPaper.findOne({ _id: id, production: true }).lean();
		if (studentPaper) {
			return {
				_id: studentPaper._id.toString(),
				exam: (studentPaper.exam || "CAT-1") as IPaper["exam"],
				file_url: studentPaper.file_url,
				thumbnail_url: studentPaper.thumbnail_url || "",
				semester: (studentPaper.semester || "Fall Semester") as IPaper["semester"],
				campus: (studentPaper.campus || "Andhra Pradesh") as IPaper["campus"],
				slot: studentPaper.slot || "",
				subject: studentPaper.subject || "",
				year: studentPaper.year || "",
			} as IPaper;
		}

		throw new Error("Paper not found"); // 404
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

		const studentPapers = await StudentPaper.find({
			subject: { $in: subjects },
			production: true,
		}).lean();

		const studentAsPapers: IPaper[] = studentPapers.map((sp) => ({
			_id: sp._id.toString(),
			exam: (sp.exam || "CAT-1") as IPaper["exam"],
			file_url: sp.file_url,
			thumbnail_url: sp.thumbnail_url || "",
			semester: (sp.semester || "Fall Semester") as IPaper["semester"],
			campus: (sp.campus || "Andhra Pradesh") as IPaper["campus"],
			slot: sp.slot || "",
			subject: sp.subject || "",
			year: sp.year || "",
		}));

		const transformed = transformPapersToSubjectSlots([...usersPapers, ...studentAsPapers]);

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
