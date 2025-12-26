

// import axios from "axios";

// import { NormalizedEventInput } from "../../commonTypes.js";
// import { ScraperParams } from '../types.js'

// export const API_URL = "https://hechdtvsjiogijxbczqs.supabase.co/rest/v1/events?select=*";

// // Scraper their API
// export const scrapeAcroFestivals = async ({
//     url = API_URL,
//     eventDataSource,
// }: ScraperParams): Promise<NormalizedEventInput[]> => {
//     try {
//         // Make a request to the Eventbrite API endpoint
//         const data = await axios.get(url, {
//             headers: {
//                 // These are public headers
//                 apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY2hkdHZzamlvZ2lqeGJjenFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU1MjkyOTAsImV4cCI6MjAyMTEwNTI5MH0.GTTenJ30CynPTvRm9f0fJ7s8vj465avrZ30BGo18bms',
//                 authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY2hkdHZzamlvZ2lqeGJjenFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU1MjkyOTAsImV4cCI6MjAyMTEwNTI5MH0.GTTenJ30CynPTvRm9f0fJ7s8vj465avrZ30BGo18bms'
//             }
//         });

//         // Extract relevant event details
//         const events = Object.values(data.data).map((event: any): NormalizedEventInput => {
//             const startDate = new Date(`${event.Date} ${event.StartTime}`);
//             const endDate = new Date(startDate);
//             endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration));

//             const url = event.web_url || event.fb_url || event.ig_url || 'https://acrofestivals.org';

//             return {
//                 original_id: `acrofestivals-${event.id}`,
//                 type: 'retreat',
//                 recurring: 'none',
//                 organizer: {
//                     // actually filled in by the DB, need to fill it in for ts, fix later
//                     id: '',
//                     name: event.name,
//                     url,
//                 },

//                 name: event.name,
//                 start_date: new Date(event.start_date).toISOString(),
//                 end_date: new Date(event.end_date).toISOString(),

//                 ticket_url: url,
//                 event_url: url,
//                 image_url: event.photo_url,

//                 location: `${event.venue_address}, ${event.city}, ${event.country}, ${event.continent}`,

//                 price: "",
//                 description: `${event.description}\n\n
//   Email: ${event.email}\n\n
//   FB: ${event.fb_url}\n\n
//   IG: ${event.ig_url}`,

//                 tags: ["acro"],

//                 source_origination_platform: "acrofestivals",
//                 source_url: API_URL,
//                 ...eventDataSource,
//             };
//         });

//         return events;
//     } catch (error) {
//         console.error(error);
//         // Fail silently by returning an empty array
//         return [];
//     }
// };
