// Arregla los avisos de Google Play Console al compilar (se ejecuta en «expo prebuild»):
//  1) Quita el servicio en primer plano de expo-audio (solo sirve para controles en la pantalla de bloqueo, que Nevú no usa).
//     Google avisa de que un servicio de este tipo, junto con un receptor BOOT_COMPLETED, falla en Android 15+.
//  2) Activa R8: ofusca y reduce el código (Play pide más de un 25 % de ofuscación) y quita recursos sin usar.
const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

const QUITAR_PERMISOS = ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'];

module.exports = (config) => {
  config = withAndroidManifest(config, (c) => {
    const m = c.modResults.manifest;
    m.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const quitar = (nombre) => ({ $: { 'android:name': nombre, 'tools:node': 'remove' } });
    m['uses-permission'] = (m['uses-permission'] || []).filter((p) => !QUITAR_PERMISOS.includes(p.$['android:name']));
    m['uses-permission'].push(...QUITAR_PERMISOS.map(quitar));
    const app = m.application[0];
    app.service = (app.service || []).filter((s) => !/AudioControlsService|AudioRecordingService/.test(s.$['android:name']));
    app.service.push(quitar('expo.modules.audio.service.AudioControlsService'));
    return c;
  });
  return withGradleProperties(config, (c) => {
    const pon = (key, value) => {
      c.modResults = c.modResults.filter((i) => i.key !== key);
      c.modResults.push({ type: 'property', key, value });
    };
    pon('android.enableMinifyInReleaseBuilds', 'true');
    pon('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return c;
  });
};
