# CLAUDE.md

Guidance for Claude Code when working in this repo (`durbin/`, durbin-site).

## What this is

The standalone hub for **Durbin**, CASSA's volunteer astronomy-outreach
programme, an Astro 6 static site whose centrepiece is the exhibition: all
astrophotography by Durbin volunteers, one page per image. Will deploy to
**durbin.cassa.bd** (site root of the subdomain, `base: '/'`).

## Commands

- `npm run dev`, dev server on port **2028** (one port per CASSA repo:
  cassa 2026 · ast100 2027 · durbin 2028; kriterion 3000/4000, inside 4317).
- `npm run build`, static build to `dist/`. Build does NOT typecheck.
- `npx astro check`, typecheck; keep it at 0 errors.

## Deployment

No CI workflow yet. When one is added it will mirror ast100's pattern (rsync
`dist/` to the subdomain's document root on push to `main`), at that point a
push to `main` becomes a live production deploy; never push without an
explicit request.

## English only

The site is monolingual English. It was bilingual (Bangla-default with an
`/en/` mirror) until 2026-08-01; that whole layer, the `/en/` route tree, the
`t(locale, key)` dictionary in `src/lib/i18n.ts`, `essayBn`, the per-entry
`lang` field, the Durer Kotha series and its Bangla posts, was deleted. Do
not reintroduce it without an explicit request.

- One unprefixed route tree under `src/pages/`. Every route file is a thin
  wrapper around a shared view in `src/views/`, page logic lives in the view,
  never in the wrapper.
- Visible strings are written directly in the views. There is no i18n module;
  `src/lib/format.ts` holds only the date helpers (all dates render in
  Asia/Dhaka).
- `BaseLayout` needs the page's `path` prop to build the canonical URL, pass
  it on every page.

## Content model

Collections in `src/content.config.ts` are field-compatible with cassa-site's
(`astrophotography`, `news`, `events`), entries migrate between the two repos
without frontmatter edits. Conventions:

- `astrophotography/`: one object per entry, image co-located, filename = slug.
  The required top-level `objectType` enum is the only broad taxonomy field
  used by filters and ordering. `featured` and `curation` are separate flags;
  `categories` is retained temporarily for migration/editorial comparison and
  must contain only the same single `objectType`. `astrophysics.objectType`
  remains the detailed scientist-supplied description. Extra
  captures of the same object go in `slides` (per-slide `astrophoto` block).
  The markdown body is the essay.
- Run `npm run report:editorial` after exhibition changes and commit the
  generated `reports/editorial-review.md`; `npm run check:content` fails if it
  is stale or if taxonomy/hero-alternative validation fails.
- `news/`: every non-draft post lands in /updates and /news/[slug].
- `events/`: all non-draft events land in /updates and /events/[slug].
- Assets referenced by news/events live in `src/assets/news|events/<slug>/`
  and are referenced relatively (`../../assets/…`), keep that layout.
- Content is English. A migrated entry carrying a stray `lang:` key is
  harmless (the schema drops it), but its prose must be English.

## Design system

Defined in `src/styles/global.css` ("Neon Dark-First"): black ground,
charcoal surfaces, white and grey text, neon-green actions, a 4px spacing grid,
border-led depth, and compact 4px corners. Shared patterns: `.placard` (mono wall
label), `.plate` (exhibition tile), `.urow` (feed row), `.hero`, `[data-reveal]`
(scroll reveal, observer in BaseLayout; always JS-optional, the noscript
fallback must stay). Fonts come from Google Fonts in BaseLayout: Inter
(display, navigation, and body) and Geist Mono (data). The site is permanently
dark. Do not add a light theme, theme toggle, or persisted theme state. Add new
colors through the shared tokens rather than raw hex values.

### Logo

`src/assets/brand/durbin-logo-{night,day}.png`, the same circular mark in two
cuts: the night one is knocked out of its white field with the dark teals
lifted to read on `--night`; the day one keeps the white field. `SiteNav`
renders both and CSS shows the one matching the theme. `public/favicon.png` is
the day cut, which reads on light and dark browser chrome alike. Both were
derived from a single 960×960 JPEG, so there is **no vector master**, get one
before scaling the mark up beyond its current 34px use.
