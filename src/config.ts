// ID de cliente OAuth de tipo "Web" de tu proyecto de Google Cloud (ver README, apartado "Iniciar sesión con Google").
export const GOOGLE_WEB_CLIENT_ID = '1049628217007-lk4ii7osftbur6lm1b73pcl1cs41etqn.apps.googleusercontent.com';
// Archivos que la app guarda en la carpeta privada de la app en tu Google Drive (se mantienen los nombres de cuando
// la app se llamaba «Menú Nevera», para que siga encontrando tus copias).
export const CLOUD_FILE = 'menu-nevera.json';
export const CLOUD_BACKUP = 'menu-nevera-copia.json';
// Identificador del paquete Android (igual que android.package en app.json).
export const APP_ID = 'com.nevu.menu';
// Nevú Plus: pago único. El id tiene que ser igual que el del producto creado en Play Console → Monetizar → Productos
// integrados en la aplicación.
export const PLUS_ID = 'nevu_plus';
// Cuentas de Google que tienen Nevú Plus sin comprarlo: la cuenta de prueba que das a Google en Play Console →
// «Datos de inicio de sesión» (los revisores no pueden pagar). Escríbelas en minúsculas.
export const REVIEW_EMAILS = ['nevu.revision@gmail.com'];
