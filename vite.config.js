import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    watch: {
      // Don't watch the public folder — static assets (audio, images, models)
      // can be locked by the OS/browser on Windows, causing EBUSY crashes.
      ignored: ['**/public/**'],
    },
  },
})
