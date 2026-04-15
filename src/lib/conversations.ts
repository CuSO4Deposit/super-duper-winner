import { getCollection } from "astro:content";

import { requireSpeakerById, type SpeakerRecord } from "./speakers";
import { formatTime, parseTime, type TimePrecision } from "./time";

export type ConversationMessageRecord = {
  id: string;
  messageIndex: number;
  speakerId: string;
  speaker: SpeakerRecord;
  time: string;
  renderedTime: string;
  text: string;
  featured: boolean;
  sortTime: Date;
};

export type ConversationIndexRecord = {
  id: string;
  slug: string;
  date: string;
  renderedDate: string;
  timePrecision: TimePrecision;
  source: string;
  tags: string[];
  featuredMessage: ConversationMessageRecord;
  sortTime: Date;
};

export type ConversationRecord = ConversationIndexRecord & {
  messages: ConversationMessageRecord[];
};

export type FeaturedConversationRecord = ConversationIndexRecord;
export type ConversationThreadRecord = ConversationRecord;

export type ConversationGroup = {
  key: string;
  label: string;
  conversations: ConversationIndexRecord[];
};

export type TagCount = {
  tag: string;
  count: number;
};

export type TagArchive = TagCount & {
  conversations: ConversationIndexRecord[];
};

const ENCODED_TAG_ROUTE_PREFIX = "~";
const PLAIN_TAG_ROUTE_PARAM_PATTERN = /^[a-z0-9-]+$/i;
const BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL);

let conversationsCache: ConversationRecord[] | undefined;
let conversationsPromise: Promise<ConversationRecord[]> | undefined;

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl === "/") {
    return "/";
  }

  return `/${baseUrl.replace(/^\/+|\/+$/g, "")}/`;
}

function getAppPath(pathname = ""): string {
  const normalizedPathname = pathname.replace(/^\/+/, "");

  if (normalizedPathname.length === 0) {
    return BASE_URL;
  }

  return `${BASE_URL}${normalizedPathname}`;
}

function cloneSpeakerRecord(speaker: SpeakerRecord): SpeakerRecord {
  return { ...speaker };
}

function cloneConversationMessage(
  message: ConversationMessageRecord,
): ConversationMessageRecord {
  return {
    ...message,
    speaker: cloneSpeakerRecord(message.speaker),
    sortTime: new Date(message.sortTime.getTime()),
  };
}

function cloneConversationIndex(
  conversation: ConversationIndexRecord,
): ConversationIndexRecord {
  return {
    ...conversation,
    tags: [...conversation.tags],
    featuredMessage: cloneConversationMessage(conversation.featuredMessage),
    sortTime: new Date(conversation.sortTime.getTime()),
  };
}

function cloneConversationRecord(
  conversation: ConversationRecord,
): ConversationRecord {
  return {
    ...cloneConversationIndex(conversation),
    messages: conversation.messages.map(cloneConversationMessage),
  };
}

function compareConversations(
  left: ConversationIndexRecord,
  right: ConversationIndexRecord,
): number {
  const timeDiff = right.sortTime.getTime() - left.sortTime.getTime();

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return left.slug.localeCompare(right.slug);
}

function isPlainTagRouteParam(tag: string): boolean {
  return PLAIN_TAG_ROUTE_PARAM_PATTERN.test(tag);
}

function encodeTagRouteParam(tag: string): string {
  if (isPlainTagRouteParam(tag)) {
    return tag;
  }

  const bytes = new TextEncoder().encode(tag);
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${ENCODED_TAG_ROUTE_PREFIX}${hex}`;
}

function decodeTagRouteParam(tagParam: string): string | undefined {
  if (isPlainTagRouteParam(tagParam)) {
    return tagParam;
  }

  if (!tagParam.startsWith(ENCODED_TAG_ROUTE_PREFIX)) {
    return undefined;
  }

  const hex = tagParam.slice(ENCODED_TAG_ROUTE_PREFIX.length);

  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return undefined;
  }

  const bytes = new Uint8Array(
    hex.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  );

  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}

async function buildConversationMessage(
  conversationSlug: string,
  messageIndex: number,
  message: {
    speakerId: string;
    time: string;
    text: string;
    featured?: boolean;
  },
  timePrecision: TimePrecision,
): Promise<ConversationMessageRecord> {
  const speaker = await requireSpeakerById(message.speakerId);

  return {
    id: `${conversationSlug}:${messageIndex}`,
    messageIndex,
    speakerId: message.speakerId,
    speaker,
    time: message.time,
    renderedTime: formatTime(message.time, timePrecision),
    text: message.text,
    featured: message.featured === true,
    sortTime: parseTime(message.time, timePrecision),
  };
}

function getFeaturedMessage(
  conversationSlug: string,
  messages: ConversationMessageRecord[],
): ConversationMessageRecord {
  const featuredMessages = messages.filter((message) => message.featured);

  if (featuredMessages.length !== 1) {
    throw new Error(
      `Conversation "${conversationSlug}" must have exactly one featured message.`,
    );
  }

  return featuredMessages[0];
}

async function loadConversations(): Promise<ConversationRecord[]> {
  const entries = await getCollection("conversations");
  const conversations = await Promise.all(
    entries.map(async (entry) => {
      const messages = await Promise.all(
        entry.data.messages.map((message, index) =>
          buildConversationMessage(entry.data.slug, index, message, entry.data.timePrecision),
        ),
      );
      const featuredMessage = getFeaturedMessage(entry.data.slug, messages);
      const featuredMessageDate = featuredMessage.time.slice(0, 10);

      if (entry.data.date !== featuredMessageDate) {
        throw new Error(
          `Conversation "${entry.data.slug}" date "${entry.data.date}" must match featured message day "${featuredMessageDate}".`,
        );
      }

      return {
        id: entry.id,
        slug: entry.data.slug,
        date: entry.data.date,
        renderedDate: formatTime(entry.data.date, "date"),
        timePrecision: entry.data.timePrecision,
        source: entry.data.source,
        tags: [...entry.data.tags],
        featuredMessage,
        messages,
        sortTime: new Date(featuredMessage.sortTime.getTime()),
      };
    }),
  );

  return conversations.sort(compareConversations);
}

async function getCachedConversations(): Promise<ConversationRecord[]> {
  if (conversationsCache) {
    return conversationsCache.map(cloneConversationRecord);
  }

  if (!conversationsPromise) {
    conversationsPromise = loadConversations()
      .then((conversations) => {
        conversationsCache = conversations;
        conversationsPromise = undefined;
        return conversations;
      })
      .catch((error: unknown) => {
        conversationsPromise = undefined;
        throw error;
      });
  }

  return (await conversationsPromise).map(cloneConversationRecord);
}

export async function getAllConversationIndexes(): Promise<ConversationIndexRecord[]> {
  const conversations = await getCachedConversations();
  return conversations.map(cloneConversationIndex);
}

export const getAllFeaturedConversations = getAllConversationIndexes;

export async function getAllConversations(): Promise<ConversationRecord[]> {
  return await getCachedConversations();
}

export async function getConversationBySlug(
  slug: string,
): Promise<ConversationRecord | undefined> {
  const conversations = await getCachedConversations();
  const conversation = conversations.find((item) => item.slug === slug);

  return conversation ? cloneConversationRecord(conversation) : undefined;
}

export async function getConversationIndexBySlug(
  slug: string,
): Promise<ConversationIndexRecord | undefined> {
  const conversation = await getConversationBySlug(slug);
  return conversation ? cloneConversationIndex(conversation) : undefined;
}

export async function getConversationsByTag(
  tag: string,
): Promise<ConversationIndexRecord[]> {
  const conversations = await getCachedConversations();

  return conversations
    .filter((conversation) => conversation.tags.includes(tag))
    .map(cloneConversationIndex);
}

export const getFeaturedConversationsByTag = getConversationsByTag;

export async function getAllTags(): Promise<TagCount[]> {
  const conversations = await getCachedConversations();
  const counts = new Map<string, number>();

  for (const conversation of conversations) {
    for (const tag of conversation.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}

export function getTagRouteParam(tag: string): string {
  return encodeTagRouteParam(tag);
}

export function getTagFromRouteParam(tagParam: string): string | undefined {
  return decodeTagRouteParam(tagParam);
}

export function getHomePath(): string {
  return getAppPath();
}

export function getConversationPath(slug: string): string {
  return getAppPath(`q/${slug}/`);
}

export function getTagPath(tag: string): string {
  return getAppPath(`tag/${getTagRouteParam(tag)}/`);
}

export async function getConversationStaticPaths(): Promise<
  Array<{ params: { slug: string } }>
> {
  const conversations = await getAllConversationIndexes();

  return conversations.map((conversation) => ({
    params: { slug: conversation.slug },
  }));
}

export async function getTagStaticPaths(): Promise<
  Array<{ params: { tag: string } }>
> {
  const tags = await getAllTags();

  return tags.map(({ tag }) => ({
    params: { tag: getTagRouteParam(tag) },
  }));
}

export async function getTagArchiveByRouteParam(
  tagParam: string,
): Promise<TagArchive | undefined> {
  const tag = decodeTagRouteParam(tagParam);

  if (tag === undefined) {
    return undefined;
  }

  const tags = await getAllTags();
  const tagMatch = tags.find((tagCount) => tagCount.tag === tag);

  if (!tagMatch) {
    return undefined;
  }

  return {
    ...tagMatch,
    conversations: await getConversationsByTag(tagMatch.tag),
  };
}

export function groupConversationIndexesByDay(
  conversations: ConversationIndexRecord[],
): ConversationGroup[] {
  const groups = new Map<string, ConversationIndexRecord[]>();

  for (const conversation of conversations) {
    const existing = groups.get(conversation.date);

    if (existing) {
      existing.push(cloneConversationIndex(conversation));
      continue;
    }

    groups.set(conversation.date, [cloneConversationIndex(conversation)]);
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatTime(key, "date"),
    conversations: items,
  }));
}

export const groupFeaturedConversationsByDay = groupConversationIndexesByDay;
