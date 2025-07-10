import { event_classifications } from './eventClassificationsList.js';

const intro = `I need your assistance in classifying a list of kinky events based on specific categories. For each event, please identify and assign values to the following attributes:`;

const format = `
Only provide the JSON output for each event in an array

Event Classification JSON Schema:
${JSON.stringify(event_classifications, null, 4)}

The output should be an array of all the events passed in with the following classificiations
 with the following attributes. Add values should use id props not name props. Give 5 themes

event_id: string;
event_name: string;
organizer_name: string;

type: string | snake_case
short_description: string

tags: string[] | Title Case
experience_level: string | snake_case
interactivity_level: string | snake_case
inclusivity: string[] | snake_case

vetted: boolean 
vetting_url: string
location: string (natural language)
non_ny: boolean
hosts: string[] | Title Case
price: string

${event_classifications.map((c) => `${c.name}: string;`).join('\n')}

Mapping
- use classification ID for keys in the output (ex: type vs Type)
- JSON output should be an array of objects containing a key "events" which is an  array of objects with the above structure
- input event.id maps to event_id (the integer) NOT the original_id
- do not put in tags something that already exists in another field (ex: queer, workshop)
- booleans (false, true) should NOT be returned as a string, but as booleans

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
