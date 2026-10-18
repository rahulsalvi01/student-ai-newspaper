# 03 — UI/UX Design System Specification

## 1. Design direction
**Reference direction: classic Indian business newspaper editorial design, using The Economic Times as a broad visual reference.** Use a high-contrast black-and-white palette, compact newspaper typography, dense but readable headlines, thin rules, structured columns and a restrained print-inspired hierarchy.

This is an original product design, not a copy of The Economic Times brand. Do not use its logo, exact masthead, proprietary icons, exact page layouts, or branding assets. Use the product name chosen by the owner (for example, “The Daily Brief”) and original components.

## 2. Layout
- Desktop: white page canvas, black masthead, thin horizontal rules, a compact date/edition line, left topic navigation, central editorial grid and optional right rail for “Top Briefing.”
- Tablet: two-column story grid; collapse side navigation.
- Mobile: single column, compact masthead, topic filter chips and a simple menu.
- Use newspaper-like columns and dividers rather than rounded dashboard cards everywhere. Story cards should have square or very subtle corners, no heavy shadows, and generous headline hierarchy.
- Main sections: Top Stories, India, World, Business, Markets, Technology, Science, Culture and Sports. Render only sections with stories.
- Each story includes category, headline, source-provided description or clearly labelled generated summary, publisher, publication time where available, and “Read source” link.
- Show issue date, generated time, source coverage, and a clear partial-data notice when relevant.

## 3. Monochrome design tokens
Use CSS variables and Tailwind theme mappings. The design should remain black, white and neutral grey. Avoid colorful accents; use border weight, type size, spacing and labels to distinguish hierarchy.

### Light theme (primary)
| Token | Value |
|---|---|
| `--background` | `#FFFFFF` |
| `--surface` | `#FFFFFF` |
| `--surface-muted` | `#F5F5F5` |
| `--text-primary` | `#111111` |
| `--text-secondary` | `#404040` |
| `--text-muted` | `#666666` |
| `--border` | `#D2D2D2` |
| `--border-strong` | `#111111` |
| `--brand` | `#111111` |
| `--accent` | `#333333` |
| `--success` | `#333333` |
| `--warning` | `#555555` |
| `--danger` | `#111111` |
| `--info` | `#444444` |

### Dark theme (optional)
| Token | Value |
|---|---|
| `--background` | `#111111` |
| `--surface` | `#1A1A1A` |
| `--surface-muted` | `#242424` |
| `--text-primary` | `#F7F7F7` |
| `--text-secondary` | `#D5D5D5` |
| `--text-muted` | `#A8A8A8` |
| `--border` | `#444444` |
| `--border-strong` | `#F7F7F7` |
| `--brand` | `#FFFFFF` |
| `--accent` | `#DADADA` |
| `--success` | `#D5D5D5` |
| `--warning` | `#D5D5D5` |
| `--danger` | `#FFFFFF` |
| `--info` | `#D5D5D5` |

## 4. Typography
- Use a newspaper-inspired pairing: `Source Serif 4` (or Georgia/system serif) for lead headlines and major story titles; `Arial`, `Helvetica`, or `Inter` for navigation, metadata and controls.
- Similar editorial feel is the goal; do not copy proprietary font files or claim to use Economic Times' exact typefaces unless verified and licensed.
- Masthead: 34–44px bold serif or strong editorial display face; desktop lead headline 30–38px; story headline 18–24px; compact headline 16–19px; body 15–17px; metadata 11–13px.
- Headline weight should be bold/semibold with tight line-height (1.1–1.25); body line-height 1.5–1.65.
- Use uppercase small labels sparingly for section names; use thin rules to create print-like hierarchy.
- Use a 4px spacing base; keep headlines and article summaries aligned to a clear column grid.

## 5. Components and states
- Masthead: original product name in bold editorial type, issue date, edition label and preferences menu. Never use The Economic Times logo or masthead.
- Section header: uppercase or title-case label with a strong black rule.
- Status label: Ready, Partial, Generating, Failed, Not generated; use monochrome text/icon and a clear label, not color alone.
- Topic chip: monochrome outline, black fill with white text when selected, visible keyboard focus.
- Story card: editorial column with a thin separator, restrained hover state, clear focus ring and source link.
- Source badge: publisher/source label; never imply endorsement.
- Preferences form: clear labels, validation errors, save-in-progress and saved states.
- Generation action: disabled while a run is active; show confirmation and run result.
- Empty state: explain why no edition/stories are available and offer retry only to an authorised user.
- Partial state: show available stories and a clear notice that some feeds failed.
- Error state: friendly message plus retry guidance; never expose raw server errors.

## 6. Accessibility and responsive behavior
- Semantic `header`, `nav`, `main`, `article`, `section` and `footer`.
- Keyboard reachable controls and visible focus rings.
- Never rely on color alone for state.
- Use descriptive link text and alt text for meaningful images; hide decorative images from screen readers.
- Support reduced motion; no auto-advancing carousels.
- Check contrast, touch target sizes and zoom/reflow on narrow screens.
- Use loading skeletons only where helpful; respect reduced-motion preferences.

## 7. Editorial integrity
- Label AI-generated summaries as generated.
- Preserve the original source link and source name.
- Do not fabricate quotations, authors, dates, images or article details.
- If the source does not provide a summary, show a short metadata-based card rather than hallucinating facts.
