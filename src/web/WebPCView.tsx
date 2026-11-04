// src/web/WebPCView.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';

const WORKER_URL = "https://nevu-validator.cristian44137.workers.dev";
const GOOGLE_WEB_CLIENT_ID = "1049628217007-2ulahpaha3in99rs2k45mjrpqlns7qvq.apps.googleusercontent.com"; 

const img1 = require('../../play-store/captura-1-presentacion.png');
const img2 = require('../../play-store/captura-2-menu.png');
const img3 = require('../../play-store/captura-3-receta.png');
const img4 = require('../../play-store/captura-4-compra.png');
const img5 = require('../../play-store/captura-5-despensa.png');
const img6 = require('../../play-store/captura-6-tu.png');
const img7 = require('../../play-store/captura-7-plus.png');
const img8 = require('../../play-store/captura-8-oscuro.png');
const favicon = require('../../play-store/icono-512.png');

function NevuPlusBadge() {
  return (
    <View style={styles.badgeContainer}>
      <View style={styles.badgeIconWrapper}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="1" y="1" width="42" height="42" rx="12" fill="#0B132B" stroke="url(#borderGrad)" strokeWidth="2" />
          <g transform="translate(10, 10)">
            <path d="M4 20v-7M4 15.5a4.5 4.5 0 0 1 9 0V20" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M12 9c0-2.8 1.7-4.7 4.4-5.5.3 2.8-1.4 4.8-4.4 5.5z" fill="#2FC79A"/>
            <path d="M19 14v6M16 17h6" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <defs>
            <linearGradient id="borderGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8"/>
              <stop offset="0.5" stopColor="#3B82F6"/>
              <stop offset="1" stopColor="#8B5CF6"/>
            </linearGradient>
          </defs>
        </svg>
      </View>

      <View style={styles.badgeTextWrapper}>
        <Text style={styles.badgeTitle}>Nevú Plus</Text>
        <Text style={styles.badgePrice}>Pago único de 3,99 €, para siempre.</Text>
        <Text style={styles.badgeSubtitle}>Sin suscripción.</Text>
      </View>
    </View>
  );
}

export default function WebPCView() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [waitingForDrive, setWaitingForDrive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncData, setSyncData] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string; picture?: string } | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        document.title = "Nevú Desktop";
        const existingLink = document.querySelector("link[rel*='icon']");
        let link: HTMLLinkElement = (existingLink as HTMLLinkElement) || document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        const faviconUrl = typeof favicon === 'object' && favicon !== null ? (favicon.uri || favicon.default) : favicon;
        if (faviconUrl) {
          link.href = faviconUrl;
          if (!existingLink) document.head.appendChild(link);
        }
      } catch (e) {
        console.warn("Favicon load error:", e);
      }

      if (!document.getElementById('nevu-web-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'nevu-web-styles';
        styleEl.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Nunito:wght@400;500;600;700&display=swap');
          * { font-family: 'Nunito', -apple-system, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes scrollInfiniteUp { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
          @keyframes scrollInfiniteDown { 0% { transform: translateY(-50%); } 100% { transform: translateY(0); } }
          @keyframes entranceFadeScale { 0% { opacity: 0; transform: scale(0.95) translateY(24px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
          .nevu-col-scroll-up { animation: scrollInfiniteUp 65s linear infinite; will-change: transform; }
          .nevu-col-scroll-down { animation: scrollInfiniteDown 58s linear infinite; will-change: transform; }
          .nevu-col-scroll-up:hover, .nevu-col-scroll-down:hover { animation-play-state: paused; }
          .nevu-card-entrance { animation: entranceFadeScale 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          :root {
            --bg-base: #060A14;
            --bg-gradient: radial-gradient(circle at 50% 35%, #1D4ED8 0%, #0B1120 55%, #04070E 90%);
            --card-bg: rgba(11, 17, 31, 0.96);
            --card-border: rgba(147, 197, 253, 0.25);
            --text-main: #FFFFFF;
            --text-sub: #94A3B8;
            --overlay-shading: rgba(6, 10, 18, 0.32);
          }
        `;
        document.head.appendChild(styleEl);
      }
    }

    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      const savedToken = localStorage.getItem('nevu_desktop_token');
      const savedEmail = localStorage.getItem('nevu_desktop_email');
      const savedName = localStorage.getItem('nevu_desktop_name');
      const savedPic = localStorage.getItem('nevu_desktop_pic');

      if (savedToken) {
        if (savedEmail) setUserInfo({ email: savedEmail, name: savedName || undefined, picture: savedPic || undefined });
        procesarTokenGoogle(savedToken, true);
      } else {
        setCheckingSession(false);
      }
    }
  }, []);

  const fetchGoogleUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data && data.email) {
        setUserInfo({ email: data.email, name: data.name, picture: data.picture });
        localStorage.setItem('nevu_desktop_email', data.email);
        if (data.name) localStorage.setItem('nevu_desktop_name', data.name);
        if (data.picture) localStorage.setItem('nevu_desktop_pic', data.picture);
      }
    } catch (err) {
      console.warn("No se pudo obtener la información del usuario de Google", err);
    }
  };

  const procesarTokenGoogle = async (accessToken: string, isAutoLogin: boolean = false) => {
    setLoading(true);
    setErrorMessage(null);
    setWaitingForDrive(false);
    
    // Obtener datos del perfil de Google al instante
    await fetchGoogleUserInfo(accessToken);

    try {
      const findRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='nevu-sync-v1.json'",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (findRes.status === 401) {
        handleLogout();
        throw new Error("La sesión ha expirado. Por favor, vuelve a iniciar sesión.");
      }

      const findData = await findRes.json();
      const file = findData.files?.[0];

      if (!file) {
        localStorage.setItem('nevu_desktop_token', accessToken);
        setWaitingForDrive(true);
        setLoading(false);
        setCheckingSession(false);
        return;
      }

      const mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const snapshot = await mediaRes.json();

      if (!snapshot.purchaseToken) {
        throw new Error("No se detectó un recibo de Nevú Plus válido en tus datos guardados.");
      }

      const workerRes = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseToken: snapshot.purchaseToken }),
      });
      const workerData = await workerRes.json();

      if (workerData.valid) {
        localStorage.setItem('nevu_desktop_token', accessToken);
        setSyncData(snapshot);
        setWaitingForDrive(false);
      } else {
        throw new Error("El recibo de compra de Google Play no es válido o ha expirado.");
      }
    } catch (e: any) {
      if (!isAutoLogin) {
        setErrorMessage(e?.message || "Ocurrió un error al verificar la suscripción.");
      } else {
        localStorage.removeItem('nevu_desktop_token');
      }
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      //@ts-ignore
      if (window.google) {
        //@ts-ignore
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_WEB_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              procesarTokenGoogle(tokenResponse.access_token, false);
            } else {
              setLoading(false);
              setErrorMessage("No se pudo autorizar el acceso a Google Drive.");
            }
          },
        });
        client.requestAccessToken();
      } else {
        setLoading(false);
        setErrorMessage("El servicio de Google no está listo todavía. Recarga la página.");
      }
    } catch (e: any) {
      setLoading(false);
      setErrorMessage(e?.message || "Error al iniciar sesión con Google.");
    }
  };

  const handleRetryDrive = () => {
    const token = localStorage.getItem('nevu_desktop_token');
    if (token) {
      procesarTokenGoogle(token, false);
    } else {
      window.location.reload();
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nevu_desktop_token');
      localStorage.removeItem('nevu_desktop_email');
      localStorage.removeItem('nevu_desktop_name');
      localStorage.removeItem('nevu_desktop_pic');
    }
    setSyncData(null);
    setWaitingForDrive(false);
    setErrorMessage(null);
    setUserInfo(null);
  };

  const col1Images = [img1, img2, img3, img4, img5, img6, img7, img8, img1, img2, img3, img4];
  const col2Images = [img5, img6, img7, img8, img1, img2, img3, img4, img5, img6, img7, img8];
  const col3Images = [img3, img4, img1, img2, img7, img8, img5, img6, img3, img4, img1, img2];
  const col4Images = [img7, img8, img5, img6, img3, img4, img1, img2, img7, img8, img5, img6];

  if (checkingSession) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={{ color: '#94A3B8', marginTop: 16, fontSize: 14, fontWeight: '600' }}>Iniciando Nevú Desktop...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />

      {/* Carrusel Inmersivo */}
      <View style={styles.mosaicGrid}>
        {/* @ts-ignore */}
        <div className="nevu-col-scroll-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, paddingInline: '12px' }}>
          {col1Images.map((img, i) => (
            <View key={`c1-${i}`} style={styles.phoneFrame}>
              <Image source={img} style={styles.phoneImage} />
            </View>
          ))}
        </div>
        {/* @ts-ignore */}
        <div className="nevu-col-scroll-down" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, paddingInline: '12px' }}>
          {col2Images.map((img, i) => (
            <View key={`c2-${i}`} style={styles.phoneFrame}>
              <Image source={img} style={styles.phoneImage} />
            </View>
          ))}
        </div>
        {/* @ts-ignore */}
        <div className="nevu-col-scroll-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, paddingInline: '12px' }}>
          {col3Images.map((img, i) => (
            <View key={`c3-${i}`} style={styles.phoneFrame}>
              <Image source={img} style={styles.phoneImage} />
            </View>
          ))}
        </div>
        {/* @ts-ignore */}
        <div className="nevu-col-scroll-down" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, paddingInline: '12px' }}>
          {col4Images.map((img, i) => (
            <View key={`c4-${i}`} style={styles.phoneFrame}>
              <Image source={img} style={styles.phoneImage} />
            </View>
          ))}
        </div>
      </View>

      <View style={styles.overlayShading} />

      {/* Tarjeta Central */}
      {/* @ts-ignore */}
      <div className="nevu-card-entrance" style={{ width: '100%', maxWidth: 450, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 74 352 128" width="170" height="58">
              <defs>
                <linearGradient id="hojaMain" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#2FC79A"/><stop offset="1" stopColor="#8BF0CF"/>
                </linearGradient>
              </defs>
              <g fill="none" stroke="var(--logo-stroke, #FFFFFF)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0 128 V192 M0 158 A30 30 0 0 1 60 158 V192"/>
                <path d="M92 160 H156 A32 32 0 1 0 147 183"/>
                <path d="M184 128 C192 158 200 192 214 192 C228 192 236 158 244 128"/>
                <path d="M272 128 V162 A30 30 0 0 0 332 162 M332 128 V192"/>
              </g>
              <path d="M296 118 C296 100 306 86 324 80 C326 98 316 112 296 118 Z" fill="url(#hojaMain)"/>
              <path d="M298 116 L318 88" stroke="#1E9C78" strokeWidth="1.6" strokeLinecap="round" opacity=".6"/>
            </svg>
          </View>

          <NevuPlusBadge />

          {/* Componente elegante de cuenta conectada */}
          {userInfo && userInfo.email && (
            <View style={styles.accountBadge}>
              {userInfo.picture ? (
                <Image source={{ uri: userInfo.picture }} style={styles.accountAvatar} />
              ) : (
                <View style={styles.accountAvatarPlaceholder}>
                  <Text style={styles.accountAvatarText}>{userInfo.email.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Sesión iniciada como</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{userInfo.email}</Text>
              </View>
            </View>
          )}

          {syncData ? (
            <>
              <Text style={styles.title}>¡Nevú Desktop Activo!</Text>
              <Text style={styles.subtitle}>Tus menús, recetas y despensa están sincronizados correctamente.</Text>
              <View style={styles.successBox}>
                <View style={styles.blueDot} />
                <Text style={styles.successText}>Suscripción verificada · Google Drive</Text>
              </View>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </Pressable>
            </>
          ) : waitingForDrive ? (
            <>
              <Text style={styles.title}>Esperando copia</Text>
              <Text style={styles.subtitle}>
                La sesión está activa, pero aún no encontramos la copia de seguridad en tu Google Drive.
              </Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>📱 Realiza una copia de seguridad desde tu app móvil Android (en Ajustes) y pulsa comprobar.</Text>
              </View>

              <Pressable 
                style={({ hovered }: any) => [styles.googleButton, hovered && styles.googleButtonHover]} 
                onPress={handleRetryDrive}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1565C0" />
                ) : (
                  <Text style={styles.actionButtonText}>Comprobar de nuevo</Text>
                )}
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Iniciar sesión</Text>
              <Text style={styles.subtitle}>
                Conecta tu cuenta de Google para verificar tu suscripción de Nevú Plus y sincronizar tu planificador culinario.
              </Text>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable 
                style={({ hovered }: any) => [styles.googleButton, hovered && styles.googleButtonHover]} 
                onPress={handleGoogleLogin} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1565C0" />
                ) : (
                  <View style={styles.buttonContent}>
                    <View style={styles.googleIconWrapper}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.18 21.31 7.27 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.19C.43 8.15 0 9.88 0 12s.43 3.85 1.19 5.39l4.08-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.18 2.69 1.19 6.61l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                      </svg>
                    </View>
                    <Text style={styles.googleButtonText}>Continuar con Google</Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.footerNote}>Sincronización segura mediante Google Drive</Text>
            </>
          )}
        </View>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'var(--bg-base, #060A14)' as any, 
    padding: 24, 
    minHeight: '100vh' as any,
    position: 'relative',
    overflow: 'hidden'
  },
  backgroundGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'var(--bg-base, #060A14)' as any,
    backgroundImage: 'var(--bg-gradient, radial-gradient(circle at 50% 35%, #1D4ED8 0%, #0B1120 55%, #04070E 90%))' as any,
    pointerEvents: 'none' as any,
  },
  mosaicGrid: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.98,
    pointerEvents: 'none' as any,
    zIndex: 1,
    overflow: 'visible',
  },
  phoneFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.1)',
  },
  phoneImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  overlayShading: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'var(--overlay-shading, rgba(6, 10, 18, 0.32))' as any,
    backdropFilter: 'blur(1px)' as any,
    pointerEvents: 'none' as any,
    zIndex: 1,
  } as any,
  card: { 
    width: '100%', 
    maxWidth: 450, 
    paddingHorizontal: 38,
    paddingVertical: 40,
    backgroundColor: 'var(--card-bg, rgba(11, 17, 31, 0.96))' as any, 
    borderRadius: 28, 
    alignItems: 'center', 
    borderWidth: 1.5,
    borderColor: 'var(--card-border, rgba(147, 197, 253, 0.25))' as any,
    shadowColor: '#1E40AF', 
    shadowOffset: { width: 0, height: 24 }, 
    shadowOpacity: 0.38, 
    shadowRadius: 52,
    zIndex: 2,
    backdropFilter: 'blur(28px)' as any,
  } as any,
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B132B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 18,
    gap: 14,
    width: '100%',
    boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.4)' as any,
  },
  badgeIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    fontFamily: 'Manrope, sans-serif',
    letterSpacing: -0.2
  },
  badgePrice: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.15)',
    marginBottom: 20,
    width: '100%',
    gap: 10
  },
  accountAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  accountAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  accountInfo: {
    flex: 1
  },
  accountLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  accountEmail: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700'
  },
  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: 'var(--text-main, #FFFFFF)' as any, 
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
    fontFamily: 'Manrope, sans-serif'
  },
  subtitle: { 
    fontSize: 14.5, 
    color: 'var(--text-sub, #94A3B8)' as any, 
    textAlign: 'center', 
    marginBottom: 26, 
    lineHeight: 22 
  },
  googleButton: { 
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 16, 
    borderRadius: 15, 
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  googleButtonHover: {
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0.26,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleIconWrapper: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  googleButtonText: { 
    color: '#0F172A', 
    fontSize: 15.5, 
    fontWeight: '700',
    letterSpacing: -0.2
  },
  actionButtonText: {
    color: '#0F172A', 
    fontSize: 15.5, 
    fontWeight: '700',
    letterSpacing: -0.2
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20
  },
  errorText: { 
    color: '#EF4444', 
    fontSize: 13.5, 
    textAlign: 'center', 
    fontWeight: '500',
    lineHeight: 18
  },
  infoBox: {
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 22
  },
  infoText: {
    color: '#38BDF8',
    fontSize: 13.5,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)', 
    borderRadius: 14, 
    marginTop: 16, 
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    width: '100%'
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8
  },
  successText: { 
    color: '#10B981', 
    fontSize: 13.5, 
    fontWeight: '600' 
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B'
  },
  logoutText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  footerNote: {
    fontSize: 12,
    color: 'var(--text-sub, #64748B)' as any,
    marginTop: 22,
    textAlign: 'center',
    fontWeight: '500'
  }
});