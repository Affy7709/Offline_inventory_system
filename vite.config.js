import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // Generates a self-signed SSL cert for local testing
  ],
  server: {
    host: "0.0.0.0", // required so the phone on the hotspot can reach this dev server
    port: 5173,
    https: true // Enable HTTPS
  },
});
