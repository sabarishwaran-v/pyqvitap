import { Schema, type Model } from "mongoose";
import { getModel } from "@/lib/database/mongoose";

export type IUpcomingSchedule = {
  date: string;
  slot: string;
  courseCodes?: string[];
  sessions?: Record<string, string[]>;
};

const upcomingScheduleSchema = new Schema<IUpcomingSchedule>(
  {
    date: { type: String, required: true, unique: true },
    slot: {
      type: String,
      required: true,
    },
    courseCodes: {
      type: [String],
      default: [],
    },
    sessions: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

const UpcomingSchedule: Model<IUpcomingSchedule> =
  getModel<IUpcomingSchedule>("UpcomingSchedule", upcomingScheduleSchema);

export default UpcomingSchedule;
