import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
    plugins: [crx({ manifest })],
    build: {
        target: 'esnext',
        sourcemap: true,
        rollupOptions: {
            input: {
                background: 'src/background.ts',
                options: 'src/options.html'
            }
        },
        minify: false,
    }
});
