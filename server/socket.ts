import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("joinCreatorRoom", (creatorCode: string) => {
      if (typeof creatorCode === "string" && creatorCode.trim()) {
        socket.join(`creator:${creatorCode.trim().toUpperCase()}`);
      }
    });
  });

  return io;
}

// Pushes a real-time event to a specific creator's browser session(s), if connected.
// No-ops silently if socket.io hasn't been initialized (e.g. serverless invocation).
export function emitToCreator(creatorCode: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`creator:${creatorCode.trim().toUpperCase()}`).emit(event, payload);
}
