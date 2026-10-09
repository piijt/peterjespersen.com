import mongoose, { Schema, model } from "mongoose";

/** One day of one account. Upserted on every sync, so re-fetching a year is idempotent. */
const contributionDaySchema = new Schema(
  {
    login: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    count: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "contribution_days" },
);
contributionDaySchema.index({ login: 1, date: 1 }, { unique: true });

/** A sync attempt, for /health and for knowing when the data was last refreshed. */
const syncRunSchema = new Schema(
  {
    startedAt: { type: Date, required: true },
    finishedAt: Date,
    ok: Boolean,
    full: Boolean,
    fetched: [{ _id: false, login: String, year: Number, days: Number }],
    error: String,
  },
  { collection: "sync_runs" },
);
syncRunSchema.index({ startedAt: -1 });

export const ContributionDay = model("ContributionDay", contributionDaySchema);
export const SyncRun = model("SyncRun", syncRunSchema);

export async function connect(uri: string) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all([ContributionDay.syncIndexes(), SyncRun.syncIndexes()]);
}

export const disconnect = () => mongoose.disconnect();
