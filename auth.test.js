const auth = require('./src/auth');

describe('Authentication Module', () => {
  let mockStorage;

  beforeEach(() => {
    // Create a mock storage for testing
    mockStorage = {
      store: {},
      getItem: jest.fn((key) => mockStorage.store[key] || null),
      setItem: jest.fn((key, value) => {
        mockStorage.store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete mockStorage.store[key];
      }),
      clear: jest.fn(() => {
        mockStorage.store = {};
      }),
    };

    // Set the mock storage
    auth._setStorage(mockStorage);
    mockStorage.clear();

    // Reset API base URL to default
    auth.setApiBaseUrl('http://127.0.0.1:3000');

    // Mock document
    document.body.innerHTML = `
      <button id="auth-action"></button>
      <span id="auth-status"></span>
    `;

    // Mock window.location
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    auth._resetStorage();
    mockStorage.clear();
  });

  describe('Storage Operations', () => {
    test('setAuthToken stores token and username', () => {
      auth.setAuthToken('test-token', 'testuser');
      expect(mockStorage.getItem('authToken')).toBe('test-token');
      expect(mockStorage.getItem('username')).toBe('testuser');
    });

    test('setAuthToken throws error if token is missing', () => {
      expect(() => auth.setAuthToken(null, 'testuser')).toThrow('Token and username are required');
    });

    test('setAuthToken throws error if username is missing', () => {
      expect(() => auth.setAuthToken('test-token', null)).toThrow('Token and username are required');
    });

    test('getAuthToken returns stored token', () => {
      auth.setAuthToken('test-token', 'testuser');
      expect(auth.getAuthToken()).toBe('test-token');
    });

    test('getAuthToken returns null when no token stored', () => {
      expect(auth.getAuthToken()).toBeNull();
    });

    test('getUsername returns stored username', () => {
      auth.setAuthToken('test-token', 'testuser');
      expect(auth.getUsername()).toBe('testuser');
    });

    test('getUsername returns null when no username stored', () => {
      expect(auth.getUsername()).toBeNull();
    });

    test('clearAuthToken removes token and username', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.clearAuthToken();
      expect(auth.getAuthToken()).toBeNull();
      expect(auth.getUsername()).toBeNull();
    });
  });

  describe('Authentication Status', () => {
    test('isAuthenticated returns true when token exists', () => {
      auth.setAuthToken('test-token', 'testuser');
      expect(auth.isAuthenticated()).toBe(true);
    });

    test('isAuthenticated returns false when token does not exist', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });

    test('isAuthenticated returns false after logout', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.clearAuthToken();
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('API URL Resolution', () => {
    test('apiUrl appends endpoint to base URL', () => {
      expect(auth.apiUrl('/api/auth/login')).toBe('http://127.0.0.1:3000/api/auth/login');
    });

    test('apiUrl returns absolute URLs unchanged', () => {
      expect(auth.apiUrl('https://example.com/api')).toBe('https://example.com/api');
    });

    test('apiUrl returns http URLs unchanged', () => {
      expect(auth.apiUrl('http://example.com/api')).toBe('http://example.com/api');
    });

    test('getApiBaseUrl returns current base URL', () => {
      expect(auth.getApiBaseUrl()).toBe('http://127.0.0.1:3000');
    });

    test('setApiBaseUrl updates base URL', () => {
      auth.setApiBaseUrl('https://api.example.com');
      expect(auth.getApiBaseUrl()).toBe('https://api.example.com');
      expect(auth.apiUrl('/auth/login')).toBe('https://api.example.com/auth/login');
    });

    test('setApiBaseUrl removes trailing slashes', () => {
      auth.setApiBaseUrl('https://api.example.com///');
      expect(auth.getApiBaseUrl()).toBe('https://api.example.com');
    });

    test('setApiBaseUrl ignores invalid input', () => {
      const original = auth.getApiBaseUrl();
      auth.setApiBaseUrl(null);
      expect(auth.getApiBaseUrl()).toBe(original);
      auth.setApiBaseUrl('');
      expect(auth.getApiBaseUrl()).toBe(original);
    });
  });

  describe('authFetch', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('authFetch includes auth headers when token exists', async () => {
      auth.setAuthToken('test-token', 'testuser');
      global.fetch.mockResolvedValueOnce({ ok: true });

      await auth.authFetch('/api/data');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    test('authFetch does not include auth headers when no token', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await auth.authFetch('/api/data');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    test('authFetch resolves API URL', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await auth.authFetch('/api/data');

      expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/api/data', expect.any(Object));
    });

    test('authFetch passes through options', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await auth.authFetch('/api/data', { method: 'POST', body: '{}' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/data',
        expect.objectContaining({
          method: 'POST',
          body: '{}',
        })
      );
    });

    test('authFetch merges custom headers', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await auth.authFetch('/api/data', { headers: { 'X-Custom': 'value' } });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('Navigation', () => {
    test('navigateTo changes window.location.href', () => {
      auth.navigateTo('/admin.html');
      expect(window.location.href).toBe('/admin.html');
    });

    test('navigateTo works with full URLs', () => {
      auth.navigateTo('https://example.com');
      expect(window.location.href).toBe('https://example.com');
    });
  });

  describe('Logout', () => {
    test('logout clears auth token and navigates to login', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.logout();

      expect(auth.isAuthenticated()).toBe(false);
      expect(window.location.href).toBe('login.html');
    });

    test('logout removes both token and username', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.logout();

      expect(auth.getAuthToken()).toBeNull();
      expect(auth.getUsername()).toBeNull();
    });
  });

  describe('requireAuth', () => {
    test('requireAuth redirects to login when not authenticated', () => {
      auth.requireAuth();
      expect(window.location.href).toBe('login.html');
    });

    test('requireAuth does not redirect when authenticated', () => {
      auth.setAuthToken('test-token', 'testuser');
      window.location.href = '';
      auth.requireAuth();
      expect(window.location.href).toBe('');
    });
  });

  describe('redirectAuthenticatedTo', () => {
    test('redirectAuthenticatedTo redirects when authenticated', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.redirectAuthenticatedTo('/admin.html');
      expect(window.location.href).toBe('/admin.html');
    });

    test('redirectAuthenticatedTo does not redirect when not authenticated', () => {
      window.location.href = '';
      auth.redirectAuthenticatedTo('/admin.html');
      expect(window.location.href).toBe('');
    });

    test('redirectAuthenticatedTo uses default path when not provided', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.redirectAuthenticatedTo();
      expect(window.location.href).toBe('index.html');
    });
  });

  describe('DOM Updates', () => {
    test('updateAuthStatus shows "logged on" when authenticated', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.updateAuthStatus();
      expect(document.getElementById('auth-status').textContent).toBe('logged on');
    });

    test('updateAuthStatus shows "logged off" when not authenticated', () => {
      auth.updateAuthStatus();
      expect(document.getElementById('auth-status').textContent).toBe('logged off');
    });

    test('updateAuthStatus does nothing if element missing', () => {
      document.body.innerHTML = '';
      expect(() => auth.updateAuthStatus()).not.toThrow();
    });

    test('updateAuthButton sets logout when authenticated', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.updateAuthButton();
      expect(document.getElementById('auth-action').textContent).toBe('Logout');
    });

    test('updateAuthButton sets login when not authenticated', () => {
      auth.updateAuthButton();
      expect(document.getElementById('auth-action').textContent).toBe('Login');
    });

    test('updateAuthButton does nothing if element missing', () => {
      document.body.innerHTML = '';
      expect(() => auth.updateAuthButton()).not.toThrow();
    });

    test('updateAuthButton removes old event listeners', () => {
      const button = document.getElementById('auth-action');
      const originalButton = button;
      auth.setAuthToken('test-token', 'testuser');
      auth.updateAuthButton();

      // The button should have been replaced to clear listeners
      const newButton = document.getElementById('auth-action');
      expect(newButton).not.toBe(originalButton);
    });
  });

  describe('initAuthUI', () => {
    test('initAuthUI updates both button and status', () => {
      auth.setAuthToken('test-token', 'testuser');
      auth.initAuthUI();

      expect(document.getElementById('auth-action').textContent).toBe('Logout');
      expect(document.getElementById('auth-status').textContent).toBe('logged on');
    });

    test('initAuthUI reflects not authenticated state', () => {
      auth.initAuthUI();

      expect(document.getElementById('auth-action').textContent).toBe('Login');
      expect(document.getElementById('auth-status').textContent).toBe('logged off');
    });
  });

  describe('Test Utilities', () => {
    test('_setStorage allows storage override', () => {
      const customStore = {};
      const customStorage = {
        getItem: (key) => customStore[key] || null,
        setItem: (key, value) => {
          customStore[key] = value;
        },
        removeItem: (key) => {
          delete customStore[key];
        },
        clear: () => {
          Object.keys(customStore).forEach(key => delete customStore[key]);
        },
      };
      auth._setStorage(customStorage);

      auth.setAuthToken('test-token', 'testuser');
      expect(auth.isAuthenticated()).toBe(true);
    });

    test('_resetStorage restores default storage', () => {
      auth._resetStorage();
      // Should not throw
      expect(() => auth.getAuthToken()).not.toThrow();
    });
  });
});
