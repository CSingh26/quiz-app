---
name: QuizBee
description: Warm paper, clear questions, and a considered place to study.
colors:
  paper: "#f7f5ef"
  surface: "#fffefb"
  soft: "#edeae1"
  ink: "#242820"
  muted: "#62675b"
  line: "#d9dace"
  honey: "#ebba48"
  honey-hover: "#dda932"
  honey-soft: "#f6eac9"
  green: "#42553c"
  green-soft: "#e5eadf"
  red: "#9a3934"
  red-soft: "#fae7e2"
  focus: "#7c5c17"
  sidebar: "#efede5"
  dark-paper: "#1c211d"
  dark-surface: "#242a24"
  dark-soft: "#2d342c"
  dark-ink: "#f2f1e7"
  dark-muted: "#b4bcac"
  dark-line: "#434d40"
  dark-honey: "#edc462"
  dark-honey-hover: "#f6d282"
  dark-honey-soft: "#3c3626"
  dark-green: "#bfceb2"
  dark-green-soft: "#303c2c"
  dark-red: "#ffb5a9"
  dark-red-soft: "#412b28"
  dark-focus: "#edc462"
  dark-sidebar: "#20261f"
typography:
  display:
    fontFamily: "QuizBeeSerif, Georgia, serif"
    fontSize: "clamp(48px, 5.1vw, 71px)"
    fontWeight: 400
    lineHeight: 1.075
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "QuizBeeSerif, Georgia, serif"
    fontSize: "clamp(30px, 3vw, 43px)"
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  section:
    fontFamily: "QuizBeeSerif, Georgia, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: "-0.015em"
  title:
    fontFamily: "QuizBeeSans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "QuizBeeSans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "QuizBeeSans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.5
rounded:
  tag: "5px"
  field: "7px"
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  label: "12px"
  control-x: "17px"
  group: "24px"
  section: "40px"
  workspace-x: "48px"
components:
  button-primary:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.honey-hover}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  button-danger:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
    height: "44px"
  tag:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "3px 9px"
  navigation-current:
    backgroundColor: "{colors.honey-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  question-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "30px"
---

# Design System: QuizBee

## Overview

**Creative North Star: "The Academic Field Guide"**

QuizBee treats studying as a thoughtful, ongoing practice. Warm paper, dark ink, honey actions, and muted green annotations establish an academic workspace that is welcoming without becoming childish. Generous serif headings introduce dense, useful lists and quiet controls.

The implemented world uses index-like navigation, compact version records, source passages, and a single-question study surface. The landing page is more expressive; task screens put readable questions and reliable state ahead of decoration. Light, dark, and system themes share the same hierarchy.

**Key Characteristics:**

- Warm paper and ink with restrained honey actions.
- Local serif headlines paired with a clear sans-serif interface.
- Useful rows and visible revision records instead of a uniform card grid.
- Quiet task surfaces with explicit loading, saved, empty, error, and pending-review states.
- A small geometric hexagon-and-bee mark, not a character illustration.

This document records the implemented platform at `/` and `/study`. Its source is `frontend/src/app/globals.css` and `frontend/src/components/study`; legacy dashboard and authentication styles remain a separate compatibility surface. The frontmatter records actual color and type values. Spacing entries describe repeated measurements already used in CSS, not a separate runtime token implementation.

## Colors

The palette combines warm neutral reading surfaces with honey for action and green for guidance and successful selection. The frontmatter is the numeric source for both themes; runtime colors are the corresponding `--qb-*` custom properties.

### Primary

- **Honey** identifies primary actions and the small bee mark. Hover uses the darker honey token in light mode and the lighter honey token in dark mode.
- **Soft Honey** marks the active navigation destination and occasional study prompts. It does not replace the normal page background.

### Secondary

- **Field Green** supports selected answers, progress, source-related accents, and contextual notices.
- **Soft Green** creates quiet selected and instructional surfaces.
- **Review Red** and its soft companion identify failures and destructive actions. Destructive actions also use explicit text.

### Neutral

- **Paper** is the continuous page background; **Surface** is the near-white sheet used by forms and questions.
- **Ink** is primary text. **Muted** is supporting copy and metadata. **Line** divides collections and outlines controls.
- **Sidebar** distinguishes navigation with a small tonal shift rather than a raised panel.
- Dark mode replaces each semantic color through `html[data-theme=dark]`. Primary-button lettering stays dark ink so the honey action remains legible.

**The Action Color Rule.** Honey identifies a next action or current location. It does not imply a score, an award, or activity that the application has not measured.

## Typography

**Display Font:** Roxborough CF, self-hosted as `QuizBeeSerif`, with Georgia and serif fallbacks.

**Body Font:** Montserrat, self-hosted as `QuizBeeSans`, with Arial and sans-serif fallbacks.

**Character:** The serif brings the character of an academic field guide; the sans-serif keeps controls, questions, source metadata, and revision records clear. The new font aliases use `font-display: swap`. The existing legacy Montserrat alias now also points to the actual Montserrat file.

### Hierarchy

- **Display:** Large, balanced landing headlines. The mobile layout overrides the fluid desktop scale at its established breakpoints.
- **Headline:** Workspace page titles, with a restrained negative letter spacing and supporting description beneath.
- **Section:** Serif headings divide meaningful tasks. Compact sidebar and settings section headings switch to the sans-serif when they function as labels.
- **Title:** Sans-serif collection rows and small operational headings.
- **Body:** The base reading style is relaxed; long prose is constrained with `ch` widths where implemented. Question prompts use a larger serif style with more leading.
- **Label:** Clear sentence-case action and field labels. Smaller metadata appears in lists, timestamps, source descriptions, and tags. Tabular numerals are used for times, scores, and table data.

**The Two Voices Rule.** Serif type introduces ideas and questions; sans-serif type explains actions, state, and records. Do not introduce a third display face.

## Layout

The desktop workspace has a fixed navigation column (236px) and a flexible main area, with a maximum main width (1600px). The main content begins with horizontal padding (48px) and a compact title/action header. The navigation narrows (210px) at the first desktop breakpoint.

Collection screens use divided rows. Overview combines a main collection column with a narrower study note and measured progress summary. The builder pairs question sheets with settings. Attempt screens pair one question with a numbered progress index. These secondary columns collapse when there is no longer enough room to read comfortably.

The landing page uses a wide container (1320px), a two-column opening, and a narrower divided workflow section (1220px). Its explicitly labeled example sheet and book spines are an illustration of the product’s study context, not real user activity.

Observed responsive thresholds are 1200px, 960px, 760px, and 460px. At 760px, the workspace sidebar becomes a toggled drawer beneath a sticky header; the main content loses its desktop offset. At 460px, field rows and tight controls stack. Data tables scroll inside their own wrapper. Question navigation uses fewer columns as the viewport narrows.

**The Reading Space Rule.** Collapse secondary columns before shrinking the question, field, or source text into the remaining space.

## Elevation & Depth

The workspace is primarily flat. Tonal surfaces, borders, and whitespace establish hierarchy; ordinary list rows and question panels do not carry large shadows. A soft offset shadow lifts the landing example sheet. The open mobile navigation drawer uses a side shadow because it overlays content.

### Shadow Vocabulary

- **Paper lift:** `0 16px 45px #35352314`; its dark-theme equivalent is `0 16px 45px #00000026`. Reserved for the landing example sheet.
- **Navigation overlay:** `12px 0 30px #00000020`. Indicates the mobile drawer’s overlap.

**The Flat Workspace Rule.** Use a border or a tonal surface for ordinary working content. Preserve elevated treatment for the few surfaces that visibly overlap another surface.

## Shapes

Controls have gently curved corners; tags are smaller and more compact. Question sheets, upload surfaces, notices, and contextual sections use the documented corner scale. Buttons are rectangular controls rather than broad pills. The avatar is circular, and the brand uses precise hexagonal geometry.

Thin borders separate information. There are no colored decorative side bars on ordinary rows. Dashed borders identify empty or add-content surfaces. The landing example is slightly rotated; operational forms and question sheets remain aligned and still.

## Components

### Buttons

Confident, compact controls name their action. Primary, secondary, quiet, and danger variants are implemented by the shared `Button` component. Controls have a minimum height (44px); larger landing actions use a taller variant. Some dense question-editor icon tools use smaller visual dimensions within the editor header, an existing exception that should not spread into primary actions.

Primary actions use honey and dark ink. Secondary actions use a surface and thin outline. Quiet actions use muted lettering and acquire a soft background on hover. Danger actions combine review-red lettering, border, and soft fill. Disabled controls reduce opacity and block activation.

Color transitions are brief (160ms). Focus uses a visible outline (2px) and offset (4px), not a decorative glow.

### Chips

Compact tags identify mode, version-adjacent metadata, state, or completion. Default tags use the soft neutral surface; success tags use soft green. Tags are descriptive, not interactive filters unless rendered with a real control.

### Cards / Containers

Question sheets and explicit form groups have a surface, thin border, and panel corners. Collection records remain rows separated by lines. Empty states use a dashed boundary, useful explanation, and relevant next action. The study note has a soft honey surface and a serif heading.

### Inputs / Fields

Fields are enclosed by a visible label and may include a supporting hint. Inputs and selects use surface fill, a thin line border, and field corners. Errors are persistent inline notices with text and an icon. Password visibility controls have explicit accessible names. File selection remains a native focusable control behind its visible upload button.

### Navigation

The sidebar combines one consistent Lucide stroke system with text labels. Active destinations use soft honey and `aria-current`. The mobile header exposes a named menu button and an expanded state. A visible-on-focus skip link leads to the main content landmark.

### Question Surface

A compact meta row shows position, type, and points. A readable serif prompt precedes answer controls. Single choice and true/false use native radios; multiple select uses checkboxes. Selection receives a green border, surface tint, letter marker, and check icon. Numeric, text, essay, matching, and ordering responses retain native input or explicit move controls.

The progress index distinguishes current, answered, and flagged questions. A server-derived countdown uses tabular numerals. Saved, saving, and failed-save text stays visible. A submission section names unanswered and flagged counts before the irreversible step. Released review renders the user’s answer, available key, explanation, and source passages in a clear hierarchy.

### Motion and Browser Surfaces

Motion is limited to short state transitions, the mobile drawer, and a loading spinner. Reduced-motion preference removes those transitions and the spinner animation while keeping loading text and state visible. Selection, caret, focus, and scrollbar colors use the same palette.

## Do's and Don'ts

### Do:

- **Do** keep the academic field-guide character: warm paper, ink, compact records, and generous serif headings.
- **Do** use the shared semantic colors so light and dark themes preserve the same hierarchy.
- **Do** use rows for comparable records and a dedicated sheet for a focused question or form.
- **Do** show real loading, error, empty, saved, and pending-review states in the same visual system.
- **Do** retain native controls, descriptive labels, visible focus, and an accessible alternative to dragging.
- **Do** label illustrative landing content as an example and derive progress from actual records.

### Don't:

- **Don't** add blue/pink legacy styling to new study routes or silently restyle legacy routes through global selectors.
- **Don't** replace useful collections with a uniform grid of decorative cards.
- **Don't** use exaggerated gradients, glass effects, cartoon mascots, or invented activity to make the workspace feel busy.
- **Don't** turn every section into a promotional hero or add a kicker above its heading.
- **Don't** use color alone to communicate answer selection, a failure, or a destructive action.
- **Don't** hide missing provider configuration or imply that browser integrity signals prove misconduct.
