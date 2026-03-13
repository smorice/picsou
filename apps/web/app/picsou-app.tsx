'use client';

import { FormEvent, useEffect, useState } from 'react';

type UserProfile = {
  id: string;
  email: string;
  phone_number?: string | null;
  full_name: string;
  role: string;
  assigned_roles: string[];
  is_active: boolean;
  mfa_enabled: boolean;
  personal_settings: Record<string, unknown>;
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
  total_value: string | null;
  cash_balance: string | null;
  pnl_realized: string | null;
  pnl_unrealized: string | null;
  annualized_return: number | null;
  rolling_volatility: number | null;
  max_drawdown: number | null;
  is_empty: boolean;
  key_indicators: Array<{ label: string; value: string; trend: string }>;
  sector_heatmap: Array<{ sector: string; weight: number; pnl: number }>;
  allocation: Array<{ class: string; weight: number }>;
  recent_flows: Array<{ date: string; type: string; amount: number }>;
  suggestions: Array<{ title: string; score: number; justification: string }>;
  bank_connectors: BankProvider[];
  connected_accounts: Array<{ provider_code: string; provider_name: string; status: string; account_label?: string | null }>;
  next_steps: string[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  mfa_required: boolean;
  mfa_method?: string | null;
  mfa_delivery_hint?: string | null;
  mfa_preview_code?: string | null;
  user?: UserProfile;
  detail?: unknown;
};

type ClientContext = {
  locale: string;
  time_zone: string;
  country: string;
};

type MfaSetupPayload = {
  method: 'email' | 'totp';
  secret?: string | null;
  otpauth_uri?: string | null;
  delivery_hint?: string | null;
  preview_code?: string | null;
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

type IntegrationConnection = {
  connection_id: string;
  provider_code: string;
  provider_name: string;
  status: string;
  account_label?: string | null;
  has_credentials: boolean;
  supports_read: boolean;
  supports_trade: boolean;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  last_sync_at?: string | null;
  last_snapshot_total_value?: string | null;
  positions_count: number;
};

type IntegrationSyncResponse = {
  provider_code: string;
  status: string;
  positions_synced: number;
  total_value?: string | null;
  synced_at?: string | null;
  message: string;
  detail?: unknown;
};

const ACCESS_TOKEN_KEY = 'picsou_access_token';
const REFRESH_TOKEN_KEY = 'picsou_refresh_token';
const SESSION_LAST_ACTIVITY_AT_KEY = 'picsou_session_last_activity_at';
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const OTHER_COUNTRY_VALUE = '__OTHER__';
const COUNTRY_OPTIONS = [
  { code: 'FR', label: 'France' },
  { code: 'BE', label: 'Belgique' },
  { code: 'CH', label: 'Suisse' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'Etats-Unis' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'ES', label: 'Espagne' },
  { code: 'IT', label: 'Italie' },
  { code: 'NL', label: 'Pays-Bas' },
  { code: 'PT', label: 'Portugal' },
  { code: 'IE', label: 'Irlande' },
  { code: 'MA', label: 'Maroc' },
  { code: 'SN', label: 'Senegal' },
  { code: 'CI', label: 'Cote d Ivoire' },
];

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

function formatNullableCurrency(value: string | null) {
  return value === null ? 'null' : formatCurrency(value);
}

function formatNullablePercent(value: number | null) {
  return value === null ? 'null' : `${(value * 100).toFixed(1)}%`;
}

function readBooleanSetting(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return fallback;
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
    phoneNumber: user?.phone_number ?? '',
    currency: String(user?.personal_settings.currency ?? 'EUR'),
    theme: String(user?.personal_settings.theme ?? 'family'),
    dashboardDensity: String(user?.personal_settings.dashboard_density ?? 'comfortable'),
    onboardingStyle: String(user?.personal_settings.onboarding_style ?? 'coach'),
    country: String(user?.personal_settings.country ?? ''),
    notifyEmail: readBooleanSetting(user?.personal_settings.notify_email, true),
    notifySms: readBooleanSetting(user?.personal_settings.notify_sms, false),
    notifyWhatsapp: readBooleanSetting(user?.personal_settings.notify_whatsapp, false),
    notifyPush: readBooleanSetting(user?.personal_settings.notify_push, false),
    weeklyDigest: readBooleanSetting(user?.personal_settings.weekly_digest, true),
    marketAlerts: readBooleanSetting(user?.personal_settings.market_alerts, true),
    communicationFrequency: String(user?.personal_settings.communication_frequency ?? 'important_only'),
  };
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function normalizeOtpInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

function inferCountryFromLocale(locale: string) {
  const match = locale.match(/[-_]([A-Za-z]{2})\b/);
  if (!match) {
    return '';
  }
  const region = match[1].toUpperCase();
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(region) ?? region;
  } catch {
    return region;
  }
}

function resolveClientContext(): ClientContext {
  if (typeof window === 'undefined') {
    return { locale: 'fr-FR', time_zone: 'Europe/Paris', country: 'France' };
  }
  const locale = navigator.languages?.[0] ?? navigator.language ?? 'fr-FR';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  return {
    locale,
    time_zone: timeZone,
    country: inferCountryFromLocale(locale),
  };
}

function isKnownCountryLabel(value: string) {
  return COUNTRY_OPTIONS.some((option) => option.label === value);
}

function statusBadgeClass(status: string) {
  if (status === 'active') {
    return 'statusBadge ok';
  }
  if (status === 'disabled') {
    return 'statusBadge idle';
  }
  if (status === 'pending_user_consent') {
    return 'statusBadge warn';
  }
  if (status === 'available') {
    return 'statusBadge idle';
  }
  return 'statusBadge warn';
}

function statusDotClass(status: string) {
  if (status === 'active') {
    return 'statusDot ok';
  }
  if (status === 'disabled' || status === 'available') {
    return 'statusDot idle';
  }
  return 'statusDot warn';
}

function statusLabel(status: string) {
  if (status === 'active') {
    return 'Actif';
  }
  if (status === 'disabled') {
    return 'Desactive';
  }
  if (status === 'pending_user_consent') {
    return 'En attente';
  }
  if (status === 'available') {
    return 'Disponible';
  }
  return status;
}

export default function PicsouApp() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
  const [resetPanelOpen, setResetPanelOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetupMethod, setMfaSetupMethod] = useState<'email' | 'totp'>('email');
  const [loginMfaMethod, setLoginMfaMethod] = useState<'email' | 'totp'>('totp');
  const [mfaDeliveryHint, setMfaDeliveryHint] = useState<string | null>(null);
  const [mfaPreviewCode, setMfaPreviewCode] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [adminConnections, setAdminConnections] = useState<Record<string, Array<{ provider_name: string; provider_code: string; status: string; account_label?: string | null }>>>({});
  const [providerLabels, setProviderLabels] = useState<Record<string, string>>({});
  const [integrationConnections, setIntegrationConnections] = useState<IntegrationConnection[]>([]);
  const [providerKeys, setProviderKeys] = useState<Record<string, { apiKey: string; apiSecret: string; portfolioId: string }>>({});
  const [clientContext] = useState<ClientContext>(resolveClientContext);

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
      setResetPanelOpen(true);
    }
    if (token) {
      setResetToken(token);
      setResetPanelOpen(true);
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
    if (!dashboard) {
      return;
    }
    const nextLabels: Record<string, string> = {};
    for (const account of dashboard.connected_accounts) {
      nextLabels[account.provider_code] = account.account_label ?? '';
    }
    setProviderLabels((state) => ({ ...state, ...nextLabels }));
  }, [dashboard]);

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
        const [dashboardResponse, integrationsResponse] = await Promise.all([
          fetch(apiUrl('/api/v1/dashboard/primary'), {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(apiUrl('/api/v1/integrations'), {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        const dashboardPayload = await readJsonResponse<DashboardData | { detail?: unknown }>(dashboardResponse);
        if (!dashboardResponse.ok) {
          throw new Error(extractErrorMessage(dashboardPayload, 'Dashboard indisponible'));
        }
        const integrationsPayload = await readJsonResponse<IntegrationConnection[] | { detail?: unknown }>(integrationsResponse);
        if (!integrationsResponse.ok) {
          throw new Error(extractErrorMessage(integrationsPayload, 'Integrations indisponibles'));
        }
        const dashboardData = dashboardPayload as DashboardData | null;
        if (!dashboardData) {
          throw new Error('Dashboard indisponible');
        }
        if (!cancelled) {
          setUser(me);
          setDashboard(dashboardData);
          setIntegrationConnections((integrationsPayload as IntegrationConnection[] | null) ?? []);
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

  useEffect(() => {
    if (user) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user?.id]);

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

  async function refreshWorkspaceData(token: string) {
    const [dashboardResponse, integrationsResponse] = await Promise.all([
      fetch(apiUrl('/api/v1/dashboard/primary'), {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(apiUrl('/api/v1/integrations'), {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (dashboardResponse.ok) {
      setDashboard((await readJsonResponse<DashboardData>(dashboardResponse)) ?? null);
    }
    if (integrationsResponse.ok) {
      setIntegrationConnections((await readJsonResponse<IntegrationConnection[]>(integrationsResponse)) ?? []);
    }
  }

  async function submitSettingsUpdate() {
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
          phone_number: settingsForm.phoneNumber || null,
          client_context: clientContext,
          personal_settings: {
            currency: settingsForm.currency,
            theme: settingsForm.theme,
            dashboard_density: settingsForm.dashboardDensity,
            onboarding_style: settingsForm.onboardingStyle,
            country: settingsForm.country,
            notify_email: settingsForm.notifyEmail,
            notify_sms: settingsForm.notifySms,
            notify_whatsapp: settingsForm.notifyWhatsapp,
            notify_push: settingsForm.notifyPush,
            weekly_digest: settingsForm.weeklyDigest,
            market_alerts: settingsForm.marketAlerts,
            communication_frequency: settingsForm.communicationFrequency,
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
      setError('Preferences et coordonnees mises a jour.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible');
    } finally {
      setSubmitting(false);
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
          client_context: clientContext,
          personal_settings: {
            currency: 'EUR',
            theme: 'family',
            dashboard_density: 'comfortable',
            onboarding_style: 'coach',
            country: clientContext.country,
            preferred_mfa_method: 'email',
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
          client_context: clientContext,
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
        setLoginMfaMethod(payload.mfa_method === 'email' ? 'email' : 'totp');
        setMfaDeliveryHint(payload.mfa_delivery_hint ?? null);
        setMfaPreviewCode(payload.mfa_preview_code ?? null);
        setError(payload.mfa_method === 'email' ? 'Code MFA envoye. Saisissez le code recu par email.' : 'Code MFA requis. Entrez votre code d application ou un code de recuperation.');
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
      setMfaDeliveryHint(null);
      setMfaPreviewCode(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendEmailMfaCode() {
    if (!loginForm.email || !loginForm.password) {
      setError('Renseignez d abord email et mot de passe pour renvoyer le code MFA.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
          mfa_code: null,
          recovery_code: null,
          client_context: clientContext,
        }),
      });
      const payload = await readJsonResponse<TokenResponse>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Renvoi du code MFA impossible'));
      }
      if (!payload?.mfa_required || payload.mfa_method !== 'email') {
        throw new Error('Le compte ne requiert pas de code email MFA.');
      }
      setMfaRequired(true);
      setLoginMfaMethod('email');
      setMfaDeliveryHint(payload.mfa_delivery_hint ?? 'Un nouveau code MFA email vient d etre emis.');
      setMfaPreviewCode(payload.mfa_preview_code ?? null);
      setError('Nouveau code MFA email genere.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renvoi du code MFA impossible');
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
      setResetPanelOpen(true);
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

  async function toggleIntegration(providerCode: string, enabled: boolean, accountLabel?: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/v1/broker-connections/toggle'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          provider_code: providerCode,
          enabled,
          account_label: accountLabel?.trim() || null,
        }),
      });
      const payload = await readJsonResponse<Record<string, unknown>>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Mise a jour du suivi impossible'));
      }
      await refreshWorkspaceData(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour du suivi impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveIntegrationCredentials(providerCode: string) {
    if (!accessToken) {
      return;
    }
    const providerKeyState = providerKeys[providerCode] ?? { apiKey: '', apiSecret: '', portfolioId: '' };
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/v1/integrations/credentials'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          provider_code: providerCode,
          account_label: providerLabels[providerCode] || null,
          api_key: providerKeyState.apiKey || null,
          api_secret: providerKeyState.apiSecret || null,
          external_portfolio_id: providerKeyState.portfolioId || null,
        }),
      });
      const payload = await readJsonResponse<IntegrationConnection | { detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Enregistrement des credentials impossible'));
      }
      await refreshWorkspaceData(accessToken);
      setProviderKeys((state) => ({ ...state, [providerCode]: { apiKey: '', apiSecret: '', portfolioId: '' } }));
      setError('Credentials integration enregistres cote serveur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement des credentials impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function syncIntegration(providerCode: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/v1/integrations/${providerCode}/sync`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await readJsonResponse<IntegrationSyncResponse>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Synchronisation impossible'));
      }
      await refreshWorkspaceData(accessToken);
      setError(payload?.message ?? 'Synchronisation terminee.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synchronisation impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitSettingsUpdate();
  }

  async function startMfaSetup(method: 'email' | 'totp') {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setRecoveryCodes([]);
    setMfaCode('');
    setMfaSetupMethod(method);
    setMfaDeliveryHint(null);
    setMfaPreviewCode(null);
    try {
      const response = await fetch(apiUrl('/auth/mfa/setup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ method }),
      });
      const payload = await readJsonResponse<MfaSetupPayload>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Initialisation MFA impossible'));
      }
      if (!payload) {
        throw new Error('Initialisation MFA impossible');
      }
      setMfaSecret(payload.secret ?? null);
      setMfaUri(payload.otpauth_uri ?? null);
      setMfaDeliveryHint(payload.delivery_hint ?? null);
      setMfaPreviewCode(payload.preview_code ?? null);
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
        setUser({ ...user, mfa_enabled: true, personal_settings: { ...user.personal_settings, preferred_mfa_method: mfaSetupMethod } });
      }
      setError(mfaSetupMethod === 'email' ? 'MFA email activee. Les prochains codes seront envoyes sur votre email principal.' : 'MFA activee. Les comptes admin devront se reconnecter avec leur code MFA pour administrer la plateforme.');
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
  const findIntegration = (providerCode: string) => integrationConnections.find((item) => item.provider_code === providerCode);

  return (
    <main className="investShell">
      <header className="heroTopbar">
        <div className="brandCluster">
          <div className="brandBadge" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="lionMane" cx="50%" cy="38%" r="56%">
                  <stop offset="0%" stopColor="#252525"/>
                  <stop offset="100%" stopColor="#6e6e6e"/>
                </radialGradient>
              </defs>
              {/* Outer dark mane silhouette */}
              <path d="M50 4 C65 4 80 10 88 22 C96 35 96 53 91 67 C87 82 77 93 64 99 C60 101 55 102 50 102 C45 102 40 101 36 99 C23 93 13 82 9 67 C4 53 4 35 12 22 C20 10 35 4 50 4Z" fill="url(#lionMane)"/>
              {/* Ear tufts */}
              <path d="M32 12 C29 5 36 1 38 8Z" fill="#1a1a1a"/>
              <path d="M68 12 C71 5 64 1 62 8Z" fill="#1a1a1a"/>
              {/* White face interior */}
              <path d="M50 21 C63 21 74 28 79 40 C84 53 83 66 78 78 C73 87 65 93 57 96 C54 97 52 97 50 97 C48 97 46 97 43 96 C35 93 27 87 22 78 C17 66 16 53 21 40 C26 28 37 21 50 21Z" fill="white"/>
              {/* Forehead shadow from mane */}
              <path d="M36 26 C40 21 60 21 64 26" stroke="#888" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              {/* Brow ridges */}
              <path d="M32 40 C36 34 42 33 44 37" stroke="#444" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M68 40 C64 34 58 33 56 37" stroke="#444" strokeWidth="2" fill="none" strokeLinecap="round"/>
              {/* Eyes */}
              <ellipse cx="40" cy="46" rx="7" ry="6" fill="#1a1a1a"/>
              <ellipse cx="60" cy="46" rx="7" ry="6" fill="#1a1a1a"/>
              {/* Nose */}
              <path d="M43 60 C45 67 55 67 57 60 L50 57Z" fill="#1c1c1c"/>
              {/* White cheek/muzzle pad */}
              <ellipse cx="50" cy="77" rx="18" ry="13" fill="white"/>
              {/* Wide open mouth – distinctive roaring feature */}
              <path d="M34 70 C36 88 64 88 66 70 C64 86 36 86 34 70Z" fill="#4a4a4a"/>
              {/* Upper teeth */}
              <path d="M36 70 C39 66 61 66 64 70 L64 74 C61 70 39 70 36 74Z" fill="white"/>
              {/* Lower chin arc */}
              <path d="M36 84 C40 93 60 93 64 84" stroke="#555" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
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
                      {loginMfaMethod === 'email' ? 'Code recu par email' : 'Code MFA'}
                      <input value={loginForm.mfaCode} onChange={(event) => setLoginForm((state) => ({ ...state, mfaCode: normalizeOtpInput(event.target.value) }))} type="text" inputMode="numeric" autoComplete="one-time-code" />
                    </label>
                    {loginMfaMethod === 'totp' ? (
                      <label>
                        Ou code de recuperation
                        <input value={loginForm.recoveryCode} onChange={(event) => setLoginForm((state) => ({ ...state, recoveryCode: event.target.value }))} type="text" />
                      </label>
                    ) : null}
                    {mfaDeliveryHint ? <p className="helperText">{mfaDeliveryHint}</p> : null}
                    {mfaPreviewCode ? <p className="helperText">Code de previsualisation: <strong>{mfaPreviewCode}</strong></p> : null}
                    {loginMfaMethod === 'email' ? (
                      <button className="textLinkButton" onClick={() => void resendEmailMfaCode()} type="button">
                        {submitting ? 'Renvoi...' : 'Renvoyer un code MFA email'}
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button className="primaryButton" disabled={submitting} type="submit">
                  {submitting ? 'Connexion en cours...' : 'Ouvrir mon cockpit'}
                </button>
                <button className="textLinkButton" onClick={() => setResetPanelOpen((state) => !state)} type="button">
                  {resetPanelOpen ? 'Masquer le service de reinitialisation' : 'Mot de passe oublie ?'}
                </button>
                {resetPanelOpen ? (
                  <div className="inlineServicePanel">
                    <form className="authForm" onSubmit={handlePasswordResetRequest}>
                      <label>
                        Email du compte
                        <input value={resetRequestEmail} onChange={(event) => setResetRequestEmail(event.target.value)} type="email" required />
                      </label>
                      <button className="secondaryButton" disabled={submitting} type="submit">
                        {submitting ? 'Generation du code...' : 'Demander un code de reset'}
                      </button>
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
                      <p className="helperText">Si l email n est pas configure, un code temporaire sera affiche ici pour continuer.</p>
                      {resetMessage ? <p className="helperText">{resetMessage}</p> : null}
                    </form>
                  </div>
                ) : null}
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

          </article>
        </section>
      ) : (
        <section className="workspaceShell">
          <nav className="workspaceNav">
            <button className={appView === 'dashboard' ? 'navButton active' : 'navButton'} onClick={() => { setAppView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
              Tableau de bord
            </button>
            <button className={appView === 'settings' ? 'navButton active' : 'navButton'} onClick={() => { setAppView('settings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
              Mon espace
            </button>
            {canAccessAdmin ? (
              <button className={appView === 'admin' ? 'navButton active' : 'navButton'} onClick={() => { setAppView('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
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
                    <span className="metaPill">Theme: {String(user.personal_settings.theme ?? 'family')}</span>
                  </div>
                </div>
                <div className="summaryValue heroValueCard">
                  <span>Valeur totale</span>
                  <strong>{dashboard ? formatNullableCurrency(dashboard.total_value) : '...'}</strong>
                  <small>
                    {dashboard
                      ? dashboard.is_empty
                        ? 'Aucune valeur consolidee tant qu aucune integration n est active'
                        : `Liquidites disponibles: ${formatNullableCurrency(dashboard.cash_balance)}`
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
                        <div className="compactRow"><span>PnL realise</span><strong>{formatNullableCurrency(dashboard.pnl_realized)}</strong></div>
                        <div className="compactRow"><span>PnL latent</span><strong>{formatNullableCurrency(dashboard.pnl_unrealized)}</strong></div>
                        <div className="compactRow"><span>Rendement annualise</span><strong>{formatNullablePercent(dashboard.annualized_return)}</strong></div>
                        <div className="compactRow"><span>Volatilite glissante</span><strong>{formatNullablePercent(dashboard.rolling_volatility)}</strong></div>
                        <div className="compactRow"><span>Drawdown max</span><strong>{formatNullablePercent(dashboard.max_drawdown)}</strong></div>
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
                        <h2>{dashboard.is_empty ? 'Sources en attente' : 'Integrations actives'}</h2>
                        <span>Lecture seule</span>
                      </div>
                      {dashboard.connected_accounts.length > 0 ? (
                        <div className="taskList">
                          {dashboard.connected_accounts.map((account) => (
                            <div className="compactRow" key={`${account.provider_name}-${account.account_label ?? 'default'}`}>
                              <span>{account.provider_name}{account.account_label ? ` · ${account.account_label}` : ''}</span>
                              <span className={statusBadgeClass(account.status)}>
                                <span className={statusDotClass(account.status)} />
                                {statusLabel(account.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="infoPanel mutedPanel">
                          <strong>Aucune source active</strong>
                          <p>Le tableau de bord reste a null tant qu aucune integration de suivi n est activee dans Mon espace.</p>
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
                    Sauvegarder le profil investisseur
                  </button>
                </form>
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Coordonnees de contact</h2>
                  <span>Email, telephone et canaux de rappel</span>
                </div>
                <div className="preferenceGroup">
                  <label>
                    Email principal
                    <input type="email" value={user.email} disabled />
                  </label>
                  <label>
                    Numero de telephone
                    <input value={settingsForm.phoneNumber} onChange={(event) => setSettingsForm((state) => ({ ...state, phoneNumber: event.target.value }))} type="tel" placeholder="+33 6 12 34 56 78" />
                  </label>
                  <label>
                    Pays de reference
                    <select
                      value={isKnownCountryLabel(settingsForm.country) ? settingsForm.country : OTHER_COUNTRY_VALUE}
                      onChange={(event) => {
                        const selectedValue = event.target.value;
                        if (selectedValue === OTHER_COUNTRY_VALUE) {
                          setSettingsForm((state) => ({ ...state, country: '' }));
                          return;
                        }
                        setSettingsForm((state) => ({ ...state, country: selectedValue }));
                      }}
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.code} value={option.label}>{option.label}</option>
                      ))}
                      <option value={OTHER_COUNTRY_VALUE}>Autre pays (saisie manuelle)</option>
                    </select>
                  </label>
                  {!isKnownCountryLabel(settingsForm.country) ? (
                    <label>
                      Autre pays
                      <input value={settingsForm.country} onChange={(event) => setSettingsForm((state) => ({ ...state, country: event.target.value }))} type="text" placeholder={clientContext.country || 'France'} />
                    </label>
                  ) : null}
                  <p className="helperText">Prefill navigateur: {clientContext.country || clientContext.locale} · {clientContext.time_zone}</p>
                  <button className="secondaryButton" disabled={submitting} onClick={() => void submitSettingsUpdate()} type="button">
                    {submitting ? 'Enregistrement...' : 'Sauvegarder mes coordonnees'}
                  </button>
                </div>
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Sources du tableau de bord</h2>
                  <span>Tile dediee aux integrations declarees</span>
                </div>
                <div className="infoPanel mutedPanel" style={{ marginBottom: '14px' }}>
                  <strong>Sources utilisateur et connecteurs reels</strong>
                  <p>Vous pouvez activer un suivi declaratif pour tous les fournisseurs. Pour Coinbase, vous pouvez aussi enregistrer des credentials API chiffrés côté serveur puis lancer une synchronisation lecture seule.</p>
                </div>

                {dashboard ? (
                  <>
                    {dashboard.connected_accounts.length > 0 ? (
                      <div className="taskList" style={{ marginBottom: '14px' }}>
                        {dashboard.connected_accounts.map((account) => (
                          <div className="compactRow" key={`${account.provider_name}-${account.account_label ?? 'default'}`}>
                            <span>{account.provider_name}{account.account_label ? ` · ${account.account_label}` : ''}</span>
                            <span className={statusBadgeClass(account.status)}>
                              <span className={statusDotClass(account.status)} />
                              {statusLabel(account.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="helperText" style={{ marginBottom: '14px' }}>
                        Aucune integration active. Activez une ou plusieurs sources de suivi ci-dessous pour initialiser le dashboard.
                      </p>
                    )}

                    <div className="providerGrid">
                      {dashboard.bank_connectors.map((provider) => {
                        const providerConnection = findIntegration(provider.code);
                        const providerKeyState = providerKeys[provider.code] ?? { apiKey: '', apiSecret: '', portfolioId: '' };
                        return (
                        <div className="providerCard stacked" key={provider.code}>
                          <div className="providerCardBody">
                            <strong>{provider.name}</strong>
                            <p>{provider.code === 'coinbase' ? 'Connecteur reel disponible en lecture seule via API Coinbase Advanced Trade. Les secrets restent chiffrés côté serveur.' : 'Source declaree pour alimenter le dashboard. Les autres connecteurs restent pour l instant en mode declaratif.'}</p>
                            <div style={{ marginTop: '8px' }}>
                              <span className={statusBadgeClass(provider.status)}>
                                <span className={statusDotClass(provider.status)} />
                                {statusLabel(provider.status)}
                              </span>
                            </div>
                            {providerConnection ? (
                              <div className="providerMetaList">
                                <span className="metaPill">Credentials: {providerConnection.has_credentials ? 'serveur' : 'absents'}</span>
                                <span className="metaPill">Lecture: {providerConnection.supports_read ? 'oui' : 'non'}</span>
                                <span className="metaPill">Ordres: {providerConnection.supports_trade ? 'pret' : 'sous validation'}</span>
                                <span className="metaPill">Derniere sync: {providerConnection.last_sync_at ? new Date(providerConnection.last_sync_at).toLocaleString('fr-FR') : 'jamais'}</span>
                                <span className="metaPill">Positions: {providerConnection.positions_count}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="providerActions fullWidth">
                            <input
                              className="providerLabelInput"
                              onChange={(event) => setProviderLabels((state) => ({ ...state, [provider.code]: event.target.value }))}
                              placeholder="Libelle visible dans le dashboard"
                              type="text"
                              value={providerLabels[provider.code] ?? ''}
                            />
                            <button
                              className="secondaryButton"
                              disabled={submitting}
                              onClick={() => toggleIntegration(provider.code, provider.status === 'available' || provider.status === 'disabled', providerLabels[provider.code])}
                              type="button"
                            >
                              {provider.status === 'available' || provider.status === 'disabled' ? 'Activer le suivi' : 'Retirer du suivi'}
                            </button>
                          </div>
                          {provider.code === 'coinbase' ? (
                            <div className="integrationCredentialBox">
                              <label>
                                API key Coinbase
                                <input value={providerKeyState.apiKey} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, apiKey: event.target.value } }))} type="text" placeholder="organizations/.../apiKeys/..." />
                              </label>
                              <label>
                                API secret Coinbase
                                <textarea value={providerKeyState.apiSecret} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, apiSecret: event.target.value } }))} placeholder="-----BEGIN EC PRIVATE KEY-----" rows={5} />
                              </label>
                              <label>
                                Portfolio ID Coinbase (optionnel)
                                <input value={providerKeyState.portfolioId} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, portfolioId: event.target.value } }))} type="text" placeholder="portfolio uuid" />
                              </label>
                              {providerConnection?.last_sync_error ? <p className="helperText">Derniere erreur: {providerConnection.last_sync_error}</p> : null}
                              <div className="providerActions fullWidth">
                                <button className="secondaryButton" disabled={submitting} onClick={() => void saveIntegrationCredentials(provider.code)} type="button">
                                  {submitting ? 'Sauvegarde...' : 'Sauvegarder les credentials'}
                                </button>
                                <button className="ghostButton" disabled={submitting || !providerConnection?.has_credentials} onClick={() => void syncIntegration(provider.code)} type="button">
                                  {submitting ? 'Synchronisation...' : 'Synchroniser Coinbase'}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )})}
                    </div>
                  </>
                ) : (
                  <p className="helperText">Chargement des integrations...</p>
                )}
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Preferences de communication</h2>
                  <span>Email et autres canaux</span>
                </div>
                <div className="preferenceGroup">
                  <label className="checkRow">
                    <input checked={settingsForm.notifyEmail} onChange={(event) => setSettingsForm((state) => ({ ...state, notifyEmail: event.target.checked }))} type="checkbox" />
                    <span>Recevoir les notifications par email</span>
                  </label>
                  <label className="checkRow">
                    <input checked={settingsForm.notifySms} onChange={(event) => setSettingsForm((state) => ({ ...state, notifySms: event.target.checked }))} type="checkbox" />
                    <span>Recevoir les alertes critiques par SMS</span>
                  </label>
                  <label className="checkRow">
                    <input checked={settingsForm.notifyWhatsapp} onChange={(event) => setSettingsForm((state) => ({ ...state, notifyWhatsapp: event.target.checked }))} type="checkbox" />
                    <span>Recevoir un recap sur WhatsApp</span>
                  </label>
                  <label className="checkRow">
                    <input checked={settingsForm.notifyPush} onChange={(event) => setSettingsForm((state) => ({ ...state, notifyPush: event.target.checked }))} type="checkbox" />
                    <span>Recevoir des notifications push navigateur</span>
                  </label>
                  <label className="checkRow">
                    <input checked={settingsForm.weeklyDigest} onChange={(event) => setSettingsForm((state) => ({ ...state, weeklyDigest: event.target.checked }))} type="checkbox" />
                    <span>Recevoir le digest hebdomadaire</span>
                  </label>
                  <label className="checkRow">
                    <input checked={settingsForm.marketAlerts} onChange={(event) => setSettingsForm((state) => ({ ...state, marketAlerts: event.target.checked }))} type="checkbox" />
                    <span>Recevoir les alertes de marche importantes</span>
                  </label>
                  <label>
                    Frequence preferee
                    <select value={settingsForm.communicationFrequency} onChange={(event) => setSettingsForm((state) => ({ ...state, communicationFrequency: event.target.value }))}>
                      <option value="important_only">Seulement l essentiel</option>
                      <option value="daily">Quotidienne</option>
                      <option value="weekly">Hebdomadaire</option>
                    </select>
                  </label>
                  <button className="secondaryButton" disabled={submitting} onClick={() => void submitSettingsUpdate()} type="button">
                    {submitting ? 'Enregistrement...' : 'Sauvegarder les preferences de communication'}
                  </button>
                </div>
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
                    <p>Votre compte est protege par une authentification a deux facteurs. Mode actif: {String(user.personal_settings.preferred_mfa_method ?? 'email')}.</p>
                    <div className="providerActions fullWidth" style={{ marginTop: '10px' }}>
                      <button className="secondaryButton" disabled={submitting} onClick={() => void startMfaSetup('email')} type="button">
                        {submitting && mfaSetupMethod === 'email' ? 'Envoi...' : 'Reconfigurer par email'}
                      </button>
                      <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('totp')} type="button">
                        {submitting && mfaSetupMethod === 'totp' ? 'Generation...' : 'Regenerer QR MFA'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mfaSteps">
                    <div className="mfaStep">
                      <div className="mfaStepNum">1</div>
                      <div className="mfaStepBody">
                        <strong>Choisir votre second facteur</strong>
                        <p>Le mode recommande est le code email integre, sans application tierce. Le QR code reste disponible si vous preferez un gestionnaire d authentification.</p>
                        <div className="providerActions fullWidth" style={{ marginTop: '10px' }}>
                          <button className="secondaryButton" disabled={submitting} onClick={() => void startMfaSetup('email')} type="button">
                            {submitting && mfaSetupMethod === 'email' ? 'Envoi...' : 'Utiliser un code email'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('totp')} type="button">
                            {submitting && mfaSetupMethod === 'totp' ? 'Generation...' : 'Afficher un QR code'}
                          </button>
                        </div>
                        {mfaDeliveryHint ? <p className="helperText" style={{ marginTop: '8px' }}>{mfaDeliveryHint}</p> : null}
                        {mfaPreviewCode ? <div className="mfaSecret">{mfaPreviewCode}</div> : null}
                      </div>
                    </div>

                    {mfaSetupMethod === 'totp' && mfaSecret ? (
                      <>
                        <div className="mfaStep">
                          <div className="mfaStepNum">2</div>
                          <div className="mfaStepBody">
                            <strong>Scanner ou ouvrir le QR code</strong>
                            <p>Le QR est affiche ci-dessous avec le secret brut et l URI complete pour rester accessible.</p>
                            {mfaUri ? (
                              <div className="mfaQrWrap">
                                {mfaQrDataUrl ? (
                                  <>
                                    <img
                                      alt="QR code MFA"
                                      className="mfaQrImage"
                                      height={180}
                                      src={mfaQrDataUrl}
                                      width={180}
                                    />
                                    <a className="textLinkButton" href={mfaQrDataUrl} target="_blank" rel="noreferrer">Ouvrir le QR code en plein ecran</a>
                                  </>
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
                            <strong>Confirmer l activation</strong>
                            <p>Entrez uniquement les chiffres du code affiche dans votre application (sans espace). Le code change toutes les 30 secondes.</p>
                            <form className="authForm" onSubmit={verifyMfa} style={{marginTop:'10px'}}>
                              <input
                                value={mfaCode}
                                onChange={(event) => setMfaCode(normalizeOtpInput(event.target.value))}
                                type="text" inputMode="numeric" placeholder="123 456"
                                style={{letterSpacing:'.2em',textAlign:'center',fontSize:'1.2rem'}}
                                autoComplete="one-time-code"
                                required
                              />
                              <button className="primaryButton" disabled={submitting} type="submit">
                                {submitting ? 'Verification...' : (user.mfa_enabled ? 'Valider le nouveau QR MFA' : 'Activer MFA maintenant')}
                              </button>
                            </form>
                          </div>
                        </div>
                      </>
                    ) : mfaSetupMethod === 'email' && (mfaDeliveryHint || mfaPreviewCode) ? (
                      <div className="mfaStep">
                        <div className="mfaStepNum">2</div>
                        <div className="mfaStepBody">
                          <strong>Valider le code email</strong>
                          <p>Le code est envoye sur votre email principal pour l activation.</p>
                          <form className="authForm" onSubmit={verifyMfa} style={{marginTop:'10px'}}>
                            <input
                              value={mfaCode}
                              onChange={(event) => setMfaCode(normalizeOtpInput(event.target.value))}
                              type="text" inputMode="numeric" placeholder="123 456"
                              style={{letterSpacing:'.2em',textAlign:'center',fontSize:'1.2rem'}}
                              autoComplete="one-time-code"
                              required
                            />
                            <button className="primaryButton" disabled={submitting} type="submit">
                              {submitting ? 'Verification...' : 'Activer MFA email'}
                            </button>
                          </form>
                        </div>
                      </div>
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