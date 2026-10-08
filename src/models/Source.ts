import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { TTelegramDialogType } from "../config/types.ts";

const sourceSchema = new Schema(
  {
    telegramId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["group", "supergroup", "channel"] satisfies TTelegramDialogType[],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

sourceSchema.index({ telegramId: 1 }, { unique: true });

export type TSource = InferSchemaType<typeof sourceSchema>;

const Source = mongoose.model("Source", sourceSchema);

export default Source;
