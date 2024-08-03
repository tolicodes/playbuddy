import scrapeOrganizerEvents from './scrapeOrganizerEvents';
import fs from 'fs';

const main = async () => {
    const organizers = JSON.parse(fs.readFileSync('organizers.json', 'utf-8'));
    const allEvents = [];

    for (const organizer of organizers) {
        const events = await scrapeOrganizerEvents(organizer.url);
        allEvents.push(...events);
    }

    fs.writeFileSync('all_events.json', JSON.stringify(allEvents, null, 2));
    console.log('All events data saved to all_events.json');
};

main();
