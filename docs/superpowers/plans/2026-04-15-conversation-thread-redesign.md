# Conversation Thread Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quote-centric content model with conversation threads, keep homepage and tag pages as featured-message indexes, and make detail pages render chat-style conversation views with speaker metadata from a mapping file.

**Architecture:** Migrate content from Markdown quote files to YAML conversation files plus a shared speaker mapping file. Refactor the content loaders so pages consume conversation-derived index records and full thread records, then update the homepage/tag pages to render featured messages and update detail pages to render the full thread with chat-style message components.

**Tech Stack:** Astro, TypeScript, Astro content collections, YAML content files, Node.js validation script, GitHub Actions

---

## File Structure

Planned files and responsibilities:

- Modify: `src/content/config.ts`
- Create: `src/content/conversations/late-night-call.yaml`
- Create: `src/content/conversations/open-window.yaml`
- Create: `src/content/conversations/first-snow.yaml`
- Create: `src/content/speakers.yaml`
- Create: `public/avatars/lin.svg`
- Create: `public/avatars/aya.svg`
- Create: `src/lib/conversations.ts`
- Create: `src/lib/speakers.ts`
- Modify: `src/lib/time.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/q/[slug].astro`
- Modify: `src/pages/tag/[tag].astro`
- Replace: `src/components/QuoteItem.astro`
- Replace: `src/components/QuoteList.astro`
- Replace: `src/components/QuoteMeta.astro`
- Create: `src/components/ConversationMessage.astro`
- Create: `src/components/ConversationThread.astro`
- Create: `src/components/FeaturedConversationCard.astro`
- Create: `src/components/SpeakerAvatar.astro`
- Modify: `src/styles/global.css`
- Modify: `scripts/validate-content.mjs`
- Delete: `src/content/quotes/2024-05-18-first-snow.md`
- Delete: `src/content/quotes/2024-05-18-late-night-call.md`
- Delete: `src/content/quotes/2024-05-19-open-window.md`
- Delete: `src/lib/quotes.ts`
- Modify: `docs/superpowers/specs/2026-04-15-conversation-thread-design.md`

Responsibility boundaries:

- `src/content/config.ts` defines collections for conversations and speakers
- `src/content/conversations/*.yaml` are the source-of-truth conversation threads
- `src/content/speakers.yaml` defines display metadata keyed by `speakerId`
- `src/lib/speakers.ts` resolves speaker metadata and presentation variants
- `src/lib/conversations.ts` produces index records, thread records, and route helpers
- `src/components/FeaturedConversationCard.astro` renders homepage/tag entries
- `src/components/ConversationThread.astro` renders the detail-page thread
- `src/components/ConversationMessage.astro` renders one message row
- `scripts/validate-content.mjs` enforces conversation/speaker/featured-message invariants

### Task 1: Define Conversation And Speaker Schemas

**Files:**
- Modify: `src/content/config.ts`
- Test: `npm run check`

- [ ] **Step 1: Write the failing schema expectation**

Expected content collections:

```ts
conversations:
  slug: string
  date: string
  timePrecision: "date" | "minute"
  source: string
  tags: string[]
  messages: {
    speakerId: string
    time: string
    text: string
    featured?: boolean
  }[]

speakers:
  Record<string, {
    name: string
    avatar: string
    variant?: "left" | "right"
  }>
```

- [ ] **Step 2: Run the current check command before schema changes**

Run: `npm run check`
Expected: PASS against the existing quote schema, confirming the redesign starts from a stable baseline

- [ ] **Step 3: Replace the content config with conversation and speaker collections**

`src/content/config.ts`

```ts
import { defineCollection, z } from "astro:content";

const trimmedNonEmptyString = z.string().trim().min(1);

const messageSchema = z.object({
  speakerId: trimmedNonEmptyString,
  time: z.string().trim(),
  text: trimmedNonEmptyString,
  featured: z.boolean().optional(),
});

const conversations = defineCollection({
  type: "data",
  schema: z.object({
    slug: z.string().trim().regex(/^[a-z0-9-]+$/),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    timePrecision: z.enum(["date", "minute"]),
    source: trimmedNonEmptyString,
    tags: z.array(trimmedNonEmptyString).default([]),
    messages: z.array(messageSchema).min(1),
  }),
});

const speakers = defineCollection({
  type: "data",
  schema: z.record(
    trimmedNonEmptyString,
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
```

- [ ] **Step 4: Run the schema check**

Run: `npm run check`
Expected: FAIL because the old `quotes` content and `src/lib/quotes.ts` references no longer match the new collections

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts
git commit -m "feat: add conversation and speaker schemas"
```

### Task 2: Add Speaker Mapping And Placeholder Avatars

**Files:**
- Create: `src/content/speakers.yaml`
- Create: `public/avatars/lin.svg`
- Create: `public/avatars/aya.svg`
- Test: `npm run check`

- [ ] **Step 1: Write the failing speaker-data expectation**

Expected sample mapping:

```yaml
lin:
  name: Lin
  avatar: /avatars/lin.svg
  variant: left

aya:
  name: Aya
  avatar: /avatars/aya.svg
  variant: right
```

- [ ] **Step 2: Verify the speaker mapping file does not exist**

Run: `test -f src/content/speakers.yaml && echo present || echo missing`
Expected: `missing`

- [ ] **Step 3: Add the speaker mapping and avatar placeholders**

`src/content/speakers.yaml`

```yaml
lin:
  name: Lin
  avatar: /avatars/lin.svg
  variant: left

aya:
  name: Aya
  avatar: /avatars/aya.svg
  variant: right
```

`public/avatars/lin.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="title">
  <title>Lin avatar</title>
  <rect width="96" height="96" rx="24" fill="#d6e5d8" />
  <circle cx="48" cy="38" r="18" fill="#6f8b74" />
  <path d="M24 82c5-16 18-24 24-24s19 8 24 24" fill="#6f8b74" />
</svg>
```

`public/avatars/aya.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="title">
  <title>Aya avatar</title>
  <rect width="96" height="96" rx="24" fill="#f0dcc8" />
  <circle cx="48" cy="38" r="18" fill="#a15f4f" />
  <path d="M24 82c5-16 18-24 24-24s19 8 24 24" fill="#a15f4f" />
</svg>
```

- [ ] **Step 4: Run the schema check**

Run: `npm run check`
Expected: FAIL later because pages/helpers still reference `quotes`, but the `speakers` collection itself should load successfully

- [ ] **Step 5: Commit**

```bash
git add src/content/speakers.yaml public/avatars/lin.svg public/avatars/aya.svg
git commit -m "feat: add speaker mapping and avatars"
```

### Task 3: Migrate Sample Content To Conversation YAML

**Files:**
- Create: `src/content/conversations/first-snow.yaml`
- Create: `src/content/conversations/late-night-call.yaml`
- Create: `src/content/conversations/open-window.yaml`
- Delete: `src/content/quotes/2024-05-18-first-snow.md`
- Delete: `src/content/quotes/2024-05-18-late-night-call.md`
- Delete: `src/content/quotes/2024-05-19-open-window.md`
- Test: `npm run validate:content`

- [ ] **Step 1: Write the migration expectation**

Expected conversation rules:

```text
- one YAML file per thread
- exactly one featured message per file
- existing sample quotes become conversation threads
- threads may contain one or more messages, but only one may be featured
- speakerId values match speakers.yaml keys
```

- [ ] **Step 2: Verify the new conversation directory does not yet contain files**

Run: `test -d src/content/conversations && find src/content/conversations -maxdepth 1 -type f | wc -l || echo 0`
Expected: `0`

- [ ] **Step 3: Add the migrated conversation files**

`src/content/conversations/first-snow.yaml`

```yaml
slug: first-snow
date: "2024-05-18"
timePrecision: date
source: Chat log
tags:
  - weather
  - memory

messages:
  - speakerId: lin
    time: "2024-05-18"
    text: "Today the wind was so light that spring finally felt willing to stay."
    featured: true
```

`src/content/conversations/late-night-call.yaml`

```yaml
slug: late-night-call
date: "2024-05-18"
timePrecision: minute
source: Phone call
tags:
  - conversation
  - midnight

messages:
  - speakerId: lin
    time: "2024-05-18 21:34"
    text: "It sounded like you were smiling before you finished the sentence."
    featured: true

  - speakerId: aya
    time: "2024-05-18 21:35"
    text: "Maybe I was."
```

`src/content/conversations/open-window.yaml`

```yaml
slug: open-window
date: "2024-05-19"
timePrecision: date
source: Notebook
tags:
  - home
  - morning

messages:
  - speakerId: aya
    time: "2024-05-19"
    text: "The room changed first when the window opened."
    featured: true
```

- [ ] **Step 4: Remove the old quote Markdown files**

Run:

```bash
git rm src/content/quotes/2024-05-18-first-snow.md \
  src/content/quotes/2024-05-18-late-night-call.md \
  src/content/quotes/2024-05-19-open-window.md
```

Expected: the three old quote files are removed from git tracking

- [ ] **Step 5: Run content validation**

Run: `npm run validate:content`
Expected: FAIL until the validator is updated from quote files to conversation files

- [ ] **Step 6: Commit**

```bash
git add src/content/conversations
git commit -m "feat: migrate sample content to conversation threads"
```

### Task 4: Build Speaker And Conversation Helpers

**Files:**
- Create: `src/lib/speakers.ts`
- Create: `src/lib/conversations.ts`
- Modify: `src/lib/time.ts`
- Delete: `src/lib/quotes.ts`
- Test: `npm run check`

- [ ] **Step 1: Write the failing helper expectation**

Expected helper API:

```ts
type SpeakerRecord = {
  id: string
  name: string
  avatar: string
  variant: "left" | "right" | undefined
}

type ConversationMessage = {
  speakerId: string
  time: string
  text: string
  featured: boolean
  renderedTime: string
  speaker: SpeakerRecord
}

type ConversationThread = {
  slug: string
  date: string
  timePrecision: "date" | "minute"
  source: string
  tags: string[]
  messages: ConversationMessage[]
  featuredMessage: ConversationMessage
}
```

- [ ] **Step 2: Run the type check before the new helpers exist**

Run: `npm run check`
Expected: FAIL because current pages/components still depend on the removed quote-centric model

- [ ] **Step 3: Create the speaker helper**

`src/lib/speakers.ts`

```ts
import { getEntry } from "astro:content";

export type SpeakerVariant = "left" | "right";

export type SpeakerRecord = {
  id: string;
  name: string;
  avatar: string;
  variant?: SpeakerVariant;
};

let speakersPromise: Promise<Record<string, SpeakerRecord>> | undefined;

async function loadSpeakers(): Promise<Record<string, SpeakerRecord>> {
  const entry = await getEntry("speakers", "speakers");

  if (!entry) {
    throw new Error("Missing speakers mapping entry");
  }

  return Object.fromEntries(
    Object.entries(entry.data).map(([id, speaker]) => [
      id,
      {
        id,
        name: speaker.name,
        avatar: speaker.avatar,
        variant: speaker.variant,
      },
    ]),
  );
}

async function getSpeakerMap() {
  speakersPromise ??= loadSpeakers();
  return speakersPromise;
}

export async function getSpeakerById(id: string): Promise<SpeakerRecord> {
  const speakers = await getSpeakerMap();
  const speaker = speakers[id];

  if (!speaker) {
    throw new Error(`Missing speaker mapping for "${id}"`);
  }

  return { ...speaker };
}
```

- [ ] **Step 4: Create the conversation helper**

`src/lib/conversations.ts`

```ts
import { getCollection } from "astro:content";

import { formatQuoteTime, parseQuoteTime, type TimePrecision } from "./time";
import { getSpeakerById, type SpeakerRecord } from "./speakers";

export type ConversationMessage = {
  speakerId: string;
  time: string;
  text: string;
  featured: boolean;
  renderedTime: string;
  sortTime: Date;
  speaker: SpeakerRecord;
};

export type ConversationThread = {
  id: string;
  slug: string;
  date: string;
  timePrecision: TimePrecision;
  source: string;
  tags: string[];
  messages: ConversationMessage[];
  featuredMessage: ConversationMessage;
  sortTime: Date;
};

export type FeaturedConversation = {
  slug: string;
  date: string;
  timePrecision: TimePrecision;
  source: string;
  tags: string[];
  featuredMessage: ConversationMessage;
  sortTime: Date;
};

export type ConversationGroup = {
  key: string;
  label: string;
  conversations: FeaturedConversation[];
};

async function buildMessage(message: {
  speakerId: string;
  time: string;
  text: string;
  featured?: boolean;
}) {
  const precision = message.time.includes(":") ? "minute" : "date";
  const sortTime = parseQuoteTime(message.time, precision);

  return {
    speakerId: message.speakerId,
    time: message.time,
    text: message.text,
    featured: message.featured === true,
    renderedTime: formatQuoteTime(message.time, precision),
    sortTime,
    speaker: await getSpeakerById(message.speakerId),
  };
}

function assertFeaturedMessage(messages: ConversationMessage[], slug: string) {
  const featured = messages.filter((message) => message.featured);

  if (featured.length !== 1) {
    throw new Error(
      `Conversation "${slug}" must contain exactly one featured message`,
    );
  }

  return featured[0];
}

export async function getAllConversations(): Promise<ConversationThread[]> {
  const entries = await getCollection("conversations");

  const threads = await Promise.all(
    entries.map(async (entry) => {
      const messages = await Promise.all(entry.data.messages.map(buildMessage));
      const featuredMessage = assertFeaturedMessage(messages, entry.data.slug);
      const sortTime = parseQuoteTime(entry.data.date, "date");

      return {
        id: entry.id,
        slug: entry.data.slug,
        date: entry.data.date,
        timePrecision: entry.data.timePrecision,
        source: entry.data.source,
        tags: [...entry.data.tags],
        messages,
        featuredMessage,
        sortTime,
      };
    }),
  );

  return threads.sort((left, right) => right.sortTime.getTime() - left.sortTime.getTime());
}

export async function getConversationBySlug(slug: string) {
  const threads = await getAllConversations();
  return threads.find((thread) => thread.slug === slug);
}

export async function getAllTags() {
  const threads = await getAllConversations();
  const counts = new Map<string, number>();

  for (const thread of threads) {
    for (const tag of thread.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}

export async function getConversationsByTag(tag: string) {
  const threads = await getAllConversations();
  return threads.filter((thread) => thread.tags.includes(tag));
}

export function toFeaturedConversation(thread: ConversationThread): FeaturedConversation {
  return {
    slug: thread.slug,
    date: thread.date,
    timePrecision: thread.timePrecision,
    source: thread.source,
    tags: [...thread.tags],
    featuredMessage: { ...thread.featuredMessage, speaker: { ...thread.featuredMessage.speaker } },
    sortTime: new Date(thread.sortTime.getTime()),
  };
}

export function groupFeaturedConversationsByDay(
  conversations: FeaturedConversation[],
): ConversationGroup[] {
  const groups = new Map<string, FeaturedConversation[]>();

  for (const conversation of conversations) {
    const key = conversation.sortTime.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), conversation]);
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatQuoteTime(key, "date"),
    conversations: items,
  }));
}
```

- [ ] **Step 5: Run the type check**

Run: `npm run check`
Expected: FAIL because pages/components still import quote-centric modules and types

- [ ] **Step 6: Commit**

```bash
git add src/lib/speakers.ts src/lib/conversations.ts src/lib/time.ts
git commit -m "feat: add conversation and speaker helpers"
```

### Task 5: Add Chat Thread Components

**Files:**
- Create: `src/components/SpeakerAvatar.astro`
- Create: `src/components/ConversationMessage.astro`
- Create: `src/components/ConversationThread.astro`
- Create: `src/components/FeaturedConversationCard.astro`
- Modify: `src/styles/global.css`
- Test: `npm run check`

- [ ] **Step 1: Write the failing component expectation**

Required component behaviors:

```text
- SpeakerAvatar renders image + fallback label
- ConversationMessage renders one bubble with avatar/name/text/time
- ConversationThread renders all messages in sequence
- FeaturedConversationCard renders the featured message only
```

- [ ] **Step 2: Run the type check before new components exist**

Run: `npm run check`
Expected: FAIL because pages are still wired to quote-centric components

- [ ] **Step 3: Add the avatar and message components**

`src/components/SpeakerAvatar.astro`

```astro
---
type Props = {
  name: string;
  avatar: string;
};

const { name, avatar }: Props = Astro.props;
---

<img class="speaker-avatar" src={avatar} alt={`${name} avatar`} loading="lazy" />
```

`src/components/ConversationMessage.astro`

```astro
---
import type { ConversationMessage as ConversationMessageRecord } from "../lib/conversations";

import SpeakerAvatar from "./SpeakerAvatar.astro";

type Props = {
  message: ConversationMessageRecord;
};

const { message }: Props = Astro.props;
const variant = message.speaker.variant ?? "left";
const messageClass = `conversation-message conversation-message-${variant}${message.featured ? " conversation-message-featured" : ""}`;
---

<li class={messageClass}>
  <div class="conversation-avatar">
    <SpeakerAvatar name={message.speaker.name} avatar={message.speaker.avatar} />
  </div>

  <div class="conversation-content">
    <p class="conversation-speaker">{message.speaker.name}</p>
    <blockquote class="conversation-bubble">
      <p>{message.text}</p>
    </blockquote>
    <time class="conversation-time" datetime={message.time}>{message.renderedTime}</time>
  </div>
</li>
```

`src/components/ConversationThread.astro`

```astro
---
import type { ConversationThread as ConversationThreadRecord } from "../lib/conversations";

import ConversationMessage from "./ConversationMessage.astro";

type Props = {
  thread: ConversationThreadRecord;
};

const { thread }: Props = Astro.props;
---

<ol class="conversation-thread" aria-label="Conversation thread">
  {thread.messages.map((message) => (
    <ConversationMessage message={message} />
  ))}
</ol>
```

`src/components/FeaturedConversationCard.astro`

```astro
---
import type { FeaturedConversation } from "../lib/conversations";
import { getQuotePath } from "../lib/conversations";

type Props = {
  conversation: FeaturedConversation;
};

const { conversation }: Props = Astro.props;
---

<article class="featured-conversation-card">
  <a class="featured-conversation-link" href={getQuotePath(conversation.slug)}>
    <p class="featured-conversation-text">{conversation.featuredMessage.text}</p>
    <p class="featured-conversation-meta">
      <span>{conversation.featuredMessage.speaker.name}</span>
      <span aria-hidden="true">·</span>
      <span>{conversation.featuredMessage.renderedTime}</span>
      <span aria-hidden="true">·</span>
      <span>{conversation.source}</span>
    </p>
  </a>
</article>
```

- [ ] **Step 4: Extend the stylesheet for thread and featured-card UI**

Append to `src/styles/global.css`:

```css
.featured-conversation-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 251, 244, 0.82);
  padding: 1rem;
}

.featured-conversation-link {
  display: block;
}

.featured-conversation-text {
  font-size: clamp(1.1rem, 4vw, 1.45rem);
  line-height: 1.55;
}

.featured-conversation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.conversation-thread {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.conversation-message {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
}

.conversation-message-right {
  grid-template-columns: 1fr auto;
}

.conversation-message-right .conversation-avatar {
  order: 2;
}

.conversation-message-right .conversation-content {
  order: 1;
  justify-items: end;
}

.conversation-avatar {
  width: 2.75rem;
}

.speaker-avatar {
  display: block;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.9rem;
}

.conversation-content {
  display: grid;
  gap: 0.35rem;
}

.conversation-speaker {
  color: var(--muted);
  font-size: 0.82rem;
}

.conversation-bubble {
  max-width: min(100%, 34rem);
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 1.1rem;
  background: #ffffff;
  border: 1px solid rgba(31, 26, 23, 0.08);
}

.conversation-message-right .conversation-bubble {
  background: #dff2d9;
}

.conversation-message-featured .conversation-bubble {
  box-shadow: 0 0 0 2px rgba(150, 87, 53, 0.18);
}

.conversation-time {
  color: var(--muted);
  font-size: 0.78rem;
}
```

- [ ] **Step 5: Run the type check**

Run: `npm run check`
Expected: FAIL because pages still reference quote-centric components and helper APIs

- [ ] **Step 6: Commit**

```bash
git add src/components/SpeakerAvatar.astro src/components/ConversationMessage.astro src/components/ConversationThread.astro src/components/FeaturedConversationCard.astro src/styles/global.css
git commit -m "feat: add conversation display components"
```

### Task 6: Refactor Homepage To Use Featured Conversations

**Files:**
- Modify: `src/pages/index.astro`
- Replace: `src/components/QuoteList.astro`
- Replace: `src/components/QuoteItem.astro`
- Replace: `src/components/QuoteMeta.astro`
- Test: `npm run build`

- [ ] **Step 1: Write the failing homepage expectation**

Required homepage output:

```text
- homepage still groups entries by day
- each group item represents one conversation
- visible main text is the featured message only
- no full chat thread shown on homepage
```

- [ ] **Step 2: Run the build before homepage refactor**

Run: `npm run build`
Expected: FAIL or produce stale quote-centric output because index still imports old quote helpers/components

- [ ] **Step 3: Replace the quote-centric list components with conversation-centric ones**

`src/components/QuoteList.astro`

```astro
---
import type { ConversationGroup } from "../lib/conversations";

import FeaturedConversationCard from "./FeaturedConversationCard.astro";

type Props = {
  groups: ConversationGroup[];
};

const { groups }: Props = Astro.props;
---

<div class="quote-groups">
  {groups.map((group) => (
    <section class="quote-group" aria-labelledby={`quote-group-${group.key}`}>
      <h2 class="group-heading" id={`quote-group-${group.key}`}>
        {group.label}
      </h2>

      <ul class="group-items">
        {group.conversations.map((conversation) => (
          <li>
            <FeaturedConversationCard conversation={conversation} />
          </li>
        ))}
      </ul>
    </section>
  ))}
</div>
```

`src/components/QuoteItem.astro`

```astro
---
throw new Error("QuoteItem.astro is no longer used after the conversation redesign");
---
```

`src/components/QuoteMeta.astro`

```astro
---
throw new Error("QuoteMeta.astro is no longer used after the conversation redesign");
---
```

- [ ] **Step 4: Update the homepage data flow**

`src/pages/index.astro`

```astro
---
import QuoteList from "../components/QuoteList.astro";
import SiteHeader from "../components/SiteHeader.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
import {
  getAllConversations,
  groupFeaturedConversationsByDay,
  toFeaturedConversation,
} from "../lib/conversations";

const conversations = await getAllConversations();
const groups = groupFeaturedConversationsByDay(
  conversations.map(toFeaturedConversation),
);
---

<BaseLayout title="Quotations">
  <div class="page-shell">
    <SiteHeader />
    <section class="intro" aria-labelledby="intro-title">
      <h1 class="intro-title" id="intro-title">Quotations</h1>
      <p class="intro-copy">A quiet archive of remembered lines.</p>
    </section>
    <QuoteList groups={groups} />
  </div>
</BaseLayout>
```

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: PASS with the homepage rendering one card per conversation rather than old quote records

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/components/QuoteList.astro src/components/QuoteItem.astro src/components/QuoteMeta.astro
git commit -m "feat: use featured conversations on homepage"
```

### Task 7: Refactor Detail Pages To Render Full Threads

**Files:**
- Modify: `src/pages/q/[slug].astro`
- Test: `npm run build`

- [ ] **Step 1: Write the failing detail-page expectation**

Required detail-page output:

```text
- one static page per conversation slug
- full thread shown in message order
- avatars and speaker names shown
- featured message lightly emphasized
```

- [ ] **Step 2: Run the build before the detail-page refactor**

Run: `npm run build`
Expected: FAIL or produce stale single-quote detail pages because the route still uses the quote-centric helper path

- [ ] **Step 3: Replace the detail page with a thread renderer**

`src/pages/q/[slug].astro`

```astro
---
import ConversationThread from "../../components/ConversationThread.astro";
import SiteHeader from "../../components/SiteHeader.astro";
import BaseLayout from "../../layouts/BaseLayout.astro";
import {
  getAllConversations,
  getHomePath,
  type ConversationThread as ConversationThreadRecord,
} from "../../lib/conversations";

type Props = {
  thread: ConversationThreadRecord;
};

export async function getStaticPaths() {
  const conversations = await getAllConversations();

  return conversations.map((thread) => ({
    params: { slug: thread.slug },
    props: { thread },
  }));
}

const { thread }: Props = Astro.props;
const pageTitle = `${thread.featuredMessage.speaker.name} | Quotations`;
---

<BaseLayout title={pageTitle}>
  <div class="page-shell page-shell-detail detail-page">
    <SiteHeader />

    <article class="detail-article">
      <h1 class="detail-title">Conversation from {thread.source}</h1>
      <ConversationThread thread={thread} />
      <p class="detail-back">
        <a href={getHomePath()}>Back to archive</a>
      </p>
    </article>
  </div>
</BaseLayout>
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: PASS and emit one detail route per conversation slug with full thread markup

- [ ] **Step 5: Commit**

```bash
git add src/pages/q/[slug].astro
git commit -m "feat: render conversation threads on detail pages"
```

### Task 8: Refactor Tag Pages To Use Featured Conversations

**Files:**
- Modify: `src/pages/tag/[tag].astro`
- Test: `npm run build`

- [ ] **Step 1: Write the failing tag-page expectation**

Required tag-page output:

```text
- one static route per tag
- title and count still shown
- list entries display featured messages only
```

- [ ] **Step 2: Run the build before the tag-page refactor**

Run: `npm run build`
Expected: FAIL or produce stale quote-centric tag pages because the route still depends on the old helper signatures

- [ ] **Step 3: Update the tag page to use conversations**

`src/pages/tag/[tag].astro`

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import QuoteList from "../../components/QuoteList.astro";
import SiteHeader from "../../components/SiteHeader.astro";
import {
  getAllTags,
  getConversationsByTag,
  getTagRouteParam,
  groupFeaturedConversationsByDay,
  toFeaturedConversation,
} from "../../lib/conversations";

export async function getStaticPaths() {
  const tags = await getAllTags();

  return Promise.all(
    tags.map(async ({ tag, count }) => ({
      params: { tag: getTagRouteParam(tag) },
      props: {
        tag,
        count,
        groups: groupFeaturedConversationsByDay(
          (await getConversationsByTag(tag)).map(toFeaturedConversation),
        ),
      },
    })),
  );
}

const { tag, count, groups } = Astro.props;
---

<BaseLayout title={`#${tag}`}>
  <div class="page-shell">
    <SiteHeader />
    <section class="tag-header" aria-labelledby="tag-title">
      <p class="tag-kicker">Tag</p>
      <h1 class="tag-title" id="tag-title">#{tag}</h1>
      <p class="tag-count">{count} conversation{count === 1 ? "" : "s"}</p>
    </section>
    <QuoteList groups={groups} />
  </div>
</BaseLayout>
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: PASS and emit one route per tag using the shared tag route contract

- [ ] **Step 5: Commit**

```bash
git add src/pages/tag/[tag].astro
git commit -m "feat: use featured conversations on tag pages"
```

### Task 9: Expand Content Validation For Conversations

**Files:**
- Modify: `scripts/validate-content.mjs`
- Test: `npm run validate:content`

- [ ] **Step 1: Write the failing validator expectation**

New validator responsibilities:

```text
- validate conversation YAML files instead of quote Markdown files
- validate speakers.yaml
- ensure exactly one featured message per conversation
- ensure each speakerId exists in speakers.yaml
- ensure slug stays route-safe
```

- [ ] **Step 2: Run the current validator before refactoring**

Run: `npm run validate:content`
Expected: FAIL because the current script still expects quote Markdown files

- [ ] **Step 3: Replace the validator with conversation-aware logic**

`scripts/validate-content.mjs`

```js
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CONVERSATIONS_DIR = fileURLToPath(
  new URL("../src/content/conversations/", import.meta.url),
);
const SPEAKERS_FILE = fileURLToPath(
  new URL("../src/content/speakers.yaml", import.meta.url),
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;

function fail(message) {
  throw new Error(message);
}

function parseYaml(source, fileLabel) {
  const yaml = source.replaceAll("\r\n", "\n");
  const lines = yaml.split("\n");
  const root = {};
  let currentSection = null;
  let currentMessage = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    if (/^[A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line)) {
      const key = line.replace(":", "").trim();

      if (key === "tags") {
        root.tags = [];
        currentSection = "tags";
        currentMessage = null;
        continue;
      }

      if (key === "messages") {
        root.messages = [];
        currentSection = "messages";
        currentMessage = null;
        continue;
      }
    }

    const rootMatch = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/.exec(line);

    if (rootMatch && !line.startsWith(" ")) {
      const [, key, value] = rootMatch;
      root[key] = value.replace(/^["']|["']$/g, "");
      currentSection = null;
      currentMessage = null;
      continue;
    }

    if (currentSection === "tags" && /^\s*-\s+/.test(line)) {
      root.tags.push(line.replace(/^\s*-\s+/, "").replace(/^["']|["']$/g, ""));
      continue;
    }

    if (currentSection === "messages" && /^\s*-\s+/.test(line)) {
      currentMessage = {};
      root.messages.push(currentMessage);
      const entry = line.replace(/^\s*-\s+/, "");
      const [key, value] = entry.split(/:\s+/, 2);
      currentMessage[key] = value.replace(/^["']|["']$/g, "");
      continue;
    }

    if (currentSection === "messages" && currentMessage && /^\s+[A-Za-z]/.test(line)) {
      const trimmed = line.trim();
      const [key, value] = trimmed.split(/:\s+/, 2);
      currentMessage[key] =
        value === "true" ? true : value?.replace(/^["']|["']$/g, "");
      continue;
    }

    fail(`${fileLabel}: unsupported YAML line "${line}"`);
  }

  return root;
}

function validateConversation(conversation, speakers, fileLabel, seenSlugs) {
  if (!SLUG_RE.test(conversation.slug ?? "")) {
    fail(`${fileLabel}: slug must match ${SLUG_RE}`);
  }

  if (seenSlugs.has(conversation.slug)) {
    fail(`${fileLabel}: duplicate slug "${conversation.slug}"`);
  }

  seenSlugs.add(conversation.slug);

  if (!DATE_RE.test(conversation.date ?? "")) {
    fail(`${fileLabel}: date must match YYYY-MM-DD`);
  }

  if (conversation.timePrecision !== "date" && conversation.timePrecision !== "minute") {
    fail(`${fileLabel}: invalid timePrecision`);
  }

  if (typeof conversation.source !== "string" || conversation.source.trim() === "") {
    fail(`${fileLabel}: source must be a non-empty string`);
  }

  if (!Array.isArray(conversation.tags)) {
    fail(`${fileLabel}: tags must be an array`);
  }

  if (!Array.isArray(conversation.messages) || conversation.messages.length === 0) {
    fail(`${fileLabel}: messages must contain at least one item`);
  }

  let featuredCount = 0;

  for (const message of conversation.messages) {
    if (typeof message.speakerId !== "string" || message.speakerId.trim() === "") {
      fail(`${fileLabel}: each message must contain a speakerId`);
    }

    if (!speakers[message.speakerId]) {
      fail(`${fileLabel}: unknown speakerId "${message.speakerId}"`);
    }

    if (typeof message.text !== "string" || message.text.trim() === "") {
      fail(`${fileLabel}: each message must contain non-empty text`);
    }

    const validTime =
      conversation.timePrecision === "date"
        ? DATE_RE.test(message.time ?? "")
        : MINUTE_RE.test(message.time ?? "");

    if (!validTime) {
      fail(`${fileLabel}: message time does not match timePrecision`);
    }

    if (message.featured === true) {
      featuredCount += 1;
    }
  }

  if (featuredCount !== 1) {
    fail(`${fileLabel}: exactly one message must be featured`);
  }
}

async function main() {
  const speakers = parseYaml(await readFile(SPEAKERS_FILE, "utf8"), "src/content/speakers.yaml");
  const files = (await readdir(CONVERSATIONS_DIR)).filter((file) => file.endsWith(".yaml")).sort();
  const seenSlugs = new Set();

  for (const file of files) {
    const filePath = path.join(CONVERSATIONS_DIR, file);
    const conversation = parseYaml(await readFile(filePath, "utf8"), file);
    validateConversation(conversation, speakers, file, seenSlugs);
  }

  console.log(`Validated ${files.length} conversation files.`);
}

await main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Run validation**

Run: `npm run validate:content`
Expected: PASS with `Validated 3 conversation files.`

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-content.mjs
git commit -m "chore: validate conversation content"
```

### Task 10: Remove Quote-Centric Dead Paths And Update Spec

**Files:**
- Modify: `docs/superpowers/specs/2026-04-15-conversation-thread-design.md`
- Delete: `src/lib/quotes.ts`
- Test: `npm run check`

- [ ] **Step 1: Write the cleanup expectation**

Required cleanup:

```text
- no remaining runtime imports from src/lib/quotes.ts
- no runtime dependence on src/content/quotes/
- spec examples align with implemented file paths and fields
```

- [ ] **Step 2: Run ripgrep before deleting the old helper**

Run: `rg -n "lib/quotes|content/quotes|QuoteMeta|QuoteItem" src docs`
Expected: output shows remaining references that must be removed or updated

- [ ] **Step 3: Remove the old quote helper**

Run:

```bash
git rm src/lib/quotes.ts
```

Expected: the old quote-centric helper is removed from git tracking

- [ ] **Step 4: Update the redesign spec if any field/file names drifted during implementation**

Update [2026-04-15-conversation-thread-design.md](/home/cuso4d/source/yellow-avatar-quotations/docs/superpowers/specs/2026-04-15-conversation-thread-design.md) so it matches the final implementation exactly.

- [ ] **Step 5: Run the type check**

Run: `npm run check`
Expected: PASS with no remaining imports from removed quote-centric files

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-15-conversation-thread-design.md
git commit -m "chore: remove quote-centric runtime paths"
```

### Task 11: Final Verification

**Files:**
- Test: `src/content/config.ts`
- Test: `src/lib/conversations.ts`
- Test: `src/lib/speakers.ts`
- Test: `src/pages/index.astro`
- Test: `src/pages/q/[slug].astro`
- Test: `src/pages/tag/[tag].astro`
- Test: `scripts/validate-content.mjs`
- Test: `.github/workflows/deploy.yml`

- [ ] **Step 1: Run content validation**

Run: `npm run validate:content`
Expected: PASS with `Validated 3 conversation files.`

- [ ] **Step 2: Run Astro diagnostics**

Run: `npm run check`
Expected: PASS with `0 errors`, `0 warnings`, `0 hints`

- [ ] **Step 3: Run the default build**

Run: `npm run build`
Expected: PASS and emit homepage, conversation detail pages, and tag pages

- [ ] **Step 4: Run the GitHub Pages subpath build**

Run: `BASE_PATH=/yellow-avatar-quotations/ npm run build`
Expected: PASS and produce app links prefixed with `/yellow-avatar-quotations/`

- [ ] **Step 5: Manually verify mobile and desktop presentation**

Run: `npm run dev`
Expected: local dev server starts successfully

Manual checks:

```text
- homepage shows one card per conversation, not full threads
- detail pages render full threads with avatar, name, bubble, and time
- featured message has a subtle emphasis only
- different speakers are visibly distinguishable
- mobile widths do not overflow avatars or bubbles
- tag pages show featured-message cards, not full transcripts
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: redesign site around conversation threads"
```
