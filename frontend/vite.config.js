import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  // Treat .js files as JSX (the codebase uses .js with JSX)
  esbuild: {
    include: /src\/.*\.(js|jsx)$/,
    exclude: /node_modules/,
    loader: 'jsx',
    jsx: 'automatic'
  }
});
