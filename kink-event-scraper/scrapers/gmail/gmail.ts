
import { getMessageBodiesForEmails } from "./gmailGetEmailBody";
import { authorizeGmailFromToken } from "./gmailAuthUtils";
import { extractEventDetailsFromEmail } from "./openAIUtils";


// Main function to load credentials and start the process.
async function main() {
    try {
        const auth = await authorizeGmailFromToken();
        const EMAILS = [
            'members@wearehacienda.com',
        ]
        const bodies = await getMessageBodiesForEmails(auth, EMAILS);

        const details = [];

        for (const body of bodies) {
            const detailsForEmail = extractEventDetailsFromEmail(body)
            details.push(detailsForEmail);
        }

        console.log({
            details
        })

    } catch (error) {
        console.error(error);
    }
}

main();
