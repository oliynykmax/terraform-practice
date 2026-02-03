import { Elysia } from "elysia";
import { spawn, type Subprocess } from "bun";

interface Session {
  process: Subprocess;
  lastActivity: number;
}

const sessions = new Map<string, Session>();
// Map WebSocket instances to session IDs
const wsToSession = new WeakMap<object, string>();

// Cleanup idle sessions after 10 minutes
const IDLE_TIMEOUT = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > IDLE_TIMEOUT) {
      console.log(`Killing idle session: ${id}`);
      session.process.kill();
      sessions.delete(id);
    }
  }
}, 60_000);

function createPythonProcess(): Subprocess {
  return spawn({
    cmd: ["python3", "-u", "-i"],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onData: (text: string) => void
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onData(decoder.decode(value));
    }
  } catch {
    // Stream closed
  }
}

const app = new Elysia()
  .get("/health", () => ({ status: "healthy" }))
  .ws("/ws", {
    open(ws) {
      const id = crypto.randomUUID();
      wsToSession.set(ws, id);

      const proc = createPythonProcess();
      sessions.set(id, { process: proc, lastActivity: Date.now() });

      console.log(`Session started: ${id}`);

      // Pipe stdout to WebSocket
      if (proc.stdout) {
        readStream(proc.stdout, (text) => {
          ws.send(JSON.stringify({ type: "stdout", data: text }));
        });
      }

      // Pipe stderr to WebSocket
      if (proc.stderr) {
        readStream(proc.stderr, (text) => {
          ws.send(JSON.stringify({ type: "stderr", data: text }));
        });
      }

      // Handle process exit
      proc.exited.then((code) => {
        ws.send(JSON.stringify({ type: "exit", code }));
        sessions.delete(id);
      });
    },

    message(ws, message) {
      const id = wsToSession.get(ws);
      if (!id) {
        ws.send(JSON.stringify({ type: "error", data: "Session not found" }));
        return;
      }

      const session = sessions.get(id);
      if (!session) {
        ws.send(JSON.stringify({ type: "error", data: "Session not found" }));
        return;
      }

      session.lastActivity = Date.now();

      try {
        const { code } = JSON.parse(message as string);
        if (code && session.process.stdin) {
          session.process.stdin.write(code + "\n");
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", data: "Invalid message format" }));
      }
    },

    close(ws) {
      const id = wsToSession.get(ws);
      if (!id) return;

      const session = sessions.get(id);
      if (session) {
        console.log(`Session ended: ${id}`);
        session.process.kill();
        sessions.delete(id);
      }
      wsToSession.delete(ws);
    },
  })
  .listen(4000);

console.log(`API server running on http://localhost:${app.server?.port}`);
