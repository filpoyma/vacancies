import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

export type TPendingApplicationStatus = "pending" | "sent" | "failed";
export type TPendingApplicationChannel = "telegram" | "email";
export type TPendingApplicationProfile = "frontend" | "fullstack";

const pendingApplicationSchema = new Schema(
  {
    vacancyId: {
      type: Schema.Types.ObjectId,
      ref: "Vacancy",
      required: true,
    },
    fingerprint: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ["telegram", "email"] satisfies TPendingApplicationChannel[],
      required: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      type: String,
      enum: ["frontend", "fullstack"] satisfies TPendingApplicationProfile[],
      required: true,
    },
    draftMessageId: {
      type: Number,
      required: true,
    },
    notificationChatId: {
      type: String,
      required: true,
      trim: true,
    },
    vacancyTitle: {
      type: String,
      trim: true,
    },
    vacancyUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"] satisfies TPendingApplicationStatus[],
      default: "pending",
    },
    error: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

pendingApplicationSchema.index(
  { notificationChatId: 1, draftMessageId: 1 },
  { unique: true },
);

export type TPendingApplication = InferSchemaType<typeof pendingApplicationSchema>;

export interface IPendingApplicationDoc extends TPendingApplication {
  _id: Types.ObjectId;
}

const PendingApplication = mongoose.model("PendingApplication", pendingApplicationSchema);

export default PendingApplication;
