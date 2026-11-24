// meilisearch@0.63 solo expone tipos vía el campo `exports` (requiere
// moduleResolution node16+), pero este proyecto usa resolución clásica (Node)
// para la salida CommonJS de NestJS. Este shim reexporta los tipos reales desde
// el .d.ts empaquetado para que el import `from 'meilisearch'` tenga tipos.
declare module 'meilisearch' {
  export * from 'meilisearch/dist/index';
}
