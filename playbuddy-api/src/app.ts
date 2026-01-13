import express, { Router, RequestHandler } from "express";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import cors from "cors";
import bodyParser from "body-parser";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");


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
import facilitatorsRoute from './routes/facilitators.js'
import tagsRoute from './routes/tags.js'
import mediaRoute from './routes/media.js'
import marketingRoute from './routes/marketing.js'
import attendeesRoute from './routes/attendees.js'
import followsRoute from './routes/follows.js'
import classificationsRoute from './routes/classifications.js'
import visualizerRoute from './routes/visualizer.js'
import importSourcesRoute from './routes/import_sources.js'
import eventPopupsRoute from './routes/event_popups.js'
import pushNotificationsRoute from './routes/push_notifications.js'
import pushTokensRoute from './routes/push_tokens.js'
import branchStatsRoute from './routes/branch_stats.js'

console.log('API Started')

// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.2");
const release =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  process.env.HEROKU_SLUG_COMMIT ||
  `${(pkg as any).name}@${(pkg as any).version}`;
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  release,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.2,
});

export const app = express();

const wrapRouter = (router: Router | RequestHandler): RequestHandler => {
  return (req, res, next) => {
    try {
      const maybePromise = (router as any)(req, res, next);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};

app.get("/debug-sentry", function mainHandler() {
  throw new Error("My first Sentry error!");
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
}));

app.use((req, res, next) => {
  console.log(`[request] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes setup (wrapped to surface async errors)
app.use('/events', wrapRouter(eventsRoute));
app.use('/kinks', wrapRouter(kinksRoute));
app.use('/wishlist', wrapRouter(wishlistRoute));
app.use('/communities', wrapRouter(communitiesRoute));
app.use('/buddies', wrapRouter(buddiesRoutes));
app.use('/profile', wrapRouter(profileRoutes));
app.use('/personalization', wrapRouter(personalizationRoutes));
app.use('/user_events', wrapRouter(userEventsRoute));
app.use('/deep_links', wrapRouter(deepLinkRoute));
app.use('/organizers', wrapRouter(organizersRoute));
app.use('/promo_codes', wrapRouter(promoCodesRoute));
app.use('/munches', wrapRouter(munchesRoute));
app.use('/facilitators', wrapRouter(facilitatorsRoute));
app.use('/tags', wrapRouter(tagsRoute));
app.use('/media', wrapRouter(mediaRoute));
app.use('/marketing', wrapRouter(marketingRoute));
app.use('/attendees', wrapRouter(attendeesRoute));
app.use('/follows', wrapRouter(followsRoute));
app.use('/classifications', wrapRouter(classificationsRoute));
app.use('/visualizer', wrapRouter(visualizerRoute));
app.use('/import_sources', wrapRouter(importSourcesRoute));
app.use('/event_popups', wrapRouter(eventPopupsRoute));
app.use('/push_notifications', wrapRouter(pushNotificationsRoute));
app.use('/push_tokens', wrapRouter(pushTokensRoute));
app.use('/branch_stats', wrapRouter(branchStatsRoute));

// Log and return 404s for unmatched routes
app.use((req, res, next) => {
  if (res.headersSent) {
    return next();
  }
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found' });
});

// Sentry error handler should be before any other error middleware
Sentry.setupExpressErrorHandler(app);

// Global error handler to fail fast and surface an eventId when possible
app.use((err: any, req: any, res: any, next: any) => {
  const status = err?.statusCode || err?.status || 500;
  const shouldExposeDetails = (process.env.NODE_ENV || 'development') !== 'production';
  console.error('[api-error]', err);

  // Ensure the error is captured even if Sentry middleware missed it
  const eventId = typeof Sentry.captureException === 'function'
    ? Sentry.captureException(err)
    : (typeof Sentry.lastEventId === 'function' ? Sentry.lastEventId() : undefined);

  if (res.headersSent) {
    return next(err);
  }
  const payload: any = {
    error: err?.message || 'Internal Server Error',
    eventId,
    status,
  };
  if (shouldExposeDetails) {
    payload.name = err?.name;
    payload.stack = err?.stack;
    payload.details = err?.details || err?.data || undefined;
  }
  res.status(status).json(payload);
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
  }).on('unhandledRejection', (reason: any) => {
    console.error('Unhandled Rejection:', reason);
    throw reason;
  });

  await start(port);
}
