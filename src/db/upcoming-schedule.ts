import mongoose, { Schema, type Model } from "mongoose";

export type IUpcomingSchedule = {
  date: string;
  slot: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  courseCodes?: string[];
  sessions?: Record<string, string[]>;
};

const upcomingScheduleSchema = new Schema<IUpcomingSchedule>(
  {
    date: { type: String, required: true, unique: true },
    slot: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D", "E", "F", "G"],
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
  mongoose.models.UpcomingSchedule ??
  mongoose.model<IUpcomingSchedule>("UpcomingSchedule", upcomingScheduleSchema);

export default UpcomingSchedule;
