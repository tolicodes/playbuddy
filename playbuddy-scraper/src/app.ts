import express, { NextFunction, Request, Response } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import process from "node:process";
import { scrapeEvents, scrapeWhatsappEvents } from "./scraper.js";

export const app = express();

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

app.get("/scrape", async (req: Request, res: Response): Promise<void> => {
  await scrapeEvents({
    freq: 'hourly'
  })
    ;
  res.send({
    status: "ok",
  });
});

// more expensive queries
app.get("/scrape/daily", async (req: Request, res: Response): Promise<void> => {
  await scrapeEvents({
    freq: 'daily'
  });

  res.send({
    status: "ok",
  });
});

app.get("/whatsapp", async (req: Request, res: Response): Promise<void> => {
  const out = await scrapeWhatsappEvents();

  res.send({
    status: "ok",
    out,
  });
});

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

// If this module is the main module, then start the server
if (import.meta.url.endsWith(process.argv[1]!)) {
  const port = process.env["PORT"] || "8082";
  await start(port);
}
