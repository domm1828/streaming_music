import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    // El primer arranque de mongodb-memory-server puede descargar el binario de mongod.
    testTimeout: 20000,
    hookTimeout: 120000,
  },
  plugins: [
    // Compila TS con metadatos de decoradores para la DI de NestJS.
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
