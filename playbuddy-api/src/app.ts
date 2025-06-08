import express, { Request, Response, NextFunction } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import cors from "cors";

// Import routes
import eventsRoute from './routes/events.js';
import kinksRoute from './routes/kinks.js';
import wishlistRoute from './routes/wishlist.js';
import communitiesRoute from './routes/communities.js';
import buddiesRoutes from './routes/buddies.js';
import profileRoutes from './routes/profile.js';
import personalizationRoutes from './routes/personalization.js';
import userEventsRoute from './routes/user_events.js';
import deepLinkRoute from './routes/deep_links.js';
import organizersRoute from './routes/organizers.js';
import promoCodesRoute from './routes/promo_codes.js';
import munchesRoute from './routes/munches.js'
export const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
}));

// Routes setup
app.use('/events', eventsRoute);
app.use('/kinks', kinksRoute);
app.use('/wishlist', wishlistRoute);
app.use('/communities', communitiesRoute);
app.use('/buddies', buddiesRoutes);
app.use('/profile', profileRoutes);
app.use('/personalization', personalizationRoutes);
app.use('/user_events', userEventsRoute);
app.use('/deep_links', deepLinkRoute);
app.use('/organizers', organizersRoute);
app.use('/promo_codes', promoCodesRoute);
app.use('/munches', munchesRoute);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

let server: Server;

export async function start(port: number | string): Promise<Server> {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      const address = server.address() as AddressInfo;
      console.log(`Listening on http://localhost:${address.port}`);
      resolve(server);
    });
  });
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  const port = process.env["PORT"] || "8080";

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  }).on('error', (err) => {
    console.error('Error:', err);

  }).on('close', () => {
    console.log('Server closed');
  });

  await start(port);
}
