import Keycloak from 'keycloak-js';
import { tokenStorage } from './auth.util';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'shopquiet',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'shopquiet-mini-app',
});

function persistSession() {
  if (keycloak.token && keycloak.refreshToken) {
    tokenStorage.setTokens({ access_token: keycloak.token, refresh_token: keycloak.refreshToken });
    localStorage.setItem('keycloak_managed_session', 'true');
    localStorage.setItem('zalo_profile_custom', JSON.stringify({
      id: keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub,
      zaloId: keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub,
      name: keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'ShopQuiet member',
      avatar: '',
      role: keycloak.tokenParsed?.realm_access?.roles?.includes('admin') ? 'admin' : 'user',
    }));
  }
}

export async function initializeMiniAppKeycloak() {
  const authenticated = await keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });
  if (!authenticated) return false;
  persistSession();
  keycloak.onTokenExpired = () => void keycloak.updateToken(0).then(persistSession).catch(() => keycloak.login());
  setInterval(() => void keycloak.updateToken(70).then(persistSession).catch(() => keycloak.login()), 60000);
  return true;
}
