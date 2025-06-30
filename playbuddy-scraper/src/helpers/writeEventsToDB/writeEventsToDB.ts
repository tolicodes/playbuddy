import { NormalizedEventInput } from "../../commonTypes.js";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const writeEventsToDB = async (events: NormalizedEventInput[]) => {
  let addedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const event of events) {
    const result = await axios.post(process.env.PLAYBUDDY_API_URL + '/events', event, {
      headers: {
        'Authorization': `Bearer ${process.env.PLAYBUDDY_API_SERVICE_KEY}`
      }
    });
    console.log(`Event ${event.name}: ${result.data}`)
    if (result.data === 'inserted') {
      addedCount++;
    } else if (result.data === 'updated') {
      updatedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`Processed ${events.length} events:`);
  console.log(`  Added: ${addedCount}`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Failed: ${failedCount}`);
};
