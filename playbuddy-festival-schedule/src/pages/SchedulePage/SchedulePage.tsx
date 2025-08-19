import { useMemo, useEffect, useState, useCallback } from "react";
import { DateTime, Interval } from "luxon";
import { createPortal } from "react-dom";

import { useFetchDoFestivalSchedule } from "../../common/db-axios/useFestivalSchedule";
import type { FestivalScheduleEvent } from "../../common/types/commonTypes";
import s from "./SchedulePage.module.css";

/** ------- Config ------- */
const PX_PER_MIN = 1.2;
const MIN_EVENT_MINUTES = 30;
const DEFAULT_EVENT_MINUTES = 60;
const TIME_TICK_MINUTES = 60;
const ROW_VPAD_PX = 8;     // total vertical padding inside each row (top+bottom)
const ROW_GAP_PX = 12;     // guaranteed space between rows
const MIN_CARD_PX = 120;   // space for: 2-line title + 3 single lines + padding
const FAV_KEY = "do25_favorites_v1";

/** ------- Utils ------- */
const parseEndISO = (e: FestivalScheduleEvent) =>
  (e as any).endDate ?? (e as any).endDAte ?? undefined;

const minutesSince = (a: DateTime, b: DateTime) =>
  Math.max(0, Math.round(a.diff(b, "minutes").minutes));

const eventId = (e: FestivalScheduleEvent) => {
  const end = parseEndISO(e) ?? "";
  return `${e.startDate}__${end}__${e.name}__${e.location ?? ""}`;
};

function formatTimeRange(e: FestivalScheduleEvent) {
  const start = DateTime.fromISO(e.startDate);
  const endIso = parseEndISO(e);
  const end = endIso ? DateTime.fromISO(endIso) : start.plus({ minutes: DEFAULT_EVENT_MINUTES });
  return `${start.toFormat("h:mm a")} – ${end.toFormat("h:mm a")}`;
}
function formatDateTimeLong(e: FestivalScheduleEvent) {
  const sdt = DateTime.fromISO(e.startDate);
  const endIso = parseEndISO(e);
  const edt = endIso ? DateTime.fromISO(endIso) : sdt.plus({ minutes: DEFAULT_EVENT_MINUTES });
  const day = sdt.toFormat("cccc, LLL d");
  return `${day} • ${sdt.toFormat("h:mm a")} – ${edt.toFormat("h:mm a")}`;
}

function groupByDay(evts: FestivalScheduleEvent[]) {
  const m = new Map<string, FestivalScheduleEvent[]>();
  for (const ev of evts) {
    const k = DateTime.fromISO(ev.startDate).toISODate();
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(ev);
  }
  const arr = [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [, list] of arr) {
    list.sort(
      (a, b) =>
        DateTime.fromISO(a.startDate).toMillis() -
        DateTime.fromISO(b.startDate).toMillis()
    );
  }
  return arr;
}

function computeDayBounds(dayISO: string, events: FestivalScheduleEvent[]) {
  const dayStart = DateTime.fromISO(dayISO).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  if (!events.length) return { start: dayStart.plus({ hours: 8 }), end: dayStart.plus({ hours: 22 }) };

  let earliest = dayEnd, latest = dayStart;
  for (const e of events) {
    const s = DateTime.fromISO(e.startDate);
    const endIso = parseEndISO(e);
    const end = endIso ? DateTime.fromISO(endIso) : s.plus({ minutes: DEFAULT_EVENT_MINUTES });
    if (s < earliest) earliest = s;
    if (end > latest) latest = end;
  }
  return { start: DateTime.max(dayStart, earliest), end: DateTime.min(dayEnd, latest) };
}

/** ---------- Placement as horizontal rows ---------- */
type RowItem = {
  e: FestivalScheduleEvent;
  lane: number;
  offsetTop: number;  // px within row
  height: number;     // px
};
type Row = {
  id: number;
  top: number;        // px from day start
  height: number;     // px (includes ROW_VPAD_PX)
  laneCount: number;
  items: RowItem[];
};

function placeAsRows(dayISO: string, list: FestivalScheduleEvent[], pxPerMin = PX_PER_MIN) {
  const { start: dayStart, end: dayEnd } = computeDayBounds(dayISO, list);

  type Active = { lane: number; endsAt: number };
  let active: Active[] = [];
  let nextLane = 0;
  let rowId = -1;

  const rows = new Map<number, Row>();
  const ensureRow = (id: number) => {
    let r = rows.get(id);
    if (!r) {
      r = { id, top: Infinity, height: 0, laneCount: 0, items: [] };
      rows.set(id, r);
    }
    return r;
  };

  for (const e of list) {
    const sdt = DateTime.fromISO(e.startDate);
    const eIso = parseEndISO(e);
    const edt = eIso ? DateTime.fromISO(eIso) : sdt.plus({ minutes: DEFAULT_EVENT_MINUTES });

    // retire lanes that ended
    const msStart = sdt.toMillis();
    active = active.filter(a => a.endsAt > msStart);

    // new row if none active
    if (active.length === 0) rowId += 1;

    // lane assignment
    const used = new Set(active.map(a => a.lane));
    let lane = 0; while (used.has(lane)) lane += 1;
    if (lane === nextLane) nextLane += 1;
    active.push({ lane, endsAt: edt.toMillis() });

    // geometry
    const visStart = DateTime.max(sdt, dayStart);
    const visEnd = DateTime.min(edt, dayEnd);
    const mins = Math.max(MIN_EVENT_MINUTES, visEnd.diff(visStart, "minutes").minutes);
    const topPx = minutesSince(visStart, dayStart) * pxPerMin;
    const hPxRaw = Math.max(MIN_EVENT_MINUTES, mins) * pxPerMin;
    const hPx = Math.max(MIN_CARD_PX, hPxRaw); // layout-friendly minimum

    const r = ensureRow(rowId);
    r.top = Math.min(r.top, topPx);
    const bottom = topPx + hPx;
    const rBottom = Math.max(r.top + r.height, bottom);
    r.height = rBottom - r.top;
    r.laneCount = Math.max(r.laneCount, lane + 1);
    r.items.push({ e, lane, offsetTop: topPx - r.top, height: hPx });
  }

  // account for vertical padding inside each row
  for (const r of rows.values()) {
    r.height = r.height + ROW_VPAD_PX;
  }

  // order rows and enforce a minimum gap between them
  const ordered = [...rows.values()].sort((a, b) => a.top - b.top);
  let cursor = -Infinity;
  for (const r of ordered) {
    if (cursor === -Infinity) {
      cursor = r.top + r.height;
      continue;
    }
    const minTop = cursor + ROW_GAP_PX;
    if (r.top < minTop) {
      const delta = minTop - r.top;
      r.top += delta; // shift down to preserve a gap
    }
    cursor = r.top + r.height;
  }

  const canvasHeight = minutesSince(dayEnd, dayStart) * pxPerMin;
  return { rows: ordered, dayStart, dayEnd, canvasHeight };
}

/** ---------- Favorites (localStorage) ---------- */
function useFavorites() {
  const [setData, setSetData] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (!raw) return new Set();
      const arr: string[] = JSON.parse(raw);
      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  // persist
  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify([...setData]));
  }, [setData]);

  // cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FAV_KEY) return;
      try {
        const arr = e.newValue ? (JSON.parse(e.newValue) as string[]) : [];
        setSetData(new Set(arr));
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFav = useCallback((id: string) => setData.has(id), [setData]);

  const toggle = useCallback((id: string) => {
    setSetData(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { isFav, toggle, ids: setData };
}

/** ---------- Location → gradient class ---------- */
function locationClass(loc?: string) {
  const k = (loc ?? "").toLowerCase();
  if (k.includes("pavilion")) return s.gradPavilion;
  if (k.includes("dining")) return s.gradDining;
  if (k.includes("temple")) return s.gradTemple;
  return s.gradOther;
}

/** ---------- Component (hooks first, returns later) ---------- */
export default function SchedulePage() {
  // 1) Hooks: order must never change
  const q = useFetchDoFestivalSchedule();
  const fav = useFavorites();

  const allEvents = useMemo(() => (q.data ?? []) as FestivalScheduleEvent[], [q.data]);
  const dayPairs = useMemo(() => groupByDay(allEvents), [allEvents]);
  const dayKeys = useMemo(() => dayPairs.map(([iso]) => iso), [dayPairs]);

  // Tabs: "all" (Schedule) vs "fav" (My Calendar)
  const [tab, setTab] = useState<"all" | "fav">("all");

  // Initialize to "today"; effect below will coerce to a valid day once data arrives
  const [selectedDay, setSelectedDay] = useState<string>(() => DateTime.now().toISODate());
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<FestivalScheduleEvent | null>(null);

  useEffect(() => {
    if (!dayKeys.length) return;
    if (!dayKeys.includes(selectedDay)) setSelectedDay(dayKeys[0]);
  }, [dayKeys, selectedDay]);

  // Lock body scroll + ESC close while modal open (hook itself is unconditional)
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Derived data
  const dayList = useMemo(
    () => (dayPairs.find(([iso]) => iso === selectedDay)?.[1] ?? []),
    [dayPairs, selectedDay]
  );

  const searched = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return dayList;
    return dayList.filter(e => {
      const hay = [e.name, e.location, e.description ?? "", ...(e.organizers ?? [])]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(t);
    });
  }, [dayList, query]);

  const filtered = useMemo(() => {
    if (tab === "all") return searched;
    return searched.filter(e => fav.isFav(eventId(e)));
  }, [searched, tab, fav]);

  // 2) Early returns AFTER hooks
  if (q.isLoading) return <div className={s.state}>Loading…</div>;
  if (q.error) return <div className={s.state}>Failed to load schedule.</div>;
  if (!dayKeys.length) return <div className={s.state}>No events.</div>;

  // 3) Render data
  const { rows, dayStart, dayEnd, canvasHeight } = placeAsRows(selectedDay, filtered);

  // ticks + now line
  const ticks: DateTime[] = [];
  for (let t = dayStart.startOf("hour"); t <= dayEnd; t = t.plus({ minutes: TIME_TICK_MINUTES })) ticks.push(t);
  const isToday = DateTime.now().toISODate() === selectedDay;
  const now = DateTime.now();
  const showNow = isToday && Interval.fromDateTimes(dayStart, dayEnd).contains(now);
  const nowTop = showNow ? minutesSince(now, dayStart) * PX_PER_MIN : 0;

  return (
    <div className={s.wrap}>
      {/* Date strip */}
      <div className={s.dateStrip} role="tablist" aria-label="Select day">
        {dayKeys.map((iso) => {
          const dt = DateTime.fromISO(iso);
          const activeDay = iso === selectedDay;
          return (
            <button
              key={iso}
              role="tab"
              aria-selected={activeDay}
              className={activeDay ? s.datePillActive : s.datePill}
              onClick={() => setSelectedDay(iso)}
            >
              <div className={s.dateDow}>{dt.toFormat("ccc")}</div>
              <div className={s.dateNum}>{dt.toFormat("d")}</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className={s.searchWrap}>
        <input
          className={s.search}
          placeholder={`Search ${tab === "fav" ? "favorites" : "events"}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className={s.clearBtn} onClick={() => setQuery("")} aria-label="Clear search">×</button>
        )}
      </div>

      {/* Day header */}
      <div className={s.dayHdr}>
        {DateTime.fromISO(selectedDay).toFormat("cccc, LLL d")}
      </div>

      {/* Grid */}
      <div className={s.gridWrap}>
        {/* Time gutter */}
        <div className={s.timeGutter} style={{ height: canvasHeight }}>
          {ticks.map((t) => {
            const top = minutesSince(t, dayStart) * PX_PER_MIN;
            return (
              <div key={t.toMillis()} className={s.timeTick} style={{ top }}>
                {t.toFormat("h a")}
              </div>
            );
          })}
        </div>

        {/* Canvas */}
        <div className={s.canvas} style={{ height: canvasHeight }}>
          {ticks.map((t) => {
            const top = minutesSince(t, dayStart) * PX_PER_MIN;
            return <div key={`line-${t.toMillis()}`} className={s.hourLine} style={{ top }} />;
          })}

          {showNow && (
            <div className={s.nowLine} style={{ top: nowTop }} aria-hidden>
              <span className={s.nowDot} />
            </div>
          )}

          {/* Rows */}
          {rows.map((r) => (
            <div key={r.id} className={s.cluster} style={{ top: r.top, height: r.height }}>
              <div className={s.clusterInner}>
                {r.items
                  .sort((a, b) => a.lane - b.lane)
                  .map((it, idx) => {
                    const e = it.e;
                    const time = formatTimeRange(e);
                    const orgs = (e.organizers ?? []).filter(Boolean);
                    const id = eventId(e);
                    const favOn = fav.isFav(id);

                    return (
                      <div
                        key={`${e.startDate}|${parseEndISO(e) ?? "noEnd"}|${e.name}|${idx}`}
                        className={`${s.card} ${locationClass(e.location)}`}
                        style={{ marginTop: it.offsetTop, height: it.height }}
                        title={`${e.name} — ${time}`}
                        onClick={() => setActive(e)}
                      >
                        {/* Heart (favorites) */}
                        <button
                          className={`${s.heart} ${favOn ? s.heartOn : ""}`}
                          aria-label={favOn ? "Remove from My Calendar" : "Add to My Calendar"}
                          title={favOn ? "Remove from My Calendar" : "Add to My Calendar"}
                          onClick={(ev) => { ev.stopPropagation(); fav.toggle(id); }}
                        >
                          {favOn ? "❤" : "♡"}
                        </button>

                        {/* 2-line title */}
                        <div className={s.title}>{e.name}</div>

                        {/* 1-line time */}
                        <div className={s.line}><span className={s.i}>🕒</span>{time}</div>

                        {/* 1-line location */}
                        {e.location && (
                          <div className={s.line}><span className={s.i}>📍</span>{e.location}</div>
                        )}

                        {/* 1-line organizers */}
                        {orgs.length > 0 && (
                          <div className={`${s.line} ${s.orgLine}`}>{orgs.join(", ")}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------- Bottom tab bar -------- */}
      <nav className={s.tabBar} role="tablist" aria-label="View">
        <button
          role="tab"
          aria-selected={tab === "all"}
          className={tab === "all" ? s.tabBtnActive : s.tabBtn}
          onClick={() => setTab("all")}
        >
          <div className={s.tabIcon}>📅</div>
          <div className={s.tabLabel}>Schedule</div>
        </button>
        <button
          role="tab"
          aria-selected={tab === "fav"}
          className={tab === "fav" ? s.tabBtnActive : s.tabBtn}
          onClick={() => setTab("fav")}
        >
          <div className={s.tabIcon}>❤️</div>
          <div className={s.tabLabel}>My Calendar</div>
        </button>
      </nav>

      {/* -------- Modal (portal to <body>) -------- */}
      {active && createPortal(
        <div className={s.modalOverlay} onClick={() => setActive(null)}>
          <div
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evt-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${s.modalHeader} ${locationClass(active.location)}`}>
              <h2 id="evt-title" className={s.modalTitle}>{active.name}</h2>
              <button className={s.modalClose} onClick={() => setActive(null)} aria-label="Close">×</button>
            </div>

            <div className={s.modalMeta}>
              <div className={s.metaRow}><span className={s.i}>📅</span>{formatDateTimeLong(active)}</div>
              {active.location && (
                <div className={s.metaRow}><span className={s.i}>📍</span>{active.location}</div>
              )}
            </div>

            {(active.organizers?.length ?? 0) > 0 && (
              <div className={s.modalChips}>
                {active.organizers!.filter(Boolean).map((o, i) => (
                  <span key={i} className={s.orgChip}>{o}</span>
                ))}
              </div>
            )}

            {active.description && (
              <div className={s.modalDesc}>{active.description}</div>
            )}

            <div className={s.modalActions}>
              {(() => {
                const id = eventId(active);
                const on = fav.isFav(id);
                return (
                  <button className={s.primaryBtn} onClick={() => fav.toggle(id)}>
                    {on ? "✓ In My Calendar — Remove" : "❤ Add to My Calendar"}
                  </button>
                );
              })()}
              <button className={s.secondaryBtn} onClick={() => setActive(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
