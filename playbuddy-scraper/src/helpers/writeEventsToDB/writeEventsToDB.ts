import { NormalizedEventInput } from "../../commonTypes.js";
import { upsertEvent } from "./upsertEvent.js";

export const writeEventsToDB = async (events: NormalizedEventInput[]) => {
  let addedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const event of events) {
    const result = await upsertEvent(event);
    if (result === 'inserted') {
      addedCount++;
    } else if (result === 'updated') {
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
