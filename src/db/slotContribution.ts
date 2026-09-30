import mongoose, { Schema, type Model, Types } from "mongoose";
import { AUTHORITATIVE_SLOTS, type AuthoritativeSlot } from "@/lib/constants/slots";

export interface ISlotContributionDoc {
  _id: Types.ObjectId;
  paperId: Types.ObjectId;
  slot: AuthoritativeSlot;
  contributorId: string;
  createdAt: Date;
}

const slotContributionSchema = new Schema<ISlotContributionDoc>(
  {
    paperId: {
      type: Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
      index: true,
    },
    slot: {
      type: String,
      enum: AUTHORITATIVE_SLOTS,
      required: true,
    },
    contributorId: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "slot_contributions",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Enforce unique contribution per contributor per paper:
slotContributionSchema.index({ paperId: 1, contributorId: 1 }, { unique: true });
// Index for fast vote aggregation:
slotContributionSchema.index({ paperId: 1, slot: 1 });

const SlotContribution: Model<ISlotContributionDoc> =
  mongoose.models.SlotContribution ??
  mongoose.model<ISlotContributionDoc>(
    "SlotContribution",
    slotContributionSchema,
    "slot_contributions"
  );

export default SlotContribution;
