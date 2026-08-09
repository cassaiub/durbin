/* Content collections for the Durbin hub. Schemas are kept field-compatible
   with cassa-site's collections so entries migrate between the two repos
   without frontmatter edits. Three collections:

   - astrophotography, the exhibition. One object per entry: a co-located
     photo, capture + astrophysics tables, and the essay (the markdown body).
     Extra captures of the same object ride along as `slides`.
   - news, Durbin dispatches.
   - events, Durbin-run events: workshops, talks, camps, astronomy nights. */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CURATION_FLAGS, EXHIBITION_OBJECT_TYPES } from "./data/site";

const astrophotography = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/astrophotography" }),
  schema: ({ image }) => {
    // The "how it was captured" block, reused by the primary capture and by
    // each additional slide, so a multi-author entry keeps every
    // contributor's distinct capture details.
    const astrophotoFields = z.object({
      photographer: z.string().optional(),
      location: z.string().optional(),
      date: z.string().optional(),
      exposure: z.string().optional(),
      telescope: z.string().optional(),
      camera: z.string().optional(),
      fov: z.string().optional(),
      processing: z.string().optional(),
      processingMethod: z.string().optional(),
    });
    return z.object({
      title: z.string(),
      object: z.string().optional(),
      catalog: z.string().optional(),
      // The one authoritative broad taxonomy value used by filters and the
      // exhibition walk. `categories` remains temporarily for migration and
      // editorial comparison, but never drives site behavior.
      objectType: z.enum(EXHIBITION_OBJECT_TYPES),
      categories: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      curation: z.array(z.enum(CURATION_FLAGS)).default([]),
      image: image(),
      imageAlt: z.string().optional(),
      caption: z.string().optional(),
      astrophoto: astrophotoFields.default({}),
      // Additional captures of the SAME object by other photographers. When
      // present, the detail page renders a slider (primary image first, then
      // these) and swaps the capture placard to match the active slide.
      slides: z
        .array(
          z.object({
            image: image(),
            alt: z.string().optional(),
            credit: z.string().optional(),
            astrophoto: astrophotoFields.default({}),
          }),
        )
        .optional(),
      astrophysics: z
        .object({
          objectType: z.string().optional(),
          constellation: z.string().optional(),
          distance: z.string().optional(),
          angularSize: z.string().optional(),
          physicalSize: z.string().optional(),
          magnitude: z.string().optional(),
        })
        .default({}),
      credit: z.string().optional(),
      status: z.enum(["published", "draft"]).default("published"),
    });
  },
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      category: z.string().optional(),
      durbin: z.boolean().default(false),
      hero: image().optional(),
      heroAlt: z.string().optional(),
      heroCaption: z.string().optional(),
      summary: z.string().optional(),
      featured: z.boolean().default(false),
      theme: z.enum(["cosmic", "lensing", "galaxy"]).optional(),
      author: z.string().optional(),
      authorHref: z.string().optional(),
      status: z.enum(["published", "draft"]).default("published"),
    }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      start: z.coerce.date(),
      end: z.coerce.date().optional(),
      allDay: z.boolean().default(false),
      // Multi-day event with the SAME daily window (start/end are the per-day
      // window repeated across the span, not one continuous run).
      daily: z.boolean().default(false),
      // Free-text override for the detail-page time line, for multi-day events
      // whose per-day windows differ.
      timeNote: z.string().optional(),
      venue: z.string().optional(),
      organizer: z.string().optional(),
      series: z.enum(["colloquium", "journal-talk", "workshop", "outreach", "other"]).default("other"),
      category: z.string().optional(),
      hideType: z.boolean().default(false),
      durbin: z.boolean().default(false),
      bdoaa: z.boolean().default(false),
      link: z.string().optional(),
      register: z.string().optional(),
      seats: z.number().int().positive().optional(),
      summary: z.string().optional(),
      hero: image().optional(),
      heroAlt: z.string().optional(),
      paperTitle: z.string().optional(),
      featured: z.boolean().default(false),
      theme: z.enum(["cosmic", "lensing", "galaxy"]).optional(),
      status: z.enum(["published", "draft"]).default("published"),
      rsvpComingSoon: z.boolean().default(false),
    }),
});

export const collections = { astrophotography, news, events };
