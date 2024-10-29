import { supabaseClient } from '../connections/supabaseClient.js';

const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";
const CONSCIOUS_TOUCH_COMMUNITY_ID = "72f599a9-6711-4d4f-a82d-1cb66eac0b7b";

// Function to update missing locations and communities
const fillMissingData = async () => {
    try {
        // Step 1: Fetch events that are missing a location
        const { data: eventsMissingLocation, error: locationError } = await supabaseClient
            .from('events')
            .select('id, location_area_id')
            .is('location_area_id', null);

        if (locationError) throw locationError;

        console.log(`Events missing location: ${eventsMissingLocation.length}`);

        // Step 2: Update missing locations to NYC
        if (eventsMissingLocation.length > 0) {
            const eventIdsMissingLocation = eventsMissingLocation.map(event => event.id);

            const { error: updateLocationError } = await supabaseClient
                .from('events')
                .update({ location_area_id: NYC_LOCATION_ID })
                .in('id', eventIdsMissingLocation);

            if (updateLocationError) throw updateLocationError;

            console.log(`${eventIdsMissingLocation.length} events updated with NYC location.`);
        } else {
            console.log('No events missing location.');
        }

        // Step 3: Fetch the event IDs that already have a community association
        const { data: eventsWithCommunity, error: communityError } = await supabaseClient
            .from('event_communities')
            .select('event_id');

        if (communityError) throw communityError;

        const eventIdsWithCommunity = eventsWithCommunity.map(event => event.event_id);

        // Step 4: Fetch events missing community associations (not in event_communities)
        const { data: eventsMissingCommunity, error: missingCommunityError } = await supabaseClient
            .from('events')
            .select('id')
            .not('id', 'in', eventIdsWithCommunity);

        if (missingCommunityError) throw missingCommunityError;

        console.log(`Events missing community association: ${eventsMissingCommunity.length}`);

        // Step 5: Insert missing community associations for these events
        if (eventsMissingCommunity.length > 0) {
            const eventCommunityRecords = eventsMissingCommunity.map(event => ({
                event_id: event.id,
                community_id: CONSCIOUS_TOUCH_COMMUNITY_ID
            }));

            const { error: insertCommunityError } = await supabaseClient
                .from('event_communities')
                .insert(eventCommunityRecords);

            if (insertCommunityError) throw insertCommunityError;

            console.log(`${eventCommunityRecords.length} events updated with Conscious Touch community.`);
        } else {
            console.log('No events missing community association.');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
};

// Run the function to update missing data
fillMissingData();
