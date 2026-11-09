export type SpoilerSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "spoiler";
      value: string;
    };

export function parseSpoilerText(text: string): SpoilerSegment[] {
  const segments: SpoilerSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const spoilerStart = text.indexOf("||", cursor);

    if (spoilerStart === -1) {
      segments.push({
        type: "text",
        value: text.slice(cursor),
      });
      break;
    }

    if (spoilerStart > cursor) {
      segments.push({
        type: "text",
        value: text.slice(cursor, spoilerStart),
      });
    }

    const spoilerEnd = text.indexOf("||", spoilerStart + 2);

    if (spoilerEnd === -1) {
      segments.push({
        type: "text",
        value: text.slice(spoilerStart),
      });
      break;
    }

    const spoilerValue = text.slice(spoilerStart + 2, spoilerEnd);

    if (spoilerValue.length === 0) {
      segments.push({
        type: "text",
        value: "||||",
      });
    } else {
      segments.push({
        type: "spoiler",
        value: spoilerValue,
      });
    }

    cursor = spoilerEnd + 2;
  }

  return segments;
}
