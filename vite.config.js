import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(async (mode) => (
  {
  plugins: [
    solidPlugin(
      {
        ssr: false
      }
    )
  ],
  build: {

      target: 'esnext',
      polyfillDynamicImport: false,
      lib: {
        entry: './src/index.js',
        name: 'krestianstvo',
        fileName: (format) => `krestianstvo.${format}.js`
      },
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [
          "solid-js",
          "solid-js/web",
          "solid-js/store"
        ],
        output: {
          sourcemap: true,
          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            "solid-js": "solid-js",
            "solid-js/web": "solid-js/web",
            "solid-js/store": "solid-js/store"
          }
        }
      }
    }
}));
