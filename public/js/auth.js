/* ============ AUTH: token storage, sign-in/register modal, timed trigger ============ */

const Auth = {
  getToken: () => localStorage.getItem('ed_token'),
  getUser: () => JSON.parse(localStorage.getItem('ed_user') || 'null'),
  isLoggedIn: () => !!Auth.getToken(),

  saveSession(token, user) {
    localStorage.setItem('ed_token', token);
    localStorage.setItem('ed_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('ed_token');
    localStorage.removeItem('ed_user');
    window.location.href = '/index.html';
  },

  async register({ name, email, password, phone }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || (data.errors && data.errors[0]?.msg) || 'Registration failed');
    Auth.saveSession(data.token, data.user);
    return data;
  },

  async login({ email, password }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    Auth.saveSession(data.token, data.user);
    return data;
  },

  authHeader() {
    const token = Auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};

/* ---------- Sign-in / Register Modal wiring (shared across all pages) ---------- */
function initAuthModal() {
  const overlay = document.getElementById('authOverlay');
  const modal = document.getElementById('authModal');
  if (!overlay || !modal) return;

  const openModal = () => { overlay.classList.add('open'); modal.classList.add('open'); };
  const closeModal = () => { overlay.classList.remove('open'); modal.classList.remove('open'); };

  document.getElementById('profileIconBtn')?.addEventListener('click', () => {
    if (Auth.isLoggedIn()) {
      window.location.href = Auth.getUser()?.role === 'admin' ? '/admin.html' : '/account.html';
    } else {
      openModal();
    }
  });
  document.getElementById('authModalClose')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Tab switching between Sign In / Register
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const formSignIn = document.getElementById('formSignIn');
  const formRegister = document.getElementById('formRegister');

  const showTab = (tab) => {
    const isSignIn = tab === 'signin';
    tabSignIn.classList.toggle('active', isSignIn);
    tabRegister.classList.toggle('active', !isSignIn);
    formSignIn.classList.toggle('tab-hidden', !isSignIn);
    formRegister.classList.toggle('tab-hidden', isSignIn);
  };
  tabSignIn?.addEventListener('click', () => showTab('signin'));
  tabRegister?.addEventListener('click', () => showTab('register'));

  formSignIn?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('signInError');
    errorEl.textContent = '';
    try {
      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;
      const data = await Auth.login({ email, password });
      window.location.href = data.redirectTo || '/index.html';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';
    try {
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const phone = document.getElementById('registerPhone').value;
      await Auth.register({ name, email, password, phone });
      window.location.href = '/index.html';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // Timed auto-trigger: 10-15s after landing, unless the flag is set or the user is logged in
  const AUTO_MODAL_FLAG = 'ed_authmodal_shown';
  if (!Auth.isLoggedIn() && !localStorage.getItem(AUTO_MODAL_FLAG)) {
    const delay = 10000 + Math.random() * 5000; // 10-15 seconds
    setTimeout(() => {
      // Don't interrupt if some other modal/drawer is already open
      if (!document.querySelector('.overlay.open')) {
        openModal();
        localStorage.setItem(AUTO_MODAL_FLAG, 'true');
      }
    }, delay);
  }

  window.EDAuthModal = { open: openModal, close: closeModal };
}

document.addEventListener('DOMContentLoaded', initAuthModal);
