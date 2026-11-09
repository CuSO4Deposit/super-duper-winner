# Quotations Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly static quotations site with a homepage time stream, quote permalink pages, tag pages, Markdown content storage, and GitHub Pages deployment.

**Architecture:** Use Astro to read Markdown quote files from a content collection at build time, normalize them through small helper modules, and generate static routes for the homepage, quote detail pages, and tag archive pages. Keep the visual system quiet and text-forward, optimized for single-sentence quotes and narrow mobile layouts.

**Tech Stack:** Astro, TypeScript, Zod via Astro content collections, Node.js scripts, GitHub Actions

---

## File Structure

Planned files and responsibilities:

- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/env.d.ts`
- Create: `src/content/config.ts`
- Create: `src/content/quotes/2024-05-18-first-snow.md`
- Create: `src/content/quotes/2024-05-18-late-night-call.md`
- Create: `src/content/quotes/2024-05-19-open-window.md`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/QuoteMeta.astro`
- Create: `src/components/QuoteItem.astro`
- Create: `src/components/QuoteList.astro`
- Create: `src/lib/time.ts`
- Create: `src/lib/quotes.ts`
- Create: `src/pages/index.astro`
- Create: `src/pages/q/[slug].astro`
- Create: `src/pages/tag/[tag].astro`
- Create: `src/styles/global.css`
- Create: `scripts/validate-content.mjs`
- Create: `.github/workflows/deploy.yml`

Responsibility boundaries:

- `src/content/config.ts` defines the quote schema
- `src/content/quotes/*.md` are the content source of truth
- `src/lib/time.ts` handles parsing and formatting mixed-precision times
- `src/lib/quotes.ts` handles sorting, grouping, tag aggregation, and route helpers
- `src/components/*` provide focused rendering primitives
- `src/pages/*` define static routes
- `src/styles/global.css` holds the global visual system and mobile-first layout
- `scripts/validate-content.mjs` enforces repository-level content rules
- `.github/workflows/deploy.yml` builds and deploys the site to GitHub Pages

### Task 1: Initialize Astro Project Skeleton

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/env.d.ts`

- [ ] **Step 1: Write the failing setup expectation**

Create a scratch note in the shell to define the expected project commands:

```text
Expected commands:
- npm run dev
- npm run build
- npm run check
- npm run validate:content
```

- [ ] **Step 2: Verify the project is not initialized yet**

Run: `test -f package.json && echo present || echo missing`
Expected: `missing`

- [ ] **Step 3: Write the initial project files**

`package.json`

```json
{
  "name": "yellow-avatar-quotations",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "validate:content": "node scripts/validate-content.mjs"
  },
  "dependencies": {
    "astro": "^5.0.0"
  }
}
```

`astro.config.mjs`

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.github.io/yellow-avatar-quotations"
});
```

`tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

`.gitignore`

```gitignore
node_modules
dist
.astro
.superpowers
```

`src/env.d.ts`

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: packages install successfully and `package-lock.json` is created

- [ ] **Step 5: Run build to verify the empty shell compiles**

Run: `npm run build`
Expected: FAIL with missing pages/content files, confirming the rest of the plan still needs implementation

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore src/env.d.ts
git commit -m "chore: initialize astro project"
```

### Task 2: Define Quote Content Schema

**Files:**
- Create: `src/content/config.ts`
- Test: `npm run check`

- [ ] **Step 1: Write the failing schema expectation**

Create the intended schema shape in the plan workspace notes:

```ts
slug: string
time: string
timePrecision: "date" | "minute"
speaker: string
source: string
tags: string[]
```

- [ ] **Step 2: Run type checking before the schema exists**

Run: `npm run check`
Expected: FAIL because `src/content/config.ts` is missing and no content collection is defined

- [ ] **Step 3: Write the minimal schema**

`src/content/config.ts`

```ts
import { defineCollection, z } from "astro:content";

const quotes = defineCollection({
  type: "content",
  schema: z.object({
    slug: z.string().min(1),
    time: z.string().min(1),
    timePrecision: z.enum(["date", "minute"]),
    speaker: z.string().min(1),
    source: z.string().min(1),
    tags: z.array(z.string().min(1)).default([])
  })
});

export const collections = {
  quotes
};
```

- [ ] **Step 4: Run type checking again**

Run: `npm run check`
Expected: FAIL later in the pipeline because pages are still missing, but content schema loading should succeed

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts
git commit -m "feat: define quote content schema"
```

### Task 3: Add Seed Quote Content

**Files:**
- Create: `src/content/quotes/2024-05-18-first-snow.md`
- Create: `src/content/quotes/2024-05-18-late-night-call.md`
- Create: `src/content/quotes/2024-05-19-open-window.md`
- Test: `npm run check`

- [ ] **Step 1: Write the failing expectation for required sample content**

Expected sample set:

```text
- 1 date-only quote
- 1 minute-precision quote
- 1 second date-only quote with different tags
```

- [ ] **Step 2: Verify the content directory is empty**

Run: `test -d src/content/quotes && find src/content/quotes -maxdepth 1 -type f | wc -l || echo 0`
Expected: `0`

- [ ] **Step 3: Add the sample quote files**

`src/content/quotes/2024-05-18-first-snow.md`

```md
---
slug: first-snow
time: 2024-05-18
timePrecision: date
speaker: Lin
source: Chat log
tags:
  - spring
  - daily
---

Today the wind was so light that spring finally felt willing to stay.
```

`src/content/quotes/2024-05-18-late-night-call.md`

```md
---
slug: late-night-call
time: 2024-05-18 21:34
timePrecision: minute
speaker: Lin
source: Phone call
tags:
  - night
  - voice
---

It sounded like you were smiling before you finished the sentence.
```

`src/content/quotes/2024-05-19-open-window.md`

```md
---
slug: open-window
time: 2024-05-19
timePrecision: date
speaker: Aya
source: Notebook
tags:
  - room
  - weather
---

The room changed first when the window opened.
```

- [ ] **Step 4: Run type checking with sample content**

Run: `npm run check`
Expected: FAIL later because route files are still missing, but content parsing should succeed for all three Markdown files

- [ ] **Step 5: Commit**

```bash
git add src/content/quotes
git commit -m "feat: add sample quote content"
```

### Task 4: Implement Time Parsing And Quote Helpers

**Files:**
- Create: `src/lib/time.ts`
- Create: `src/lib/quotes.ts`
- Test: `npm run check`

- [ ] **Step 1: Write the failing helper expectations**

Expected helper API:

```ts
parseQuoteTime(time: string, precision: "date" | "minute"): Date
formatQuoteTime(time: string, precision: "date" | "minute"): string
getAllQuotes(): Promise<QuoteRecord[]>
getQuoteBySlug(slug: string): Promise<QuoteRecord | undefined>
getQuotesByTag(tag: string): Promise<QuoteRecord[]>
getAllTags(): Promise<{ tag: string; count: number }[]>
groupQuotesByDay(quotes: QuoteRecord[]): { key: string; label: string; quotes: QuoteRecord[] }[]
```

- [ ] **Step 2: Run checking before helpers exist**

Run: `npm run check`
Expected: FAIL because `src/lib/time.ts` and `src/lib/quotes.ts` are missing

- [ ] **Step 3: Implement the time helper**

`src/lib/time.ts`

```ts
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

export type TimePrecision = "date" | "minute";

export function parseQuoteTime(time: string, precision: TimePrecision): Date {
  const valid = precision === "date" ? DATE_RE.test(time) : MINUTE_RE.test(time);

  if (!valid) {
    throw new Error(`Invalid ${precision} time: ${time}`);
  }

  const normalized = precision === "date" ? `${time}T00:00:00Z` : time.replace(" ", "T") + ":00Z";
  return new Date(normalized);
}

export function formatQuoteTime(time: string, precision: TimePrecision): string {
  const parsed = parseQuoteTime(time, precision);

  if (precision === "date") {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(parsed);
}
```

- [ ] **Step 4: Implement the quote helper module**

`src/lib/quotes.ts`

```ts
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

async function loadQuotes(): Promise<QuoteRecord[]> {
  const entries = await getCollection("quotes");

  const quotes = entries.map((entry) => ({
    id: entry.id,
    slug: entry.data.slug,
    time: entry.data.time,
    timePrecision: entry.data.timePrecision,
    speaker: entry.data.speaker,
    source: entry.data.source,
    tags: entry.data.tags,
    body: entry.body.trim(),
    renderedTime: formatQuoteTime(entry.data.time, entry.data.timePrecision),
    sortTime: parseQuoteTime(entry.data.time, entry.data.timePrecision)
  }));

  return quotes.sort((a, b) => {
    const timeDiff = b.sortTime.getTime() - a.sortTime.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.slug.localeCompare(b.slug);
  });
}

export async function getAllQuotes(): Promise<QuoteRecord[]> {
  return loadQuotes();
}

export async function getQuoteBySlug(slug: string): Promise<QuoteRecord | undefined> {
  const quotes = await loadQuotes();
  return quotes.find((quote) => quote.slug === slug);
}

export async function getQuotesByTag(tag: string): Promise<QuoteRecord[]> {
  const quotes = await loadQuotes();
  return quotes.filter((quote) => quote.tags.includes(tag));
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const quotes = await loadQuotes();
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    for (const tag of quote.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function groupQuotesByDay(quotes: QuoteRecord[]) {
  const groups = new Map<string, QuoteRecord[]>();

  for (const quote of quotes) {
    const key = quote.time.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), quote]);
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatQuoteTime(key, "date"),
    quotes: items
  }));
}
```

- [ ] **Step 5: Run type checking again**

Run: `npm run check`
Expected: FAIL later because page components still do not exist, while helper modules type-check cleanly

- [ ] **Step 6: Commit**

```bash
git add src/lib/time.ts src/lib/quotes.ts
git commit -m "feat: add quote parsing helpers"
```

### Task 5: Build The Base Layout And Global Styling

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/styles/global.css`
- Create: `src/components/SiteHeader.astro`
- Test: `npm run check`

- [ ] **Step 1: Write the failing layout expectation**

Required layout behaviors:

```text
- Mobile-first typography
- Quiet header
- Centered reading column
- Comfortable spacing for one-line quotes
```

- [ ] **Step 2: Run checking before layout files exist**

Run: `npm run check`
Expected: FAIL because the base layout and imported styles do not exist

- [ ] **Step 3: Create the base layout and site header**

`src/layouts/BaseLayout.astro`

```astro
---
import "../styles/global.css";

type Props = {
  title: string;
};

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

`src/components/SiteHeader.astro`

```astro
<header class="site-header">
  <a href="/" class="site-title">Quotations</a>
</header>
```

`src/styles/global.css`

```css
:root {
  --bg: #f4efe6;
  --surface: #fffaf1;
  --text: #1f1a17;
  --muted: #6e6259;
  --line: rgba(31, 26, 23, 0.12);
  --accent: #b86a3b;
  --max-width: 44rem;
  --page-pad: 1rem;
  --radius: 18px;
}

* {
  box-sizing: border-box;
}

html {
  background: linear-gradient(180deg, #efe7db 0%, #f7f1e8 100%);
  color: var(--text);
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
}

body {
  margin: 0;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

.page-shell {
  width: min(100%, var(--max-width));
  margin: 0 auto;
  padding: 1.25rem var(--page-pad) 4rem;
}

.site-header {
  display: flex;
  justify-content: center;
  padding: 1rem 0 2rem;
}

.site-title {
  color: var(--muted);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (min-width: 768px) {
  :root {
    --page-pad: 1.5rem;
  }

  .page-shell {
    padding-top: 2rem;
  }
}
```

- [ ] **Step 4: Run checking again**

Run: `npm run check`
Expected: FAIL later because page routes still do not exist, while layout files parse successfully

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/SiteHeader.astro src/styles/global.css
git commit -m "feat: add base layout and global styles"
```

### Task 6: Build Quote Presentation Components

**Files:**
- Create: `src/components/QuoteMeta.astro`
- Create: `src/components/QuoteItem.astro`
- Create: `src/components/QuoteList.astro`
- Test: `npm run check`

- [ ] **Step 1: Write the failing component expectation**

Required component behaviors:

```text
- QuoteItem renders one quote and links to the detail page
- QuoteMeta renders time, speaker, source, and tag links
- QuoteList renders grouped date sections
```

- [ ] **Step 2: Run checking before the components exist**

Run: `npm run check`
Expected: FAIL because the components are missing

- [ ] **Step 3: Create the metadata and list components**

`src/components/QuoteMeta.astro`

```astro
---
type Props = {
  time: string;
  speaker: string;
  source: string;
  tags: string[];
};

const { time, speaker, source, tags } = Astro.props;
---

<div class="quote-meta">
  <span>{time}</span>
  <span>{speaker}</span>
  <span>{source}</span>
  <ul class="tag-list">
    {tags.map((tag) => (
      <li><a href={`/tag/${encodeURIComponent(tag)}/`}>#{tag}</a></li>
    ))}
  </ul>
</div>
```

`src/components/QuoteItem.astro`

```astro
---
import QuoteMeta from "./QuoteMeta.astro";

type Props = {
  quote: {
    slug: string;
    body: string;
    renderedTime: string;
    speaker: string;
    source: string;
    tags: string[];
  };
};

const { quote } = Astro.props;
---

<article class="quote-item">
  <a href={`/q/${quote.slug}/`} class="quote-link">
    <p class="quote-body">{quote.body}</p>
  </a>
  <QuoteMeta
    time={quote.renderedTime}
    speaker={quote.speaker}
    source={quote.source}
    tags={quote.tags}
  />
</article>
```

`src/components/QuoteList.astro`

```astro
---
import QuoteItem from "./QuoteItem.astro";

type QuoteGroup = {
  key: string;
  label: string;
  quotes: {
    slug: string;
    body: string;
    renderedTime: string;
    speaker: string;
    source: string;
    tags: string[];
  }[];
};

type Props = {
  groups: QuoteGroup[];
};

const { groups } = Astro.props;
---

<div class="quote-groups">
  {groups.map((group) => (
    <section class="quote-group" aria-labelledby={`group-${group.key}`}>
      <h2 id={`group-${group.key}`} class="group-heading">{group.label}</h2>
      <div class="group-items">
        {group.quotes.map((quote) => <QuoteItem quote={quote} />)}
      </div>
    </section>
  ))}
</div>
```

- [ ] **Step 4: Extend the global stylesheet for the quote UI**

Append to `src/styles/global.css`:

```css
.quote-group {
  margin-bottom: 2.5rem;
}

.group-heading {
  margin: 0 0 1rem;
  color: var(--muted);
  font-size: 0.95rem;
  font-weight: 400;
}

.group-items {
  display: grid;
  gap: 1rem;
}

.quote-item {
  padding: 1rem 1rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 250, 241, 0.72);
  backdrop-filter: blur(8px);
}

.quote-link {
  display: block;
}

.quote-body {
  margin: 0 0 0.85rem;
  font-size: clamp(1.1rem, 4vw, 1.55rem);
  line-height: 1.45;
}

.quote-meta {
  display: grid;
  gap: 0.45rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-list a {
  color: var(--accent);
}
```

- [ ] **Step 5: Run checking again**

Run: `npm run check`
Expected: FAIL later because route files still do not exist, while the quote components type-check successfully

- [ ] **Step 6: Commit**

```bash
git add src/components/QuoteMeta.astro src/components/QuoteItem.astro src/components/QuoteList.astro src/styles/global.css
git commit -m "feat: add quote display components"
```

### Task 7: Build The Homepage Time Stream

**Files:**
- Create: `src/pages/index.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Test: `npm run build`

- [ ] **Step 1: Write the failing homepage expectation**

Required homepage output:

```text
- shows header
- groups quotes by date
- renders quotes in reverse chronological order
- remains readable at narrow mobile widths
```

- [ ] **Step 2: Run build before the homepage exists**

Run: `npm run build`
Expected: FAIL because `src/pages/index.astro` does not exist

- [ ] **Step 3: Implement the homepage**

`src/pages/index.astro`

```astro
---
import QuoteList from "../components/QuoteList.astro";
import SiteHeader from "../components/SiteHeader.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
import { getAllQuotes, groupQuotesByDay } from "../lib/quotes";

const quotes = await getAllQuotes();
const groups = groupQuotesByDay(quotes);
---

<BaseLayout title="Quotations">
  <main class="page-shell">
    <SiteHeader />
    <section class="intro">
      <p class="intro-copy">A quiet archive of remembered lines.</p>
    </section>
    <QuoteList groups={groups} />
  </main>
</BaseLayout>
```

- [ ] **Step 4: Extend the global stylesheet for the homepage intro**

Append to `src/styles/global.css`:

```css
.intro {
  margin-bottom: 1.75rem;
}

.intro-copy {
  margin: 0;
  color: var(--muted);
  font-size: 0.98rem;
  line-height: 1.6;
}
```

- [ ] **Step 5: Run build again**

Run: `npm run build`
Expected: FAIL later because quote detail and tag routes are still missing or because route typing still needs the remaining files

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles/global.css
git commit -m "feat: add homepage quote stream"
```

### Task 8: Build Quote Detail Pages

**Files:**
- Create: `src/pages/q/[slug].astro`
- Modify: `src/styles/global.css`
- Test: `npm run build`

- [ ] **Step 1: Write the failing detail-page expectation**

Required detail-page output:

```text
- static route for every slug
- quote text as primary content
- metadata underneath
- link back to homepage
```

- [ ] **Step 2: Run build before the detail page exists**

Run: `npm run build`
Expected: FAIL because `src/pages/q/[slug].astro` is missing

- [ ] **Step 3: Implement the detail page**

`src/pages/q/[slug].astro`

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import QuoteMeta from "../../components/QuoteMeta.astro";
import SiteHeader from "../../components/SiteHeader.astro";
import { getAllQuotes } from "../../lib/quotes";

export async function getStaticPaths() {
  const quotes = await getAllQuotes();

  return quotes.map((quote) => ({
    params: { slug: quote.slug },
    props: { quote }
  }));
}

const { quote } = Astro.props;
---

<BaseLayout title={quote.body}>
  <main class="page-shell">
    <SiteHeader />
    <article class="detail-article">
      <p class="detail-body">{quote.body}</p>
      <QuoteMeta
        time={quote.renderedTime}
        speaker={quote.speaker}
        source={quote.source}
        tags={quote.tags}
      />
      <p class="detail-back"><a href="/">Back to archive</a></p>
    </article>
  </main>
</BaseLayout>
```

- [ ] **Step 4: Extend the stylesheet for the detail page**

Append to `src/styles/global.css`:

```css
.detail-article {
  display: grid;
  gap: 1rem;
  padding: 1rem 0;
}

.detail-body {
  margin: 0;
  font-size: clamp(1.45rem, 7vw, 2.5rem);
  line-height: 1.35;
}

.detail-back a {
  color: var(--accent);
}
```

- [ ] **Step 5: Run build again**

Run: `npm run build`
Expected: FAIL later because tag routes are still missing, or PASS if Astro does not require them yet and the current route set is complete

- [ ] **Step 6: Commit**

```bash
git add src/pages/q/[slug].astro src/styles/global.css
git commit -m "feat: add quote detail pages"
```

### Task 9: Build Tag Archive Pages

**Files:**
- Create: `src/pages/tag/[tag].astro`
- Modify: `src/styles/global.css`
- Test: `npm run build`

- [ ] **Step 1: Write the failing tag-page expectation**

Required tag-page output:

```text
- one static route per unique tag
- tag title and count
- quote list filtered to the tag
```

- [ ] **Step 2: Run build before the tag page exists**

Run: `npm run build`
Expected: FAIL because `src/pages/tag/[tag].astro` is missing

- [ ] **Step 3: Implement the tag page**

`src/pages/tag/[tag].astro`

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import QuoteList from "../../components/QuoteList.astro";
import SiteHeader from "../../components/SiteHeader.astro";
import { getAllTags, getQuotesByTag, groupQuotesByDay } from "../../lib/quotes";

export async function getStaticPaths() {
  const tags = await getAllTags();

  return Promise.all(
    tags.map(async ({ tag, count }) => ({
      params: { tag },
      props: {
        tag,
        count,
        groups: groupQuotesByDay(await getQuotesByTag(tag))
      }
    }))
  );
}

const { tag, count, groups } = Astro.props;
---

<BaseLayout title={`#${tag}`}>
  <main class="page-shell">
    <SiteHeader />
    <section class="tag-header">
      <p class="tag-kicker">Tag</p>
      <h1 class="tag-title">#{tag}</h1>
      <p class="tag-count">{count} quote{count === 1 ? "" : "s"}</p>
    </section>
    <QuoteList groups={groups} />
  </main>
</BaseLayout>
```

- [ ] **Step 4: Extend the stylesheet for tag pages**

Append to `src/styles/global.css`:

```css
.tag-header {
  margin-bottom: 1.75rem;
}

.tag-kicker,
.tag-count {
  margin: 0;
  color: var(--muted);
}

.tag-title {
  margin: 0.2rem 0;
  font-size: clamp(1.5rem, 8vw, 2.75rem);
}
```

- [ ] **Step 5: Run build again**

Run: `npm run build`
Expected: PASS, producing static pages for the homepage, each quote detail page, and each tag page

- [ ] **Step 6: Commit**

```bash
git add src/pages/tag/[tag].astro src/styles/global.css
git commit -m "feat: add tag archive pages"
```

### Task 10: Add Content Validation Script

**Files:**
- Create: `scripts/validate-content.mjs`
- Test: `npm run validate:content`

- [ ] **Step 1: Write the failing validation expectation**

Validation rules:

```text
- no duplicate slugs
- time matches timePrecision
- body is not empty
- tags are strings
```

- [ ] **Step 2: Run the validation command before the script exists**

Run: `npm run validate:content`
Expected: FAIL because `scripts/validate-content.mjs` does not exist

- [ ] **Step 3: Implement the validation script**

`scripts/validate-content.mjs`

```js
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src/content/quotes");
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const minuteRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error("Missing frontmatter block");
  }

  const [, frontmatter, body] = match;
  const lines = frontmatter.split("\n");
  const data = {};
  let currentArrayKey = null;

  for (const line of lines) {
    if (line.startsWith("  - ") && currentArrayKey) {
      data[currentArrayKey].push(line.slice(4).trim());
      continue;
    }

    const keyValue = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!keyValue) continue;

    const [, key, rawValue] = keyValue;

    if (rawValue === "") {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }

    data[key] = rawValue.trim();
    currentArrayKey = null;
  }

  return { data, body: body.trim() };
}

const files = (await fs.readdir(root)).filter((file) => file.endsWith(".md"));
const seenSlugs = new Set();

for (const file of files) {
  const fullPath = path.join(root, file);
  const source = await fs.readFile(fullPath, "utf8");
  const { data, body } = parseFrontmatter(source);

  if (!data.slug) throw new Error(`${file}: missing slug`);
  if (seenSlugs.has(data.slug)) throw new Error(`${file}: duplicate slug ${data.slug}`);
  seenSlugs.add(data.slug);

  if (!data.time) throw new Error(`${file}: missing time`);
  if (!["date", "minute"].includes(data.timePrecision)) {
    throw new Error(`${file}: invalid timePrecision`);
  }

  if (data.timePrecision === "date" && !dateRe.test(data.time)) {
    throw new Error(`${file}: invalid date time format`);
  }

  if (data.timePrecision === "minute" && !minuteRe.test(data.time)) {
    throw new Error(`${file}: invalid minute time format`);
  }

  if (!Array.isArray(data.tags)) throw new Error(`${file}: tags must be an array`);
  if (!body) throw new Error(`${file}: empty quote body`);
}

console.log(`Validated ${files.length} quote files.`);
```

- [ ] **Step 4: Run validation**

Run: `npm run validate:content`
Expected: PASS with `Validated 3 quote files.`

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-content.mjs
git commit -m "chore: add content validation script"
```

### Task 11: Add GitHub Pages Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Test: `npm run build`

- [ ] **Step 1: Write the failing deployment expectation**

Expected deployment behavior:

```text
- runs on pushes to main
- installs dependencies
- runs content validation
- runs static build
- publishes dist to GitHub Pages
```

- [ ] **Step 2: Verify the workflow file does not exist**

Run: `test -f .github/workflows/deploy.yml && echo present || echo missing`
Expected: `missing`

- [ ] **Step 3: Add the workflow**

`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run validate:content
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run the local build one more time**

Run: `npm run build`
Expected: PASS, confirming the workflow commands match a successful local build

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy site to github pages"
```

### Task 12: Final Verification

**Files:**
- Test: `package.json`
- Test: `src/pages/index.astro`
- Test: `src/pages/q/[slug].astro`
- Test: `src/pages/tag/[tag].astro`
- Test: `scripts/validate-content.mjs`

- [ ] **Step 1: Run content validation**

Run: `npm run validate:content`
Expected: PASS with `Validated 3 quote files.`

- [ ] **Step 2: Run Astro checks**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS and a populated `dist/` directory

- [ ] **Step 4: Manually verify desktop and mobile layouts**

Run: `npm run dev`
Expected: local dev server starts successfully

Manual checks:

```text
- Homepage reads comfortably on a narrow mobile viewport
- Quote cards do not overflow at 320px width
- Detail pages keep single-sentence quotes visually prominent
- Tag pages list only matching quotes
- Tag links and quote links navigate correctly
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: ship quotations site v1"
```
