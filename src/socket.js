import { io } from "socket.io-client";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:5000`
    : "http://localhost:5000");

const socket = io(BACKEND_URL, {
  reconnectionAttempts: 5,
  timeout: 10000,
});

export default socket;