const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes on local network for mobile phones (0.0.0.0)
    port: 5173,
    open: true,
  },
})