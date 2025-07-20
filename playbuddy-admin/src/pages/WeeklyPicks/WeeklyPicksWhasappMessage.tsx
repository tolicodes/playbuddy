import React from "react";
import moment from "moment-timezone";
import { Event } from "../../common/types/commonTypes";

type Props = {
    events: Event[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WeeklyPickWhatsappMessage: React.FC<Props> = ({ events }) => {
    // Get start of current week (Monday) in NY time
    const weekStart = moment.tz('America/New_York').startOf('week').add(1, 'day'); // Monday
    const weekEnd = weekStart.clone().add(6, 'days').endOf('day');

    // Filter to weekly picks in this week
    const weeklyPicks = events.filter((e) => {
        if (!e.weekly_pick) return false;
        const eventTime = moment.tz(e.start_date, 'America/New_York');
        return eventTime.isBetween(weekStart, weekEnd, null, '[]');
    });

    // Group events by day
    const grouped: Record<string, Event[]> = {};
    WEEKDAYS.forEach((day) => (grouped[day] = []));
    weeklyPicks.forEach((evt) => {
        const day = moment.tz(evt.start_date, 'America/New_York').format('ddd'); // e.g., "Mon"
        if (grouped[day]) {
            grouped[day].push(evt);
        }
    });

    // Build the WhatsApp message
    const lines: string[] = [];
    lines.push(`*PB’s Weekly Picks*`);
    lines.push('');
    lines.push(`PB's Weekly Picks are here!`);

    WEEKDAYS.forEach((day) => {
        const dayEvents = grouped[day];
        if (dayEvents.length === 0) return;

        const lineItems = dayEvents.map((e) => {
            const short = e.short_description?.trim();
            if (short) {
                return `*${e.name}* (${short})`;
            } else {
                return `*${e.name}*`;
            }
        });
        lines.push(`* ${day} – ${lineItems.join(', ')}`);
    });

    lines.push('');
    lines.push(`You can find the full list — plus exclusive discounts — on PlayBuddy:`);
    lines.push(`https://l.playbuddy.me/9waWxlBPHUb`);

    const message = lines.join('\n');

    return (
        <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
            {message}
        </pre>
    );
};

export default WeeklyPickWhatsappMessage;
