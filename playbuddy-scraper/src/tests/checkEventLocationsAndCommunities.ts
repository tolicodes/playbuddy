import fs from 'fs';
import path from 'path';
import { supabaseClient } from '../connections/supabaseClient.js';

// File to track event count between runs
const eventCountFile = path.join('eventCount.json');

// Function to get previous event count
const getPreviousEventCount = () => {
    if (fs.existsSync(eventCountFile)) {
        const data = fs.readFileSync(eventCountFile, 'utf-8');
        return JSON.parse(data).eventCount || 0;
    }
    return 0;
};

// Function to save the new event count
const saveEventCount = (count: number) => {
    const data = JSON.stringify({ eventCount: count });
    fs.writeFileSync(eventCountFile, data);
};

// Function to check events and communities
export const checkEvents = async () => {
    try {
        // Fetch all events
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('id, location_area_id, event_communities(community_id)');

        if (eventsError) throw eventsError;

        // Check the current number of events
        const currentEventCount = events.length;
        const previousEventCount = getPreviousEventCount();

        console.log(`Previous event count: ${previousEventCount}`);
        console.log(`Current event count: ${currentEventCount}`);

        // Save the current count
        saveEventCount(currentEventCount);

        // Ensure each event has a location and community
        const eventsMissingLocation = events.filter(event => !event.location_area_id);
        const eventsMissingCommunity = events.filter(event => event.event_communities.length === 0);

        console.log(`Events missing location: ${eventsMissingLocation.length}`);
        console.log(`Events missing community: ${eventsMissingCommunity.length}`);

        if (eventsMissingLocation.length > 0 || eventsMissingCommunity.length > 0) {
            console.error('Some events are missing location or community!');
        } else {
            console.log('All events have location and community.');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
};