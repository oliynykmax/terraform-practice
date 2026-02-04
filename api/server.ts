import { spawn, type Subprocess, type ServerWebSocket } from "bun";

interface Session {
  process: Subprocess;
  lastActivity: number;
}

interface WSData {
  sessionId: string;
}

const sessions = new Map<string, Session>();
const IDLE_TIMEOUT = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > IDLE_TIMEOUT) {
      console.log(`[log] Killing idle session: ${id}`);
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

async function pipeStream(
  stream: ReadableStream<Uint8Array>,
  ws: ServerWebSocket<WSData>,
  type: "stdout" | "stderr"
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ws.send(JSON.stringify({ type, data: decoder.decode(value) }));
    }
  } catch {}
}

const server = Bun.serve<WSData>({
  port: 4000,
  
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "healthy" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    if (url.pathname === "/ws") {
      const sessionId = crypto.randomUUID();
      const upgraded = server.upgrade(req, { data: { sessionId } });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    
    return new Response("Not found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      const { sessionId } = ws.data;
      const proc = createPythonProcess();
      sessions.set(sessionId, { process: proc, lastActivity: Date.now() });

      console.log(`[log] Session started: ${sessionId}`);

      if (proc.stdout) pipeStream(proc.stdout, ws, "stdout");
      if (proc.stderr) pipeStream(proc.stderr, ws, "stderr");
      
      proc.exited.then((code) => {
        ws.send(JSON.stringify({ type: "exit", code }));
        sessions.delete(sessionId);
      });
    },
    
    message(ws, message) {
      const { sessionId } = ws.data;
      const session = sessions.get(sessionId);
      
      if (!session) {
        ws.send(JSON.stringify({ type: "error", data: "Session not found" }));
        return;
      }
      
      session.lastActivity = Date.now();
      
      try {
        const msg = typeof message === "string" ? message : new TextDecoder().decode(message);
        const { code } = JSON.parse(msg);
        if (code && session.process.stdin) {
          session.process.stdin.write(code + "\n");
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", data: "Invalid message format" }));
      }
    },
    
    close(ws) {
      const { sessionId } = ws.data;
      const session = sessions.get(sessionId);
      if (session) {
        console.log(`[log] Session ended: ${sessionId}`);
        session.process.kill();
        sessions.delete(sessionId);
      }
    },
  },
});

console.log(`API server running on http://localhost:${server.port}`);
