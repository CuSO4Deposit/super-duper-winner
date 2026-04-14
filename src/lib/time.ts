const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTE_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const MINUTE_FORMATTER = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export type TimePrecision = "date" | "minute";

function invalidTimeError(time: string, precision: TimePrecision): Error {
  return new Error(`Invalid ${precision} time: ${time}`);
}

function buildUtcDate(
  time: string,
  precision: TimePrecision,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute
  ) {
    throw invalidTimeError(time, precision);
  }

  return parsed;
}

export function parseQuoteTime(time: string, precision: TimePrecision): Date {
  if (precision === "date") {
    const match = DATE_RE.exec(time);

    if (!match) {
      throw invalidTimeError(time, precision);
    }

    const [, year, month, day] = match;
    return buildUtcDate(
      time,
      precision,
      Number(year),
      Number(month),
      Number(day),
    );
  }

  const match = MINUTE_RE.exec(time);

  if (!match) {
    throw invalidTimeError(time, precision);
  }

  const [, year, month, day, hour, minute] = match;
  return buildUtcDate(
    time,
    precision,
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
  );
}

export function formatQuoteTime(time: string, precision: TimePrecision): string {
  const parsed = parseQuoteTime(time, precision);

  if (precision === "date") {
    return DATE_FORMATTER.format(parsed);
  }

  return MINUTE_FORMATTER.format(parsed);
}
