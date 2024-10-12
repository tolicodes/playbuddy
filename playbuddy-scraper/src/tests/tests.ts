import { checkEvents } from "./checkEventLocationsAndCommunities.js";
import { listOrganizers } from "./listOrganizers.js";

async function main() {
    await checkEvents();
    await listOrganizers();
}

main();