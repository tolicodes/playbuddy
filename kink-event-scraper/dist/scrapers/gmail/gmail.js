import { getMessageBodiesForEmails } from "./gmailGetEmailBody.js";
import { authorizeGmailFromToken } from "./gmailAuthUtils.js";
import { extractEventDetailsFromEmail } from "./openAIUtils.js";
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
    }
    catch (error) {
        console.error(error);
    }
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ21haWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc2NyYXBlcnMvZ21haWwvZ21haWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHaEUsS0FBSyxVQUFVLElBQUk7SUFDakIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3RCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFbkIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLGVBQWUsR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztBQUNILENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQyJ9