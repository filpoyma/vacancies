import mongoose, { Schema, type InferSchemaType } from "mongoose";

const salarySchema = new Schema(
  {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, trim: true },
  },
  { _id: false },
);

const telegramMessageRefSchema = new Schema(
  {
    sourceId: {
      type: String,
      required: true,
      trim: true,
    },
    messageId: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const vacancySchema = new Schema(
  {
    fingerprint: {
      type: String,
      required: true,
      trim: true,
    },
    sourceIds: {
      type: [String],
      default: [],
    },
    telegramMessages: {
      type: [telegramMessageRefSchema],
      default: [],
    },
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    description: {
      type: String,
      required: true,
    },
    salary: {
      type: salarySchema,
    },
    location: { type: String, trim: true },
    remote: { type: Boolean },
    skills: {
      type: [String],
      default: [],
    },
    experience: { type: Number },
    contact: { type: String, trim: true },
    url: { type: String, trim: true },
    matchScore: { type: Number },
    isRelevant: { type: Boolean },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

vacancySchema.index({ fingerprint: 1 }, { unique: true });

export type TVacancy = InferSchemaType<typeof vacancySchema>;

const Vacancy = mongoose.model("Vacancy", vacancySchema);

export default Vacancy;
