import moment from "moment-timezone";
import { EventWithMetadata } from "../../../Common/Nav/NavStackType";

export const TZ = "America/New_York";

export type NavState = {
    weekAnchorDate: Date; // NY Sunday for the visible week
    selectedDate: Date;   // the currently picked day (NY)
};

/** Sunday-start week in NY, regardless of device locale. */
function startOfWeekSundayNY(d: Date | string) {
    const m = moment(d).tz(TZ);
    const dow = m.day(); // 0=Sun..6=Sat
    return m.clone().startOf("day").subtract(dow, "days");
}

export const ny = {
    startOfDay(d: Date | string) {
        return moment(d).tz(TZ).startOf("day");
    },
    startOfWeek(d: Date | string) {
        return startOfWeekSundayNY(d);
    },
    addDays(d: Date | string, n: number) {
        return moment(d).tz(TZ).add(n, "days");
    },
    addWeeks(d: Date | string, n: number) {
        return moment(d).tz(TZ).add(n, "weeks");
    },
    isSameDay(a: Date | string, b: Date | string) {
        return moment(a).tz(TZ).isSame(moment(b).tz(TZ), "day");
    },
    isBeforeToday(d: Date | string) {
        return moment(d).tz(TZ).isBefore(moment().tz(TZ).startOf("day"));
    },
};

/** True if any event starts on this day (NY). */
export function hasEventsOnDayNY(events: EventWithMetadata[], day: Date | string): boolean {
    const mday = ny.startOfDay(day);
    return events.some((ev) => ny.startOfDay(ev.start_date).isSame(mday, "day"));
}

/** Treat all days before today as disabled (for greying/press). */
export function hasEventsOnOrAfterTodayNY(events: EventWithMetadata[], day: Date | string): boolean {
    if (ny.isBeforeToday(day)) return false;
    return hasEventsOnDayNY(events, day);
}

/** Scan from startDay in direction for the first event day (NY). Optional min/max bounds inclusive. */
export function findEventDayFrom(
    events: EventWithMetadata[],
    startDay: Date,
    direction: 1 | -1,
    options?: { minDayInclusive?: Date; maxDayInclusive?: Date }
): Date | null {
    const limit = 366; // safety valve
    let probe = ny.startOfDay(startDay).toDate();

    for (let i = 0; i < limit; i++) {
        const inLower = !options?.minDayInclusive || !ny.startOfDay(probe).isBefore(options.minDayInclusive, "day");
        const inUpper = !options?.maxDayInclusive || !ny.startOfDay(probe).isAfter(options.maxDayInclusive, "day");
        if (inLower && inUpper && hasEventsOnDayNY(events, probe)) {
            console.log("[nav] findEventDayFrom ->", moment(probe).tz(TZ).format("YYYY-MM-DD"));
            return probe;
        }
        probe = ny.addDays(probe, direction).toDate();
    }
    console.log("[nav] findEventDayFrom -> NONE");
    return null;
}

/** Build week arrays for a given anchor (NY Sunday). */
export function deriveWeekArrays(weekAnchorDate: Date) {
    const anchor = ny.startOfWeek(weekAnchorDate).toDate();
    const thisWeek = Array.from({ length: 7 }, (_, i) => ny.addDays(anchor, i).toDate());
    const prevWeekAnchor = ny.addWeeks(anchor, -1).toDate();
    const nextWeekAnchor = ny.addWeeks(anchor, 1).toDate();
    const prevWeek = Array.from({ length: 7 }, (_, i) => ny.addDays(prevWeekAnchor, i).toDate());
    const nextWeek = Array.from({ length: 7 }, (_, i) => ny.addDays(nextWeekAnchor, i).toDate());
    return { prevWeekDays: prevWeek, weekDays: thisWeek, nextWeekDays: nextWeek };
}

/** Initial state: selected = today if events, else next future event (fallback today). */
export function computeInitialState(events: EventWithMetadata[]): NavState {
    const today = moment().tz(TZ).toDate();

    const todayHas = hasEventsOnDayNY(events, today);
    const nextFuture = todayHas ? today : findEventDayFrom(events, today, 1);

    const selected = nextFuture ?? today;
    const initial: NavState = {
        weekAnchorDate: ny.startOfWeek(selected).toDate(),
        selectedDate: selected,
    };

    return initial;
}

/** Can we go to the previous week? True iff anchor is strictly AFTER this week's Sunday. */
export function canGoPrev(weekAnchorDate: Date): boolean {
    const thisWeekSunday = ny.startOfWeek(new Date()).toDate();
    const ok = moment(weekAnchorDate).tz(TZ).isAfter(thisWeekSunday, "day");
    return ok;
}

/** Prev week nav: last Sunday if events, else scan backward (but not before this week). */
export function goToPrevWeekNav(state: NavState, events: EventWithMetadata[]): NavState {
    const allowPrev = canGoPrev(state.weekAnchorDate);
    console.log("[nav] goToPrevWeek allowPrev=", allowPrev);
    if (!allowPrev) return state;

    const prevSunday = ny.addWeeks(state.weekAnchorDate, -1).toDate();
    const lowerBound = ny.startOfWeek(new Date()).toDate(); // don’t cross before current week

    const chosen = hasEventsOnDayNY(events, prevSunday)
        ? prevSunday
        : findEventDayFrom(events, prevSunday, -1, { minDayInclusive: lowerBound });

    if (!chosen) {
        console.log("[nav] goToPrevWeek -> NO CHANGE");
        return state;
    }

    const next: NavState = {
        weekAnchorDate: ny.startOfWeek(chosen).toDate(),
        selectedDate: chosen,
    };

    console.log("[nav] goToPrevWeek", {
        from: moment(state.weekAnchorDate).tz(TZ).format("YYYY-MM-DD"),
        to: moment(next.weekAnchorDate).tz(TZ).format("YYYY-MM-DD"),
        selected: moment(next.selectedDate).tz(TZ).format("YYYY-MM-DD"),
    });

    return next;
}

/** Next week nav: next Sunday if events, else scan forward. */
export function goToNextWeekNav(state: NavState, events: EventWithMetadata[]): NavState {
    const nextSunday = ny.addWeeks(state.weekAnchorDate, 1).toDate();
    const chosen: Date | null = hasEventsOnDayNY(events, nextSunday)
        ? nextSunday
        : findEventDayFrom(events, nextSunday, 1);

    const next: NavState = !chosen
        ? { weekAnchorDate: nextSunday, selectedDate: state.selectedDate } // browse forward with no future events
        : { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };

    console.log("[nav] goToNextWeek", {
        from: moment(state.weekAnchorDate).tz(TZ).format("YYYY-MM-DD"),
        to: moment(next.weekAnchorDate).tz(TZ).format("YYYY-MM-DD"),
        selected: moment(next.selectedDate).tz(TZ).format("YYYY-MM-DD"),
        chosen: chosen ? moment(chosen).tz(TZ).format("YYYY-MM-DD") : null,
    });

    return next;
}

/** Today nav: today if events, else next future event (fallback today). */
export function goToTodayNav(_state: NavState, events: EventWithMetadata[]): NavState {
    const today = moment().tz(TZ).toDate();
    const chosen = hasEventsOnDayNY(events, today) ? today : findEventDayFrom(events, today, 1) ?? today;

    const next: NavState = {
        weekAnchorDate: ny.startOfWeek(chosen).toDate(),
        selectedDate: chosen,
    };

    console.log("[nav] goToToday", {
        today: moment(today).tz(TZ).format("YYYY-MM-DD"),
        selected: moment(next.selectedDate).tz(TZ).format("YYYY-MM-DD"),
        weekAnchor: moment(next.weekAnchorDate).tz(TZ).format("YYYY-MM-DD"),
    });

    return next;
}
