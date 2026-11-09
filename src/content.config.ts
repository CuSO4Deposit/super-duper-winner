import { defineCollection, z } from "astro:content";

const trimmedNonEmptyString = z.string().trim().min(1);
const stableIdPattern = /^[a-z0-9-]+$/;
const stableId = trimmedNonEmptyString.regex(stableIdPattern);

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidMinuteDateTimeString(value: string): boolean {
  const match = value.match(
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2})$/,
  );

  if (!match?.groups) {
    return false;
  }

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
}

function isValidMessageTime(
  value: string,
  timePrecision: "date" | "minute",
): boolean {
  return timePrecision === "date"
    ? isValidDateString(value)
    : isValidMinuteDateTimeString(value);
}

const messageSchema = z.object({
  speakerId: stableId,
  time: trimmedNonEmptyString,
  text: trimmedNonEmptyString,
  featured: z.boolean().optional(),
});

const conversations = defineCollection({
  type: "data",
  schema: z
    .object({
      slug: stableId,
      date: trimmedNonEmptyString.refine(isValidDateString, {
        message: "Date must be a real calendar date in YYYY-MM-DD format.",
      }),
      timePrecision: z.enum(["date", "minute"]),
      source: trimmedNonEmptyString,
      tags: z.array(trimmedNonEmptyString).default([]),
      messages: z.array(messageSchema).min(1),
    })
    .superRefine(({ messages, timePrecision }, ctx) => {
      for (const [index, message] of messages.entries()) {
        if (!isValidMessageTime(message.time, timePrecision)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              timePrecision === "date"
                ? "Message time must be a real calendar date in YYYY-MM-DD format."
                : "Message time must be a real date-time in YYYY-MM-DD HH:MM format.",
            path: ["messages", index, "time"],
          });
        }
      }
    }),
});

const speakers = defineCollection({
  type: "data",
  schema: z.record(
    stableId,
    z.object({
      name: trimmedNonEmptyString,
      avatar: trimmedNonEmptyString,
      variant: z.enum(["left", "right"]).optional(),
    }),
  ),
});

export const collections = {
  conversations,
  speakers,
};
