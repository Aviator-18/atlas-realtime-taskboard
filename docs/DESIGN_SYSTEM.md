# Atlas design system

## 1. Direction

Atlas is a working tool that a team keeps open all day. The interface should feel quiet, dense and precise, closer to a well-made desk instrument than to a product landing page. There is no marketing surface anywhere: no hero section, no illustration, no slogan.

**One memorable thing.** Boldness is spent in a single place: the way a card announces that a teammate just changed it (section 6). Everything else stays disciplined and plain so that this one behaviour is noticed. That behaviour is also the product's central idea, live collaboration made visible.

**Subject vocabulary.** The visual language comes from the subject: planning boards, index cards on a table, pencil on paper. So: flat white cards on a lightly tinted surface, thin rules, ink-coloured text, one accent used sparingly.

## 2. Tokens

Define these as CSS variables in `src/styles/tokens.css` and map them into the Tailwind theme. Do not use raw hex values in components.

### Colour

| Token | Value | Use |
|---|---|---|
| `--surface-canvas` | `#F1F3F5` | Page and board background |
| `--surface-lane` | `#E6E9ED` | Column background |
| `--surface-raised` | `#FFFFFF` | Cards, drawer, top bar, inputs |
| `--rule` | `#D3D8DE` | Default borders and dividers |
| `--rule-strong` | `#B3BAC4` | Hover borders, input borders |
| `--ink` | `#1F252C` | Primary text |
| `--ink-muted` | `#56616D` | Secondary text |
| `--accent` | `#0E6B6F` | Primary buttons, focus ring, live cue, links |
| `--accent-wash` | `#D8EBEC` | Background of the remote-change cue |
| `--priority-high-ink` / `-wash` | `#9E2A1D` / `#FADFDB` | High priority |
| `--priority-medium-ink` / `-wash` | `#7A5200` / `#F8ECC8` | Medium priority |
| `--priority-low-ink` / `-wash` | `#46525F` / `#DDE2E8` | Low priority |
| `--danger` | `#B42318` | Destructive actions, errors |
| `--warning-wash` | `#FBF0D0` | Conflict banner background |

Light theme only for the dry run. Keep the token structure so a dark theme could be added later. Text on any background must meet 4.5:1 contrast.

### Type

One family: **Public Sans**, self-hosted through `@fontsource/public-sans` (weights 400, 500, 600). No second family. No monospace face; use `font-variant-numeric: tabular-nums` for estimates and counts instead.

| Role | Size / line height | Weight |
|---|---|---|
| Board title | 20 / 28 | 600 |
| Drawer title, dialog title | 18 / 26 | 600 |
| Body, card title, inputs | 14 / 20 | 400, card title 500 |
| Secondary text, chips | 12.5 / 18 | 400 or 500 |

Sentence case everywhere. Do not use all capitals, letter-spaced labels or eyebrow text above headings. Column names, field labels and button labels are plain sentence case.

### Space, shape, depth

- 4 px base unit. Common steps: 4, 8, 12, 16, 24.
- Radius follows hierarchy rather than being uniform: chips and inputs 4 px, cards 6 px, drawer and menus 8 px, avatars full circle.
- Cards have no shadow at rest. Shadow is reserved for things that float: a dragged card (`0 6px 16px rgba(31, 37, 44, 0.18)`), menus and the drawer. No other shadows.
- Borders are 1 px `--rule`. Structure comes from rules and tint, not from boxes inside boxes.
- No gradients, anywhere. No glass or blur effects.

### Motion

- 120 ms ease-out for state changes (hover, press, focus).
- 180 ms ease-out for the drawer sliding in.
- No entrance animations on page load or on sections. No hover lift on cards.
- Respect `prefers-reduced-motion`: replace all transitions, including the live cue fade, with an instant change.

### Icons

lucide-react, 16 px, stroke width 1.5, current colour. Use only where an icon saves words: add, close, check, warning. No icon in front of every label. No sparkle or "AI" symbol anywhere. No emojis.

## 3. Layout

```
+--------------------------------------------------------------------------+
| Atlas   Checkout API, sprint 12          Priya  Arjun  Sana       Live    |  top bar, 48 px
+--------------------------------------------------------------------------+
|  To do  4              In progress  3           Done  7                   |
|  +------------------+  +------------------+   +------------------+        |
|  | Card             |  | Card             |   | Card             |        |
|  | 4 h  High    PN  |  |                  |   |                  |        |
|  +------------------+  +------------------+   +------------------+        |
|  | Card             |  ...                                                |
|  + Add task                                                               |
+--------------------------------------------------------------------------+
```

- Top bar, 48 px, `--surface-raised`, bottom rule. Left: product name in plain text at weight 600, then the board name. Right: member initials, then the connection state. No logo mark, no avatar menu clutter.
- Board canvas scrolls horizontally. Columns are 300 px wide, 12 px apart, left aligned, with 16 px padding around them. Each column is a `--surface-lane` strip with a header (name in 500 weight, task count in `--ink-muted`, add button on the right) and a vertical list of cards with 8 px gaps. Columns scroll vertically on their own.
- Task details open in a right-hand drawer, 420 px wide, not a centred modal. The board stays visible behind it so live changes remain visible while editing.
- Below 768 px: columns become 85 percent of the viewport width with scroll snapping, and the drawer takes the full width.
- Content is left aligned throughout. Nothing is centred except the sign-in form container itself.

## 4. Components

### Task card

`--surface-raised`, 1 px `--rule` border, radius 6, padding 10 px 12 px.

1. Title: 14 px, weight 500, at most three lines, then an ellipsis.
2. One meta row under it, 8 px below, three items spread with flex, not joined with separators: the estimate ("4 h", tabular figures, `--ink-muted`; omitted when empty), the priority chip, and the assignee as a 22 px circle with initials (`--surface-lane` background, 11 px, weight 600).

Priority chip: radius 4, padding 2 px 6 px, 12.5 px text in the priority ink on the priority wash. The chip always carries the word ("High", "Medium", "Low"), so meaning never depends on colour alone.

States: hover changes the border to `--rule-strong`. Selected (drawer open) gets a 2 px `--accent` outline. Dragging gets the floating shadow and nothing else, no rotation, no scaling. The drop position is shown as a 2 px `--accent` line between cards.

### Buttons

Primary: `--accent` background, white text, radius 4, height 32, weight 500. Secondary: white background, `--rule-strong` border, `--ink` text. Destructive: text in `--danger`, with a confirmation step. Labels say exactly what happens: "Create task", "Save changes", "Delete task", "Use suggestion". The same action keeps the same name everywhere.

### Fields

Height 32 (textarea grows), `--surface-raised`, 1 px `--rule-strong` border, radius 4. The label sits above the field, 12.5 px weight 500. Validation messages sit below the field in `--danger`, and say how to fix the problem.

### Drawer

Header with the task title field and a close button. Body: description, then a two column grid of the remaining fields (estimate, priority, assignee, column) with labels above values. Footer is sticky with "Save changes" and "Cancel". Created and last updated times appear in `--ink-muted` at the bottom, as relative time with the exact time in a `title` attribute.

### Estimation suggestion block

Located directly under the title and description fields in the create form.

- Resting state: a secondary button "Suggest estimate".
- Loading: the button shows "Suggesting" and is disabled. No spinner overlay.
- Result: a bordered block (1 px `--rule`, radius 4, padding 12) containing the estimate and priority on one line ("4 h, High priority"), the one sentence rationale in `--ink-muted`, a source line ("Suggested by the language model" or "Estimated from keywords because the model was unavailable"), then two buttons, "Use suggestion" and "Ignore".
- "Use suggestion" fills the estimate and priority fields, which remain editable. The block never applies anything by itself.

### Connection state

Top bar, right side: a 6 px dot followed by text. "Live" in `--accent`, "Reconnecting" in the medium priority ink, "Offline" in `--danger`. The text sits in an `aria-live="polite"` region. Do not use a toast for connection changes.

### Empty, loading and error states

- Loading a board: lane skeletons (flat `--surface-lane` blocks), no spinner.
- Empty column: no illustration. The header's add button is the invitation, and the column body shows "No tasks" in `--ink-muted`.
- No boards yet: "You are not on any boards yet." followed by two buttons, "Create a board" and "Join with an invite code".
- Failed request: an inline banner at the top of the affected area that says what failed and offers "Try again".

## 5. Screens

1. **Sign in and register.** A single column form, 360 px wide, left aligned inside the page, vertically near the top third. Product name in text, heading "Sign in", two fields, one primary button, a text link "Create an account". No side panel, no testimonial, no illustration.
2. **Boards.** A plain list under the top bar. Each row: board name, role in `--ink-muted`, member count. Actions "Create a board" and "Join with an invite code" open small dialogs. Invite code is shown in the board's top bar menu with a copy action.
3. **Board.** As in section 3.

## 6. The live cue (the one bold element)

When an event from another member creates, updates or moves a card:

- The card gets a 3 px `--accent` bar on its left edge and an `--accent-wash` background.
- For the first 4 seconds the card shows one extra line under the title: "Moved by Priya" or "Edited by Arjun" or "Added by Sana", in `--ink-muted`, 12.5 px.
- The bar and wash fade out over 2.4 seconds starting after 1.6 seconds. The caption is removed after 4 seconds.
- A single `aria-live="polite"` region announces the change in words, for example "Priya moved Fix refund rounding to Done".
- With `prefers-reduced-motion`, skip the fade: show the cue for 4 seconds, then remove it.
- Your own changes never trigger the cue.

## 7. Conflict presentation

When a save or move is rejected with `TASK_VERSION_CONFLICT`:

- The card snaps to the latest state from the response.
- An inline banner is attached to the card (not a toast that disappears), on `--warning-wash`, with text such as: "Arjun changed this task before your change was saved. Your change was not applied." Two buttons: "Apply my change again" and "Dismiss".
- If the drawer is open with unsaved edits, keep the user's draft in the form, show the same banner at the top of the drawer, and update the displayed version so that saving again is a deliberate act.
- If the task was deleted meanwhile, remove the card and show a banner in its place for a few seconds: "This task was deleted by someone else."

## 8. Writing

- Sentence case. Plain verbs. Active voice. No exclamation marks, no emojis, no cleverness.
- Name things the way the user thinks about them: "board", "task", "estimate", "invite code". Not "workspace", "ticket", "item", "resource".
- Errors say what happened and what to do next, in the interface's voice, and never apologise or blame the user.
- Do not append arrows to links or buttons. Do not build labels with dashes or middle dots. Do not use numbered markers unless the content really is a sequence.
- Every string in the interface comes from one place, `src/strings.ts`, so the vocabulary stays consistent.

Reference strings:

| Situation | Text |
|---|---|
| Wrong sign-in details | Email or password is incorrect. |
| Email already registered | An account with this email already exists. Sign in instead. |
| Invalid invite code | No board matches this invite code. Check the code and try again. |
| Not a member | You are not a member of this board. |
| Connection lost | Reconnecting |
| Model unavailable | Estimated from keywords because the model was unavailable. |
| Rate limited | Too many suggestions in a short time. Try again in a minute. |
| Generic failure | Something went wrong while saving. Try again. |

## 9. Accessibility floor

- Every control is reachable by keyboard, with a visible 2 px `--accent` focus ring and a 2 px offset.
- Cards can be moved by keyboard through the dnd-kit keyboard sensor, with screen reader announcements on pick up, move and drop.
- Hit targets are at least 24 by 24 px. Priority and connection state never rely on colour alone.
- Headings follow a logical order. Form fields have programmatic labels.

## 10. What to avoid, and why

These are common defaults of generated interfaces. Do not use them unless this document explicitly calls for them.

- Purple, indigo or blue to pink gradients, glow effects, glass panels, gradient text.
- One identical rounded card repeated for everything, all with the same large radius and the same soft shadow.
- Tracked-out capital letter labels above headings and sections.
- Small data labels set in a monospace face.
- Meta text joined with middle dots, labels formed as "WORD, then a dash, then a fragment", arrows after link text.
- A dashboard of decorative statistics and charts with invented numbers.
- Entrance animations on every section and hover lift on every card.
- Stock illustrations, mascot graphics, sparkle icons for anything involving the model.
