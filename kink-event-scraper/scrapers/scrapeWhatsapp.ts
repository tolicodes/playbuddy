import { Client, LocalAuth, Message, Chat } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { SourceMetadata } from '../types';

const SCRAPE_GROUPS: string[] = [
    'Rad Nu Yorkerz',
    'Circling & AR ~ NYC',
    'Youtopia DreamSpace Community Events',
    'TREE 💃🌳🕺🏻 RAVE',
];

export const scrapeWhatsappLinks = (): Promise<SourceMetadata[]> => {
    return new Promise<SourceMetadata[]>((resolve, reject) => {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: 'client-one' }), // Specify a clientId to differentiate between different sessions
            puppeteer: { headless: false },
        });

        client.on('qr', (qr: string) => {
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            try {
                // Get all the groups
                console.log('Fetching chats...');
                const chats: Chat[] = await client.getChats();
                console.log(`Fetched ${chats.length} chats`);

                const groups = chats.filter((chat) => chat.isGroup);
                console.log(`Found ${groups.length} groups`);

                // Domains to search for
                const domains = ['eventbrite.com', 'partiful.com'];
                const domainRegex = new RegExp(
                    `https?://(?:www\\.)?(?:${domains.join('|')})[\\w\\-./?=&%]*`,
                    'g',
                );

                // Container for matched links
                const linkMatches: SourceMetadata[] = [];

                for (const group of groups) {
                    if (!SCRAPE_GROUPS.includes(group.name)) continue;
                    console.log(`Processing group: ${group.name}`);

                    // Fetch messages from the group
                    const messages: Message[] = await group.fetchMessages({ limit: 200 }); // Adjust the limit as needed
                    console.log(
                        `Fetched ${messages.length} messages from group: ${group.name}`,
                    );

                    messages.forEach((message) => {
                        // Check if the message contains a link from the specified domains
                        const urls = message.body.match(domainRegex);
                        if (urls && urls.length > 0) {
                            linkMatches.push({
                                url: urls[0], // Only save the first matched link
                                source_origination_group_id: group.id._serialized,
                                source_origination_group_name: group.name,
                                source_origination_platform: 'WhatsApp',
                                timestamp_scraped: message.timestamp,
                            });
                        }
                    });
                }
                resolve(linkMatches);
            } catch (error) {
                console.error('Error fetching group messages:', error);
                reject(error);
            } finally {
                client.destroy();
            }
        });

        client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
            reject(new Error(`Authentication failure: ${msg}`));
        });

        client.on('disconnected', (reason) => {
            console.log('Whatsapp Client was logged out', reason);
        });

        client.initialize();
    });
};
