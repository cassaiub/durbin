# CLAUDE.md

Guidance for Claude Code when working in this repo (`durbin/`, durbin-site).

## What this is

The standalone hub for **Durbin**, CASSA's volunteer astronomy-outreach
programme, an Astro 6 static site whose centrepiece is the exhibition: all
astrophotography by Durbin volunteers, one page per image. Deploys to
**durbin.cc**, its own domain, so the site is at that domain's root
(`base: '/'`).

## Commands

- `npm run dev`, dev server on port **2028** (one port per CASSA repo:
  cassa 2026 · ast100 2027 · durbin 2028; kriterion 3000/4000, inside 4317).
- `npm run build`, static build to `dist/`. Build does NOT typecheck.
- `npx astro check`, typecheck; keep it at 0 errors.
- `npm run deploy`, manual deploy (build + dry-run + confirm + rsync).

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci` →
`check:content` → `astro build` → `rsync --delete dist/` to Bluehost. **There
is no staging, so a push to `main` is a live production deploy** — never push
without an explicit request. The Actions tab also allows a manual re-run
(`workflow_dispatch`), and `npm run deploy` is the local escape hatch (uses the
`bluehost` alias in `~/.ssh/config`; CI uses the shared `cassa-ci-deploy` key
via the four `BLUEHOST_*` repo secrets).

The destination is `~/durbin.cc/` on the server — the document root of the
`durbin.cc` addon domain (live since 2026-08-11), deliberately **outside
`public_html`**. The sibling
`cassa` repo mirrors its build onto `public_html/` with `--delete`, where
anything not part of the cassa build survives only by being named in that
repo's exclude list. Keeping this site out of `public_html` means neither
deploy can reach the other's files; do not move it in there.

Note that `cassa.bd/durbin` is a **different** site — a section of cassa-site,
built and owned by the `cassa` repo. This repo does not deploy there.

`public/.htaccess` ships with the build and is **not** excluded from the rsync,
so server URL behaviour (no-trailing-slash pages, the 404 document) is version
controlled. Edit it in the repo, never on the server. Bluehost also runs an
nginx edge cache in front of Apache with an 8-hour TTL, so after a deploy an
unchanged URL can serve a stale response; add a throwaway query string when
verifying.

## No localization layer (but content may be Bangla)

The site **chrome** is monolingual English. It was bilingual (Bangla-default
with an `/en/` mirror) until 2026-08-01; that whole layer, the `/en/` route
tree, the `t(locale, key)` dictionary in `src/lib/i18n.ts`, `essayBn`, the
per-entry `lang` field, and the Durer Kotha series, was deleted. Do not
reintroduce it without an explicit request.

**Content is a separate question.** On 2026-08-11 the user confirmed that news
posts may be written in Bangla — the site carries both, with no per-entry
`lang` field and no route-level split. Do not translate or delete a Bangla
entry; leave the prose in the language it was written in. `Noto Sans Bengali`
trails Inter in the font tokens in `src/styles/global.css` (and is loaded in
`BaseLayout`) so Bengali codepoints resolve to real glyphs; keep it there.

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
- `news/`: every non-draft post lands in /news-and-events and /news/[slug].
- `events/`: all non-draft events land in /news-and-events and /events/[slug].
  (`/updates` is only a 301 stub to /news-and-events, kept for old links.)
- Assets referenced by news/events live in `src/assets/news|events/<slug>/`
  and are referenced relatively (`../../assets/…`), keep that layout.
- Content may be English or Bangla; both live in the same feed. A migrated
  entry carrying a stray `lang:` key is harmless (the schema drops it). Do not
  translate an entry into the other language on your own initiative.

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
