import fs from "fs";
import readline from "readline";
import { google } from "googleapis";
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const GMAIL_CREDENTIALS_PATH = "./gmail_credentials.json";
const GMAIL_TOKEN_PATH = "./gmail_token.json";
async function loadGmailCredentials() {
    return new Promise((resolve, reject) => {
        fs.readFile(GMAIL_CREDENTIALS_PATH, (err, content) => {
            if (err) {
                reject("Error loading client secret file: " + err);
            }
            resolve(JSON.parse(content.toString()));
        });
    });
}
async function getGmailAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve, reject) => {
        rl.question("Enter the code from that page here: ", (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    reject("Error retrieving access token: " + err);
                }
                else {
                    oAuth2Client.setCredentials(token);
                    fs.writeFile(GMAIL_TOKEN_PATH, JSON.stringify(token), (err) => {
                        if (err)
                            reject(err);
                        console.log("Token stored to", GMAIL_TOKEN_PATH);
                        resolve();
                    });
                }
            });
        });
    });
}
export async function authorizeGmailFromToken() {
    const credentials = await loadGmailCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    return new Promise((resolve, reject) => {
        fs.readFile(GMAIL_TOKEN_PATH, (err, token) => {
            if (err) {
                getGmailAccessToken(oAuth2Client)
                    .then(() => resolve(oAuth2Client))
                    .catch(reject);
            }
            else {
                oAuth2Client.setCredentials(JSON.parse(token.toString()));
                resolve(oAuth2Client);
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ21haWxBdXRoVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc2NyYXBlcnMvZ21haWwvZ21haWxBdXRoVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3BCLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsTUFBTSxFQUFZLE1BQU0sWUFBWSxDQUFDO0FBRzlDLE1BQU0sTUFBTSxHQUFHLENBQUMsZ0RBQWdELENBQUMsQ0FBQztBQUNsRSxNQUFNLHNCQUFzQixHQUFHLDBCQUEwQixDQUFDO0FBQzFELE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUM7QUFHOUMsS0FBSyxVQUFVLG9CQUFvQjtJQUNqQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLEVBQUUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDUixNQUFNLENBQUMsb0NBQW9DLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFHRCxLQUFLLFVBQVUsbUJBQW1CLENBQUMsWUFBMEI7SUFDM0QsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUMzQyxXQUFXLEVBQUUsU0FBUztRQUN0QixLQUFLLEVBQUUsTUFBTTtLQUNkLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQztRQUNsQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDcEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0tBQ3ZCLENBQUMsQ0FBQztJQUVILE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzNELEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUN6QyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUNSLE1BQU0sQ0FBQyxpQ0FBaUMsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztxQkFBTSxDQUFDO29CQUNOLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBTSxDQUFDLENBQUM7b0JBQ3BDLEVBQUUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO3dCQUM1RCxJQUFJLEdBQUc7NEJBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLENBQUM7d0JBQ2pELE9BQU8sRUFBRSxDQUFDO29CQUNaLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBS0QsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUI7SUFDM0MsTUFBTSxXQUFXLEdBQUcsTUFBTSxvQkFBb0IsRUFBRSxDQUFDO0lBRWpELE1BQU0sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7SUFDMUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FDekMsU0FBUyxFQUNULGFBQWEsRUFDYixhQUFhLENBQUMsQ0FBQyxDQUFDLENBQ2pCLENBQUM7SUFHRixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDM0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDUixtQkFBbUIsQ0FBQyxZQUFZLENBQUM7cUJBQzlCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ2pDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQixDQUFDO2lCQUFNLENBQUM7Z0JBQ04sWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMifQ==