import express, { NextFunction, Request, Response } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import process from "node:process";

import { connectRedisClient } from "./connections/redisClient.js";
import { supabaseClient } from "./connections/supabaseClient.js";
import { createIcal } from "./helpers/ical.js";

export const app = express();

// Request middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.head("/", (req: Request, res: Response): void => {
  res.send();
});

app.get("/events", async (req: Request, res: Response): Promise<void> => {
  const cacheKey = "events";
  let redisClient;

  console.log("toli");

  try {
    redisClient = await connectRedisClient();
    console.log("Connected to Redis");

    const cacheData = await redisClient.get(cacheKey);
    console.log("Cache data", !!cacheData);

    let responseData;
    let jsonData;

    // If there is cache data in Redis, return it
    if (cacheData) {
      // Return cached data
      responseData = cacheData;
      jsonData = JSON.parse(cacheData);
    }

    // Fetch data from Supabase if not in cache
    else {
      const { data, error } = await supabaseClient.from("events").select(`
          *,
          organizer:organizers(name, url)
        `);

      if (error) {
        throw new Error(error.message);
      }

      console.log("Fetched data from Supabase");

      jsonData = data.map((event) => ({
        ...event,
        organizer: event.organizer.name,
        organizer_url: event.organizer.url,
      }));

      // will return later
      responseData = JSON.stringify(jsonData);

      // Cache the new data in Redis
      await redisClient.setEx(cacheKey, 600, responseData); // Cache for 10 minutes
    }

    // Handle the request for iCal format
    if (req.query.format === "ical") {
      console.log("Sending ical format");
      await res
        .status(200)
        .set("Content-Type", "text/calendar")
        .send(createIcal(jsonData));
      return;
    }

    // at the end always return JSON of response data, unless iCal
    // whether we fetched from cache or Supabase
    await res.status(200).send(responseData);
  } catch (error) {
    console.error("Error:", error);
    // @ts-ignore
    res.status(500).send({ error: error.message });
  } finally {
    redisClient?.quit();
  }
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
  const port = process.env["PORT"] || "8080";
  await start(port);
}
