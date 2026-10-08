import mongoose, { Schema, type InferSchemaType } from "mongoose";

const processedMessageSchema = new Schema(
  {
    sourceId: {
      type: String,
      required: true,
      trim: true,
    },
    telegramMessageId: {
      type: Number,
      required: true,
    },
    processedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
  },
);

processedMessageSchema.index(
  { sourceId: 1, telegramMessageId: 1 },
  { unique: true },
);

export type TProcessedMessage = InferSchemaType<typeof processedMessageSchema>;

const ProcessedMessage = mongoose.model("ProcessedMessage", processedMessageSchema);

export default ProcessedMessage;
