import { getCollection } from "astro:content";

import { formatQuoteTime, parseQuoteTime, type TimePrecision } from "./time";

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

export type TagCount = {
  tag: string;
  count: number;
};

export type TagArchive = TagCount & {
  quotes: QuoteRecord[];
};

const ENCODED_TAG_ROUTE_PREFIX = "~";
const PLAIN_TAG_ROUTE_PARAM_PATTERN = /^[a-z0-9-]+$/i;
const BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL);

let quotesCache: QuoteRecord[] | undefined;
let quotesPromise: Promise<QuoteRecord[]> | undefined;

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

function cloneQuoteRecord(quote: QuoteRecord): QuoteRecord {
  return {
    ...quote,
    tags: [...quote.tags],
    sortTime: new Date(quote.sortTime.getTime()),
  };
}

function cloneQuoteRecords(quotes: QuoteRecord[]): QuoteRecord[] {
  return quotes.map(cloneQuoteRecord);
}

function compareQuotes(left: QuoteRecord, right: QuoteRecord): number {
  const timeDiff = right.sortTime.getTime() - left.sortTime.getTime();

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return left.slug.localeCompare(right.slug);
}

async function loadQuotes(): Promise<QuoteRecord[]> {
  const entries = await getCollection("quotes");

  return entries
    .map((entry) => {
      const sortTime = parseQuoteTime(entry.data.time, entry.data.timePrecision);

      return {
        id: entry.id,
        slug: entry.slug,
        time: entry.data.time,
        timePrecision: entry.data.timePrecision,
        speaker: entry.data.speaker,
        source: entry.data.source,
        tags: [...entry.data.tags],
        body: entry.body.trim(),
        renderedTime: formatQuoteTime(entry.data.time, entry.data.timePrecision),
        sortTime,
      };
    })
    .sort(compareQuotes);
}

function getCachedQuotes(): Promise<QuoteRecord[]> {
  if (quotesCache) {
    return Promise.resolve(quotesCache);
  }

  if (!quotesPromise) {
    quotesPromise = loadQuotes()
      .then((quotes) => {
        quotesCache = quotes;
        quotesPromise = undefined;
        return quotes;
      })
      .catch((error: unknown) => {
        quotesPromise = undefined;
        throw error;
      });
  }

  return quotesPromise;
}

export async function getAllQuotes(): Promise<QuoteRecord[]> {
  const quotes = await getCachedQuotes();
  return cloneQuoteRecords(quotes);
}

export async function getQuoteBySlug(
  slug: string,
): Promise<QuoteRecord | undefined> {
  const quotes = await getCachedQuotes();
  const quote = quotes.find((quoteItem) => quoteItem.slug === slug);
  return quote ? cloneQuoteRecord(quote) : undefined;
}

export async function getQuotesByTag(tag: string): Promise<QuoteRecord[]> {
  const quotes = await getCachedQuotes();
  return cloneQuoteRecords(
    quotes.filter((quote) => quote.tags.includes(tag)),
  );
}

export async function getAllTags(): Promise<TagCount[]> {
  const quotes = await getCachedQuotes();
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    for (const tag of quote.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
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

export function getTagRouteParam(tag: string): string {
  return encodeTagRouteParam(tag);
}

export function getHomePath(): string {
  return getAppPath();
}

export function getQuotePath(slug: string): string {
  return getAppPath(`q/${slug}/`);
}

export function getTagPath(tag: string): string {
  return getAppPath(`tag/${getTagRouteParam(tag)}/`);
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
    quotes: await getQuotesByTag(tagMatch.tag),
  };
}

export function groupQuotesByDay(quotes: QuoteRecord[]): QuoteGroup[] {
  const groups = new Map<string, QuoteRecord[]>();

  for (const quote of quotes) {
    const key = quote.sortTime.toISOString().slice(0, 10);
    const existing = groups.get(key);

    if (existing) {
      existing.push(quote);
      continue;
    }

    groups.set(key, [quote]);
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatQuoteTime(key, "date"),
    quotes: items,
  }));
}
