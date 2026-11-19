import { defineConfig } from 'vite';

export default defineConfig({
  // navegadores modernos: permite top-level await (usado al cargar el gato)
  build: { target: 'es2022' },
});
