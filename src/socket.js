import { io } from "socket.io-client";

const socket = io("http://10.71.27.158:5000");

export default socket;