import { spawn, type ChildProcess } from "node:child_process";

const DEFAULT_BASE_URL = "http://localhost:3000";

const TEST_BASE_URL = "http://localhost:3100";

const READY_PATH = "/api/auth/me";

const probe = async (
  baseUrl: string,
  timeoutMs: number,
): Promise<boolean> => {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const response = await fetch(
      `${baseUrl}${READY_PATH}`,
      {
        signal: controller.signal,
      },
    );

    /*
     * Any HTTP response (including 401) means the
     * server is up and routes are compiling.
     */
    return response.status < 600;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const waitForServer = async (
  baseUrl: string,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await probe(baseUrl, 2_000)) {
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500),
    );
  }

  throw new Error(
    `Server at ${baseUrl} did not become ready within ${timeoutMs}ms.`,
  );
};

export default async function globalSetup(): Promise<() => Promise<void>> {
  let baseUrl = process.env.TEST_BASE_URL ?? DEFAULT_BASE_URL;

  let child: ChildProcess | null = null;

  const serverWasReachable = await probe(
    baseUrl,
    2_000,
  );

  if (!serverWasReachable) {
    baseUrl = TEST_BASE_URL;

    process.stdout.write(
      `No server reachable at ${process.env.TEST_BASE_URL ?? DEFAULT_BASE_URL}; starting next dev on ${baseUrl}...\n`,
    );

    child = spawn(
      "pnpm",
      ["next", "dev", "--port", "3100"],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
        detached: true,
      },
    );

    await waitForServer(baseUrl, 120_000);
  } else {
    await waitForServer(baseUrl, 120_000);
  }

  process.env.TEST_BASE_URL = baseUrl;

  return async () => {
    if (child === null) {
      return;
    }

    /*
     * Detached process group: kill the whole group so
     * next's child processes do not leak.
     */
    try {
      process.kill(-child.pid!, "SIGTERM");
    } catch {
      /* already gone */
    }

    const exited = new Promise<void>((resolve) => {
      child!.on("exit", () => resolve());
    });

    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          process.kill(-child!.pid!, "SIGKILL");
        } catch {
          /* already gone */
        }

        resolve();
      }, 10_000);
    });

    await Promise.race([exited, timeout]);
  };
}
