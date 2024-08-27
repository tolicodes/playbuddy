import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
const SCRAPE_GROUPS = [
    "Rad Nu Yorkerz",
    "Circling & AR ~ NYC",
    "Youtopia DreamSpace Community Events",
    "TREE 💃🌳🕺🏻 RAVE",
];
export const scrapeWhatsappLinks = () => {
    return new Promise((resolve, reject) => {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: "client-one" }),
            puppeteer: { headless: false },
        });
        client.on("qr", (qr) => {
            qrcode.generate(qr, { small: true });
        });
        client.on("ready", async () => {
            try {
                console.log("Fetching chats...");
                const chats = await client.getChats();
                console.log(`Fetched ${chats.length} chats`);
                const groups = chats.filter((chat) => chat.isGroup);
                console.log(`Found ${groups.length} groups`);
                const domains = ["eventbrite.com", "partiful.com"];
                const domainRegex = new RegExp(`https?://(?:www\\.)?(?:${domains.join("|")})[\\w\\-./?=&%]*`, "g");
                const linkMatches = [];
                for (const group of groups) {
                    if (!SCRAPE_GROUPS.includes(group.name))
                        continue;
                    console.log(`Processing group: ${group.name}`);
                    const messages = await group.fetchMessages({ limit: 200 });
                    console.log(`Fetched ${messages.length} messages from group: ${group.name}`);
                    messages.forEach((message) => {
                        const urls = message.body.match(domainRegex);
                        if (urls && urls.length > 0) {
                            linkMatches.push({
                                url: urls[0],
                                source_origination_group_id: group.id._serialized,
                                source_origination_group_name: group.name,
                                source_origination_platform: "WhatsApp",
                                timestamp_scraped: message.timestamp,
                            });
                        }
                    });
                }
                resolve(linkMatches);
            }
            catch (error) {
                console.error("Error fetching group messages:", error);
                reject(error);
            }
            finally {
                client.destroy();
            }
        });
        client.on("auth_failure", (msg) => {
            console.error("Authentication failure:", msg);
            reject(new Error(`Authentication failure: ${msg}`));
        });
        client.on("disconnected", (reason) => {
            console.log("Whatsapp Client was logged out", reason);
        });
        client.initialize();
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlV2hhdHNhcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2NyYXBlcnMvc2NyYXBlV2hhdHNhcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQWlCLE1BQU0saUJBQWlCLENBQUM7QUFDbkUsT0FBTyxNQUFNLE1BQU0saUJBQWlCLENBQUM7QUFHckMsTUFBTSxhQUFhLEdBQWE7SUFDOUIsZ0JBQWdCO0lBQ2hCLHFCQUFxQjtJQUNyQixzQ0FBc0M7SUFDdEMsb0JBQW9CO0NBQ3JCLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUE4QixFQUFFO0lBQ2pFLE9BQU8sSUFBSSxPQUFPLENBQW1CLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDO1lBQ3hCLFlBQVksRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsQ0FBQztZQUN2RCxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO1NBQy9CLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBVSxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVCLElBQUksQ0FBQztnQkFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2pDLE1BQU0sS0FBSyxHQUFXLE1BQU0sTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsS0FBSyxD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