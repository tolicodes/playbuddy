import { CreateEventInput } from "../../commonTypes.js";
import { upsertEvent } from "./upsertEvent.js";

export const writeEventsToDB = async (events: CreateEventInput[]): Promise<number> => {
  let addedCount = 0;
  for (const event of events) {
    const success = await upsertEvent(event);
    addedCount += success || 0;
  }

  console.log(`Processed ${events.length} events.`);
  console.log(`Successfully added ${addedCount} events.`);
  return addedCount;
};
