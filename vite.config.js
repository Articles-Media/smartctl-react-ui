import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'watch-server-changes',

      configureServer(server) {
        // Watch your backend server directory
        server.watcher.add('./routes/**/*');

        server.watcher.on('change', (file) => {

          console.log(`File changed: ${file}`);

          // Check if the modified file belongs to the server directory
          if (file.includes(`smartctl-react-ui\\routes\\`)) {
            console.log(`Server file changed: ${file}`);
            // Send a full page reload event to the browser
            server.hot.send({ type: 'full-reload' });
          }
        });
      },
      
    },
  ],
  server: { port: 3063, proxy: { '/api': 'http://localhost:3064' } }
})
