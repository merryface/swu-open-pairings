// Storage keys
const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USERNAME_KEY = 'username';

// API configuration
let API_BASE_URL = 'http://127.0.0.1:3000';

// Initialize from window if available (allows override)
if (typeof window !== 'undefined' && window.SWU?.API_BASE_URL) {
  API_BASE_URL = window.SWU.API_BASE_URL;
}

// Storage abstraction layer - allows mocking in tests
const createStorage = (source = typeof window !== 'undefined' ? window.sessionStorage : null) => ({
  getItem: (key) => source?.getItem(key) ?? null,
  setItem: (key, value) => source?.setItem(key, value),
  removeItem: (key) => source?.removeItem(key),
  clear: () => source?.clear(),
});

let storage = createStorage();

// Pure functions for auth state management
const isAuthenticated = () => !!storage.getItem(AUTH_TOKEN_KEY);
const getAuthToken = () => storage.getItem(AUTH_TOKEN_KEY);
const getUsername = () => storage.getItem(AUTH_USERNAME_KEY);
const isMerryface = () => getUsername() === 'merryface';

const setAuthToken = (token, username) => {
  if (!token || !username) {
    throw new Error('Token and username are required');
  }
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USERNAME_KEY, username);
};

const clearAuthToken = () => {
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_USERNAME_KEY);
};

// API URL resolution
const getApiBaseUrl = () => API_BASE_URL;

const setApiBaseUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return;
  API_BASE_URL = url.trim().replace(/\/+$/, '');
};

const apiUrl = (endpoint) => {
  if (typeof endpoint !== 'string') return endpoint;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  return `${API_BASE_URL}${endpoint}`;
};

// Fetch wrapper with auth headers
const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resolvedUrl = apiUrl(url);
  const fetchOptions = {
    ...options,
    headers,
  };

  console.log('[authFetch] Request:', {
    url: resolvedUrl,
    method: fetchOptions.method || 'GET',
    headers: fetchOptions.headers,
    body: fetchOptions.body ? JSON.parse(fetchOptions.body) : undefined,
  });

  const response = await fetch(resolvedUrl, fetchOptions);

  console.log('[authFetch] Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers ? Object.fromEntries(response.headers.entries?.() || []) : undefined,
  });

  return response;
};

// Navigation helpers (side effects)
const navigateTo = (path) => {
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
};

const logout = () => {
  clearAuthToken();
  navigateTo('login.html');
};

const requireAuth = () => {
  if (!isAuthenticated()) {
    navigateTo('login.html');
  }
};

const redirectAuthenticatedTo = (defaultPath = 'index.html') => {
  if (isAuthenticated()) {
    navigateTo(defaultPath);
  }
};

// DOM manipulation helpers
const updateAuthButton = () => {
  const button = document.getElementById('auth-action');
  if (!button) return;

  // Remove existing listener by cloning to avoid multiple handlers
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);

  if (isAuthenticated()) {
    newButton.textContent = 'Logout';
    newButton.addEventListener('click', logout);
  } else {
    newButton.textContent = 'Login';
    newButton.addEventListener('click', () => navigateTo('login.html'));
  }
};

const updateAuthStatus = () => {
  const statusEl = document.getElementById('auth-status');
  if (statusEl) {
    statusEl.textContent = isAuthenticated() ? 'logged on' : 'logged off';
  }
};

const initAuthUI = () => {
  updateAuthButton();
  updateAuthStatus();
};

// Test utilities (for testing only)
const _setStorage = (mockStorage) => {
  storage = mockStorage;
};

const _resetStorage = () => {
  storage = createStorage();
};

// Export for both browser and Node.js
if (typeof window !== 'undefined') {
  window.SWU = window.SWU || {};
  window.SWU.Auth = {
    isAuthenticated,
    getAuthToken,
    getUsername,
    isMerryface,
    setAuthToken,
    clearAuthToken,
    logout,
    authFetch,
    requireAuth,
    redirectAuthenticatedTo,
    initAuthUI,
    updateAuthButton,
    updateAuthStatus,
    apiUrl,
    getApiBaseUrl,
    setApiBaseUrl,
    navigateTo,
    _setStorage,
    _resetStorage,
  };
  console.log('[Auth] Module loaded and registered on window.SWU.Auth');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isAuthenticated,
    getAuthToken,
    getUsername,
    isMerryface,
    setAuthToken,
    clearAuthToken,
    logout,
    authFetch,
    requireAuth,
    redirectAuthenticatedTo,
    initAuthUI,
    updateAuthButton,
    updateAuthStatus,
    apiUrl,
    getApiBaseUrl,
    setApiBaseUrl,
    navigateTo,
    _setStorage,
    _resetStorage,
    createStorage,
  };
}
