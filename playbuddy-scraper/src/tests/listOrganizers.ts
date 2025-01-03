import fs from 'fs';
import { supabaseClient } from '../connections/supabaseClient.js';
// Print table using table library
import Table from 'cli-table3';

interface Organizer {
    organizer_id: string;
    name: string;
    count: number;
}

interface Event {
    organizer_id: string;
    organizer: {
        name: string;
    };
}

// Function to fetch organizers and event counts
async function fetchOrganizersAndEventCount(): Promise<Organizer[]> {
    try {
        // Fetch organizers and their event count
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('organizer_id, organizer!organizer_id(name)');

        if (error) throw error;

        // @ts-expect-error - TODO: fix this
        const organizers = (events).reduce<Record<string, Organizer>>((acc, event: Event) => {
            const organizerId = event.organizer_id;
            if (!acc[organizerId]) {
                acc[organizerId] = {
                    organizer_id: organizerId,
                    name: event.organizer.name,
                    count: 0
                };
            }
            acc[organizerId].count++;
            return acc;
        }, {});

        const data = Object.values(organizers);

        return data;
    } catch (error) {
        console.error('Error fetching organizers and event counts:', error);
        return [];
    }
}

// Function to save data to a file
function saveOrganizersEventCount(data: Organizer[]): void {
    const filePath = './organizers_event_count.json';

    // Save the data to a file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Organizers' event counts saved to ${filePath}`);
}

// Function to compare with previous data and create a table
function compareWithPreviousRun(currentData: Organizer[]): void {
    const filePath = './organizers_event_count.json';
    const previousData: Organizer[] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];
    const previousDate = fs.existsSync(filePath) ? fs.statSync(filePath).mtime.toISOString().split('T')[0] : 'N/A';

    const previousCount = previousData.length;
    const currentCount = currentData.length;

    console.log(`Previous organizer count: ${previousCount}`);
    console.log(`Current organizer count: ${currentCount}`);

    if (currentCount !== previousCount) {
        console.log(`Difference in the number of organizers: ${currentCount - previousCount}`);
    } else {
        console.log("No change in the number of organizers.");
    }

    // Create table data
    const tableData = currentData.map(currentOrganizer => {
        const previousOrganizer = previousData.find(org => org.organizer_id === currentOrganizer.organizer_id);
        return {
            name: currentOrganizer.name,
            id: currentOrganizer.organizer_id,
            prevCount: previousOrganizer ? previousOrganizer.count : 'N/A',
            currentCount: currentOrganizer.count
        };
    });

    const table = new Table({
        head: ['Name', `${previousDate}`, 'Current'],
        colWidths: [30, 15, 10]
    });

    tableData
        .sort((a, b) => b.currentCount - a.currentCount)
        .forEach(row => {
            table.push([row.name, row.prevCount, row.currentCount]);
        });

    console.log('\nOrganizer Event Count Table:');
    console.log(table.toString());

    // Detailed comparison
    currentData.forEach(currentOrganizer => {
        const previousOrganizer = previousData.find(org => org.organizer_id === currentOrganizer.organizer_id);

        if (!previousOrganizer) {
            console.log(`New organizer found: ${currentOrganizer.name}`);
        } else if (previousOrganizer.count !== currentOrganizer.count) {
            console.log(`Change in event count for ${currentOrganizer.name}: Previous ${previousOrganizer.count}, Current ${currentOrganizer.count}`);
        }
    });
}

interface OrganizerWithId {
    id: string;
    name: string;
}

interface CommunityWithOrganizerId {
    organizer_id: string;
}

const testMatchingCommunities = async (): Promise<void> => {
    console.log("Testing for matching communities...");

    // Fetch all organizers
    const { data: organizers, error: organizersError } = await supabaseClient
        .from('organizers')
        .select('id, name');

    if (organizersError) {
        console.error("Error fetching organizers:", organizersError);
        return;
    }

    // Fetch all communities with organizer_id
    const { data: communities, error: communitiesError } = await supabaseClient
        .from('communities')
        .select('organizer_id');

    if (communitiesError) {
        console.error("Error fetching communities:", communitiesError);
        return;
    }

    // Create a set of organizer IDs that have communities
    const organizerIdsWithCommunities = new Set((communities as CommunityWithOrganizerId[]).map(c => c.organizer_id));

    // Find organizers without communities
    const organizersWithoutCommunities = (organizers as OrganizerWithId[]).filter(org => !organizerIdsWithCommunities.has(org.id));

    if (organizersWithoutCommunities.length === 0) {
        console.log("All organizers have matching communities.");
    } else {
        console.log("Organizers without matching communities:");
        organizersWithoutCommunities.forEach(org => {
            console.log(`- ${org.name}`);
        });
    }
}

// all events have at least 2 communities   
async function eventCommunities() {
    const { data: events, error: eventsError } = await supabaseClient
        .from('events')
        .select('id, event_communities(community_id)')

    if (eventsError) {
        console.error("Error fetching events:", eventsError);
        return;
    }

    if (!events) {
        console.log("No events found.");
        return;
    }

    const eventsWithLessThanTwoCommunities = events.filter(event =>
        event.event_communities.length < 2
    );

    if (eventsWithLessThanTwoCommunities.length === 0) {
        console.log("All events have at least 2 communities.");
    } else {
        console.log("Events with less than 2 communities:");
        eventsWithLessThanTwoCommunities.forEach(event => {
            console.log(`- Event ID: ${event.id}, Community Count: ${event.event_communities.length}`);
        });
    }
}

// Main function to run the process
export const listOrganizers = async (): Promise<void> => {
    const organizersEventCount = await fetchOrganizersAndEventCount();
    await saveOrganizersEventCount(organizersEventCount);
    await compareWithPreviousRun(organizersEventCount);
    await testMatchingCommunities();
    await eventCommunities();
}
