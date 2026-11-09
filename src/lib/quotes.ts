import {
  getAllConversationIndexes,
  getAllTags,
  getConversationBySlug,
  getConversationPath,
  getConversationsByTag,
  getHomePath,
  getTagArchiveByRouteParam as getConversationTagArchiveByRouteParam,
  getTagPath,
  getTagRouteParam,
  groupConversationIndexesByDay,
  type ConversationGroup,
  type ConversationIndexRecord,
  type TagArchive as ConversationTagArchive,
  type TagCount,
} from "./conversations";
import type { TimePrecision } from "./time";

export type QuoteRecord = {
  id: string;
  slug: string;
  time: string;
  timePrecision: TimePrecision;
  speaker: string;
  source: string;
  tags: string[];
  body: string;
  renderedTime: string;
  sortTime: Date;
};

export type QuoteGroup = {
  key: string;
  label: string;
  quotes: QuoteRecord[];
};

export type { TagCount };

export type TagArchive = TagCount & {
  quotes: QuoteRecord[];
};

function cloneQuoteRecord(quote: QuoteRecord): QuoteRecord {
  return {
    ...quote,
    tags: [...quote.tags],
    sortTime: new Date(quote.sortTime.getTime()),
  };
}

function toQuoteRecord(conversation: ConversationIndexRecord): QuoteRecord {
  return {
    id: conversation.id,
    slug: conversation.slug,
    time: conversation.featuredMessage.time,
    timePrecision: conversation.timePrecision,
    speaker: conversation.featuredMessage.speaker.name,
    source: conversation.source,
    tags: [...conversation.tags],
    body: conversation.featuredMessage.text,
    renderedTime: conversation.featuredMessage.renderedTime,
    sortTime: new Date(conversation.sortTime.getTime()),
  };
}

function toQuoteGroup(group: ConversationGroup): QuoteGroup {
  return {
    key: group.key,
    label: group.label,
    quotes: group.conversations.map(toQuoteRecord),
  };
}

function toTagArchive(archive: ConversationTagArchive): TagArchive {
  return {
    tag: archive.tag,
    count: archive.count,
    quotes: archive.conversations.map(toQuoteRecord),
  };
}

export async function getAllQuotes(): Promise<QuoteRecord[]> {
  const conversations = await getAllConversationIndexes();
  return conversations.map(toQuoteRecord).map(cloneQuoteRecord);
}

export async function getQuoteBySlug(
  slug: string,
): Promise<QuoteRecord | undefined> {
  const conversation = await getConversationBySlug(slug);

  return conversation ? cloneQuoteRecord(toQuoteRecord(conversation)) : undefined;
}

export async function getQuotesByTag(tag: string): Promise<QuoteRecord[]> {
  const conversations = await getConversationsByTag(tag);
  return conversations.map(toQuoteRecord).map(cloneQuoteRecord);
}

export { getAllTags, getHomePath, getTagPath, getTagRouteParam };

export function getQuotePath(slug: string): string {
  return getConversationPath(slug);
}

export async function getTagArchiveByRouteParam(
  tagParam: string,
): Promise<TagArchive | undefined> {
  const archive = await getConversationTagArchiveByRouteParam(tagParam);
  return archive ? toTagArchive(archive) : undefined;
}

export function groupQuotesByDay(quotes: QuoteRecord[]): QuoteGroup[] {
  const conversations = quotes.map((quote) => ({
    id: quote.id,
    slug: quote.slug,
    date: quote.sortTime.toISOString().slice(0, 10),
    renderedDate: quote.renderedTime,
    timePrecision: quote.timePrecision,
    source: quote.source,
    tags: [...quote.tags],
    featuredMessage: {
      id: `${quote.slug}:featured`,
      messageIndex: 0,
      speakerId: quote.speaker,
      speaker: {
        id: quote.speaker,
        name: quote.speaker,
        avatar: "",
      },
      time: quote.time,
      renderedTime: quote.renderedTime,
      text: quote.body,
      featured: true,
      sortTime: new Date(quote.sortTime.getTime()),
    },
    sortTime: new Date(quote.sortTime.getTime()),
  }));

  return groupConversationIndexesByDay(conversations).map(toQuoteGroup);
}
