// Configuración de Expo: toma app.json y, al compilar en GitHub, pone el número de compilación (versionCode).
// Google Play exige que cada subida tenga un versionCode mayor que la anterior: el workflow lo pasa en VERSION_CODE.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Number(process.env.VERSION_CODE) || config.android.versionCode || 1 },
});
