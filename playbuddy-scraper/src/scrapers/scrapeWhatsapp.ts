import Whatsapp, { Client, Message, Chat } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { SourceMetadata } from "../commonTypes.js";
import { puppeteerConfig } from "../config.js";

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { AwsS3Store } from "wwebjs-aws-s3";
import { SCRAPERS } from "../helpers/scrapeURLs.js";

export const scrapeWhatsappLinks = (whatsappGroups: { group_name: string, community_id: string }[], sourceMetadata: SourceMetadata): Promise<SourceMetadata[]> => {
  return new Promise<SourceMetadata[]>((resolve, reject) => {
    const s3 = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || ''
      },
      forcePathStyle: true
    });

    const putObjectCommand = PutObjectCommand;
    const headObjectCommand = HeadObjectCommand;
    const getObjectCommand = GetObjectCommand;
    const deleteObjectCommand = DeleteObjectCommand;

    const store = new AwsS3Store({
      bucketName: process.env.SUPABASE_S3_BUCKET_NAME || '',
      remoteDataPath: 'scraper-client',
      s3Client: s3,
      putObjectCommand,
      headObjectCommand,
      getObjectCommand,
      deleteObjectCommand,
      forcePathStyle: true,
    });

    const authStrategy = process.env.NODE_ENV === 'production' ?
      new Whatsapp.RemoteAuth({
        clientId: 'scraper2',
        dataPath: 'whatsapp-login/',
        store: store,
        backupSyncIntervalMs: 600000,
      }) :
      new Whatsapp.LocalAuth();

    const client = new Client({
      authStrategy,

      puppeteer: {
        ...puppeteerConfig,
      },

      webVersionCache: {
        type: "remote",
        // remote execution context crashes 
        // https://github.com/pedroslopez/whatsapp-web.js/issues/2789
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/1.26.0.html",
      },
    });

    client.on("qr", (qr: string) => {
      console.log("qr ready");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", async () => {
      console.log('ready');
      try {
        // Get all the groups
        console.log("Fetching chats...");
        const chats: Chat[] = await client.getChats();
        console.log(`Fetched ${chats.length} chats`);

        const groups = chats.filter((chat) => chat.isGroup);
        console.log(`Found ${groups.length} groups`);

        // Domains to search for
        const domains = Object.keys(SCRAPERS);
        // match containing any of the domains
        const domainRegex = new RegExp(
          `https?://(?:[\\w\\-.]+\\.)?(?:${domains.join("|")})[\\w\\-./?=&%]*`,
          "ig",
        );

        // Container for matched links
        const linkMatches: SourceMetadata[] = [];

        for (const group of groups) {
          const existingGroup = whatsappGroups.find((g) => g.group_name === group.name);
          if (!existingGroup) continue;
          console.log(`Processing group: ${group.name}`);

          // Fetch messages from the group
          const messages: Message[] = await group.fetchMessages({ limit: 300 });
          console.log(
            `Fetched ${messages.length} messages from group: ${group.name}`,
          );

          const communities = [...sourceMetadata.communities || [], {
            id: existingGroup.community_id,
          }];

          messages.forEach((message) => {

            // Check if the message contains a link from the specified domains
            const urls = message.body.match(domainRegex);

            if (urls && urls.length > 0) {
              linkMatches.push({
                source_url: urls[0], // Only save the first matched link
                source_origination_group_id: group.id._serialized,
                source_origination_group_name: group.name,
                source_origination_platform: "WhatsApp",
                communities,
              });
            }
          });
        }
        resolve(linkMatches);
      } catch (error) {
        console.error("Error fetching group messages:", error);
        reject(error);
      } finally {
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
