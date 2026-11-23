import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { app as serverApp, migratePostgres as migrateDb } from "../server/vercel-bundle.mjs";

type BundleModule = {
  app: typeof serverApp;
  migratePostgres: typeof migrateDb;
};

let listener:
  | ((req: IncomingMessage, res: ServerResponse) => Promise<void>)
  | undefined;

function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://***");
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`API startup timed out after ${ms}ms`));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function start(): Promise<
  (req: IncomingMessage, res: ServerResponse) => Promise<void>
> {
  if (listener) return listener;
  const { app, migratePostgres } = (await import(
    "../server/vercel-bundle.mjs"
  )) as BundleModule;
  await withTimeout(migratePostgres(), 12_000);
  listener = getRequestListener(app.fetch as never);
  return listener;
}

export const config = { runtime: "nodejs" };

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const listen = await start();
    await listen(req, res);
  } catch (error) {
    console.error(error);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ error: "server_error", message: publicError(error) }),
    );
  }
}
