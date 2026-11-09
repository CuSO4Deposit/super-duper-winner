# Quotations Site Design

**Date:** 2026-04-14

## Goal

Build a static quotations site on GitHub Pages that renders structured quote records into a calm, time-oriented reading experience. The first version should feel closer to a curated memory archive than a blog or content platform.

## Product Scope

The first version includes:

- Homepage time stream at `/`
- Individual quote detail pages at `/q/<slug>/`
- Tag archive pages at `/tag/<tag>/`
- GitHub Actions deployment to GitHub Pages
- A lightweight content validation workflow

The first version explicitly excludes:

- Full-text search
- Speaker archive pages
- Source archive pages
- Client-side filtering UI
- Social features such as comments, likes, or bookmarks
- Admin interface

## Chosen Approach

Use Astro as the static site generator, with quote records stored as Markdown files with frontmatter. Astro will read local content files at build time and generate fully static HTML pages for GitHub Pages hosting.

This approach was chosen because it balances:

- Low runtime complexity
- Strong control over layout and visual tone
- Easy generation of permalink pages and tag pages
- Good long-term maintainability for hand-edited content

## Content Model

Each quote is stored as one Markdown file under `src/content/quotes/`.

Required frontmatter fields:

- `slug`: stable unique identifier for permalink generation, restricted to a lowercase single path segment using letters, numbers, and hyphens
- `time`: raw source time value, such as `2024-05-18` or `2024-05-18 21:34`
- `timePrecision`: either `date` or `minute`
- `speaker`: speaker name
- `source`: source label
- `tags`: array of tag strings

Markdown body:

- Quote text only in the first version

Expected content shape:

- Most records are single-sentence quotes
- The layout should assume short-form text by default
- The detail page should still support slightly longer entries without breaking the visual rhythm

Example:

```md
---
slug: first-snow
time: "2024-05-18"
timePrecision: date
speaker: Someone
source: Chat log
tags:
  - daily
  - spring
---

Today the wind was so light that spring finally felt willing to stay.
```

## Rationale For Markdown + Frontmatter

Markdown with frontmatter is the canonical content format because the site is expected to be maintained by hand over time.

Benefits:

- One quote per file keeps diffs small and understandable
- Quote text stays readable in raw form
- Future metadata expansion remains straightforward
- Future detail-page notes can be added without changing storage format

JSON or JSONL may still be used as import formats for batch ingestion, but not as the primary source of truth for the site.

## Time Handling

Time precision is intentionally mixed.

Rules:

- Some quotes may have only a date
- Some quotes may have date plus minute-level time
- The frontend must display the known precision only
- The site must not fabricate unknown hours or minutes in UI copy

Implementation guidance:

- Store `time` as the source string
- Store `timePrecision` explicitly
- Parse values into sortable build-time data
- Keep display formatting aligned with `timePrecision`

Sorting behavior:

- Quotes are sorted chronologically using parsed values
- When values have only date precision, they are treated as date-only for display
- Sorting ties may fall back to slug for deterministic output

## URL Design

Routes:

- `/` for the homepage time stream
- `/q/<slug>/` for quote detail pages
- `/tag/<tag>/` for tag archive pages

`slug` is required even though it is not part of the user-facing content model discussion, because permalink stability matters. URLs must not be derived from mutable quote text or from time strings that may later be corrected.

Date segments are intentionally not included in permalink paths. Date-based URLs would look archival, but they increase coupling between content corrections and URL stability without adding enough value for this project.

## Information Architecture

### Homepage

The homepage is a time-oriented quote stream, not a blog index.

Structure:

- Minimal site header
- Main stream grouped by time buckets
- Each quote shows:
  - quote text
  - time
  - speaker
  - source
  - tags
- Each item links to its detail page

Design intent:

- Quote text carries primary visual weight
- Time acts as the organizing axis
- Metadata remains quiet and secondary
- Generous spacing is preferred over heavy card chrome

### Quote Detail Page

Each quote gets a focused permalink page.

Structure:

- Quote text as the main content
- Metadata block with time, speaker, source, and tags
- Simple navigation back to the homepage or related tag pages

Optional later enhancement:

- Previous/next quote navigation

This is intentionally deferred from v1 unless implementation is trivial after core pages are working.

### Tag Page

Each tag page is a filtered archive using the same display language as the homepage.

Structure:

- Tag title
- Entry count
- Quote list for that tag

The first version will not include nested filtering, faceted browsing, or complex tag management.

## Visual Direction

The site should feel like a quiet, curated archive of remembered lines.

Visual principles:

- Calm rather than app-like
- Editorial rather than dashboard-like
- Sparse but intentional
- Strong typographic hierarchy
- Light metadata treatment
- Reading flow centered on time and text, not on UI controls

Practical implications:

- Avoid dense cards or loud component framing
- Avoid feature-heavy navigation
- Prefer whitespace, rhythm, and restrained accents
- Treat mobile readability as a first-class constraint rather than a later adaptation

The target feeling is “organized memory index,” not “quote product.”

## Build Architecture

Recommended file structure:

```text
/
  src/
    content/
      quotes/
        2024-05-18-first-snow.md
    pages/
      index.astro
      q/
        [slug].astro
      tag/
        [tag].astro
    components/
      QuoteList.astro
      QuoteItem.astro
      QuoteMeta.astro
      SiteHeader.astro
    layouts/
      BaseLayout.astro
    lib/
      quotes.ts
      time.ts
  scripts/
    validate-content.mjs
    import-jsonl-to-md.mjs
  .github/
    workflows/
      deploy.yml
```

Responsibility boundaries:

- `src/content/quotes/`: source content
- `src/pages/`: route generation
- `src/components/`: reusable display blocks
- `src/layouts/`: page shell
- `src/lib/`: sorting, grouping, formatting, metadata helpers
- `scripts/validate-content.mjs`: content linting
- `scripts/import-jsonl-to-md.mjs`: migration/import helper

## Data Flow

Build-time flow:

1. Astro reads quote Markdown files from the content collection
2. Build helpers parse and normalize quote metadata
3. Quotes are sorted and grouped for homepage rendering
4. Static pages are generated for each quote and each tag
5. Output is deployed to GitHub Pages as static assets

There is no runtime data fetching requirement for the first version.

## Error Handling And Validation

The site should fail early on invalid content.

Validation checks should cover:

- Missing, duplicate, or route-unsafe `slug`
- Missing required fields
- Invalid `timePrecision`
- Invalid time string format for the chosen precision
- Non-array `tags`
- Empty quote body

Validation can be split across:

- Astro content schema checks
- A small custom script for repository-level validation

## Deployment

Deployment target: GitHub Pages

Recommended deployment flow:

1. Push to the default branch
2. GitHub Actions installs dependencies
3. GitHub Actions runs the static build
4. Built output from `dist/` is published to GitHub Pages

This keeps hosting simple and avoids manual deployment steps.

## Suggested Implementation Sequence

1. Initialize Astro project and GitHub Pages build settings
2. Define the quote content collection schema
3. Add 3 to 5 sample quote files
4. Build the homepage time stream
5. Build quote detail pages
6. Build tag archive pages
7. Add content validation script
8. Add GitHub Actions deployment workflow
9. Replace sample quotes with real content

## Testing Strategy

The implementation plan should include:

- Content schema validation
- Focused tests for time parsing and grouping helpers
- A build verification step to ensure all routes generate successfully
- Manual checks for homepage, detail pages, and tag pages on both desktop-width and mobile-width layouts

The first version does not need a large browser test suite. Build correctness and content integrity matter more than interactive behavior.

## Open Decisions Intentionally Deferred

These are consciously left out of the first version and should not block implementation:

- Speaker archive pages
- Source archive pages
- Full-text search
- Previous/next detail-page navigation
- RSS feed
- Rich contextual notes beneath quotes
- Comments powered by GitHub Issues or a similar issue-backed mechanism

These can be layered on later without invalidating the core structure above.
