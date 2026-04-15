import { getCollection } from "astro:content";

export type SpeakerVariant = "left" | "right";

export type SpeakerRecord = {
  id: string;
  name: string;
  avatar: string;
  variant?: SpeakerVariant;
};

type SpeakerMap = Map<string, SpeakerRecord>;

let speakersCache: SpeakerMap | undefined;
let speakersPromise: Promise<SpeakerMap> | undefined;

function cloneSpeakerRecord(speaker: SpeakerRecord): SpeakerRecord {
  return { ...speaker };
}

function cloneSpeakerDirectory(directory: SpeakerMap): SpeakerMap {
  return new Map(
    [...directory.entries()].map(([speakerId, speaker]) => [
      speakerId,
      cloneSpeakerRecord(speaker),
    ]),
  );
}

async function loadSpeakerDirectory(): Promise<SpeakerMap> {
  const entries = await getCollection("speakers");
  const directory = new Map<string, SpeakerRecord>();

  for (const entry of entries) {
    for (const [speakerId, speaker] of Object.entries(entry.data)) {
      if (directory.has(speakerId)) {
        throw new Error(`Duplicate speaker id "${speakerId}" found in speakers collection.`);
      }

      directory.set(speakerId, {
        id: speakerId,
        name: speaker.name,
        avatar: speaker.avatar,
        variant: speaker.variant,
      });
    }
  }

  return directory;
}

async function getCachedSpeakerDirectory(): Promise<SpeakerMap> {
  if (speakersCache) {
    return cloneSpeakerDirectory(speakersCache);
  }

  if (!speakersPromise) {
    speakersPromise = loadSpeakerDirectory()
      .then((directory) => {
        speakersCache = directory;
        speakersPromise = undefined;
        return directory;
      })
      .catch((error: unknown) => {
        speakersPromise = undefined;
        throw error;
      });
  }

  return cloneSpeakerDirectory(await speakersPromise);
}

export async function getSpeakerDirectory(): Promise<SpeakerMap> {
  return await getCachedSpeakerDirectory();
}

export async function getAllSpeakers(): Promise<SpeakerRecord[]> {
  const directory = await getCachedSpeakerDirectory();

  return [...directory.values()]
    .map(cloneSpeakerRecord)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function getSpeakerById(
  speakerId: string,
): Promise<SpeakerRecord | undefined> {
  const directory = await getCachedSpeakerDirectory();
  const speaker = directory.get(speakerId);
  return speaker ? cloneSpeakerRecord(speaker) : undefined;
}

export async function requireSpeakerById(speakerId: string): Promise<SpeakerRecord> {
  const speaker = await getSpeakerById(speakerId);

  if (!speaker) {
    throw new Error(`Unknown speaker id "${speakerId}" in conversations collection.`);
  }

  return speaker;
}
