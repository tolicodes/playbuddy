import { event_classifications } from './event_classifications.js';

const intro = `I need your assistance in classifying a list of kinky events based on specific categories. For each event, please identify and assign values to the following attributes:`;

const format = `
Only provide the JSON output for each event in an array

Event Classification JSON Schema:
${JSON.stringify(event_classifications, null, 4)}}

The output should be an array of all the events passed in with the following classificiations
 with the following attributes. Add values should use id props not name props. Give 5-10 tags and 3-5 themes

event_id: string;
event_name: string;
 event_themes: string[];
 tags: string[];
 comfort_level: string;
 experience_level: string;
 inclusivity: string;
 consent_and_safety_policies: string[];
 alcohol_and_substance_policies: string[];
 venue_type: string;
 interactivity_level: string;
 dress_code: string[];
 accessibility: string[];

 input event.id maps to event_id (the integer) NOT the original_id

 JSON output should be an objects containing a key "events" which is an  array of objects with the above structure

{
    events: [{
        event_id: "1234",
    }, {
        event_id: "5678",
    }]
}
 `

// const instructions = `
// **Instructions:**

// - For each event description provided, please analyze the content and assign the most appropriate classification for each attribute based on the definitions below.
// - If certain information is missing or unclear from the event description, please note it as 'not_provided' in the relevant category.
// - Present the output in the following JSON format for consistency and ease of integration
// - When interpreting the event descriptions, please make reasonable inferences where appropriate but avoid assuming details not supported by the text.

// ${format}
// `;

// const inputEvent = {
//     "original_id": "plura-e18f6899-406a-4322-908d-31dd335f5846",
//     "organizer": {
//         "name": "Daddy Retreat",
//         "url": "https://plra.io/m/org/daddy-retreat"
//     },
//     "name": "All Hands On D*ck! - An Erotic Voyage! Joint w/MAN group!",
//     "start_date": "2024-09-09T16:30:00.000Z",
//     "end_date": "2024-09-09T18:45:00.000Z",
//     "ticket_url": "https://plra.io/m/allhandsondsept9",
//     "event_url": "https://plra.io/m/allhandsondsept9",
//     "image_url": "https://d1ne94wy7mt59y.cloudfront.net/prod/cd0e3a1f-d6ab-4945-9ae9-7ba694310450/600x300",
//     "location": ", New York, NY 10001",
//     "price": "",
//     "description": "All Hands on Deck! - Mon 12:30-2:45pm Joint with [MAN](https://www.males.org/) (Males Au Naturel) Means more men!\n\n_\\*This event is for male identified only\\*_\n\nCalling all Seamen!!!\n\nthe Captain is back for more, and he needs as many willing boys and daddies to go on an erotic adventure with him.\n\nLed by [Dominus Eros](dominuseros.com) aka your Captain on this voyage!\n\nEver have a 4 handed massage? 6? 8? This is the social event to come many and come all! Invite a fellow sailor or two to join in on the sensual and erotic multi-handed massage experience while being touched by many seaman on this voyage of fun! All forms of swabbing the d\\*ck will be shown during shore leave with the last 30 minutes to allow all sailors to enjoy in their free time from orders of the captain ;)\n\nCost Eventbrite Early bird $30, Gen Admin $36 (Limited)\n\nCost at the door - $45 (Bring exact amount)\n\nDoors open at 12:30pm and close at 12:45pm.\n\nRefund requests must be given 7 days in advance.\n\n**Address in email confirmation**\n\nWhat to expect at the class: The class is nude, but a modesty towel can be used if preferred. We will do random round robin so that you get to touch as many bodies as possible, and be touched by many. If you just want to touch that can be arranged as well. The class is 2.25 hrs long to ensure everyone gets a turn, a midway break is included. Basic strokes, sensitive areas to work will be shown and some great erotic tricks as well. Performed on a massage table.\n\n**_This event is for male identified only, 18+ age, Daddy Retreat hosted_**\n\nWhat to bring: \\*Special for this event, Bonus points to all who bring a sailors hat of any kind! Bring a towel, and shirt/shorts that you can wear when you need to use the restroom or walk in the waiting area. Also arrive freshly showered if possible.",

//     "source_ticketing_platform": "Plura",
//     "dataset": "Kink"
// };


// const outputClassification = {
//     "event_categories": ["kink", "workshop", "play_party"],
//     "comfort_level": ["sexual"],
//     "experience_level": ["beginner_friendly"],
//     "inclusivity": ["gay_men"],
//     "consent": ["participants_can_opt_out"],
//     "alcohol_and_substance": "not_specified",
//     "venue_type": "private_venue",
//     "interactivity_level": "hands_on_participation",
//     "dress_code": "clothing_optional",
//     "accessibility": "information_not_provided",
//     "event_themes": ["sensual_massage"],
// }

// const example = `
// **Example:** \n
// **Input:**\n

// ${JSON.stringify(inputEvent, null, 4)}\n

// **Output:**\n
// ${JSON.stringify(outputClassification, null, 4)}\n
// `;

export const systemPrompt = `
    ${intro}\n\n
    ${format}
`;

console.log('System Prompt:', systemPrompt);