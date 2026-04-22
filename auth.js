const DASH_AUTH_STORAGE_KEY = 'dashboard_auth_session';

function getAuthSession() {
  try {
    const raw = sessionStorage.getItem(DASH_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  const session = getAuthSession();
  return !!(session && session.logado);
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem(DASH_AUTH_STORAGE_KEY);
  window.location.href = 'login.html';
}

function applyAuthUserInfo() {
  const session = getAuthSession();
  if (!session) return;

  const userNameEls = document.querySelectorAll('[data-auth="nome"]');
  const userPerfilEls = document.querySelectorAll('[data-auth="perfil"]');
  const userUsuarioEls = document.querySelectorAll('[data-auth="usuario"]');

  userNameEls.forEach(el => el.textContent = session.nome || '');
  userPerfilEls.forEach(el => el.textContent = session.perfil || '');
  userUsuarioEls.forEach(el => el.textContent = session.usuario || '');
}

document.addEventListener('DOMContentLoaded', () => {
  const protectedPage = document.body.dataset.protected === 'true';

  if (protectedPage) {
    if (!requireAuth()) return;
    applyAuthUserInfo();
  }

  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});