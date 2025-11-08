import 'dotenv/config';
// Debug print for GITHUB_TOKEN
console.log('DEBUG GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.slice(0, 4) + '...' : '<missing>');
import express, { type Request, Response, NextFunction } from "express";

// Debug: print whether critical env vars are present (masked) so we can diagnose startup issues
if (process.env.NODE_ENV === 'development') {
  const mask = (v?: string) => (v ? (v.length > 8 ? v.slice(0, 4) + '...' + v.slice(-4) : '****') : '<missing>');
  // eslint-disable-next-line no-console
  console.log(`env check: DATABASE_URL=${mask(process.env.DATABASE_URL)}, OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'set' : '<missing>'}`);
}
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOpts: any = { port, host: "0.0.0.0" };
  if (process.platform !== 'win32') {
    // reusePort isn't supported on Windows; only set when not on Windows
    listenOpts.reusePort = true;
  }

  server.listen(listenOpts, () => {
    log(`serving on port ${port}`);
  });
})();
