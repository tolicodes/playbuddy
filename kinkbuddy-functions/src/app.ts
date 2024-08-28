import express, { Request, Response } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import process from "node:process";
import cors from "cors";

import { connectRedisClient } from "./connections/redisClient.js";
import { supabaseClient } from "./connections/supabaseClient.js";
import { createIcal } from "./helpers/ical.js";

export const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  }),
);

const fetchAndCacheData = async (
  redisClient: any,
  cacheKey: string,
  supabaseQuery: () => any,
): Promise<string> => {
  const cacheData = await redisClient.get(cacheKey);
  if (cacheData) return cacheData;

  const { data, error } = await supabaseQuery();
  if (error) throw new Error(error.message);

  const responseData = JSON.stringify(data);
  await redisClient.set(cacheKey, responseData, "EX", 600); // Cache for 10 minutes

  return responseData;
};

app.get("/events", async (req: Request, res: Response): Promise<void> => {
  const cacheKey = "events";
  const today = new Date().toISOString().split("T")[0];

  try {
    const redisClient = await connectRedisClient();

    const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
      // @ts-ignore
      supabaseClient
        .from("events")
        .select("*, organizer:organizers(name, url)")
        .gte("start_date", today),
    );

    if (req.query.format === "ical") {
      res
        .status(200)
        .set("Content-Type", "text/calendar")
        .send(createIcal(JSON.parse(responseData)));
    } else {
      res.status(200).send(responseData);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: error });
  }
});

app.get("/kinks", async (req: Request, res: Response): Promise<void> => {
  const cacheKey = "kinks";

  try {
    const redisClient = await connectRedisClient();

    const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
      supabaseClient.from("kinks").select("*"),
    );

    res.status(200).send(responseData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: error });
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
  } else if (signal) {
    console.log(`stop (${signal})`);
  } else {
    console.log("stop");
  }

  if (server) {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    } catch (error: any) {
      process.exitCode = 1;
      console.error(error.message);
    }
  }

  console.log("Server stopped");
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  const port = process.env["PORT"] || "8080";
  await start(port);
}
