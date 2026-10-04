import { withDatabase } from "@/lib/database/mongoose";
import { type IRelatedSubject } from "@/interface";
import { escapeRegExp } from "@/lib/utils/regex";
import { Course } from "@/db/course";
import RelatedSubject from "@/db/relatedSubjects";
import UpcomingSubject from "@/db/upcoming-paper";
import { checkAndSyncUpcomingSlots } from "@/lib/services/upcoming-sync";

export async function getCourseList(){
	return await withDatabase(async () => {
		return await Course.find().lean();
	});
}

export async function getRelatedSubjects(subject: string) {
	return await withDatabase(async () => {
		const escapedSubject = escapeRegExp(subject);
		const subjects: IRelatedSubject[] = await RelatedSubject.find({
			subject: { $regex: new RegExp(`${escapedSubject}`, "i") },
		}).lean<IRelatedSubject[]>();

		return subjects[0]?.related_subjects ?? [];
	});
}

export async function getUpcomingSubjects() {
	return await withDatabase(async () => {
		await checkAndSyncUpcomingSlots();
		return await UpcomingSubject.find()
			.sort({ _id: 1 })
			.lean();
	});
}