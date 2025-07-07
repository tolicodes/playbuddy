import { event_classifications } from './event_classifications.js';

const intro = `I need your assistance in classifying a list of kinky events based on specific categories. For each event, please identify and assign values to the following attributes:`;

const format = `
Only provide the JSON output for each event in an array

Event Classification JSON Schema:
${JSON.stringify(event_classifications, null, 4)}}

The output should be an array of all the events passed in with the following classificiations
 with the following attributes. Add values should use id props not name props. Give 5 themes

event_id: string;
event_name: string;
event_themes: string[];
comfort_level: string;
experience_level: string;
interactivity_level: string;

Also extract
- event_hosts - try to find the event hosts
- play_party - says something like "play party" "temple party" or "kink party"
- vetted - is this event vetted?
- vetting_url - the url to the vetting page
- non_ny - is this event not in New York?
- is_munch - is this event a munch or social?

input event.id maps to event_id (the integer) NOT the original_id

JSON output should be an array of objects containing a key "events" which is an  array of objects with the above structure

{
    events: [{
        event_id: "1234",
    }, {
        event_id: "5678",
    }]
}
 `

export const systemPrompt = `
    ${intro}\n\n
    ${format}
`;
