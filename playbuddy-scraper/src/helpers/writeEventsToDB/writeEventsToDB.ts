import { NormalizedEventInput } from "../../commonTypes.js";
import axios from 'axios';
import dotenv from 'dotenv';
import PQueue from 'p-queue';

dotenv.config();

const queue = new PQueue({ concurrency: 50 });

export const writeEventsToDB = async (events: NormalizedEventInput[]) => {
  let addedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  const tasks = events.map((event) =>
    queue.add(async () => {
      try {
        const response = await axios.post(
          `${process.env.PLAYBUDDY_API_URL}/events`,
          event,
          {
            headers: {
              Authorization: `Bearer ${process.env.PLAYBUDDY_API_SERVICE_KEY}`,
            },
          }
        );

        if (response.data === 'inserted') {
          addedCount++;
        } else if (response.data === 'updated') {
          updatedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        // @ts-ignore
        console.error(`❌ Failed to insert/update event ${event.name}:`, error.message);
      }
    })
  );

  await Promise.allSettled(tasks);

  console.log(`\n✅ Processed ${events.length} events:`);
  console.log(`  ➕ Added: ${addedCount}`);
  console.log(`  🔁 Updated: ${updatedCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
};
