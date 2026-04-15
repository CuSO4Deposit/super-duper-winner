# Contributing

This repository is an Astro site that publishes a structured archive of quotations and conversation records. Contributions are welcome through pull requests.

## Before You Start

- Use Node.js and `npm`.
- Install dependencies with `npm install`.
- Run the local development server with `npm run dev`.

## Project Structure

- `src/content/conversations/`: conversation records in YAML.
- `src/content/speakers/index.yaml`: speaker directory.
- `public/avatars/`: avatar assets referenced by speakers.
- `scripts/validate-content.mjs`: repository-specific content validator.

## What a Good PR Looks Like

- Keep the scope narrow. One PR should cover one logical change set.
- Preserve existing naming and formatting conventions.
- Do not mix unrelated cleanup with content additions.
- If you change content structure or rendering behavior, explain why in the PR description.

## Adding or Editing Conversation Records

Each conversation record is a standalone YAML file in `src/content/conversations/`.

Required top-level fields:

- `slug`
- `date`
- `timePrecision`
- `source`
- `tags`
- `messages`

Rules:

- `slug` must be unique across the repository.
- `slug` and `speakerId` values must use lowercase letters, numbers, and hyphens only.
- `date` must use `YYYY-MM-DD`.
- `timePrecision` must be either `date` or `minute`.
- If `timePrecision` is `date`, every `messages[].time` value must use `YYYY-MM-DD`.
- If `timePrecision` is `minute`, every `messages[].time` value must use `YYYY-MM-DD HH:MM`.
- Every conversation must contain exactly one message with `featured: true`.
- The conversation `date` must match the day of the featured message.
- Keep tags concise and consistent with existing usage.

Example:

```yaml
slug: example-record
date: "2026-04-15"
timePrecision: minute
source: Chat log
tags:
  - yellow-avatar
  - example

messages:
  - speakerId: yellow-avatar
    time: "2026-04-15 12:30"
    text: "Example text."
    featured: true
```

## Adding or Editing Speakers

Speakers are defined in `src/content/speakers/index.yaml`.

Rules:

- Each top-level key is a stable `speakerId`.
- Each speaker must define `name` and `avatar`.
- `variant` is optional and should be either `left` or `right`.
- If you add a new avatar file, place it in `public/avatars/`.
- Do not rename existing speaker IDs casually. Treat them as stable data references.

Example:

```yaml
yellow-avatar:
  name: 黄头像的
  avatar: /avatars/yellow-avatar.svg
  variant: left
```

## Writing Style

- Preserve the intended tone of the source material.
- Keep wording accurate to the underlying record.
- If wording is normalized for consistency, do not alter meaning.
- Use formal, explicit prose in documentation and UI copy.

## Validation Before Opening a PR

Run both commands before submitting:

```bash
npm run validate:content
npm run check
```

Your PR should not introduce:

- duplicate slugs
- unknown speaker IDs
- invalid date or time formats
- missing or multiple featured messages
- Astro type or content errors

## Pull Request Checklist

- I kept the PR focused on a single change set.
- I followed the repository's YAML and naming conventions.
- I ran `npm run validate:content`.
- I ran `npm run check`.
- I updated avatars or speaker definitions if the new content required them.
- I described the change clearly in the PR summary.
