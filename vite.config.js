import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages sirve el sitio en /<repositorio>/; en desarrollo se usa la raíz
  base: command === 'build' ? '/gato-gamer-portfolio/' : '/',
  // navegadores modernos: permite top-level await (usado al cargar el gato)
  build: { target: 'es2022' },
}));
