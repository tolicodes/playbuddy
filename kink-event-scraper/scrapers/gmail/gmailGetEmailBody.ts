import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// List messages from the Gmail inbox.
async function listGmailMessages(auth: OAuth2Client, email: string): Promise<string[]> {
    const gmail = google.gmail({ version: 'v1', auth });
    const emailsQuery = `from:${email}`;
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: emailsQuery,
        maxResults: 5,
    });

    const messages = res.data.messages;
    if (!messages) {
        console.log('No messages found.');
        return []
    }
    return messages.map((message) => message.id!);
}

// Get a specific message from Gmail.
async function getGmailMessage(gmail: gmail_v1.Gmail, messageId: string): Promise<string> {
    const res = await gmail.users.messages.get({ userId: 'me', id: messageId });
    const message = res.data;

    let emailData: string | undefined;

    // Check if the email has multiple parts and try to find the plain text or HTML part
    if (message.payload?.parts) {
        for (const part of message.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                emailData = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break;
            } else if (part.mimeType === 'text/html' && part.body?.data) {
                emailData = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break;
            }
        }
    } else if (message.payload?.body?.data) {
        // If the email doesn't have parts, it might be a simple message with a body
        emailData = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    if (emailData) {
        // console.log('Email Content:', emailData);
        return emailData;
    } else {
        console.log('No email content found for message ID:', messageId);
        return '';
    }
}


// PUBLIC FUNCTIONS
export const getMessageBodiesForEmails = async (auth: OAuth2Client, emails: string[]): Promise<string[]> => {
    const gmail = google.gmail({ version: 'v1', auth });

    const messageBodies: string[] = [];
    for (const email of emails) {
        const messages = await listGmailMessages(auth, email);

        for (const message of messages) {
            messageBodies.push(await getGmailMessage(gmail, message));
        }
    }

    return messageBodies;
};