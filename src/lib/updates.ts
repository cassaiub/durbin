/* The updates feed: Durbin news and events merged into one newest-first
   stream. */

import { getCollection } from "astro:content";
import { inUpdatesFeed } from "../data/site";

export type UpdateItem = {
  kind: "news" | "event";
  /** Path of the detail page. */
  path: string;
  date: Date;
  title: string;
  summary?: string;
  category?: string;
  hero?: ImageMetadata;
  heroAlt?: string;
};

export const getUpdates = async (): Promise<UpdateItem[]> => {
  const news: UpdateItem[] = (await getCollection("news", ({ data }) => inUpdatesFeed(data))).map((p) => ({
    kind: "news",
    path: `/news/${p.id}`,
    date: p.data.date,
    title: p.data.title,
    summary: p.data.summary,
    category: p.data.category,
    hero: p.data.hero,
    heroAlt: p.data.heroAlt,
  }));
  const events: UpdateItem[] = (await getCollection("events", ({ data }) => data.status !== "draft")).map((e) => ({
    kind: "event",
    path: `/events/${e.id}`,
    date: e.data.start,
    title: e.data.title,
    summary: e.data.summary,
    category: e.data.category,
    hero: e.data.hero,
    heroAlt: e.data.heroAlt,
  }));
  return [...news, ...events].sort((a, b) => +b.date - +a.date);
};
