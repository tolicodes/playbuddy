// import fs from "fs";
// import readline from "readline";
// import { google, gmail_v1 } from "googleapis";
// import { OAuth2Client } from "google-auth-library";

// const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// const GMAIL_CREDENTIALS_PATH = "./gmail_credentials.json";
// const GMAIL_TOKEN_PATH = "./gmail_token.json";

// // Load client secrets from a local file.
// async function loadGmailCredentials(): Promise<any> {
//   return new Promise((resolve, reject) => {
//     fs.readFile(GMAIL_CREDENTIALS_PATH, (err, content) => {
//       if (err) {
//         reject("Error loading client secret file: " + err);
//       }
//       resolve(JSON.parse(content.toString()));
//     });
//   });
// }

// // Get and store new token after prompting for user authorization.
// async function getGmailAccessToken(oAuth2Client: OAuth2Client): Promise<void> {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: SCOPES,
//   });
//   console.log("Authorize this app by visiting this url:", authUrl);
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   return new Promise((resolve, reject) => {
//     rl.question("Enter the code from that page here: ", (code) => {
//       rl.close();
//       oAuth2Client.getToken(code, (err, token) => {
//         if (err) {
//           reject("Error retrieving access token: " + err);
//         } else {
//           oAuth2Client.setCredentials(token!);
//           fs.writeFile(GMAIL_TOKEN_PATH, JSON.stringify(token), (err) => {
//             if (err) reject(err);
//             console.log("Token stored to", GMAIL_TOKEN_PATH);
//             resolve();
//           });
//         }
//       });
//     });
//   });
// }

// // PUBLIC FUNCTIONS

// // Authorize a client with credentials, then call the Gmail API.
// export async function authorizeGmailFromToken(): Promise<OAuth2Client> {
//   const credentials = await loadGmailCredentials();

//   const { client_secret, client_id, redirect_uris } = credentials.installed;
//   const oAuth2Client = new google.auth.OAuth2(
//     client_id,
//     client_secret,
//     redirect_uris[0],
//   );

//   // Check if we have previously stored a token.
//   return new Promise((resolve, reject) => {
//     fs.readFile(GMAIL_TOKEN_PATH, (err, token) => {
//       if (err) {
//         getGmailAccessToken(oAuth2Client)
//           .then(() => resolve(oAuth2Client))
//           .catch(reject);
//       } else {
//         oAuth2Client.setCredentials(JSON.parse(token.toString()));
//         resolve(oAuth2Client);
//       }
//     });
//   });
// }
