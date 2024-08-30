
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Event } from '../../Common/commonTypes';

export type OrganizerFilterOption = {
    id: string
    name: string
    count: number
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
        }

        return () => {
            subscription?.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.match(/inactive|background/) && nextAppState === "active") {
            console.log("App has come to the foreground!");
            // Do something when app comes to the foreground
        }

        setAppState(nextAppState);
    }

    return { appState };
}