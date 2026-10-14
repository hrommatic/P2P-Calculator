#!/usr/bin/env node
import { spawn, spawnSync } from "child_process";
import net from "net";

const API_PORT = 3000;
const UI_PORT = 5173;
const apiBase = `http://127.0.0.1:${API_PORT}`;

function waitForPort(port, timeoutMs = 180_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Port ${port} did not open in time`));
          return;
        }
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

function freePort(port) {
  console.log(`Freeing port ${port} if needed…`);
  spawnSync("npx", ["--yes", "kill-port", String(port)], {
    shell: true,
    stdio: "inherit",
  });
}

freePort(API_PORT);
freePort(UI_PORT);

const env = {
  ...process.env,
  VERCEL_DEV_API_URL: apiBase,
};

console.log(`\nStarting API (Vercel) on ${apiBase}/api/…`);

const vercel = spawn(
  "npx",
  [
    "vercel",
    "dev",
    "--yes",
    "--listen",
    String(API_PORT),
    "--local-config",
    "vercel.dev.json",
  ],
  { shell: true, stdio: "inherit", env },
);

let vite;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  vite?.kill("SIGINT");
  vercel.kill("SIGINT");
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

vercel.on("exit", (code) => {
  if (!shuttingDown) shutdown(code ?? 1);
});

try {
  await waitForPort(API_PORT);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  shutdown(1);
}

freePort(UI_PORT);

console.log(`\nStarting UI (Vite) on http://localhost:${UI_PORT}/`);
console.log(`Open http://localhost:${UI_PORT}/ in the browser.\n`);

vite = spawn("npm", ["run", "dev"], { shell: true, stdio: "inherit", env });

vite.on("exit", (code) => {
  if (!shuttingDown) shutdown(code ?? 1);
});
