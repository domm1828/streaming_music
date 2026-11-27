declare module 'ffprobe-static' {
  /** Ruta al binario estático de ffprobe para la plataforma actual. */
  const ffprobe: { path: string; version?: string };
  export default ffprobe;
}
