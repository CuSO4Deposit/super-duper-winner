# Conversation Thread Redesign

**Date:** 2026-04-15

## Goal

Redesign the quotations site so the homepage remains an index of featured lines, while each detail page becomes a chat-style conversation view. Content should move from one-quote-per-file to one-conversation-per-file, with a single featured message representing the conversation in index contexts.

## Scope

This redesign includes:

- Replace the quote-centric content model with a conversation-thread content model
- Keep the homepage and tag pages as index views
- Make detail pages render full conversation threads in a chat-inspired layout
- Add a speaker mapping file for display name and avatar resolution
- Support one featured message per conversation for index display

This redesign does not include:

- Search
- Speaker archive pages
- Source archive pages
- Comments
- Admin tooling
- Rich message types such as images, reply chains, or system messages

## Chosen Product Model

The site keeps its current information architecture:

- Homepage at `/`
- Detail pages at `/q/<slug>/`
- Tag pages at `/tag/<tag>/`

What changes is the content unit:

- Before: one quote file per page item
- After: one conversation thread file per page item

Each conversation thread contains multiple messages. Exactly one message is marked `featured: true`. That featured message becomes the representative line shown on the homepage and tag pages. The detail page shows the whole conversation.

## Content Storage

### Conversation Files

Store each conversation in one YAML file under:

`src/content/conversations/*.yaml`

Each file contains:

- `slug`
- `date`
- `timePrecision`
- `source`
- `tags`
- `messages`

Each message contains the minimal fields:

- `speakerId`
- `time`
- `text`
- optional `featured`

Example:

```yaml
slug: late-night-call
date: "2024-05-18"
timePrecision: minute
source: Phone call
tags:
  - midnight
  - conversation

messages:
  - speakerId: lin
    time: "2024-05-18 21:34"
    text: "It sounded like you were smiling before you finished the sentence."
    featured: true

  - speakerId: aya
    time: "2024-05-18 21:35"
    text: "Maybe I was."
```

### Speaker Mapping File

Store speaker metadata in one mapping file:

`src/content/speakers.yaml`

Example:

```yaml
lin:
  name: Lin
  avatar: /avatars/lin.jpg
  variant: left

aya:
  name: Aya
  avatar: /avatars/aya.jpg
  variant: right
```

Fields:

- `name`: display name
- `avatar`: public image path
- optional `variant`: currently `left` or `right`

Avatar assets should live under:

`public/avatars/*`

## Message And Speaker Semantics

### Featured Message

Exactly one message in each conversation must have `featured: true`.

Rules:

- Homepage uses the featured message text as the main visible quote
- Tag pages use the featured message text as the main visible quote
- The featured message speaker determines which speaker metadata is shown in index views
- Detail pages show the full conversation, not just the featured message

This keeps the site centered on “quotations” while allowing conversations to be the true source unit.

### Speaker Identity

Messages use `speakerId`, not a display name.

Rationale:

- display names and avatars can change independently of content files
- the same speaker can appear across many threads without duplication
- layout decisions such as message presentation can be centralized

## Information Architecture

### Homepage

The homepage remains an index rather than a chat transcript.

Each conversation appears once, represented by:

- featured message text
- featured message speaker identity
- conversation date or featured message time as appropriate
- source
- tags

Homepage grouping remains time-oriented. The homepage should not show full thread expansion.

### Tag Page

Each tag page follows the same pattern as the homepage:

- one entry per conversation
- the visible body is the featured message
- clicking enters the full thread

### Detail Page

The detail page becomes a conversation page.

It should:

- render all messages in sequence
- show avatar, display name, and message text
- show message time in a restrained way
- keep a simple return link to the archive
- visually distinguish speakers clearly

The page should feel inspired by chat software, but not like a literal screenshot or pixel-perfect clone of WeChat.

## Visual Direction

### Index Views

Homepage and tag pages should stay close to the current design language:

- quiet archive feeling
- restrained typography
- featured message shown as the main textual content
- no full chat bubble layout in index views

### Detail View

Detail pages should become chat-inspired.

The goal is not strict WeChat imitation. The goal is clear conversational readability:

- each message has avatar, name, and bubble
- speakers are visually distinguishable
- featured message receives a subtle emphasis
- the page still reads as a designed website, not a screenshot of a phone UI

### Speaker Distinction Strategy

The system should support a stable distinction between speakers without hard-coding one visual style forever.

Recommended implementation:

- speaker mapping can define `variant`
- components can also assign stable visual variants by speaker
- current default should support `left` and `right` variants

This keeps the data model flexible:

- if later the site moves to a single-column colored-bubble layout, data files do not need to change

## Data Model Constraints

### Conversation Constraints

Each conversation must satisfy:

- non-empty `slug`
- `slug` safe for `/q/<slug>/`
- non-empty `source`
- `tags` array with non-empty items
- at least one message
- exactly one featured message
- all message times valid and parseable
- message times compatible with conversation `timePrecision`

### Message Constraints

Each message must satisfy:

- non-empty `speakerId`
- non-empty `text`
- valid `time`

### Speaker Constraints

Each referenced `speakerId` must exist in `speakers.yaml`.

Each speaker entry must satisfy:

- non-empty `name`
- non-empty `avatar`
- optional `variant` currently limited to `left` or `right`

## Build Architecture Changes

Recommended source structure after redesign:

```text
src/
  content/
    config.ts
    conversations/
      late-night-call.yaml
      open-window.yaml
    speakers.yaml
  components/
    ConversationMessage.astro
    ConversationThread.astro
    FeaturedConversationCard.astro
    SpeakerAvatar.astro
  lib/
    conversations.ts
    speakers.ts
```

The rest of the page and layout structure can stay conceptually similar.

Responsibility split:

- `content/config.ts`: schema definitions for conversations and speakers
- `lib/speakers.ts`: speaker lookup and normalization
- `lib/conversations.ts`: loading threads, finding featured messages, producing index-ready records
- `FeaturedConversationCard.astro`: homepage/tag-page entry renderer
- `ConversationThread.astro`: detail-page full thread renderer
- `ConversationMessage.astro`: one chat bubble row

## URL Design

Quote detail URLs stay:

- `/q/<slug>/`

Tag URLs stay:

- `/tag/<tag>/`

The redesign does not change the public permalink structure for conversation pages.

## Migration Strategy

The current content source is quote-centric Markdown. The redesign should migrate content in stages.

### Stage 1

Introduce the new conversation and speaker structures alongside current code.

### Stage 2

Convert the existing sample quote files into conversation files. Minimal samples can remain one-message threads, and conversational samples can include follow-up messages as long as exactly one message is featured.

This means each old quote becomes:

- one conversation file
- one message in `messages`
- that message marked `featured: true`

This keeps old content valid while enabling the new model.

### Stage 3

Update homepage and tag pages to read featured messages from conversations.

### Stage 4

Update detail pages to render full threads.

### Stage 5

Remove old quote-specific structures once all pages use the new model.

## Validation And Error Handling

The content validator must be expanded to cover:

- exactly one featured message per conversation
- all referenced `speakerId`s exist in `speakers.yaml`
- speaker mapping fields are complete
- conversation `slug` remains route-safe
- message arrays are non-empty

Build-time helper code should fail early with explicit messages when:

- no featured message exists
- more than one featured message exists
- a speaker mapping is missing
- a conversation file is malformed

## Implementation Order

Recommended implementation sequence:

1. Add schemas for conversations and speakers
2. Add speaker mapping file and sample avatar assets or placeholders
3. Build conversation and speaker helper modules
4. Migrate sample content into conversation YAML files
5. Refactor homepage/tag pages to use featured messages
6. Build chat-style conversation detail components
7. Replace quote detail page body with full thread rendering
8. Expand content validation
9. Remove old quote-centric content paths and helpers

## Testing Strategy

Verification should cover:

- content validation passes for migrated sample data
- `npm run check` passes after schema migration
- `npm run build` emits homepage, detail pages, and tag pages successfully
- detail pages render full message threads
- homepage and tag pages show only featured messages
- a build with GitHub Pages base path still produces correct internal links

Manual review should focus on:

- mobile readability of chat bubbles
- avatar/name/message alignment
- featured message emphasis not overwhelming the page
- clear distinction between speakers

## Deferred Features

Not part of this redesign:

- image messages
- voice/system message types
- reply threading
- message reactions
- multi-featured excerpts
- per-speaker archive pages
