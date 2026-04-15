import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = fileURLToPath(new URL("../src/content/", import.meta.url));
const CONVERSATIONS_DIR = path.join(CONTENT_DIR, "conversations");
const SPEAKERS_DIR = path.join(CONTENT_DIR, "speakers");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const STABLE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseKeyValueLine(line, fileLabel) {
  const match = /^(\s*)([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(line);

  if (!match) {
    throw new Error(`${fileLabel}: invalid line "${line}"`);
  }

  return {
    indent: match[1].length,
    key: match[2],
    rawValue: match[3],
  };
}

function parseSpeakersFile(source, fileLabel) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const speakers = {};
  let currentSpeakerId;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const { indent, key, rawValue } = parseKeyValueLine(line, fileLabel);

    if (indent === 0) {
      if (stripInlineComment(rawValue).trim() !== "") {
        throw new Error(`${fileLabel}: speaker "${key}" must use nested fields`);
      }

      if (Object.hasOwn(speakers, key)) {
        throw new Error(`${fileLabel}: duplicate speakerId "${key}"`);
      }

      speakers[key] = {};
      currentSpeakerId = key;
      continue;
    }

    if (indent !== 2 || !currentSpeakerId) {
      throw new Error(`${fileLabel}: invalid speaker field indentation`);
    }

    const speaker = speakers[currentSpeakerId];

    if (Object.hasOwn(speaker, key)) {
      throw new Error(`${fileLabel}: duplicate field "${key}" for speaker "${currentSpeakerId}"`);
    }

    speaker[key] = parseScalar(rawValue);
  }

  return speakers;
}

function parseConversationFile(source, fileLabel) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const data = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      index += 1;
      continue;
    }

    const { indent, key, rawValue } = parseKeyValueLine(line, fileLabel);

    if (indent !== 0) {
      throw new Error(`${fileLabel}: unexpected indentation at top level`);
    }

    if (Object.hasOwn(data, key)) {
      throw new Error(`${fileLabel}: duplicate field "${key}"`);
    }

    const inlineValue = stripInlineComment(rawValue).trim();

    if (key === "tags") {
      if (inlineValue === "[]") {
        data.tags = [];
        index += 1;
        continue;
      }

      if (inlineValue !== "") {
        throw new Error(`${fileLabel}: tags must be a YAML array`);
      }

      const tags = [];
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];
        const trimmedNextLine = nextLine.trim();

        if (!trimmedNextLine || trimmedNextLine.startsWith("#")) {
          index += 1;
          continue;
        }

        const listMatch = /^\s{2}-\s?(.*)$/.exec(nextLine);

        if (!listMatch) {
          break;
        }

        tags.push(parseScalar(listMatch[1]));
        index += 1;
      }

      data.tags = tags;
      continue;
    }

    if (key === "messages") {
      if (inlineValue !== "") {
        throw new Error(`${fileLabel}: messages must use nested YAML entries`);
      }

      const messages = [];
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];
        const trimmedNextLine = nextLine.trim();

        if (!trimmedNextLine || trimmedNextLine.startsWith("#")) {
          index += 1;
          continue;
        }

        const listMatch = /^\s{2}-\s([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(nextLine);

        if (!listMatch) {
          break;
        }

        const message = {
          [listMatch[1]]: parseScalar(listMatch[2]),
        };

        index += 1;

        while (index < lines.length) {
          const messageLine = lines[index];
          const trimmedMessageLine = messageLine.trim();

          if (!trimmedMessageLine || trimmedMessageLine.startsWith("#")) {
            index += 1;
            continue;
          }

          if (/^\s{2}-\s/.test(messageLine)) {
            break;
          }

          const parsedField = parseKeyValueLine(messageLine, fileLabel);

          if (parsedField.indent < 4) {
            break;
          }

          if (parsedField.indent !== 4) {
            throw new Error(`${fileLabel}: invalid message field indentation`);
          }

          if (Object.hasOwn(message, parsedField.key)) {
            throw new Error(`${fileLabel}: duplicate message field "${parsedField.key}"`);
          }

          message[parsedField.key] = parseScalar(parsedField.rawValue);
          index += 1;
        }

        messages.push(message);
      }

      data.messages = messages;
      continue;
    }

    data[key] = parseScalar(rawValue);
    index += 1;
  }

  return data;
}

function isValidCalendarDate(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function isValidDateValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  return isValidCalendarDate(Number(year), Number(month), Number(day));
}

function isValidMinuteValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value);

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

function assertNonEmptyString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
}

function validateSpeakers(speakers, fileLabel) {
  const speakerIds = Object.keys(speakers);

  if (speakerIds.length === 0) {
    throw new Error(`${fileLabel}: must define at least one speaker`);
  }

  for (const speakerId of speakerIds) {
    if (!STABLE_ID_RE.test(speakerId)) {
      throw new Error(`${fileLabel}: invalid speakerId "${speakerId}"`);
    }

    const speaker = speakers[speakerId];

    assertNonEmptyString(speaker.name, `${fileLabel}: speaker "${speakerId}" must have a non-empty name`);
    assertNonEmptyString(
      speaker.avatar,
      `${fileLabel}: speaker "${speakerId}" must have a non-empty avatar path`,
    );

    if (
      speaker.variant !== undefined &&
      speaker.variant !== "left" &&
      speaker.variant !== "right"
    ) {
      throw new Error(
        `${fileLabel}: speaker "${speakerId}" has invalid variant "${speaker.variant}"`,
      );
    }
  }
}

function validateConversation(conversation, fileLabel, seenSlugs, knownSpeakerIds) {
  const requiredFields = ["slug", "date", "timePrecision", "source", "tags", "messages"];

  for (const fieldName of requiredFields) {
    if (!Object.hasOwn(conversation, fieldName)) {
      throw new Error(`${fileLabel}: missing required field "${fieldName}"`);
    }
  }

  assertNonEmptyString(conversation.slug, `${fileLabel}: slug must be a non-empty string`);
  assertNonEmptyString(conversation.date, `${fileLabel}: date must be a non-empty string`);
  assertNonEmptyString(
    conversation.source,
    `${fileLabel}: source must be a non-empty string`,
  );

  if (!STABLE_ID_RE.test(conversation.slug)) {
    throw new Error(`${fileLabel}: slug must be route-safe lowercase letters, numbers, and hyphens`);
  }

  const existingSlugOwner = seenSlugs.get(conversation.slug);

  if (existingSlugOwner) {
    throw new Error(
      `${fileLabel}: duplicate slug "${conversation.slug}" already used by ${existingSlugOwner}`,
    );
  }

  seenSlugs.set(conversation.slug, fileLabel);

  if (!DATE_RE.test(conversation.date) || !isValidDateValue(conversation.date)) {
    throw new Error(`${fileLabel}: date must be a real calendar date in YYYY-MM-DD format`);
  }

  if (conversation.timePrecision !== "date" && conversation.timePrecision !== "minute") {
    throw new Error(`${fileLabel}: invalid timePrecision "${conversation.timePrecision}"`);
  }

  if (!Array.isArray(conversation.tags)) {
    throw new Error(`${fileLabel}: tags must be an array`);
  }

  for (const tag of conversation.tags) {
    assertNonEmptyString(tag, `${fileLabel}: tags must contain only non-empty strings`);
  }

  if (!Array.isArray(conversation.messages) || conversation.messages.length === 0) {
    throw new Error(`${fileLabel}: messages must contain at least one entry`);
  }

  let featuredCount = 0;
  let featuredMessageDate;

  for (const [index, message] of conversation.messages.entries()) {
    assertNonEmptyString(
      message.speakerId,
      `${fileLabel}: message ${index + 1} must have a non-empty speakerId`,
    );
    assertNonEmptyString(
      message.text,
      `${fileLabel}: message ${index + 1} must have non-empty text`,
    );
    assertNonEmptyString(
      message.time,
      `${fileLabel}: message ${index + 1} must have a non-empty time`,
    );

    if (!knownSpeakerIds.has(message.speakerId)) {
      throw new Error(
        `${fileLabel}: message ${index + 1} references unknown speakerId "${message.speakerId}"`,
      );
    }

    if (
      message.featured !== undefined &&
      typeof message.featured !== "boolean"
    ) {
      throw new Error(`${fileLabel}: message ${index + 1} featured must be a boolean`);
    }

    if (message.featured === true) {
      featuredCount += 1;
      featuredMessageDate = message.time.slice(0, 10);
    }

    if (conversation.timePrecision === "date") {
      if (!DATE_RE.test(message.time) || !isValidDateValue(message.time)) {
        throw new Error(
          `${fileLabel}: message ${index + 1} time must be a real date in YYYY-MM-DD format`,
        );
      }
    } else if (!MINUTE_RE.test(message.time) || !isValidMinuteValue(message.time)) {
      throw new Error(
        `${fileLabel}: message ${index + 1} time must be a real date-time in YYYY-MM-DD HH:MM format`,
      );
    }
  }

  if (featuredCount !== 1) {
    throw new Error(`${fileLabel}: must have exactly one featured message`);
  }

  if (conversation.date !== featuredMessageDate) {
    throw new Error(
      `${fileLabel}: date "${conversation.date}" must match featured message day "${featuredMessageDate}"`,
    );
  }
}

async function getConversationFiles() {
  const entries = await readdir(CONVERSATIONS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => path.join(CONVERSATIONS_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function getSpeakerFiles() {
  const entries = await readdir(SPEAKERS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => path.join(SPEAKERS_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function main() {
  const errors = [];
  let speakers = {};
  const conversationFiles = await getConversationFiles();
  const speakerFiles = await getSpeakerFiles();

  try {
    for (const filePath of speakerFiles) {
      const fileLabel = path.relative(process.cwd(), filePath) || filePath;
      const speakersSource = await readFile(filePath, "utf8");
      const parsedSpeakers = parseSpeakersFile(speakersSource, fileLabel);

      validateSpeakers(parsedSpeakers, fileLabel);

      for (const [speakerId, speaker] of Object.entries(parsedSpeakers)) {
        if (Object.hasOwn(speakers, speakerId)) {
          throw new Error(`${fileLabel}: duplicate speakerId "${speakerId}" across speakers files`);
        }

        speakers[speakerId] = speaker;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
  }

  const knownSpeakerIds = new Set(Object.keys(speakers));
  const seenSlugs = new Map();

  for (const filePath of conversationFiles) {
    const fileLabel = path.relative(process.cwd(), filePath) || filePath;

    try {
      const source = await readFile(filePath, "utf8");
      const conversation = parseConversationFile(source, fileLabel);
      validateConversation(conversation, fileLabel, seenSlugs, knownSpeakerIds);
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

  console.log(
    `Validated ${conversationFiles.length} conversation files and ${knownSpeakerIds.size} speakers.`,
  );
}

await main();
