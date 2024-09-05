import express, { Request, Response } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import process from "node:process";
import cors from "cors";

// Import routes
import eventsRoute from './routes/events.js';
import kinksRoute from './routes/kinks.js';

export const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// Routes setup
app.use('/events', eventsRoute); // For event-related routes
app.use('/kinks', kinksRoute);   // For kinks-related routes

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
