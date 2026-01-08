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
neighborhood: string (NYC neighborhood, e.g. Bushwick, Midtown)
non_ny: boolean
hosts: string[] | Title Case
price: string
short_price: string | null (best guess as $number)

${event_classifications.map((c) => `${c.name}: string;`).join('\n')}

Mapping
- use classification ID for keys in the output (ex: type vs Type)
- type must be one of: play_party, jam, munch, retreat, festival, workshop, performance, discussion. Do not output "event".
- if the title/description indicates a class, training, demo, or workshop, choose "workshop" for type.
- JSON output should be an array of objects containing a key "events" which is an  array of objects with the above structure
- input event.id maps to event_id (the integer) NOT the original_id
- do not put in tags something that already exists in another field (ex: queer, workshop)
- booleans (false, true) should NOT be returned as a string, but as booleans
- if price is a range, use the lower bound (single $value)
- short_price should be "$<number>" or null if there is no best guess

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

const neighborhoodOnlyFormat = `
Only provide the JSON output for each event in an array.

Return ONLY the event_id and neighborhood. Use an empty string if the neighborhood is unclear or non-NY.

event_id: string;
neighborhood: string

Mapping
- use "neighborhood" as the key
- input event.id maps to event_id (the integer) NOT the original_id

{
    events: [{
        event_id: "1234",
        neighborhood: "Bushwick"
    }, {
        event_id: "5678",
        neighborhood: ""
    }]
}
`;

export const neighborhoodOnlyPrompt = `
    ${intro}\n\n
    ${neighborhoodOnlyFormat}
`;

const priceOnlyFormat = `
Only provide the JSON output for each event in an array.

Return ONLY the event_id, price, and short_price.
- price: single "$<number>" or empty string if unknown (if range, choose the lower bound)
- short_price: "$<number>" or null if there is no best guess (use the same lower bound when range)

event_id: string;
price: string;
short_price: string | null;

Mapping
- use "price" and "short_price" as the keys
- input event.id maps to event_id (the integer) NOT the original_id

{
    events: [{
        event_id: "1234",
        price: "$25-$40",
        short_price: "$30"
    }, {
        event_id: "5678",
        price: "",
        short_price: null
    }]
}
`;

export const priceOnlyPrompt = `
    ${intro}\n\n
    ${priceOnlyFormat}
`;
