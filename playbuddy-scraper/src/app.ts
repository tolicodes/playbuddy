import express, { NextFunction, Request, Response } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import process from "node:process";
import cron from "node-cron";
import { scrapeEvents } from "./scrapers/scraper.js";

export const app = express();

// Cron job configuration
const ENABLE_SCHEDULER = process.env.ENABLE_SCHEDULER !== "false"; // Enabled by default
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 */12 * * *"; // Every 12 hours by default

// Request middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  next(err);
});

app.head("/", (req: Request, res: Response): void => {
  res.send();
});

app.get("/health", (req: Request, res: Response): void => {
  res.send({
    status: "ok",
    timestamp: new Date().toISOString(),
    scheduler: {
      enabled: ENABLE_SCHEDULER,
      schedule: CRON_SCHEDULE,
    },
  });
});

app.get("/scrape", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Manual scrape triggered via /scrape endpoint");
    await scrapeEvents();
    res.send({
      status: "ok",
      message: "Scraping completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during manual scrape:", error);
    res.status(500).send({
      status: "error",
      message: "Scraping failed",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize cron scheduler if enabled
if (ENABLE_SCHEDULER) {
  console.log(`Initializing scheduled scraper with cron pattern: ${CRON_SCHEDULE}`);
  
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("Scheduled scrape starting at:", new Date().toISOString());
    try {
      await scrapeEvents();
      console.log("Scheduled scrape completed successfully at:", new Date().toISOString());
    } catch (error) {
      console.error("Scheduled scrape failed at:", new Date().toISOString(), error);
    }
  }, {
    timezone: "UTC"
  });
  
  console.log("Scheduled scraper initialized - will run every 12 hours");
} else {
  console.log("Scheduled scraper is disabled via ENABLE_SCHEDULER environment variable");
}


let server: Server;
export async function start(port: number | string): Promise<Server> {
  return new Promise((resolve) => {
    server = app
      .listen(port, () => {
        const address = server.address() as AddressInfo;
        console.log(`Listening on http://localhost:${address.port}`);
        ["SIGTERM", "SIGINT"].forEach((signal): void => {
          process.on(signal, stop);
        });
        resolve(server);
      })
      .on("close", () => {
        console.log("Server connection closed");
      })
      .on("error", async (error) => {
        await stop(error);
      });
  });
}
export async function stop(signal?: string | Error): Promise<void> {
  if (signal instanceof Error) {
    process.exitCode = 1;
    console.error(`error: ${signal.message}`);
    console.log("stop (error)");
  } else {
    if (signal) {
      console.log(`stop (${signal})`);
    } else {
      console.log("stop");
    }
  }
  if (server) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          err ? reject(err) : resolve();
        });
      });
    } catch (error: any) {
      process.exitCode = 1;
      console.error(error.message);
    }
  }
  console.log("Server stopped");
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  const port = process.env["PORT"] || "8082";

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  }).on('error', (err) => {
    console.error('Error:', err);

  }).on('close', () => {
    console.log('Server closed');
  });

  await start(port);
}
