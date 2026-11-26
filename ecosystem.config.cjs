// PM2 — corre la API NestJS en el host del VPS (fuera de Docker).
// La API lee su configuración del archivo .env en la raíz del repo
// (ConfigModule envFilePath: ['.env', '../../.env']).
//
// Uso:
//   npm ci
//   npm run build -w @stream-music/shared && npm run build -w @stream-music/api
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup   # arranque en el boot
//
// `cwd` apunta a la carpeta de este archivo (la raíz del repo), sea cual sea la
// ruta donde lo clonaste. Así la API encuentra su .env sin editar nada acá.
module.exports = {
  apps: [
    {
      name: 'stream-music-api',
      script: 'apps/api/dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      restart_delay: 2000,
      time: true, // timestamps en los logs
    },
  ],
};
