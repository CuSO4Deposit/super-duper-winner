import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const QUOTES_DIR = fileURLToPath(
  new URL("../src/content/quotes/", import.meta.url),
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const QUOTE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_FIELDS = ["slug", "time", "timePrecision", "speaker", "source", "tags"];

function stripInlineComment(rawValue) {
  let quoteCharacter;

  for (let index = 0; index < rawValue.length; index += 1) {
    const character = rawValue[index];
    const previousCharacter = rawValue[index - 1];

    if ((character === '"' || character === "'") && previousCharacter !== "\\") {
      if (quoteCharacter === character) {
        quoteCharacter = undefined;
      } else if (quoteCharacter === undefined) {
        quoteCharacter = character;
      }

      continue;
    }

    if (character === "#" && quoteCharacter === undefined) {
      return rawValue.slice(0, index).trimEnd();
    }
  }

  return rawValue.trimEnd();
}

function parseScalar(rawValue) {
  const value = stripInlineComment(rawValue).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseQuoteFile(source, fileLabel) {
  const normalizedSource = source.replaceAll("\r\n", "\n");
  const lines = normalizedSource.split("\n");

  if (lines[0] !== "---") {
    throw new Error(`${fileLabel}: missing opening frontmatter fence`);
  }

  const closingIndex = lines.indexOf("---", 1);

  if (closingIndex === -1) {
    throw new Error(`${fileLabel}: missing closing frontmatter fence`);
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const data = {};

  for (let index = 0; index < frontmatterLines.length; index += 1) {
    const line = frontmatterLines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const fieldMatch = /^\s*([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(line);

    if (!fieldMatch) {
      throw new Error(`${fileLabel}: invalid frontmatter line "${line}"`);
    }

    const [, key, rawValue] = fieldMatch;

    if (Object.hasOwn(data, key)) {
      throw new Error(`${fileLabel}: duplicate frontmatter field "${key}"`);
    }

    if (key === "tags") {
      const inlineValue = stripInlineComment(rawValue).trim();

      if (inlineValue === "[]") {
        data.tags = [];
        continue;
      }

      if (inlineValue !== "") {
        throw new Error(`${fileLabel}: tags must be a YAML array`);
      }

      const tags = [];

      while (index + 1 < frontmatterLines.length) {
        const nextLine = frontmatterLines[index + 1];
        const trimmedNextLine = nextLine.trim();

        if (!trimmedNextLine || trimmedNextLine.startsWith("#")) {
          index += 1;
          continue;
        }

        if (!/^\s*-\s/.test(nextLine)) {
          break;
        }

        index += 1;

        const itemMatch = /^\s*-\s?(.*)$/.exec(nextLine);

        if (!itemMatch) {
          throw new Error(`${fileLabel}: invalid tag entry "${nextLine}"`);
        }

        tags.push(parseScalar(itemMatch[1]));
      }

      data.tags = tags;
      continue;
    }

    data[key] = {
      raw: rawValue.trim(),
      value: parseScalar(rawValue),
    };
  }

  return { body, data };
}

function getRequiredValue(data, fieldName, fileLabel) {
  const entry = data[fieldName];

  if (entry === undefined) {
    throw new Error(`${fileLabel}: missing required field "${fieldName}"`);
  }

  if (typeof entry === "object" && entry !== null && "value" in entry) {
    return entry.value;
  }

  return entry;
}

function isValidCalendarDate(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function isValidDateValue(time) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(time);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  return isValidCalendarDate(Number(year), Number(month), Number(day));
}

function isValidMinuteValue(time) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute] = match;
  const numericHour = Number(hour);
  const numericMinute = Number(minute);

  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) {
    return false;
  }

  return numericHour >= 0 && numericHour <= 23 && numericMinute >= 0 && numericMinute <= 59;
}

function validateQuoteFile(parsedQuote, fileLabel, seenSlugs) {
  const { body, data } = parsedQuote;

  for (const fieldName of REQUIRED_FIELDS) {
    if (!Object.hasOwn(data, fieldName)) {
      throw new Error(`${fileLabel}: missing required field "${fieldName}"`);
    }
  }

  const slug = getRequiredValue(data, "slug", fileLabel);
  const time = getRequiredValue(data, "time", fileLabel);
  const timePrecision = getRequiredValue(data, "timePrecision", fileLabel);
  const speaker = getRequiredValue(data, "speaker", fileLabel);
  const source = getRequiredValue(data, "source", fileLabel);
  const tags = data.tags;

  if (typeof slug !== "string" || slug.trim() === "") {
    throw new Error(`${fileLabel}: slug must be a non-empty string`);
  }

  if (!QUOTE_SLUG_RE.test(slug)) {
    throw new Error(
      `${fileLabel}: slug must be a lowercase single path segment using only letters, numbers, and hyphens for /q/<slug>/`,
    );
  }

  const existingSlugOwner = seenSlugs.get(slug);

  if (existingSlugOwner) {
    throw new Error(
      `${fileLabel}: duplicate slug "${slug}" already used by ${existingSlugOwner}`,
    );
  }

  seenSlugs.set(slug, fileLabel);

  if (typeof speaker !== "string" || speaker.trim() === "") {
    throw new Error(`${fileLabel}: speaker must be a non-empty string`);
  }

  if (typeof source !== "string" || source.trim() === "") {
    throw new Error(`${fileLabel}: source must be a non-empty string`);
  }

  if (typeof time !== "string" || time.trim() === "") {
    throw new Error(`${fileLabel}: time must be a non-empty string`);
  }

  if (data.time.raw === "" || !/^(".*"|'.*')$/.test(data.time.raw)) {
    throw new Error(`${fileLabel}: time must be a quoted string`);
  }

  if (timePrecision !== "date" && timePrecision !== "minute") {
    throw new Error(`${fileLabel}: invalid timePrecision "${timePrecision}"`);
  }

  if (timePrecision === "date" && !DATE_RE.test(time)) {
    throw new Error(`${fileLabel}: time must match YYYY-MM-DD for date precision`);
  }

  if (timePrecision === "date" && !isValidDateValue(time)) {
    throw new Error(`${fileLabel}: time must be a real calendar date`);
  }

  if (timePrecision === "minute" && !MINUTE_RE.test(time)) {
    throw new Error(
      `${fileLabel}: time must match YYYY-MM-DD HH:MM for minute precision`,
    );
  }

  if (timePrecision === "minute" && !isValidMinuteValue(time)) {
    throw new Error(`${fileLabel}: time must be a real calendar date and time`);
  }

  if (!Array.isArray(tags)) {
    throw new Error(`${fileLabel}: tags must be an array`);
  }

  for (const tag of tags) {
    if (typeof tag !== "string" || tag.trim() === "") {
      throw new Error(`${fileLabel}: tags must contain only non-empty strings`);
    }
  }

  if (body.trim() === "") {
    throw new Error(`${fileLabel}: quote body must not be empty`);
  }
}

async function getQuoteFiles() {
  const entries = await readdir(QUOTES_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(QUOTES_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function main() {
  const files = await getQuoteFiles();
  const seenSlugs = new Map();
  const errors = [];

  for (const filePath of files) {
    const fileLabel = path.relative(process.cwd(), filePath) || filePath;

    try {
      const source = await readFile(filePath, "utf8");
      const parsedQuote = parseQuoteFile(source, fileLabel);
      validateQuoteFile(parsedQuote, fileLabel, seenSlugs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${files.length} quote files.`);
}

await main();
