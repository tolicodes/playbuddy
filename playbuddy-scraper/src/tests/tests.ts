import { checkEvents } from "./checkEventLocationsAndCommunities.js";
import { listOrganizers } from "./listOrganizers.js";
import { testSchedulerEndpoints } from "./testScheduler.js";

async function main() {
    await checkEvents();
    await listOrganizers();
    await testSchedulerEndpoints();
}

main();