'use client';

import { FormEvent, useEffect, useState } from 'react';

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  assigned_roles: string[];
  is_active: boolean;
  mfa_enabled: boolean;
  personal_settings: Record<string, string>;
};

type BankProvider = {
  code: string;
  name: string;
  category: string;
  supports_securities: boolean;
  supports_crypto: boolean;
  supports_cash: boolean;
  status: string;
  onboarding_hint: string;
};

type DashboardData = {
  portfolio_id: string;
  portfolio_name: string;
  total_value: string;
  cash_balance: string;
  pnl_realized: string;
  pnl_unrealized: string;
  annualized_return: number;
  rolling_volatility: number;
  max_drawdown: number;
  is_empty: boolean;
  key_indicators: Array<{ label: string; value: string; trend: string }>;
  sector_heatmap: Array<{ sector: string; weight: number; pnl: number }>;
  allocation: Array<{ class: string; weight: number }>;
  recent_flows: Array<{ date: string; type: string; amount: number }>;
  suggestions: Array<{ title: string; score: number; justification: string }>;
  bank_connectors: BankProvider[];
  connected_accounts: Array<{ provider_name: string; status: string; account_label?: string | null }>;
  next_steps: string[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  mfa_required: boolean;
  user?: UserProfile;
  detail?: unknown;
};

type PasswordResetResponse = {
  message: string;
  reset_token?: string | null;
  detail?: unknown;
};

type AuditEntry = {
  id: string;
  actor_id: string;
  event_type: string;
  severity: string;
  ip_address?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type OAuthProvider = {
  provider: string;
  enabled: boolean;
};

const ACCESS_TOKEN_KEY = 'picsou_access_token';
const REFRESH_TOKEN_KEY = 'picsou_refresh_token';
const SESSION_LAST_ACTIVITY_AT_KEY = 'picsou_session_last_activity_at';
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

function apiUrl(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const candidate = payload as { detail?: unknown };
  if (typeof candidate.detail === 'string') {
    return candidate.detail;
  }
  if (Array.isArray(candidate.detail)) {
    return candidate.detail
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }
        if (entry && typeof entry === 'object') {
          const item = entry as { msg?: unknown; loc?: unknown };
          const msg = typeof item.msg === 'string' ? item.msg : 'Champ invalide';
          const loc = Array.isArray(item.loc) ? item.loc.map(String).join(' > ') : '';
          return loc ? `${loc}: ${msg}` : msg;
        }
        return 'Champ invalide';
      })
      .join(' | ');
  }
  return fallback;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function hasAdminRole(user: UserProfile | null) {
  return !!user && user.assigned_roles.includes('admin');
}

function defaultSettingsFromUser(user: UserProfile | null) {
  return {
    fullName: user?.full_name ?? '',
    currency: user?.personal_settings.currency ?? 'EUR',
    theme: user?.personal_settings.theme ?? 'family',
    dashboardDensity: user?.personal_settings.dashboard_density ?? 'comfortable',
    onboardingStyle: user?.personal_settings.onboarding_style ?? 'coach',
  };
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export default function PicsouApp() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [appView, setAppView] = useState<'dashboard' | 'settings' | 'admin'>('dashboard');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [registerForm, setRegisterForm] = useState({ fullName: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '', mfaCode: '', recoveryCode: '' });
  const [settingsForm, setSettingsForm] = useState(defaultSettingsFromUser(null));
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'admin' | 'user' | 'banned'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'info' | 'warning'>('all');
  const [resetRequestEmail, setResetRequestEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [adminConnections, setAdminConnections] = useState<Record<string, Array<{ provider_name: string; provider_code: string; status: string; account_label?: string | null }>>>({});
  const [providerLabels, setProviderLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedAccess = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const token = params.get('token');
    const oauthAccess = params.get('oauth_access');
    const oauthRefresh = params.get('oauth_refresh');
    const oauthError = params.get('oauth_error');

    // Clean OAuth params from URL without reloading the page
    if (oauthAccess || oauthRefresh || oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (oauthError) {
      setError(`Connexion externe echouee : ${oauthError.replace(/_/g, ' ')}`);
      setLoading(false);
      return;
    }

    if (oauthAccess && oauthRefresh) {
      persistSession(oauthAccess, oauthRefresh, true);
      setAccessToken(oauthAccess);
      setRefreshToken(oauthRefresh);
      return;
    }

    if (mode === 'reset') {
      setAuthMode('reset');
    }
    if (token) {
      setResetToken(token);
    }
    if (!storedAccess || !storedRefresh) {
      setLoading(false);
      return;
    }
    if (!sessionStorage.getItem(SESSION_LAST_ACTIVITY_AT_KEY)) {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
    }
    setAccessToken(storedAccess);
    setRefreshToken(storedRefresh);
  }, []);

  useEffect(() => {
    fetch(apiUrl('/auth/oauth/providers'))
      .then((r) => r.ok ? r.json() : [])
      .then((data: OAuthProvider[]) => setOauthProviders(data.filter((p) => p.enabled)))
      .catch(() => setOauthProviders([]));
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    setSettingsForm(defaultSettingsFromUser(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function buildMfaQr() {
      if (!mfaUri) {
        setMfaQrDataUrl(null);
        return;
      }
      try {
        const qr = await import('qrcode');
        const dataUrl = await qr.toDataURL(mfaUri, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) {
          setMfaQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setMfaQrDataUrl(null);
        }
      }
    }

    void buildMfaQr();
    return () => {
      cancelled = true;
    };
  }, [mfaUri]);

  useEffect(() => {
    if (!accessToken) {
      setDashboard(null);
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const meResponse = await fetch(apiUrl('/auth/me'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const mePayload = await readJsonResponse<UserProfile | { detail?: unknown }>(meResponse);
        if (meResponse.status === 401 && refreshToken) {
          await refreshSession(refreshToken);
          return;
        }
        if (!meResponse.ok) {
          throw new Error(extractErrorMessage(mePayload, 'Session invalide'));
        }
        const me = mePayload as UserProfile | null;
        if (!me) {
          throw new Error('Session invalide');
        }
        const dashboardResponse = await fetch(apiUrl('/api/v1/dashboard/primary'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const dashboardPayload = await readJsonResponse<DashboardData | { detail?: unknown }>(dashboardResponse);
        if (!dashboardResponse.ok) {
          throw new Error(extractErrorMessage(dashboardPayload, 'Dashboard indisponible'));
        }
        const dashboardData = dashboardPayload as DashboardData | null;
        if (!dashboardData) {
          throw new Error('Dashboard indisponible');
        }
        if (!cancelled) {
          setUser(me);
          setDashboard(dashboardData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          clearSession();
          setError(err instanceof Error ? err.message : 'Impossible de charger votre espace');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let timeoutId: number | null = null;
    const logoutForInactivity = () => {
      setError('Session expiree apres 2 minutes d inactivite. Reconnectez-vous.');
      void handleLogout();
    };

    const scheduleInactivityTimeout = (delayMs: number) => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(logoutForInactivity, delayMs);
    };

    const rawLastActivity = sessionStorage.getItem(SESSION_LAST_ACTIVITY_AT_KEY);
    const lastActivityAt = rawLastActivity ? Number(rawLastActivity) : Date.now();
    if (!rawLastActivity || Number.isNaN(lastActivityAt)) {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
    }

    const elapsed = Date.now() - lastActivityAt;
    const remaining = SESSION_TIMEOUT_MS - elapsed;
    if (remaining <= 0) {
      logoutForInactivity();
      return;
    }

    const markUserActivity = () => {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
      scheduleInactivityTimeout(SESSION_TIMEOUT_MS);
    };

    scheduleInactivityTimeout(remaining);

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markUserActivity, { passive: true });
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markUserActivity);
      }
    };
  }, [accessToken]);

  useEffect(() => {
    if (appView !== 'admin' || !accessToken || !hasAdminRole(user)) {
      return;
    }
    void loadAdminData(accessToken);
  }, [appView, accessToken, user]);

  async function refreshSession(token: string) {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
    });
    if (!response.ok) {
      clearSession();
      return;
    }
    const payload = await readJsonResponse<TokenResponse>(response);
    if (payload?.access_token && payload?.refresh_token) {
      persistSession(payload.access_token, payload.refresh_token);
      setAccessToken(payload.access_token);
      setRefreshToken(payload.refresh_token);
    }
  }

  function persistSession(newAccessToken: string, newRefreshToken: string, resetSessionClock = false) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    if (resetSessionClock || !sessionStorage.getItem(SESSION_LAST_ACTIVITY_AT_KEY)) {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
    }
  }

  function clearSession() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_LAST_ACTIVITY_AT_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setDashboard(null);
    setMfaRequired(false);
    setAppView('dashboard');
    setMfaQrDataUrl(null);
  }

  async function loadAdminData(token: string) {
    const [usersResponse, auditResponse] = await Promise.all([
      fetch(apiUrl('/api/v1/admin/users'), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(apiUrl('/api/v1/admin/audit-trail'), { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (!usersResponse.ok || !auditResponse.ok) {
      const failedPayload = await readJsonResponse(usersResponse.ok ? auditResponse : usersResponse);
      setAdminFeedback(extractErrorMessage(failedPayload, 'Administration indisponible. Activez puis validez MFA pour continuer.'));
      return;
    }

    setAdminUsers((await readJsonResponse<UserProfile[]>(usersResponse)) ?? []);
    setAuditTrail((await readJsonResponse<AuditEntry[]>(auditResponse)) ?? []);
    setAdminFeedback(null);

    const connsResponse = await fetch(apiUrl('/api/v1/admin/broker-connections'), { headers: { Authorization: `Bearer ${token}` } });
    if (connsResponse.ok) {
      const conns = (await readJsonResponse<Array<{ user_id: string; provider_name: string; provider_code: string; status: string; account_label?: string | null }>>(connsResponse)) ?? [];
      const byUser: Record<string, Array<{ provider_name: string; provider_code: string; status: string; account_label?: string | null }>> = {};
      for (const c of conns) {
        if (!byUser[c.user_id]) byUser[c.user_id] = [];
        byUser[c.user_id].push({ provider_name: c.provider_name, provider_code: c.provider_code, status: c.status, account_label: c.account_label });
      }
      setAdminConnections(byUser);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerForm.email,
          full_name: registerForm.fullName,
          password: registerForm.password,
          personal_settings: {
            currency: 'EUR',
            theme: 'family',
            dashboard_density: 'comfortable',
            onboarding_style: 'coach',
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile | { detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Inscription impossible'));
      }
      setLoginForm({ email: registerForm.email, password: registerForm.password, mfaCode: '', recoveryCode: '' });
      setAuthMode('login');
      setRegisterForm({ fullName: '', email: '', password: '' });
      setError('Profil cree. Connectez-vous pour lancer votre tableau de bord et votre accompagnement investisseur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
          mfa_code: loginForm.mfaCode || null,
          recovery_code: loginForm.recoveryCode || null,
        }),
      });
      const payload = await readJsonResponse<TokenResponse>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Connexion impossible'));
      }
      if (!payload) {
        throw new Error('Connexion impossible');
      }
      if (payload.mfa_required) {
        setMfaRequired(true);
        setError('Code MFA requis. Entrez votre code d application ou un code de recuperation.');
        return;
      }
      if (!payload.access_token || !payload.refresh_token) {
        throw new Error('Session incomplete');
      }
      persistSession(payload.access_token, payload.refresh_token, true);
      setAccessToken(payload.access_token);
      setRefreshToken(payload.refresh_token);
      setUser(payload.user ?? null);
      setMfaRequired(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResetMessage(null);
    try {
      const response = await fetch(apiUrl('/auth/password-reset/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetRequestEmail }),
      });
      const payload = await readJsonResponse<PasswordResetResponse>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Demande de reinitialisation impossible'));
      }
      if (!payload) {
        throw new Error('Demande de reinitialisation impossible');
      }
      setResetMessage(payload.message);
      if (payload.reset_token) {
        setResetToken(payload.reset_token);
      }
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : 'Demande de reinitialisation impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordResetConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResetMessage(null);
    try {
      const response = await fetch(apiUrl('/auth/password-reset/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, new_password: resetNewPassword }),
      });
      const payload = await readJsonResponse<PasswordResetResponse>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Reinitialisation impossible'));
      }
      if (!payload) {
        throw new Error('Reinitialisation impossible');
      }
      setResetMessage(payload.message);
      setAuthMode('login');
      setLoginForm((state) => ({ ...state, password: resetNewPassword }));
      setResetNewPassword('');
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : 'Reinitialisation impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      if (accessToken && refreshToken) {
        await fetch(apiUrl('/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      clearSession();
    }
  }

  async function requestConnection(providerCode: string, accountLabel?: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/v1/broker-connections/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ provider_code: providerCode, account_label: accountLabel?.trim() || null }),
      });
      const payload = await readJsonResponse<Record<string, unknown>>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Demande de connexion impossible'));
      }
      const dashboardResponse = await fetch(apiUrl('/api/v1/dashboard/primary'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (dashboardResponse.ok) {
        setDashboard((await readJsonResponse<DashboardData>(dashboardResponse)) ?? null);
      }
      setProviderLabels((state) => ({ ...state, [providerCode]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion bancaire impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/me/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: settingsForm.fullName,
          personal_settings: {
            currency: settingsForm.currency,
            theme: settingsForm.theme,
            dashboard_density: settingsForm.dashboardDensity,
            onboarding_style: settingsForm.onboardingStyle,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Mise a jour impossible'));
      }
      if (!payload) {
        throw new Error('Mise a jour impossible');
      }
      setUser(payload);
      setError('Preferences mises a jour.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function startMfaSetup() {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setRecoveryCodes([]);
    setMfaCode('');
    try {
      const response = await fetch(apiUrl('/auth/mfa/setup'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await readJsonResponse<{ secret?: string; otpauth_uri?: string; detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Initialisation MFA impossible'));
      }
      if (!payload?.secret || !payload?.otpauth_uri) {
        throw new Error('Initialisation MFA impossible');
      }
      setMfaSecret(payload.secret);
      setMfaUri(payload.otpauth_uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialisation MFA impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/mfa/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code: mfaCode }),
      });
      const payload = await readJsonResponse<{ recovery_codes?: string[]; detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Verification MFA impossible'));
      }
      setRecoveryCodes(payload?.recovery_codes ?? []);
      setMfaCode('');
      if (user) {
        setUser({ ...user, mfa_enabled: true });
      }
      setError('MFA activee. Les comptes admin devront se reconnecter avec leur code MFA pour administrer la plateforme.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification MFA impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAdminUser(target: UserProfile, assignedRoles: string[], isActive: boolean) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setAdminFeedback(null);
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/users/${target.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ assigned_roles: assignedRoles, is_active: isActive }),
      });
      const payload = await readJsonResponse<UserProfile | { detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Mise a jour utilisateur impossible'));
      }
      if (!payload || !('id' in payload)) {
        throw new Error('Mise a jour utilisateur impossible');
      }
      setAdminUsers((state) => state.map((entry) => (entry.id === target.id ? payload : entry)));
      setAdminFeedback(`Profil mis a jour pour ${target.full_name}.`);
      await loadAdminData(accessToken);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Mise a jour utilisateur impossible');
    } finally {
      setSubmitting(false);
    }
  }

  const canAccessAdmin = hasAdminRole(user);
  const filteredAdminUsers = adminUsers.filter((entry) => {
    const matchesUser = !adminUserSearch || matchesSearch(`${entry.full_name} ${entry.email}`, adminUserSearch);
    const matchesRole = adminRoleFilter === 'all' || entry.assigned_roles.includes(adminRoleFilter);
    const matchesStatus =
      adminStatusFilter === 'all' ||
      (adminStatusFilter === 'active' && entry.is_active) ||
      (adminStatusFilter === 'inactive' && !entry.is_active);
    return matchesUser && matchesRole && matchesStatus;
  });
  const filteredAuditTrail = auditTrail.filter((entry) => {
    const matchesText =
      !auditSearch ||
      matchesSearch(`${entry.event_type} ${entry.actor_id} ${entry.ip_address ?? ''} ${JSON.stringify(entry.payload)}`, auditSearch);
    const matchesSeverity = auditSeverityFilter === 'all' || entry.severity === auditSeverityFilter;
    return matchesText && matchesSeverity;
  });

  return (
    <main className="investShell">
      <header className="heroTopbar">
        <div className="brandCluster">
          <div className="brandBadge" aria-hidden="true">
            <span>P</span>
          </div>
          <div>
            <strong>Picsou IA</strong>
            <p>Marche, crypto, allocation et accompagnement, dans un cockpit qui reste humain.</p>
          </div>
        </div>
        {user ? (
          <div className="headerActions">
            {hasAdminRole(user) ? (
              <div className="adminIdentityPill" title="Compte admin connecte">
                <span className="adminIdentityIcon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M4 20c1.8-3.4 4.7-5 8-5s6.2 1.6 8 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <span>Admin connecte: {user.full_name}</span>
              </div>
            ) : null}
            <div className="smallPill">{user.full_name}</div>
            <button className="ghostButton" onClick={handleLogout} type="button">
              Se deconnecter
            </button>
          </div>
        ) : (
          <div className="smallPill">Investissez avec des reperes clairs, pas avec du bruit</div>
        )}
      </header>

      {error ? <p className="formMessage">{error}</p> : null}

      {!user ? (
        <section className="landingCanvas">
          <article className="landingStoryCard">
            <p className="sectionTag">Votre copilote investisseur</p>
            <h1>Construisez un patrimoine plus serein avec un guide qui suit les marches, les cryptos et vos objectifs de vie.</h1>
            <p className="bodyText">
              Picsou IA melange tableau de bord, analyse de marche et accompagnement pedagogique. Vous voyez ce qui se
              passe, pourquoi c est important et quelle decision merite vraiment votre attention.
            </p>
            <div className="marketPulseGrid">
              <div className="pulseCard">
                <span>Actions</span>
                <strong>Cap croissance</strong>
                <p>Des indicateurs pour arbitrer entre coeur de portefeuille, ETF et themes sectoriels.</p>
              </div>
              <div className="pulseCard">
                <span>Crypto</span>
                <strong>Risque sous controle</strong>
                <p>Une place claire pour le crypto, sans laisser la volatilite dicter la strategie.</p>
              </div>
              <div className="pulseCard">
                <span>Coaching</span>
                <strong>Decision expliquee</strong>
                <p>Chaque suggestion vous dit quoi faire, pourquoi et dans quel niveau de prudence.</p>
              </div>
            </div>
            <div className="coachStrip">
              <div>
                <span>Mode accompagnement</span>
                <strong>Du premier euro jusqu aux arbitrages plus avances.</strong>
              </div>
              <div className="coachStats">
                <span>Marche</span>
                <span>Crypto</span>
                <span>Budget risque</span>
              </div>
            </div>
          </article>

          <article className="authExperienceCard">
            <div className="toggleRow">
              <button className={authMode === 'login' ? 'toggleButton active' : 'toggleButton'} onClick={() => setAuthMode('login')} type="button">
                Connexion
              </button>
              <button className={authMode === 'register' ? 'toggleButton active' : 'toggleButton'} onClick={() => setAuthMode('register')} type="button">
                Nouveau profil
              </button>
              <button className={authMode === 'reset' ? 'toggleButton active' : 'toggleButton'} onClick={() => setAuthMode('reset')} type="button">
                Reset password
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="authForm" onSubmit={handleLogin}>
                <h2>Reprendre la main sur vos investissements</h2>
                <label>
                  Email
                  <input value={loginForm.email} onChange={(event) => setLoginForm((state) => ({ ...state, email: event.target.value }))} type="email" required />
                </label>
                <label>
                  Mot de passe
                  <input value={loginForm.password} onChange={(event) => setLoginForm((state) => ({ ...state, password: event.target.value }))} type="password" required />
                </label>
                {mfaRequired ? (
                  <>
                    <label>
                      Code MFA
                      <input value={loginForm.mfaCode} onChange={(event) => setLoginForm((state) => ({ ...state, mfaCode: event.target.value }))} type="text" inputMode="numeric" />
                    </label>
                    <label>
                      Ou code de recuperation
                      <input value={loginForm.recoveryCode} onChange={(event) => setLoginForm((state) => ({ ...state, recoveryCode: event.target.value }))} type="text" />
                    </label>
                  </>
                ) : null}
                <button className="primaryButton" disabled={submitting} type="submit">
                  {submitting ? 'Connexion en cours...' : 'Ouvrir mon cockpit'}
                </button>
                {oauthProviders.length > 0 ? (
                  <div className="oauthDivider">
                    <span>ou continuer avec</span>
                  </div>
                ) : null}
                {oauthProviders.map((p) => (
                  <a className="oauthButton" href={apiUrl(`/auth/oauth/${p.provider}`)} key={p.provider}>
                    {p.provider === 'google' ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    ) : null}
                    {p.provider === 'franceconnect' ? (
                      <svg width="18" height="18" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#003189"/><text x="20" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">FC</text></svg>
                    ) : null}
                    {p.provider === 'google' ? 'Google' : 'FranceConnect'}
                  </a>
                ))}
              </form>
            ) : null}

            {authMode === 'register' ? (
              <form className="authForm" onSubmit={handleRegister}>
                <h2>Creer un espace investisseur</h2>
                <label>
                  Nom complet
                  <input value={registerForm.fullName} onChange={(event) => setRegisterForm((state) => ({ ...state, fullName: event.target.value }))} type="text" required />
                </label>
                <label>
                  Email
                  <input value={registerForm.email} onChange={(event) => setRegisterForm((state) => ({ ...state, email: event.target.value }))} type="email" required />
                </label>
                <label>
                  Mot de passe fort
                  <input value={registerForm.password} onChange={(event) => setRegisterForm((state) => ({ ...state, password: event.target.value }))} type="password" required />
                </label>
                <button className="primaryButton" disabled={submitting} type="submit">
                  {submitting ? 'Creation en cours...' : 'Lancer mon espace'}
                </button>
                {oauthProviders.length > 0 ? (
                  <div className="oauthDivider">
                    <span>ou s inscrire avec</span>
                  </div>
                ) : null}
                {oauthProviders.map((p) => (
                  <a className="oauthButton" href={apiUrl(`/auth/oauth/${p.provider}`)} key={p.provider}>
                    {p.provider === 'google' ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    ) : null}
                    {p.provider === 'franceconnect' ? (
                      <svg width="18" height="18" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#003189"/><text x="20" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">FC</text></svg>
                    ) : null}
                    {p.provider === 'google' ? 'Google' : 'FranceConnect'}
                  </a>
                ))}
                <p className="helperText">Le portefeuille demarre vide et vous guide ensuite pour connecter une banque, definir votre style d accompagnement et cadrer votre risque.</p>
              </form>
            ) : null}

            {authMode === 'reset' ? (
              <div className="authFormStack">
                <form className="authForm" onSubmit={handlePasswordResetRequest}>
                  <h2>Mot de passe oublie</h2>
                  <label>
                    Email du compte
                    <input value={resetRequestEmail} onChange={(event) => setResetRequestEmail(event.target.value)} type="email" required />
                  </label>
                  <button className="primaryButton" disabled={submitting} type="submit">
                    {submitting ? 'Generation du code...' : 'Demander un code de reset'}
                  </button>
                  <p className="helperText">Si l email est configure, vous recevrez un lien direct. Sinon, un code temporaire restera affiche ici.</p>
                </form>

                <form className="authForm resetConfirmCard" onSubmit={handlePasswordResetConfirm}>
                  <label>
                    Code temporaire
                    <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} type="text" required />
                  </label>
                  <label>
                    Nouveau mot de passe
                    <input value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} type="password" required />
                  </label>
                  <button className="secondaryButton" disabled={submitting} type="submit">
                    Valider le nouveau mot de passe
                  </button>
                  {resetMessage ? <p className="helperText">{resetMessage}</p> : null}
                </form>
              </div>
            ) : null}
          </article>
        </section>
      ) : (
        <section className="workspaceShell">
          <nav className="workspaceNav">
            <button className={appView === 'dashboard' ? 'navButton active' : 'navButton'} onClick={() => setAppView('dashboard')} type="button">
              Tableau de bord
            </button>
            <button className={appView === 'settings' ? 'navButton active' : 'navButton'} onClick={() => setAppView('settings')} type="button">
              Mon espace
            </button>
            {canAccessAdmin ? (
              <button className={appView === 'admin' ? 'navButton active' : 'navButton'} onClick={() => setAppView('admin')} type="button">
                Admin
              </button>
            ) : null}
          </nav>

          {appView === 'dashboard' ? (
            <>
              <section className="portfolioHero">
                <div className="portfolioIntro">
                  <p className="sectionTag">{dashboard?.portfolio_name ?? 'Votre portefeuille'}</p>
                  <h1>Investir avec plus de calme, mais sans rater les opportunites utiles.</h1>
                  <p className="bodyText">
                    Suivi marche, poche crypto, tresorerie, suggestions IA et prochaines actions: tout est rassemble
                    dans un espace qui vous accompagne au lieu de vous submerger.
                  </p>
                  <div className="profileMeta">
                    <span className="metaPill">Profil: {user.role}</span>
                    <span className="metaPill">Acces: {user.assigned_roles.join(', ')}</span>
                    <span className="metaPill">Theme: {user.personal_settings.theme ?? 'family'}</span>
                  </div>
                </div>
                <div className="summaryValue heroValueCard">
                  <span>Valeur totale</span>
                  <strong>{dashboard ? formatCurrency(dashboard.total_value) : '...'}</strong>
                  <small>
                    {dashboard
                      ? dashboard.is_empty
                        ? 'Portefeuille pret a etre alimente et pilote'
                        : `Liquidites disponibles: ${formatCurrency(dashboard.cash_balance)}`
                      : 'Chargement des liquidites'}
                  </small>
                </div>
              </section>

              {loading ? <article className="featureCard">Chargement de votre espace...</article> : null}

              {dashboard ? (
                <>
                  <section className="indicatorDeck">
                    {dashboard.key_indicators.map((item) => (
                      <article className="signalCard" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{item.trend}</small>
                      </article>
                    ))}
                  </section>

                  <section className="workspaceGrid">
                    <article className="featureCard">
                      <div className="cardHeader">
                        <h2>Vue synthetic coach</h2>
                        <span>Actions et crypto</span>
                      </div>
                      <div className="compactList">
                        <div className="compactRow"><span>PnL realise</span><strong>{formatCurrency(dashboard.pnl_realized)}</strong></div>
                        <div className="compactRow"><span>PnL latent</span><strong>{formatCurrency(dashboard.pnl_unrealized)}</strong></div>
                        <div className="compactRow"><span>Rendement annualise</span><strong>{(dashboard.annualized_return * 100).toFixed(1)}%</strong></div>
                        <div className="compactRow"><span>Volatilite glissante</span><strong>{(dashboard.rolling_volatility * 100).toFixed(1)}%</strong></div>
                        <div className="compactRow"><span>Drawdown max</span><strong>{(dashboard.max_drawdown * 100).toFixed(1)}%</strong></div>
                      </div>
                    </article>

                    <article className="featureCard accentCard">
                      <div className="cardHeader">
                        <h2>Feuille de route</h2>
                        <span>Accompagnement</span>
                      </div>
                      <div className="taskList">
                        {dashboard.next_steps.map((step) => (
                          <div className="taskRow" key={step}>
                            <span className="benefitDot" />
                            <p>{step}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </section>

                  <section className="workspaceGrid">
                    <article className="featureCard">
                      <div className="cardHeader">
                        <h2>Suggestions accompagnees</h2>
                        <span>Jamais sans validation</span>
                      </div>
                      <div className="suggestionGrid">
                        {dashboard.suggestions.map((item) => (
                          <div className="suggestionCard" key={item.title}>
                            <div className="compactRow">
                              <strong>{item.title}</strong>
                              <span>{item.score}/100</span>
                            </div>
                            <p>{item.justification}</p>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="featureCard">
                      <div className="cardHeader">
                        <h2>{dashboard.is_empty ? 'Connecter une banque ou un broker' : 'Integrations actives'}</h2>
                        <span>Execution sous controle</span>
                      </div>
                      {dashboard.connected_accounts.length > 0 ? (
                        <div className="taskList">
                          {dashboard.connected_accounts.map((account) => (
                            <div className="compactRow" key={`${account.provider_name}-${account.account_label ?? 'default'}`}>
                              <span>{account.provider_name}</span>
                              <strong>{account.status}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="providerGrid">
                          {dashboard.bank_connectors.map((provider) => (
                            <div className="providerCard" key={provider.code}>
                              <div>
                                <strong>{provider.name}</strong>
                                <p>{provider.onboarding_hint}</p>
                              </div>
                              <button className="secondaryButton" disabled={submitting || provider.status !== 'available'} onClick={() => requestConnection(provider.code)} type="button">
                                {provider.status === 'available' ? 'Connecter' : provider.status}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  </section>
                </>
              ) : null}
            </>
          ) : null}

          {appView === 'settings' ? (
            <section className="workspaceGrid">
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Mon espace personnel</h2>
                  <span>Preferences et accompagnement</span>
                </div>
                <form className="authForm" onSubmit={saveSettings}>
                  <label>
                    Nom affiche
                    <input value={settingsForm.fullName} onChange={(event) => setSettingsForm((state) => ({ ...state, fullName: event.target.value }))} type="text" required />
                  </label>
                  <label>
                    Devise principale
                    <input value={settingsForm.currency} onChange={(event) => setSettingsForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))} type="text" maxLength={5} />
                  </label>
                  <label>
                    Theme d interface
                    <select value={settingsForm.theme} onChange={(event) => setSettingsForm((state) => ({ ...state, theme: event.target.value }))}>
                      <option value="family">Family coach</option>
                      <option value="focus">Focus investisseur</option>
                      <option value="calm">Calme et lecture rapide</option>
                    </select>
                  </label>
                  <label>
                    Densite du dashboard
                    <select value={settingsForm.dashboardDensity} onChange={(event) => setSettingsForm((state) => ({ ...state, dashboardDensity: event.target.value }))}>
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <label>
                    Style d accompagnement
                    <select value={settingsForm.onboardingStyle} onChange={(event) => setSettingsForm((state) => ({ ...state, onboardingStyle: event.target.value }))}>
                      <option value="coach">Coach</option>
                      <option value="pedagogue">Pedagogue</option>
                      <option value="direct">Direct</option>
                    </select>
                  </label>
                  <button className="primaryButton" disabled={submitting} type="submit">
                    Sauvegarder mes preferences
                  </button>
                </form>

                <div className="cardHeader" style={{ marginTop: '22px' }}>
                  <h2>Configuration des fournisseurs</h2>
                  <span>Revolut, Boursorama et autres integrations</span>
                </div>

                {dashboard ? (
                  <>
                    {dashboard.connected_accounts.length > 0 ? (
                      <div className="taskList" style={{ marginBottom: '14px' }}>
                        {dashboard.connected_accounts.map((account) => (
                          <div className="compactRow" key={`${account.provider_name}-${account.account_label ?? 'default'}`}>
                            <span>{account.provider_name}{account.account_label ? ` · ${account.account_label}` : ''}</span>
                            <strong>{account.status}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="helperText" style={{ marginBottom: '14px' }}>
                        Aucune integration active. Configurez un fournisseur ci-dessous pour demarrer l alimentation du portefeuille.
                      </p>
                    )}

                    <div className="providerGrid">
                      {dashboard.bank_connectors.map((provider) => (
                        <div className="providerCard" key={provider.code}>
                          <div>
                            <strong>{provider.name}</strong>
                            <p>{provider.onboarding_hint}</p>
                          </div>
                          <div className="providerActions">
                            <input
                              className="providerLabelInput"
                              onChange={(event) => setProviderLabels((state) => ({ ...state, [provider.code]: event.target.value }))}
                              placeholder="Libelle compte (optionnel)"
                              type="text"
                              value={providerLabels[provider.code] ?? ''}
                            />
                            <button
                              className="secondaryButton"
                              disabled={submitting || provider.status !== 'available'}
                              onClick={() => requestConnection(provider.code, providerLabels[provider.code])}
                              type="button"
                            >
                              {provider.status === 'available' ? 'Connecter' : provider.status}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="helperText">Chargement des integrations...</p>
                )}
              </article>

              <article className="featureCard accentCard">
                <div className="cardHeader">
                  <h2>Securite et MFA</h2>
                  <span className={user.mfa_enabled ? 'statusBadge ok' : 'statusBadge warn'}>
                    <span className={user.mfa_enabled ? 'statusDot ok' : 'statusDot warn'} />
                    {user.mfa_enabled ? 'Protege' : 'Non active'}
                  </span>
                </div>

                {user.mfa_enabled && !mfaSecret ? (
                  <div className="infoPanel">
                    <strong>MFA active ✓</strong>
                    <p>Votre compte est protege par une authentification a deux facteurs. Les actions sensibles requierent votre code TOTP.</p>
                    <button className="secondaryButton" disabled={submitting} onClick={startMfaSetup} style={{marginTop:'10px'}} type="button">
                      {submitting ? 'Generation...' : 'Regenerer QR MFA'}
                    </button>
                  </div>
                ) : (
                  <div className="mfaSteps">
                    <div className="mfaStep">
                      <div className="mfaStepNum">1</div>
                      <div className="mfaStepBody">
                        <strong>Preparer une application d authentification</strong>
                        <p>{user.mfa_enabled ? 'Votre MFA est active. Vous pouvez regenerer le QR pour reconfigurer une application.' : 'Installez Google Authenticator, Authy ou 1Password sur votre telephone.'}</p>
                        {!mfaSecret ? (
                          <button className="secondaryButton" disabled={submitting} onClick={startMfaSetup} style={{marginTop:'10px'}} type="button">
                            {submitting ? 'Generation...' : (user.mfa_enabled ? 'Regenerer mon QR MFA' : 'Generer mon secret MFA')}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {mfaSecret ? (
                      <>
                        <div className="mfaStep">
                          <div className="mfaStepNum">2</div>
                          <div className="mfaStepBody">
                            <strong>Scanner ou saisir le secret</strong>
                            <p>Copiez ce code dans votre app ou scannez ce QR code :</p>
                            {mfaUri ? (
                              <div className="mfaQrWrap">
                                {mfaQrDataUrl ? (
                                  <img
                                    alt="QR code MFA"
                                    className="mfaQrImage"
                                    height={180}
                                    src={mfaQrDataUrl}
                                    width={180}
                                  />
                                ) : (
                                  <p className="helperText">Generation du QR code en cours...</p>
                                )}
                              </div>
                            ) : null}
                            <div className="mfaSecret">{mfaSecret}</div>
                            {mfaUri ? <div className="mfaUri">{mfaUri}</div> : null}
                          </div>
                        </div>

                        <div className="mfaStep">
                          <div className="mfaStepNum">3</div>
                          <div className="mfaStepBody">
                            <strong>Confirmer avec le code a 6 chiffres</strong>
                            <p>Entrez le code affiche dans votre application pour valider la liaison.</p>
                            <form className="authForm" onSubmit={verifyMfa} style={{marginTop:'10px'}}>
                              <input
                                value={mfaCode}
                                onChange={(event) => setMfaCode(event.target.value)}
                                type="text" inputMode="numeric" placeholder="123 456"
                                style={{letterSpacing:'.2em',textAlign:'center',fontSize:'1.2rem'}}
                                required
                              />
                              <button className="primaryButton" disabled={submitting} type="submit">
                                {submitting ? 'Verification...' : (user.mfa_enabled ? 'Valider le nouveau QR MFA' : 'Activer MFA maintenant')}
                              </button>
                            </form>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {recoveryCodes.length > 0 ? (
                  <div style={{marginTop:'18px'}}>
                    <div className="infoPanel warn">
                      <strong>Codes de recuperation — a conserver absolument</strong>
                      <p>Chaque code ne peut etre utilise qu une seule fois. Conservez-les dans un endroit sur.</p>
                    </div>
                    <div className="recoveryGrid">
                      {recoveryCodes.map((code) => (
                        <span className="recoveryCode" key={code}>{code}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            </section>
          ) : null}

          {appView === 'admin' ? (
            <section className="workspaceGrid adminGrid">
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Gestion des utilisateurs</h2>
                  <span>Roles, bannissement, activite</span>
                </div>
                {adminFeedback ? <p className="helperText">{adminFeedback}</p> : null}
                {!user.mfa_enabled ? (
                  <div className="infoPanel">
                    <strong>MFA requise</strong>
                    <p>Activez MFA dans Mon espace puis reconnectez-vous pour administrer la plateforme.</p>
                  </div>
                ) : (
                  <>
                    <div className="adminToolbar">
                      <input
                        aria-label="Rechercher un utilisateur"
                        className="toolbarInput"
                        onChange={(event) => setAdminUserSearch(event.target.value)}
                        placeholder="Rechercher par nom ou email"
                        type="search"
                        value={adminUserSearch}
                      />
                      <select className="toolbarSelect" onChange={(event) => setAdminRoleFilter(event.target.value as 'all' | 'admin' | 'user' | 'banned')} value={adminRoleFilter}>
                        <option value="all">Tous les roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Utilisateurs</option>
                        <option value="banned">Bannis</option>
                      </select>
                      <select className="toolbarSelect" onChange={(event) => setAdminStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} value={adminStatusFilter}>
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Inactifs</option>
                      </select>
                    </div>
                    <div className="adminSummaryRow">
                      <span>{filteredAdminUsers.length} utilisateur(s) affiches</span>
                      <span>{adminUsers.filter((entry) => entry.assigned_roles.includes('admin')).length} admin(s)</span>
                    </div>
                    <div className="adminList">
                    {filteredAdminUsers.map((entry) => {
                      const roles = new Set(entry.assigned_roles);
                      const userConns = adminConnections[entry.id] ?? [];
                      return (
                        <div className="adminUserCard" key={entry.id}>
                          <div className="adminUserCardHeader">
                            <div>
                              <strong>{entry.full_name}</strong>
                              <p>{entry.email}</p>
                            </div>
                            <div className="adminActions">
                              <button className={roles.has('user') ? 'tagButton active' : 'tagButton'} onClick={() => updateAdminUser(entry, roles.has('admin') ? ['admin', 'user'] : ['user'], entry.is_active)} type="button">
                                Utilisateur
                              </button>
                              <button className={roles.has('admin') ? 'tagButton active' : 'tagButton'} onClick={() => updateAdminUser(entry, ['admin', 'user'], entry.is_active)} type="button">
                                Admin
                              </button>
                              <button className={roles.has('banned') ? 'tagButton danger active' : 'tagButton'} onClick={() => updateAdminUser(entry, ['banned'], false)} type="button">
                                Banni
                              </button>
                              <button className="ghostButton" onClick={() => updateAdminUser(entry, entry.assigned_roles, !entry.is_active)} type="button">
                                {entry.is_active ? 'Desactiver' : 'Reactiver'}
                              </button>
                            </div>
                          </div>
                          {userConns.length > 0 ? (
                            <div className="adminUserConnections">
                              <span className="adminUserConnLabel">Connexions :</span>
                              {userConns.map((c) => {
                                const s = c.status === 'active' || c.status === 'available' ? 'ok'
                                        : c.status === 'pending_user_consent' ? 'warn' : 'error';
                                return (
                                  <span className={`statusBadge ${s}`} key={`${c.provider_code}-${c.account_label ?? 'x'}`}>
                                    <span className={`statusDot ${s}`} />
                                    {c.provider_name}{c.account_label ? ` · ${c.account_label}` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="adminUserConnections">
                              <span className="adminUserConnLabel">Connexions :</span>
                              <span className="statusBadge idle"><span className="statusDot idle" />Aucune</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Audit trail</h2>
                  <span>Actions tracees</span>
                </div>
                <div className="adminToolbar">
                  <input
                    aria-label="Rechercher dans l audit"
                    className="toolbarInput"
                    onChange={(event) => setAuditSearch(event.target.value)}
                    placeholder="Filtrer par evenement, acteur, IP ou charge utile"
                    type="search"
                    value={auditSearch}
                  />
                  <select className="toolbarSelect" onChange={(event) => setAuditSeverityFilter(event.target.value as 'all' | 'info' | 'warning')} value={auditSeverityFilter}>
                    <option value="all">Toutes severites</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Infos</option>
                  </select>
                </div>
                <div className="auditTimeline">
                  {filteredAuditTrail.map((entry) => (
                    <div className="auditEntry" key={entry.id}>
                      <div className="auditDot" />
                      <div>
                        <div className="compactRow noBorder">
                          <strong>{entry.event_type}</strong>
                          <span>{new Date(entry.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                        <p>Acteur: {entry.actor_id}</p>
                        <p>Severite: {entry.severity}{entry.ip_address ? ` | IP: ${entry.ip_address}` : ''}</p>
                        <p>Payload: {JSON.stringify(entry.payload)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}