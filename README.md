# durbin-site

The hub for **Durbin**, CASSA's volunteer astronomy-outreach programme, built
around an immersive online exhibition of deep-sky images captured by student
volunteers across Bangladesh. Deploys to **durbin.cc**.

The site is English-only: one unprefixed route tree, one view per page, and no
localization layer.

## Structure

| Route | What it is |
|-------|-----------|
| `/` | Ambient full-screen crossfade of featured plates + about, stats, previews |
| `/exhibition` | The full exhibition, every object, filterable by object type |
| `/exhibition/[slug]` | One object: capture carousel, the essay, the two information cards, prev/next walk |
| `/news-and-events` | Merged news + events feed by year (`/updates` 301s here) |
| `/news/[slug]`, `/events/[slug]` | Dispatch and event pages |
| `/volunteers` | Current cohort + alumni |
| `/manual` | The Durbin Manual (governance, volunteer model, safeguarding) |

Every route file is a thin wrapper around a view in `src/views/`; page logic
lives in the view.

Content collections (`src/content/`): `astrophotography` (one object per entry,
co-located image, capture + astrophysics frontmatter, the essay as the markdown
body), `news`, `events`, schemas field-compatible with cassa-site, so entries
move between the repos without frontmatter edits.

The exhibition's required top-level `objectType` enum is the authoritative
broad taxonomy used by filters and ordering. `featured` and `curation` are
separate from taxonomy; `astrophysics.objectType` remains the detailed
scientist-supplied description. Run `npm run report:editorial` after content
changes to regenerate `reports/editorial-review.md`.

## Commands

```sh
npm install
npm run dev       # dev server on http://localhost:2028
npm run build     # static build → dist/
npx astro check   # typecheck
npm run preview   # serve dist/
npm run check:content      # validate content + generated editorial report
npm run check:html         # audit built HTML (H1, alts, titles, metadata)
npm run test:e2e           # breakpoint overflow + keyboard interaction checks
npm test                   # complete content, build, HTML, and browser suite
```

## Deployment

Every push to `main` builds the site and rsyncs `dist/` to Bluehost via
`.github/workflows/deploy.yml`. There is no staging, so **a push to `main` is a
live deploy of https://durbin.cc**. The same job can be re-run by hand from the
Actions tab, and `npm run deploy` does it locally (build, dry-run, confirm,
sync) over the `bluehost` host alias in `~/.ssh/config`.

The destination is `~/durbin.cc/`, the document root of the `durbin.cc` addon
domain, which sits outside `public_html` so that the cassa-site deploy —
a `--delete` mirror onto `public_html/` — can never touch it.

CI needs four repository secrets, shared with the sibling `cassa` and `ast100`
repos: `BLUEHOST_SSH_KEY`, `BLUEHOST_KNOWN_HOSTS`, `BLUEHOST_USER`,
`BLUEHOST_HOST`.

## Design

"Neon Dark-First": a permanent black canvas, charcoal elevated surfaces,
white and grey text, and neon green reserved for primary actions and key
accents. Type uses Inter for display, body, and navigation, with Geist Mono
for data. Spacing follows a 4px base grid and controls use compact 4px corners.
Depth comes from border contrast, with blur reserved for the scrolling glass
navigation. There is no light theme or theme toggle.
