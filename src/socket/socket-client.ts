import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Initialize the socket connection with the server
 * @param token - User authentication token
 * @returns The socket instance
 */
export const initializeSocket = (token: string): Socket => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
    auth: { token },
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
};

/**
 * Get the current socket instance
 * @returns The current socket instance or null if not initialized
 */
export const getSocket = (): Socket | null => socket;

/**
 * Close the socket connection
 */
export const closeSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
