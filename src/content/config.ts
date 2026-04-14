import { defineCollection, z } from "astro:content";

const trimmedNonEmptyString = z.string().trim().min(1);

const quotes = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("timePrecision", [
    z.object({
      time: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
      timePrecision: z.literal("date"),
      speaker: trimmedNonEmptyString,
      source: trimmedNonEmptyString,
      tags: z.array(trimmedNonEmptyString).default([]),
    }),
    z.object({
      time: z.string().trim().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      timePrecision: z.literal("minute"),
      speaker: trimmedNonEmptyString,
      source: trimmedNonEmptyString,
      tags: z.array(trimmedNonEmptyString).default([]),
    }),
  ]),
});

export const collections = { quotes };
