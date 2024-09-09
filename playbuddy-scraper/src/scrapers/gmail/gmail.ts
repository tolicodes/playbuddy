import { getMessageBodiesForEmails } from "./gmailGetEmailBody.js";
import { authorizeGmailFromToken } from "./gmailAuthUtils.js";
import { extractEventDetailsFromEmail } from "./openAIUtils.js";

// Main function to load credentials and start the process.
async function main() {
  try {
    const auth = await authorizeGmailFromToken();
    const EMAILS = ["members@wearehacienda.com"];
    const bodies = await getMessageBodiesForEmails(auth, EMAILS);

    const details = [];

    for (const body of bodies) {
      const detailsForEmail = extractEventDetailsFromEmail(body);
      details.push(detailsForEmail);
    }
  } catch (error) {
    console.error(error);
  }
}

main();
