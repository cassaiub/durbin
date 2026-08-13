import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./EventsCalendar.css";

export type CalendarEvent = {
  slug: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  venue: string | null;
  organizer: string | null;
  series: string;
  category: string | null;
  summary: string | null;
  hero: string | null;
  href: string;
  link?: string | null;
  source?: "durbin" | "google";
};

type View = "list" | "week" | "month" | "year";
type SyncState = "local" | "loading" | "live" | "error";
type EventVM = CalendarEvent & { _start: Date; _end: Date | null; dayKey: string; dayKeys: string[] };
type GoogleConfig = { calendarId: string; apiKey: string } | null;

const TZ = "Asia/Dhaka";
const SERIES_ORDER = ["workshop", "outreach", "colloquium", "journal-talk", "other"];
const SERIES_LABELS: Record<string, string> = {
  workshop: "Workshop",
  outreach: "Outreach",
  colloquium: "Colloquium",
  "journal-talk": "Talk",
  other: "Other",
};
const pad = (n: number) => String(n).padStart(2, "0");
const civilKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dhakaKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const eventDayKey = (iso: string) => dhakaKey.format(new Date(iso));
const todayKey = () => dhakaKey.format(new Date());
const instantFormat = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options });
const civilFormat = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", options);
const timeLabel = (date: Date) => instantFormat({ hour: "numeric", minute: "2-digit", hour12: true }).format(date);
const WEEKDAYS = Array.from({ length: 7 }, (_, index) => civilFormat({ weekday: "short" }).format(new Date(2024, 0, 7 + index)));

const eventDayKeys = (startIso: string, endIso: string | null) => {
  const start = eventDayKey(startIso);
  const end = endIso ? eventDayKey(endIso) : start;
  if (end <= start) return [start];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const current = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  const keys: string[] = [];
  for (let guard = 0; current <= last && guard < 400; guard += 1) {
    keys.push(civilKey(current.getFullYear(), current.getMonth(), current.getDate()));
    current.setDate(current.getDate() + 1);
  }
  return keys;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const monthGrid = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
};

const inferSeries = (title = "", description = "") => {
  const value = `${title} ${description}`.toLowerCase();
  if (/workshop|training|camp/.test(value)) return "workshop";
  if (/talk|lecture|colloquium/.test(value)) return "journal-talk";
  if (/outreach|astronomy night|public evening|school/.test(value)) return "outreach";
  return "other";
};

const googleDate = (value: { date?: string; dateTime?: string } | undefined, end = false) => {
  if (!value) return null;
  if (value.dateTime) return new Date(value.dateTime).toISOString();
  if (!value.date) return null;
  const instant = new Date(`${value.date}T00:00:00+06:00`);
  if (end) instant.setMilliseconds(instant.getMilliseconds() - 1);
  return instant.toISOString();
};

const fetchGoogleEvents = async (config: NonNullable<GoogleConfig>, signal: AbortSignal): Promise<CalendarEvent[]> => {
  const now = new Date();
  const timeMin = new Date(now.getFullYear() - 2, 0, 1).toISOString();
  const timeMax = new Date(now.getFullYear() + 4, 11, 31, 23, 59, 59).toISOString();
  const endpoint = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`);
  endpoint.searchParams.set("key", config.apiKey);
  endpoint.searchParams.set("singleEvents", "true");
  endpoint.searchParams.set("orderBy", "startTime");
  endpoint.searchParams.set("maxResults", "2500");
  endpoint.searchParams.set("timeMin", timeMin);
  endpoint.searchParams.set("timeMax", timeMax);
  const response = await fetch(endpoint, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Google Calendar returned ${response.status}`);
  const payload = await response.json() as { items?: Array<Record<string, any>> };
  return (payload.items ?? []).flatMap((item) => {
    const start = googleDate(item.start);
    if (!start || item.status === "cancelled") return [];
    const allDay = Boolean(item.start?.date && !item.start?.dateTime);
    const end = googleDate(item.end, allDay);
    const series = item.extendedProperties?.private?.series ?? inferSeries(item.summary, item.description);
    return [{
      slug: `google-${item.id}`,
      title: item.summary || "Durbin event",
      start,
      end,
      allDay,
      venue: item.location ?? null,
      organizer: item.organizer?.displayName ?? item.organizer?.email ?? null,
      series: SERIES_ORDER.includes(series) ? series : "other",
      category: item.extendedProperties?.private?.category ?? SERIES_LABELS[series] ?? "Event",
      summary: item.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null,
      hero: null,
      href: item.htmlLink ?? "https://calendar.google.com/",
      link: item.htmlLink ?? null,
      source: "google" as const,
    }];
  });
};

const mergeEvents = (local: CalendarEvent[], google: CalendarEvent[]) => {
  const googleKeys = new Set(google.map((event) => `${event.title.toLowerCase()}|${eventDayKey(event.start)}`));
  return [...google, ...local.filter((event) => !googleKeys.has(`${event.title.toLowerCase()}|${eventDayKey(event.start)}`))];
};

export default function EventsCalendar({ events, google }: { events: CalendarEvent[]; google: GoogleConfig }) {
  const [calendarEvents, setCalendarEvents] = useState(events);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => {
    const [year, month, day] = todayKey().split("-").map(Number);
    return new Date(year, month - 1, day);
  });
  const [selected, setSelected] = useState<EventVM | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(google ? "loading" : "local");

  useEffect(() => {
    document.documentElement.setAttribute("data-cal-ready", "");
    if (window.innerWidth < 640) setView("list");
    return () => document.documentElement.removeAttribute("data-cal-ready");
  }, []);

  useEffect(() => {
    if (!google) return;
    let active = true;
    const controller = new AbortController();
    const sync = async () => {
      try {
        const live = await fetchGoogleEvents(google, controller.signal);
        if (!active) return;
        setCalendarEvents(mergeEvents(events, live));
        setSyncState("live");
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setCalendarEvents(events);
        setSyncState("error");
        console.warn("Durbin Google Calendar sync failed; using the local event archive.", error);
      }
    };
    sync();
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); };
  }, [events, google]);

  const vms = useMemo<EventVM[]>(() => calendarEvents.map((event) => ({
    ...event,
    source: event.source ?? "durbin",
    _start: new Date(event.start),
    _end: event.end ? new Date(event.end) : null,
    dayKey: eventDayKey(event.start),
    dayKeys: eventDayKeys(event.start, event.end),
  })).sort((a, b) => +a._start - +b._start), [calendarEvents]);

  const byDay = useMemo(() => {
    const map = new Map<string, EventVM[]>();
    // A multi-day event is one calendar entry, not a separate item for every
    // date it spans. Its drawer still presents the full start/end range.
    vms.forEach((event) => {
      if (!map.has(event.dayKey)) map.set(event.dayKey, []);
      map.get(event.dayKey)!.push(event);
    });
    return map;
  }, [vms]);

  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    vms.forEach((event) => counts.set(event.dayKey.slice(0, 7), (counts.get(event.dayKey.slice(0, 7)) ?? 0) + 1));
    return counts;
  }, [vms]);

  const go = useCallback((direction: -1 | 1) => {
    setAnchor((current) => {
      const next = new Date(current);
      if (view === "week") next.setDate(next.getDate() + 7 * direction);
      else if (view === "year") next.setFullYear(next.getFullYear() + direction);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  }, [view]);

  const goToday = useCallback(() => {
    const [year, month, day] = todayKey().split("-").map(Number);
    setAnchor(new Date(year, month - 1, day));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (selected || ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
      else if (event.key.toLowerCase() === "l") setView("list");
      else if (event.key.toLowerCase() === "w") setView("week");
      else if (event.key.toLowerCase() === "m") setView("month");
      else if (event.key.toLowerCase() === "y") setView("year");
      else if (event.key.toLowerCase() === "t") goToday();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, goToday, selected]);

  const period = useMemo(() => {
    if (view === "year") return String(anchor.getFullYear());
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${civilFormat({ month: "short", day: "numeric" }).format(start)} – ${civilFormat({ month: "short", day: "numeric", year: "numeric" }).format(end)}`;
    }
    return civilFormat({ month: "long", year: "numeric" }).format(anchor);
  }, [anchor, view]);

  const subscribe = google ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(google.calendarId)}` : null;

  return <div className="cal" data-calendar-sync={syncState}>
    <div className="cal__syncbar" aria-live="polite">
      <span className="cal__syncdot" />
      <span>{syncState === "live" ? "Live from Google Calendar" : syncState === "loading" ? "Syncing Google Calendar…" : syncState === "error" ? "Live sync unavailable · showing Durbin archive" : "Durbin event archive"}</span>
      {subscribe && <a href={subscribe} target="_blank" rel="noopener">Subscribe ↗</a>}
    </div>
    <Toolbar period={period} view={view} onView={setView} onPrev={() => go(-1)} onNext={() => go(1)} onToday={goToday} />
    {view === "month" && <MonthView anchor={anchor} byDay={byDay} onOpen={setSelected} onPickDay={(date) => { setAnchor(date); setView("week"); }} />}
    {view === "week" && <WeekView anchor={anchor} byDay={byDay} onOpen={setSelected} />}
    {view === "year" && <YearView anchor={anchor} monthCounts={monthCounts} onPickMonth={(date) => { setAnchor(date); setView("month"); }} />}
    {view === "list" && <ListView events={vms} onOpen={setSelected} />}
    <Legend />
    {selected && <EventDrawer event={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function Toolbar({ period, view, onView, onPrev, onNext, onToday }: { period: string; view: View; onView: (view: View) => void; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  const views: View[] = ["list", "week", "month", "year"];
  return <div className="cal__toolbar">
    <div className="cal__nav">
      <button className="cal__icon" onClick={onPrev} aria-label="Previous period">←</button>
      <button className="cal__today" onClick={onToday}>Today</button>
      <button className="cal__icon" onClick={onNext} aria-label="Next period">→</button>
      <h3 className="cal__period" aria-live="polite">{period}</h3>
    </div>
    <div className="cal__views" role="tablist" aria-label="Calendar view">
      {views.map((item) => <button key={item} className="cal__viewbtn" role="tab" aria-selected={view === item} onClick={() => onView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>
  </div>;
}

function Chip({ event, onOpen }: { event: EventVM; onOpen: (event: EventVM) => void }) {
  return <button className="cal__chip" data-series={event.series} onClick={(click) => { click.stopPropagation(); onOpen(event); }} title={event.title}>
    {event.hero && <img className="cal__chipthumb" src={event.hero} alt="" loading="lazy" />}
    {!event.allDay && <span className="cal__chiptime">{timeLabel(event._start)}</span>}
    <span className="cal__chiptitle">{event.title}</span>
  </button>;
}

function MonthView({ anchor, byDay, onOpen, onPickDay }: { anchor: Date; byDay: Map<string, EventVM[]>; onOpen: (event: EventVM) => void; onPickDay: (date: Date) => void }) {
  const cells = monthGrid(anchor);
  const currentMonth = anchor.getMonth();
  const today = todayKey();
  return <div className="cal__month" role="grid" aria-label="Month">
    <div className="cal__weekhead" role="row">{WEEKDAYS.map((day) => <div key={day} className="cal__wd" role="columnheader">{day}</div>)}</div>
    <div className="cal__grid">{cells.map((date) => {
      const key = civilKey(date.getFullYear(), date.getMonth(), date.getDate());
      // Out-of-month dates remain as navigation context, but their events are
      // shown in their own month only so paging cannot appear to duplicate them.
      const events = date.getMonth() === currentMonth ? (byDay.get(key) ?? []) : [];
      return <div key={key} className={`cal__cell${date.getMonth() !== currentMonth ? " cal__cell--out" : ""}${key === today ? " cal__cell--today" : ""}`} role="gridcell">
        <button className="cal__daynum" aria-current={key === today ? "date" : undefined} onClick={() => onPickDay(date)}>{date.getDate()}</button>
        <div className="cal__cellevents">{events.slice(0, 3).map((event) => <Chip key={`${event.slug}-${key}`} event={event} onOpen={onOpen} />)}{events.length > 3 && <button className="cal__more" onClick={() => onPickDay(date)}>+{events.length - 3} more</button>}</div>
      </div>;
    })}</div>
  </div>;
}

function WeekView({ anchor, byDay, onOpen }: { anchor: Date; byDay: Map<string, EventVM[]>; onOpen: (event: EventVM) => void }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  return <div className="cal__week" role="grid" aria-label="Week">{days.map((date) => {
    const key = civilKey(date.getFullYear(), date.getMonth(), date.getDate());
    return <div key={key} className={`cal__weekcol${key === todayKey() ? " cal__weekcol--today" : ""}`} role="gridcell">
      <div className="cal__weekhd"><span>{civilFormat({ weekday: "short" }).format(date)}</span><strong>{date.getDate()}</strong></div>
      <div className="cal__weekbody">{(byDay.get(key) ?? []).map((event) => <Chip key={`${event.slug}-${key}`} event={event} onOpen={onOpen} />)}</div>
    </div>;
  })}</div>;
}

function YearView({ anchor, monthCounts, onPickMonth }: { anchor: Date; monthCounts: Map<string, number>; onPickMonth: (date: Date) => void }) {
  const year = anchor.getFullYear();
  return <div className="cal__year">{Array.from({ length: 12 }, (_, month) => {
    const first = new Date(year, month, 1);
    const count = monthCounts.get(`${year}-${pad(month + 1)}`) ?? 0;
    return <button key={month} className="cal__mini" onClick={() => onPickMonth(first)}><span>{civilFormat({ month: "long" }).format(first)}</span>{count > 0 && <strong>{count}</strong>}<span className="cal__minigrid" aria-hidden="true">{monthGrid(first).map((date, index) => <i key={index} className={date.getMonth() !== month ? "out" : ""}>{date.getDate()}</i>)}</span></button>;
  })}</div>;
}

function ListView({ events, onOpen }: { events: EventVM[]; onOpen: (event: EventVM) => void }) {
  const present = SERIES_ORDER.filter((series) => events.some((event) => event.series === series));
  const [active, setActive] = useState("all");
  const shown = active === "all" ? events : events.filter((event) => event.series === active);
  const upcoming = shown.filter((event) => event.dayKey >= todayKey());
  const past = shown.filter((event) => event.dayKey < todayKey()).reverse();
  const rows = (items: EventVM[]) => items.map((event) => <button key={event.slug} className="cal__lrow" data-series={event.series} onClick={() => onOpen(event)}>
    <span className="cal__ldate"><strong>{instantFormat({ day: "2-digit" }).format(event._start)}</strong><span>{instantFormat({ month: "short" }).format(event._start)}</span><small>{instantFormat({ year: "numeric" }).format(event._start)}</small></span>
    {event.hero && <span className="cal__lthumb"><img src={event.hero} alt="" loading="lazy" /></span>}
    <span className="cal__lbody"><span className="cal__lmeta"><em>{event.category ?? SERIES_LABELS[event.series] ?? "Event"}</em><small>{event.allDay ? "All day" : timeLabel(event._start)}</small>{event.source === "google" && <small>Google Calendar</small>}</span><strong>{event.title}</strong>{event.venue && <span>{event.venue}</span>}</span>
  </button>);
  return <div className="cal__list">
    <div className="cal__filter" role="group" aria-label="Filter events by type"><button aria-pressed={active === "all"} onClick={() => setActive("all")}>All <span>{events.length}</span></button>{present.map((series) => <button key={series} data-series={series} aria-pressed={active === series} onClick={() => setActive(series)}>{SERIES_LABELS[series]} <span>{events.filter((event) => event.series === series).length}</span></button>)}</div>
    {upcoming.length > 0 && <><p className="cal__ldiv">Upcoming</p>{rows(upcoming)}</>}
    {past.length > 0 && <><p className="cal__ldiv">Past</p>{rows(past)}</>}
  </div>;
}

function Legend() {
  return <div className="cal__legend" aria-hidden="true">{SERIES_ORDER.map((series) => <span key={series}><i data-series={series} />{SERIES_LABELS[series]}</span>)}</div>;
}

function EventDrawer({ event, onClose }: { event: EventVM; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    close.current?.focus();
    const keydown = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose();
      if (key.key === "Tab") {
        const focusable = panel.current?.querySelectorAll<HTMLElement>("a[href],button");
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last.focus(); }
        else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); document.documentElement.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);
  const date = instantFormat({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(event._start);
  return <div className="cal__drawer" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title">
    <button className="cal__backdrop" onClick={onClose} aria-label="Close event details" />
    <div className="cal__panel" ref={panel}>
      <div className="cal__panelhd"><span data-series={event.series}>{event.category ?? SERIES_LABELS[event.series]}</span><button ref={close} onClick={onClose} aria-label="Close">×</button></div>
      {event.hero && <div className="cal__panelhero"><img src={event.hero} alt="" /></div>}
      <h2 id="calendar-event-title">{event.title}</h2>
      <dl><div><dt>When</dt><dd>{date}{!event.allDay && ` · ${timeLabel(event._start)}`}</dd></div>{event.venue && <div><dt>Where</dt><dd>{event.venue}</dd></div>}{event.organizer && <div><dt>Organizer</dt><dd>{event.organizer}</dd></div>}</dl>
      {event.summary && <p>{event.summary}</p>}
      <div className="cal__panelcta"><a className="btn btn--solid" href={event.href} target={event.source === "google" ? "_blank" : undefined} rel={event.source === "google" ? "noopener" : undefined}>{event.source === "google" ? "Open in Google Calendar ↗" : "View full page →"}</a></div>
    </div>
  </div>;
}
