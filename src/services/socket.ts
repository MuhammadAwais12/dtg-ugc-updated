import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Connects once and joins the creator's private room so they only receive
// their own approval/denial events.
export function connectCreatorSocket(creatorCode: string): Socket {
  if (!socket) {
    socket = io({ withCredentials: true });
  }
  if (socket.connected) {
    socket.emit("joinCreatorRoom", creatorCode);
  } else {
    socket.on("connect", () => socket?.emit("joinCreatorRoom", creatorCode));
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
