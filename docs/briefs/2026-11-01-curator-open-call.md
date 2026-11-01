# Brief 2026-11-01: Cosmic HerStory exhibition curator, open call (Inside form + cassa.bd page)

From Asad, via tim. Two linked pieces of work; the Inside form comes first because its URL goes on the
cassa page. Same brief in `inside/`, `cassa/` and `durbin/docs/briefs/`.

**Rules:** never push or deploy until Asad says "push"/"deploy". Preview on the integrated previews
(Inside 2025, cassa 2026). Strict semver + CHANGELOG when it does deploy. Report back to the hub, which tells Tim.

## Background (emails in kasad@ Gmail)

- 2026-10-31, "Exhibition Curator Selection": Farzana Akter Lima (Project Manager, Durbin,
  durbin.cassa@iub.edu.bd) asked about appointing a curator for **Cosmic HerStory**; the British Council (Waseka)
  urged an experienced curator; Bhoirobee suggested Mahmudul Hasnat; HerStory Foundation (Katerina) suggested an
  open call. Lamiya Mowla (lmowla@wellesley.edu) is on the thread.
- Asad's reply: no hire without a proper look at CV and portfolio. **Open call with no deadline**: interview
  people as they apply, close the call once someone is selected. Aim to hire **by 6 November**, giving the curator
  two weeks. The call also starts advertising the event. The suggested person can apply like anyone else.
- 2026-11-01, "Open Call: Exhibition Curator": Lima's draft text, reproduced below. Use it, lightly edited
  (CASSA spelling is "Center", not "Centre"; keep her structure and voice).

## Part 1 — Inside: the application form (repo `inside`, skills `/forms` and `/hiring`)

- A vacancy-style application form, slug following the convention (e.g. `2026-11-01-a`), category as the other
  vacancy forms, public (no sign-in), built-in name and email boxes.
- **No closing date** (rolling). It must be closable by hand once a curator is chosen.
- Fields (Lima's list plus the three documents she asks for):
  1. Full name (built-in) · 2. Email (built-in) and phone number
  3. Current affiliation or professional role
  4. Educational and professional background
  5. Relevant curatorial, design, arts or exhibition experience
  6. Why are you interested in curating Cosmic HerStory? (statement of interest; sensible word limit)
  7. CV or professional profile (file upload, PDF) — required
  8. Portfolio or examples of previous work: file upload and/or link — optional ("if available")
  9. Availability to begin immediately and work through 26 Nov – 5 Dec 2026 (yes / no + note)
  10. Any additional information (optional)
- Responses visible to the Durbin project manager (durbin.cassa@) and Asad; check the form-ownership rules in
  `CLAUDE.md` for who can be made manager. Lamiya is external; say whether she can be given read access.
- A rubric for grading (for screening as applications arrive) is welcome — propose criteria (curatorial
  experience, portfolio quality, concept fit with women in astronomy, availability) but it is code and needs a
  deploy: prepare it, don't push.
- Create through the API or the idempotent `scripts/create-<slug>-form.ts` pattern, whichever the skills say is
  current. If creating it in production makes it publicly reachable before Asad's OK, keep it unopened/draft
  until he says go.
- Report: the form's public URL, its status, and anything needing a deploy.

## Part 2 — cassa.bd: the public call page (repo `cassa`)

- A new entry in `src/content/opportunities/` like `2026-09-15-a.md` (ARC-FOCUS RA), `applyUrl` = the Inside form
  URL from Part 1. Organised by Durbin, CASSA, IUB.
- **No deadline** shown as a date: say applications are reviewed on a rolling basis and the call closes once a
  curator is selected; encourage early application. (Check the collection schema handles a missing
  `deadline`; if it needs one, solve it cleanly, e.g. a "rolling" option, rather than a fake date.)
- Compensation (Asad, 2026-11-01): **honorarium BDT 20,000–30,000, negotiable** (`compensation` field and a
  line in the body).
- The page should also work as a first announcement of the exhibition (dates, IUB). If there is an events/news
  pattern for Cosmic HerStory already, link it; don't create a second page for the event without asking.
- Keep the "Or, send the following" email alternative out: one route, the Inside form. Queries to
  durbin.cassa@iub.edu.bd.
- The page lives on cassa.bd (Asad's choice). Preview on 2026. Report the preview path.

## Part 3 — durbin.cc: a link to the call (repo `durbin`)

- Asad (2026-11-01): **add a link on durbin.cc** to the cassa.bd call page (where Durbin's own calls and news
  sit, per that repo's `CLAUDE.md`; e.g. a short card or notice, not a copy of the text). Same rules: preview
  locally, no push until Asad says so.

## Lima's draft (source text)

> **Open Call: Exhibition Curator — Cosmic HerStory**
>
> **Organised by:** Durbin, Centre for Astronomy, Space Science and Astrophysics (CASSA), Independent University,
> Bangladesh (IUB)
>
> Durbin invites applications from creative and experienced individuals interested in curating the upcoming
> exhibition **Cosmic HerStory**, taking place from **26 November to 5 December 2026** at Independent University,
> Bangladesh.
>
> ### About the Exhibition
> Cosmic HerStory celebrates the contributions, journeys, and achievements of women in astronomy. Through
> astrophotography, visual storytelling, educational displays, and interactive experiences, the exhibition aims to
> make the stories of women accessible and inspiring to a wider audience.
>
> The exhibition will bring together scientific content, creative interpretation, and public engagement to
> explore the relationship between women and the universe.
>
> ### About the Role
> The selected curator will work closely with the Durbin project team to develop and shape the exhibition's
> overall curatorial direction and visitor experience. Key responsibilities will include:
> - Developing a cohesive curatorial concept and narrative for the exhibition.
> - Advising on the selection, arrangement, and presentation of exhibition materials.
> - Supporting the layout and spatial planning of the exhibition.
> - Ensuring that the scientific and historical content is presented in an engaging, accessible, and visually
>   coherent manner.
> - Collaborating with the project team, designers, and other contributors throughout the preparation process.
> - Providing guidance during the installation and final presentation of the exhibition.
>
> ### Who Can Apply?
> We welcome applications from individuals with backgrounds or experience in:
> - Exhibition curation and exhibition design.
> - Fine arts, visual arts, architecture, or spatial design.
> - Museum, gallery, or cultural project management.
> - Visual storytelling, science communication, or interdisciplinary creative projects.
>
> Previous experience in curating exhibitions or developing public-facing creative projects will be considered
> an advantage. An interest in astronomy, women's stories, science, and inclusive public engagement is highly
> encouraged.
>
> ### Timeline and Commitment
> The exhibition will run from **26 November to 5 December 2026** at IUB. The selected curator should be
> available to work intensively with the team during the preparation period, including planning, content
> development, installation, and exhibition opening. As the preparation timeline is short, applicants should be
> ready to begin working immediately upon selection.
>
> ### How to Apply
> Applications will be reviewed on a rolling basis. The selection process will begin as soon as applications are
> received, and the call will close once a suitable candidate is selected. Interested candidates are encouraged to
> apply at the earliest opportunity.
>
> To apply, please submit: 1. An updated CV or professional profile. 2. A brief statement of interest. 3. A
> portfolio or examples of relevant previous work, if available.
>
> **Apply here:** [Insert application link]
>
> For queries, please contact: **Durbin, CASSA, IUB** — durbin.cassa@iub.edu.bd
>
> We look forward to hearing from individuals who can help bring the stories of women astronomers to life
> through thoughtful and engaging exhibition curation.
