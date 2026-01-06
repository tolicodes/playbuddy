
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import moment from 'moment';
import { Event } from '../../../commonTypes';
import { formatDate } from '../../../utils/formatDate'
import { calendarOrganizerPalette } from '../../../components/styles';

export type OrganizerFilterOption = {
    id: string
    name: string
    count: number
    color: string
}

export const getAvailableOrganizers = (events: Event[]): OrganizerFilterOption[] => {
    const organizers = events.reduce((acc, event, index) => {
        if (!event.organizer) return acc;

        const existingOrganizer = acc.find((org) => org.id === event.organizer.id);

        if (existingOrganizer) {
            existingOrganizer.count += 1;
        } else {
            acc.push({
                name: event.organizer.name,
                id: event.organizer.id,
                count: 1,
                color: calendarOrganizerPalette[acc.length % calendarOrganizerPalette.length],
            });
        }

        return acc;
    }, [] as (OrganizerFilterOption)[]);

    const withCount = organizers.map((organizer) => {
        return {
            ...organizer,
            name: `${organizer.name} (${organizer.count})`
        }
    }).sort((a, b) => b.count - a.count);

    return withCount;
}

export function useRefreshEventsOnAppStateChange() {
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        let subscription: any;
        try {
            subscription = AppState.addEventListener("change", handleAppStateChange);
        }
        // fail silently if the event listener is not available 
        catch (e) {
            return;
        }

        return () => {
            subscription?.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.match(/inactive|background/) && nextAppState === "active") {
            // Do something when app comes to the foreground
        }

        setAppState(nextAppState);
    }

    return { appState };
}

export const EXPLICIT_WORDS = [
    "d*ck",
    "erotic",
    "bondage",
    "torture",
    "kink",
    "fetish",
    "BDSM",
    "adult",
    "explicit",
    "nude",
    "nudity",
    "sex",
    "sexual",
    "orgasm",
    "climax",
    "voyeur",
    "sensual", // maybe
    "hardcore",
    "porn",
    "pornographic",
    "XXX",
    "intimate", // maybe
    "intimacy", // maybe
    "domination",
    "submission",
    "master",
    "slave",
    "whipping",
    "spanking",
    "leather",
    "restraint",
    "rope play",
    "discipline",
    "fetish",
    "pegging",
    "gagging",
    "choking",
    "strap-on",
    "submissive",
    "dominatrix",
    "sex toys",
    "nipple clamps",
    "erotic massage",
    "semen",
    "penis",
    "orgy",
    "gangbang",
    "penetration",
    "oral sex",
    "anal",
    "bareback",
    "rimming",
    "cum",
    "facial",
    "handjob",
    "blowjob",
    "tantra",
    "CARE-FULL",
    "HUMP",
    "Testicular",
    "Tantric",
    "Play Party",
    "S*x",
    "K!nk",
    "K!NK"
]

export { formatDate };
