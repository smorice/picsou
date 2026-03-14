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
  portfolios: Array<{
    portfolio_id: string;
    provider_code: string;
    provider_name: string;
    label: string;
    status: string;
    agent_name: string;
    current_value?: string | null;
    last_sync_status?: string | null;
    history_points?: Array<{ date: string; value: number }>;
    latest_actions?: Array<{ asset: string; action: string; amount: number; date?: string; fee?: number; trade_id?: string }>;
  }>;
  virtual_portfolio: {
    portfolio_id: string;
    label: string;
    budget_initial: string;
    current_value: string;
    pnl: string;
    roi: number;
    history_points: Array<{ date: string; value: number }>;
    strategy_mix: Array<{ class: string; weight: number }>;
    latest_actions: Array<{ asset: string; action: string; amount: number }>;
    agent_name: string;
  };
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
  method: 'email' | 'totp' | 'sms' | 'whatsapp' | 'google_chat';
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

type TradeProposalResponse = {
  proposal_id: string;
  status: string;
  approval_required: boolean;
  detail?: unknown;
};

type TradeApprovalResponse = {
  proposal_id: string;
  status: string;
  detail?: unknown;
};

type IntegrationBulkSyncResponse = {
  synced: number;
  skipped: number;
  failed: number;
  summaries: Array<{ provider_code: string; status: string; message: string }>;
};

type CommunicationTestResponse = {
  channel: 'email' | 'sms' | 'whatsapp' | 'google_chat' | 'telegram' | 'push';
  status: 'ok' | 'error';
  message: string;
  detail?: unknown;
};

type CommunicationTestRequest = {
  channel: 'email' | 'sms' | 'whatsapp' | 'google_chat' | 'telegram' | 'push';
  phone_number?: string | null;
  google_chat_webhook?: string | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
};

type Portfolio = {
  id: string;
  type: 'integration' | 'virtual';
  provider_code?: string;
  label: string;
  current_value: number;
  budget: number;
  pnl: number;
  roi: number;
  visible: boolean;
  status: 'active' | 'disabled' | 'pending_user_consent' | 'available';
  last_sync_at?: string | null;
  agent_name: string;
  history: Array<{ date: string; value: number }>;
  operations: Array<{
    id: string;
    date: string;
    side: 'buy' | 'sell';
    asset: string;
    amount: number;
    tax_state: number | null;
    tax_intermediary: number | null;
    intermediary: string;
  }>;
  ai_advice: Array<{ kind: 'buy' | 'sell' | 'hold' | 'info'; text: string }>;
  allocation: Array<{ class: string; weight: number; value: number }>;
};

type InsightItem = {
  id: string;
  title: string;
  value: string;
  trend: string;
  detail: string;
  section: 'decisions' | 'indicator' | 'coach' | 'source';
  portfolio_id?: string;
  portfolio_label?: string;
};

type AppliedDecision = {
  id: string;
  title: string;
  portfolio_label: string;
  action: 'buy' | 'sell';
  amount: number;
  applied_at: string;
};

type Holding = {
  asset: string;
  firstBuyDate: string;
  totalBought: number;
  totalSold: number;
  netInvested: number;
  fees: number;
  operationCount: number;
  estimatedCurrentValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  estimatedSellFee: number;
  taxFRIfSold: number;
  intermediary: string;
};

type MarketSignal = {
  id: string;
  category: 'crypto' | 'actions' | 'etf' | 'obligations';
  name: string;
  symbol: string;
  performance_30d: number;
  confidence: number; // 1-5
  rationale: string;
  risk: 'faible' | 'modere' | 'eleve';
  min_investment: number;
};

type AgentMode = 'manual' | 'autopilot';
type AgentDomain = 'crypto' | 'actions' | 'etf' | 'obligations';
type AgentDomainPolicy = 'prefer' | 'allow' | 'reject';

type AgentQuotaConfig = {
  enabled: boolean;
  mode: AgentMode;
  max_amount: number;
  max_transactions_per_day: number;
  domain_policy: Record<AgentDomain, AgentDomainPolicy>;
};

const DEFAULT_AGENT_CONFIG: AgentQuotaConfig = {
  enabled: false,
  mode: 'manual',
  max_amount: 250,
  max_transactions_per_day: 3,
  domain_policy: {
    crypto: 'allow',
    actions: 'allow',
    etf: 'prefer',
    obligations: 'allow',
  },
};

const PROVIDER_AGENT_NAMES: Record<string, string> = {
  coinbase: 'Agent Crypto Momentum',
  interactive_brokers: 'Agent Multi-Marches Pro',
  trade_republic: 'Agent Growth ETF',
};

function resolveAgentNameFe(providerCode: string): string {
  return PROVIDER_AGENT_NAMES[providerCode] ?? `Agent ${providerCode}`;
}

function computeHoldings(
  operations: Portfolio['operations'],
  portfolioROI: number
): Holding[] {
  const SELL_FEE_RATE = 0.003;
  const PFU_RATE = 0.30;
  const byAsset = new Map<string, {
    asset: string; firstBuyDate: string; totalBought: number; totalSold: number;
    fees: number; operationCount: number; intermediary: string;
  }>();
  for (const op of operations) {
    if (!byAsset.has(op.asset)) {
      byAsset.set(op.asset, { asset: op.asset, firstBuyDate: op.date, totalBought: 0, totalSold: 0, fees: 0, operationCount: 0, intermediary: op.intermediary });
    }
    const h = byAsset.get(op.asset)!;
    if (op.side === 'buy') {
      h.totalBought += op.amount;
      if (op.date < h.firstBuyDate) h.firstBuyDate = op.date;
    } else {
      h.totalSold += op.amount;
    }
    if (op.tax_intermediary !== null) h.fees += op.tax_intermediary;
    h.operationCount++;
  }
  return Array.from(byAsset.values())
    .filter((h) => h.totalBought - h.totalSold > 0.01)
    .map((h) => {
      const netInvested = h.totalBought - h.totalSold;
      const roiMultiplier = portfolioROI !== 0 ? (1 + portfolioROI / 100) : 1;
      const estimatedCurrentValue = netInvested * roiMultiplier;
      const unrealizedPnl = estimatedCurrentValue - netInvested;
      const unrealizedPct = netInvested > 0 ? (unrealizedPnl / netInvested) * 100 : 0;
      const estimatedSellFee = estimatedCurrentValue * SELL_FEE_RATE;
      const taxFRIfSold = unrealizedPnl > 0 ? unrealizedPnl * PFU_RATE : 0;
      return { ...h, netInvested, estimatedCurrentValue, unrealizedPnl, unrealizedPct, estimatedSellFee, taxFRIfSold };
    })
    .sort((a, b) => b.netInvested - a.netInvested);
}

function buildOperationsFromSyncActions(
  actions: Array<{ asset: string; action: string; amount: number; date?: string; fee?: number; trade_id?: string }>,
  providerCode: string | undefined,
  intermediary: string
) {
  return actions
    .slice()
    .sort((a, b) => {
      const da = Date.parse(a.date || '');
      const db = Date.parse(b.date || '');
      return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    })
    .map((action, index) => {
      const side: 'buy' | 'sell' = action.action.toLowerCase() === 'sell' ? 'sell' : 'buy';
      const amount = Math.max(0, action.amount ?? 0);
      const realFee = typeof action.fee === 'number' && Number.isFinite(action.fee) ? Math.max(0, action.fee) : null;
      return {
        id: action.trade_id ? `${providerCode ?? 'provider'}-sync-op-${action.trade_id}` : `${providerCode ?? 'provider'}-sync-op-${index}`,
        date: action.date || new Date().toISOString(),
        side,
        asset: action.asset || (providerCode === 'coinbase' ? 'Crypto Basket' : 'Portfolio Basket'),
        amount,
        tax_state: null,
        tax_intermediary: realFee,
        intermediary,
      };
    })
    .slice(0, 40);
}

function buildAllPortfolios(
  dashboard: DashboardData | null,
  integrations: IntegrationConnection[],
  visibility: Record<string, boolean>
): Portfolio[] {
  if (!dashboard) {
    return [];
  }

  const dashboardByProvider = new Map(
    dashboard.portfolios
      .filter((item) => item.provider_code !== 'virtual_alpha')
      .map((item) => [item.provider_code, item])
  );

  const integrationPortfolios: Portfolio[] = integrations.map((connection) => {
    const item = dashboardByProvider.get(connection.provider_code);
    const rawValue = item?.current_value !== null && item?.current_value !== undefined
      ? parseFloat(item.current_value)
      : connection.last_snapshot_total_value
        ? parseFloat(connection.last_snapshot_total_value)
        : 0;
    const backendHistory = (item?.history_points ?? []).filter((point) => Number.isFinite(point.value));
    const history = backendHistory.length >= 2 ? backendHistory : [];
    const backendActions = item?.latest_actions ?? [];
    const operations = backendActions.length > 0
      ? buildOperationsFromSyncActions(backendActions, connection.provider_code, connection.provider_name)
      : [];

    return {
      id: connection.provider_code,
      type: 'integration',
      provider_code: connection.provider_code,
      label: connection.account_label || item?.label || connection.provider_name,
      current_value: rawValue,
      budget: 0,
      pnl: 0,
      roi: 0,
      visible: visibility[connection.provider_code] !== false,
      status: connection.status as 'active' | 'disabled' | 'pending_user_consent' | 'available',
      last_sync_at: connection.last_sync_at ?? null,
      agent_name: item?.agent_name || resolveAgentNameFe(connection.provider_code),
      history,
      operations,
      ai_advice: [
        { kind: 'info', text: `${connection.provider_name} connecté. Statut sync: ${connection.last_sync_status ?? 'inconnu'}.` },
        { kind: 'hold', text: backendActions.length > 0 ? 'Les derniers mouvements proviennent des synchronisations Coinbase.' : rawValue > 0 ? 'Données disponibles. Synchronisez régulièrement pour des conseils IA affinés.' : 'Synchronisez pour récupérer vos positions et des conseils personnalisés.' },
      ],
      allocation: rawValue > 0 ? [{ class: 'Investissements', weight: 100, value: rawValue }] : [],
    };
  });

  const vp = dashboard.virtual_portfolio;
  const vpValue = parseFloat(vp.current_value) || 0;
  const vpBudget = parseFloat(vp.budget_initial) || 100;
  const vpPnl = parseFloat(vp.pnl) || 0;
  const vpOps = vp.latest_actions.map((a, i) => ({
    id: `virtual-op-${i}`,
    date: new Date(Date.now() - (vp.latest_actions.length - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
    side: a.action.toLowerCase() === 'sell' ? 'sell' as const : 'buy' as const,
    asset: a.asset,
    amount: Math.max(0, a.amount),
    tax_state: null,
    tax_intermediary: null,
    intermediary: 'Picsou IA (virtuel)',
  }));
  const virtualPortfolio: Portfolio = {
    id: vp.portfolio_id,
    type: 'virtual',
    label: vp.label || 'Portefeuille Virtuel IA',
    current_value: vpValue,
    budget: vpBudget,
    pnl: vpPnl,
    roi: vp.roi,
    visible: visibility[vp.portfolio_id] !== false,
    status: 'active',
    last_sync_at: null,
    agent_name: vp.agent_name,
    history: vp.history_points,
    operations: vpOps,
    ai_advice: [
      { kind: 'info', text: `Bac à sable virtuel — budget initial : ${vpBudget.toFixed(0)} €. Picsou IA teste ses stratégies ici sans risque réel.` },
      vpPnl > 0
        ? { kind: 'hold', text: `Performance actuelle : +${vpPnl.toFixed(2)} € (+${(vp.roi >= 0 ? '+' : '')}${(vp.roi).toFixed(1)}%). L IA surperforme.` }
        : vpPnl < 0
          ? { kind: 'sell', text: `Sous-performance virtuelle : ${vpPnl.toFixed(2)} €. L IA ajuste sa stratégie sans impact réel.` }
          : { kind: 'info', text: 'Aucune activité virtuelle pour l instant. Souscrivez à un signal marché pour tester Picsou IA.' },
    ],
    allocation: vp.strategy_mix.length > 0
      ? vp.strategy_mix.map((m) => ({ class: m.class, weight: m.weight, value: vpValue * m.weight / 100 }))
      : (vpValue > 0 ? [{ class: 'Cash IA', weight: 100, value: vpValue }] : []),
  };

  return [virtualPortfolio, ...integrationPortfolios];
}

function Sparkline({ data, color = 'var(--brand)' }: { data: Array<{ value: number }>; color?: string }) {
  if (data.length < 2) {
    return (
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Synchronisation requise</span>
      </div>
    );
  }
  const W = 400; const H = 56;
  const min = Math.min(...data.map((p) => p.value));
  const max = Math.max(...data.map((p) => p.value));
  const range = max - min || 1;
  const coords = data.map((p, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 4 - ((p.value - min) / range) * (H - 12);
    return [x, y] as [number, number];
  });
  const polyline = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;
  const gradId = `sg${data.length}x${Math.round(data[0]?.value ?? 0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 56 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const ACCESS_TOKEN_KEY = 'picsou_access_token';
const REFRESH_TOKEN_KEY = 'picsou_refresh_token';
const SESSION_LAST_ACTIVITY_AT_KEY = 'picsou_session_last_activity_at';
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const COOKIE_SESSION_MARKER = '__cookie_session__';
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

function authHeader(token: string | null | undefined) {
  if (!token || token === COOKIE_SESSION_MARKER) {
    return {} as Record<string, string>;
  }
  return { Authorization: `Bearer ${token}` };
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
    autoRefreshSeconds: String(user?.personal_settings.auto_refresh_seconds ?? '30'),
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

function trendTone(value: string) {
  const normalized = value.toLowerCase();
  if (/(hausse|progress|ameli|up|bull|positif|\+)/.test(normalized)) {
    return 'up';
  }
  if (/(baisse|repli|down|bear|negatif|drawdown|-)/.test(normalized)) {
    return 'down';
  }
  return 'neutral';
}

function trendPrefix(value: string) {
  if (/^[↑↓→]/.test(value.trim())) {
    return '';
  }
  const tone = trendTone(value);
  if (tone === 'up') {
    return '↑';
  }
  if (tone === 'down') {
    return '↓';
  }
  return '→';
}

function trendFromScore(score: number) {
  if (score >= 80) {
    return '↑ Priorite haute';
  }
  if (score >= 65) {
    return '→ Priorite stable';
  }
  return '↓ Priorite faible';
}

function scoreToConfidenceLevel(score: number) {
  if (score >= 80) {
    return 3;
  }
  if (score >= 60) {
    return 2;
  }
  return 1;
}

function projectionConfidenceFromHistory(history: Array<{ date: string; value: number }>) {
  const parsed = history
    .map((point) => Date.parse(point.date))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (parsed.length < 2) {
    return 1;
  }
  const spanDays = (parsed[parsed.length - 1] - parsed[0]) / (24 * 60 * 60 * 1000);
  if (spanDays >= 180 && parsed.length >= 24) {
    return 3;
  }
  if (spanDays >= 30 && parsed.length >= 8) {
    return 2;
  }
  return 1;
}

function toneFromTrend(trend: string) {
  return trendTone(trend) as 'up' | 'down' | 'neutral';
}

function evolutionTone(value: number) {
  if (value > 0.05) {
    return 'up';
  }
  if (value < -0.05) {
    return 'down';
  }
  return 'neutral';
}

function formatPortfolioEvolution(history: Array<{ date: string; value: number }>, days: number) {
  if (history.length < 2) {
    return { value: 'n/d', tone: 'neutral' as const };
  }
  const points = history
    .map((point) => ({ ...point, ts: Date.parse(point.date) }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  if (points.length < 2) {
    return { value: 'n/d', tone: 'neutral' as const };
  }
  const nowTs = points[points.length - 1].ts;
  const targetTs = nowTs - days * 24 * 60 * 60 * 1000;
  const basePoint = [...points].reverse().find((point) => point.ts <= targetTs) ?? points[0];
  const current = points[points.length - 1]?.value ?? 0;
  const base = basePoint?.value ?? 0;
  if (base <= 0) {
    return { value: 'n/d', tone: 'neutral' as const };
  }
  const changePct = ((current - base) / base) * 100;
  return {
    value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
    tone: evolutionTone(changePct) as 'up' | 'down' | 'neutral',
  };
}

function aggregatePortfolioHistory(portfolios: Portfolio[]) {
  const withHistory = portfolios.filter((portfolio) => portfolio.history.length > 1);
  if (withHistory.length === 0) {
    return [] as Array<{ date: string; value: number }>;
  }
  const minLength = Math.min(...withHistory.map((portfolio) => portfolio.history.length));
  return Array.from({ length: minLength }, (_, index) => {
    const date = withHistory[0].history[withHistory[0].history.length - minLength + index].date;
    const value = withHistory.reduce((sum, portfolio) => {
      const point = portfolio.history[portfolio.history.length - minLength + index];
      return sum + (point?.value ?? 0);
    }, 0);
    return { date, value };
  });
}

function filterHistoryByScale(history: Array<{ date: string; value: number }>, scale: '5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '1m' | '3m' | '1y' | '2y') {
  const windowsMs: Record<typeof scale, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 1 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '2y': 730 * 24 * 60 * 60 * 1000,
  };
  const parsed = history
    .map((point) => ({ ...point, ts: Date.parse(point.date) }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  if (parsed.length === 0) {
    return [] as Array<{ date: string; value: number }>;
  }
  const lastTs = parsed[parsed.length - 1].ts;
  const cutoffTs = lastTs - windowsMs[scale];
  const filtered = parsed.filter((point) => point.ts >= cutoffTs).map((point) => ({ date: point.date, value: point.value }));
  if (filtered.length >= 2) {
    return filtered;
  }
  return parsed.slice(-Math.max(2, Math.ceil(parsed.length * 0.1))).map((point) => ({ date: point.date, value: point.value }));
}

const MARKET_SIGNALS: MarketSignal[] = [
  // Crypto
  { id: 'btc', category: 'crypto', name: 'Bitcoin', symbol: 'BTC', performance_30d: 12.4, confidence: 4, rationale: 'Demande institutionnelle soutenue. ETF spot en forte collecte. Momentum haussier confirmé sur les 30 derniers jours.', risk: 'eleve', min_investment: 10 },
  { id: 'eth', category: 'crypto', name: 'Ethereum', symbol: 'ETH', performance_30d: 8.7, confidence: 3, rationale: 'Hausse du TVL DeFi et adoption L2. Signal technique modéré. Corrélation BTC élevée.', risk: 'eleve', min_investment: 10 },
  { id: 'sol', category: 'crypto', name: 'Solana', symbol: 'SOL', performance_30d: 18.2, confidence: 3, rationale: 'Croissance du nombre de transactions, adoption gaming/DePIN. Volatilité élevée à surveiller.', risk: 'eleve', min_investment: 10 },
  // Actions
  { id: 'nvda', category: 'actions', name: 'NVIDIA', symbol: 'NVDA', performance_30d: 6.3, confidence: 4, rationale: 'Demande centres de données IA Blackwell dépasse les capacités de production. BPA estimé +85% exercice.', risk: 'modere', min_investment: 50 },
  { id: 'msft', category: 'actions', name: 'Microsoft', symbol: 'MSFT', performance_30d: 3.1, confidence: 4, rationale: 'Azure AI et Copilot M365 en forte croissance. Flux de trésorerie solides. Position défensive et croissance.', risk: 'modere', min_investment: 50 },
  { id: 'mc', category: 'actions', name: 'LVMH', symbol: 'MC', performance_30d: -1.2, confidence: 2, rationale: 'Reprise progressive du marché du luxe. Pression persistante sur les marges côté Chine. Signal attentiste.', risk: 'modere', min_investment: 50 },
  // ETF
  { id: 'cw8', category: 'etf', name: 'Amundi MSCI World (CW8)', symbol: 'CW8', performance_30d: 4.5, confidence: 5, rationale: 'Meilleur rapport rendement/risque ajusté sur 5 ans. Exposition monde maximale, frais réduits. Cœur de portefeuille.', risk: 'faible', min_investment: 20 },
  { id: 'cspx', category: 'etf', name: 'iShares Core S&P 500', symbol: 'CSPX', performance_30d: 5.2, confidence: 5, rationale: 'Rebond post-correction T1 2026. Ratio Sharpe favorable. Concentration US à surveiller mais flux soutenu.', risk: 'faible', min_investment: 20 },
  { id: 'ust', category: 'etf', name: 'Lyxor Nasdaq 100', symbol: 'UST', performance_30d: 7.8, confidence: 4, rationale: 'Concentration IA/tech. Surperformance vs monde. Volatilité modérée. Complémentaire CW8.', risk: 'modere', min_investment: 20 },
  // Obligations
  { id: 'oat', category: 'obligations', name: 'OAT France 10 ans', symbol: 'OAT10', performance_30d: 0.8, confidence: 3, rationale: 'Proche du pic de taux. Potentiel de plus-value si la BCE confirme son cycle de baisse. Rendement ~3.5%.', risk: 'faible', min_investment: 100 },
  { id: 'igln', category: 'obligations', name: 'iShares Green Bond', symbol: 'IGLN', performance_30d: 1.2, confidence: 3, rationale: 'Rendement annualisé 3.8%. Demande ESG institutionnelle soutenue. Duration maîtrisée.', risk: 'faible', min_investment: 50 },
  { id: 'ihyg', category: 'obligations', name: 'iShares EUR High Yield', symbol: 'IHYG', performance_30d: 2.1, confidence: 3, rationale: 'Spread HY en compression. Rendement 5.9%. Prime de risque de crédit attrayante en contexte de baisse de taux.', risk: 'modere', min_investment: 50 },
];

export default function PicsouApp() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [appView, setAppView] = useState<'dashboard' | 'portfolios' | 'settings' | 'admin'>('dashboard');
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
  const [mfaSetupMethod, setMfaSetupMethod] = useState<'email' | 'totp' | 'sms' | 'whatsapp' | 'google_chat'>('email');
  const [loginMfaMethod, setLoginMfaMethod] = useState<'email' | 'totp' | 'sms' | 'whatsapp' | 'google_chat'>('totp');
  const [mfaDeliveryHint, setMfaDeliveryHint] = useState<string | null>(null);
  const [mfaPreviewCode, setMfaPreviewCode] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [adminConnections, setAdminConnections] = useState<Record<string, Array<{ provider_name: string; provider_code: string; status: string; account_label?: string | null }>>>({});
  const [providerLabels, setProviderLabels] = useState<Record<string, string>>({});
  const [integrationConnections, setIntegrationConnections] = useState<IntegrationConnection[]>([]);
  const [providerKeys, setProviderKeys] = useState<Record<string, { apiKey: string; apiSecret: string; portfolioId: string }>>({});
  const [clientContext] = useState<ClientContext>(resolveClientContext);
  const [portfolioDetailOpen, setPortfolioDetailOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [portfolioHistoryScale, setPortfolioHistoryScale] = useState<'5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '1m' | '3m' | '1y' | '2y'>('1m');
  const [portfolioVisibility, setPortfolioVisibility] = useState<Record<string, boolean>>({});
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [communicationTestResult, setCommunicationTestResult] = useState<string | null>(null);
  const [commGoogleChat, setCommGoogleChat] = useState({ enabled: false, webhook: '' });
  const [commTelegram, setCommTelegram] = useState({ enabled: false, botToken: '', chatId: '' });
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);
  const [settingsTileCollapsed, setSettingsTileCollapsed] = useState<Record<string, boolean>>({
    intro: true,
    profile: true,
    agent: true,
    virtual: false,
    sources: true,
    communication: true,
    security: true,
    config: true,
  });
  const [decisionActionLoading, setDecisionActionLoading] = useState(false);
  const [resolvedDecisionKeys, setResolvedDecisionKeys] = useState<Record<string, true>>({});
  const [appliedDecisions, setAppliedDecisions] = useState<AppliedDecision[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentQuotaConfig>>({});
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [emergencyStopActive, setEmergencyStopActive] = useState(false);
  const [adminTransactionLog, setAdminTransactionLog] = useState<Array<{ id: string; user_id: string; user_name: string; portfolio_id: string; asset: string; side: string; amount: number; status: string; created_at: string }>>([]);
  const [marketSignalFilter, setMarketSignalFilter] = useState<'all' | 'crypto' | 'actions' | 'etf' | 'obligations'>('all');
  const [subscribeSignalId, setSubscribeSignalId] = useState<string | null>(null);
  const [subscribePortfolioId, setSubscribePortfolioId] = useState<string>('');
  const [subscribeAmount, setSubscribeAmount] = useState<number>(50);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  useEffect(() => {
    const storedAccess = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
    const mode = queryParams.get('mode');
    const token = queryParams.get('token');
    const oauthAccess = hashParams.get('oauth_access') ?? queryParams.get('oauth_access');
    const oauthRefresh = hashParams.get('oauth_refresh') ?? queryParams.get('oauth_refresh');
    const oauthError = queryParams.get('oauth_error') ?? hashParams.get('oauth_error');

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
      persistSession(COOKIE_SESSION_MARKER, COOKIE_SESSION_MARKER, true);
      setAccessToken(COOKIE_SESSION_MARKER);
      setRefreshToken(COOKIE_SESSION_MARKER);
      return;
    }

    if (mode === 'reset') {
      setResetPanelOpen(true);
    }
    if (token) {
      setResetToken(token);
      setResetPanelOpen(true);
    }
    if (storedAccess || storedRefresh) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (!sessionStorage.getItem(SESSION_LAST_ACTIVITY_AT_KEY)) {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
    }
    setAccessToken(COOKIE_SESSION_MARKER);
    setRefreshToken(COOKIE_SESSION_MARKER);
  }, []);

  useEffect(() => {
    fetch(apiUrl('/auth/oauth/providers'))
      .then((r) => r.ok ? r.json() : [])
      .then((data: OAuthProvider[]) => setOauthProviders(data.filter((p) => p.enabled)))
      .catch(() => setOauthProviders([]));
  }, []);

  useEffect(() => {
    if (!user) {
      setAgentConfigs({});
      return;
    }
    setSettingsForm(defaultSettingsFromUser(user));
    const savedVisibility = (user.personal_settings.portfolio_visibility ?? {}) as Record<string, unknown>;
    const nextVisibility: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(savedVisibility)) {
      nextVisibility[key] = value !== false;
    }
    setPortfolioVisibility(nextVisibility);

    const savedDecisionResolutions = (user.personal_settings.decision_resolutions ?? {}) as Record<string, unknown>;
    const nextDecisionResolutions: Record<string, true> = {};
    for (const [key, value] of Object.entries(savedDecisionResolutions)) {
      if (value === true) {
        nextDecisionResolutions[key] = true;
      }
    }
    setResolvedDecisionKeys(nextDecisionResolutions);

    const savedAgentConfigs = (user.personal_settings.agent_quotas ?? {}) as Record<string, unknown>;
    const nextAgentConfigs: Record<string, AgentQuotaConfig> = {};
    for (const [portfolioId, raw] of Object.entries(savedAgentConfigs)) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const source = raw as Record<string, unknown>;
      const domainSource = (source.domain_policy ?? {}) as Record<string, unknown>;
      nextAgentConfigs[portfolioId] = {
        enabled: source.enabled === true,
        mode: source.mode === 'autopilot' ? 'autopilot' : 'manual',
        max_amount: Math.max(1, Number(source.max_amount ?? DEFAULT_AGENT_CONFIG.max_amount) || DEFAULT_AGENT_CONFIG.max_amount),
        max_transactions_per_day: Math.max(1, Number(source.max_transactions_per_day ?? DEFAULT_AGENT_CONFIG.max_transactions_per_day) || DEFAULT_AGENT_CONFIG.max_transactions_per_day),
        domain_policy: {
          crypto: domainSource.crypto === 'reject' || domainSource.crypto === 'prefer' ? domainSource.crypto : 'allow',
          actions: domainSource.actions === 'reject' || domainSource.actions === 'prefer' ? domainSource.actions : 'allow',
          etf: domainSource.etf === 'reject' || domainSource.etf === 'prefer' ? domainSource.etf : 'allow',
          obligations: domainSource.obligations === 'reject' || domainSource.obligations === 'prefer' ? domainSource.obligations : 'allow',
        },
      };
    }
    setAgentConfigs(nextAgentConfigs);

    const googleChat = (user.personal_settings.communication_google_chat ?? {}) as Record<string, unknown>;
    setCommGoogleChat({
      enabled: googleChat.enabled === true,
      webhook: typeof googleChat.webhook === 'string' ? googleChat.webhook : '',
    });

    const telegram = (user.personal_settings.communication_telegram ?? {}) as Record<string, unknown>;
    setCommTelegram({
      enabled: telegram.enabled === true,
      botToken: typeof telegram.bot_token === 'string' ? telegram.bot_token : '',
      chatId: typeof telegram.chat_id === 'string' ? telegram.chat_id : '',
    });
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
        const token = accessToken;
        if (!token && token !== COOKIE_SESSION_MARKER) {
          return;
        }
        const meResponse = await fetch(apiUrl('/auth/me'), {
          headers: { ...authHeader(token) },
          credentials: 'include',
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
        await syncAllIntegrations(token, true);
        const [dashboardResponse, integrationsResponse] = await Promise.all([
          fetch(apiUrl('/api/v1/dashboard/primary'), {
            headers: { ...authHeader(token) },
            credentials: 'include',
          }),
          fetch(apiUrl('/api/v1/integrations'), {
            headers: { ...authHeader(token) },
            credentials: 'include',
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
    if (!accessToken || !user) {
      return;
    }
    const shouldRefresh = appView === 'dashboard' || appView === 'portfolios' || portfolioDetailOpen;
    if (!shouldRefresh) {
      return;
    }
    const seconds = Number.parseInt(settingsForm.autoRefreshSeconds, 10);
    const refreshMs = Number.isFinite(seconds) && seconds >= 15 ? seconds * 1000 : 30000;
    const intervalId = window.setInterval(() => {
      void refreshWorkspaceData(accessToken, { syncAll: true, silentSync: true });
    }, refreshMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [accessToken, user, appView, portfolioDetailOpen, settingsForm.autoRefreshSeconds]);

  useEffect(() => {
    if (user) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user?.id]);

  async function refreshSession(token: string) {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token === COOKIE_SESSION_MARKER ? {} : { refresh_token: token }),
      credentials: 'include',
    });
    if (!response.ok) {
      clearSession();
      return;
    }
    persistSession(COOKIE_SESSION_MARKER, COOKIE_SESSION_MARKER);
    setAccessToken(COOKIE_SESSION_MARKER);
    setRefreshToken(COOKIE_SESSION_MARKER);
  }

  function persistSession(_newAccessToken: string, _newRefreshToken: string, resetSessionClock = false) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
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
      fetch(apiUrl('/api/v1/admin/users'), { headers: { ...authHeader(token) }, credentials: 'include' }),
      fetch(apiUrl('/api/v1/admin/audit-trail'), { headers: { ...authHeader(token) }, credentials: 'include' }),
    ]);

    if (!usersResponse.ok || !auditResponse.ok) {
      const failedPayload = await readJsonResponse(usersResponse.ok ? auditResponse : usersResponse);
      setAdminFeedback(extractErrorMessage(failedPayload, 'Administration indisponible. Activez puis validez MFA pour continuer.'));
      return;
    }

    setAdminUsers((await readJsonResponse<UserProfile[]>(usersResponse)) ?? []);
    setAuditTrail((await readJsonResponse<AuditEntry[]>(auditResponse)) ?? []);
    setAdminFeedback(null);

    const connsResponse = await fetch(apiUrl('/api/v1/admin/broker-connections'), { headers: { ...authHeader(token) }, credentials: 'include' });
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

  function buildPersonalSettingsPayload(
    overrides: Record<string, unknown> = {},
    visibilityState: Record<string, boolean> = portfolioVisibility,
    decisionState: Record<string, true> = resolvedDecisionKeys
  ) {
    return {
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
      auto_refresh_seconds: Number.parseInt(settingsForm.autoRefreshSeconds, 10) || 30,
      portfolio_visibility: visibilityState,
      decision_resolutions: decisionState,
      agent_quotas: agentConfigs,
      communication_google_chat: {
        enabled: commGoogleChat.enabled,
        webhook: commGoogleChat.webhook,
      },
      communication_telegram: {
        enabled: commTelegram.enabled,
        bot_token: commTelegram.botToken,
        chat_id: commTelegram.chatId,
      },
      ...overrides,
    };
  }

  async function persistDashboardPreferences(nextVisibility: Record<string, boolean>, successMessage = 'Préférences du dashboard mises à jour.') {
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: settingsForm.fullName,
          phone_number: settingsForm.phoneNumber || null,
          client_context: clientContext,
          personal_settings: buildPersonalSettingsPayload({}, nextVisibility, resolvedDecisionKeys),
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Mise à jour impossible'));
      }
      if (!payload) {
        throw new Error('Mise à jour impossible');
      }
      setUser(payload);
      setError(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePortfolioVisibilityPreference(portfolioId: string, visible: boolean) {
    const nextVisibility = { ...portfolioVisibility, [portfolioId]: visible };
    setPortfolioVisibility(nextVisibility);
    await persistDashboardPreferences(nextVisibility, 'Sélection des portefeuilles mise à jour.');
  }

  async function persistDecisionResolutions(nextDecisionState: Record<string, true>) {
    if (!accessToken) {
      return;
    }
    try {
      const response = await fetch(apiUrl('/auth/me/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: settingsForm.fullName,
          phone_number: settingsForm.phoneNumber || null,
          client_context: clientContext,
          personal_settings: buildPersonalSettingsPayload({}, portfolioVisibility, nextDecisionState),
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (response.ok && payload) {
        setUser(payload);
      }
    } catch {
      // Keep local state even if persistence fails.
    }
  }

  async function togglePortfolioActivation(portfolio: Portfolio, enabled: boolean) {
    if (!portfolio.provider_code) {
      return;
    }
    const nextVisibility = { ...portfolioVisibility, [portfolio.id]: enabled };
    setPortfolioVisibility(nextVisibility);
    await toggleIntegration(portfolio.provider_code, enabled, providerLabels[portfolio.provider_code] ?? portfolio.label);
    await persistDashboardPreferences(nextVisibility, 'Activation des portefeuilles mise à jour.');
  }

  async function updateAgentConfig(portfolioId: string, patch: Partial<AgentQuotaConfig>) {
    const current = agentConfigs[portfolioId] ?? DEFAULT_AGENT_CONFIG;
    const nextConfig: AgentQuotaConfig = {
      ...current,
      ...patch,
      domain_policy: {
        ...current.domain_policy,
        ...(patch.domain_policy ?? {}),
      },
      max_amount: Math.max(1, Number((patch.max_amount ?? current.max_amount) || DEFAULT_AGENT_CONFIG.max_amount)),
      max_transactions_per_day: Math.max(1, Number((patch.max_transactions_per_day ?? current.max_transactions_per_day) || DEFAULT_AGENT_CONFIG.max_transactions_per_day)),
    };
    const nextConfigs = { ...agentConfigs, [portfolioId]: nextConfig };
    setAgentConfigs(nextConfigs);

    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(apiUrl('/auth/me/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: settingsForm.fullName,
          phone_number: settingsForm.phoneNumber || null,
          client_context: clientContext,
          personal_settings: {
            ...buildPersonalSettingsPayload(),
            agent_quotas: nextConfigs,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (response.ok && payload) {
        setUser(payload);
      }
    } catch {
      // Keep local settings even if persistence fails.
    }
  }

  async function subscribeToMarketSignal(signal: MarketSignal, targetPortfolioId: string, amount: number) {
    if (!accessToken) return;
    if (emergencyStopActive) {
      setError('Arrêt d urgence actif. Souscription impossible.');
      return;
    }
    setSubscribeLoading(true);
    setError(null);
    try {
      const proposalResponse = await fetch(apiUrl('/api/v1/orders/propose'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(accessToken) },
        credentials: 'include',
        body: JSON.stringify({
          portfolio_id: targetPortfolioId,
          asset_symbol: signal.symbol,
          side: 'buy',
          quantity: Number(amount.toFixed(2)),
          order_type: 'market',
          rationale: `Signal marché Picsou IA — ${signal.name} (${signal.symbol}). ${signal.rationale}`,
        }),
      });
      const proposalPayload = await readJsonResponse<TradeProposalResponse>(proposalResponse);
      if (!proposalResponse.ok || !proposalPayload) {
        throw new Error(extractErrorMessage(proposalPayload, 'Proposition de souscription impossible'));
      }
      if (proposalPayload.approval_required) {
        const approvalResponse = await fetch(apiUrl('/api/v1/orders/approve'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader(accessToken) },
          credentials: 'include',
          body: JSON.stringify({ proposal_id: proposalPayload.proposal_id, approved: true }),
        });
        const approvalPayload = await readJsonResponse<TradeApprovalResponse>(approvalResponse);
        if (!approvalResponse.ok) {
          throw new Error(extractErrorMessage(approvalPayload, 'Validation de souscription impossible'));
        }
      }
      await refreshWorkspaceData(accessToken);
      const targetLabel = allPortfolios.find((p) => p.id === targetPortfolioId)?.label ?? targetPortfolioId;
      setSubscribeSignalId(null);
      setError(`Ordre d achat de ${amount.toFixed(2)} € sur ${signal.name} envoyé vers "${targetLabel}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Souscription impossible');
    } finally {
      setSubscribeLoading(false);
    }
  }

  async function syncAllIntegrations(token: string, silent = true) {
    const response = await fetch(apiUrl('/api/v1/integrations/sync-all'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(token),
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    const payload = await readJsonResponse<IntegrationBulkSyncResponse | { detail?: unknown }>(response);
    if (!response.ok) {
      if (silent && response.status === 403) {
        return null;
      }
      throw new Error(extractErrorMessage(payload, 'Synchronisation globale impossible'));
    }
    return payload as IntegrationBulkSyncResponse | null;
  }

  async function refreshWorkspaceData(token: string, options: { syncAll?: boolean; silentSync?: boolean } = {}) {
    const { syncAll = false, silentSync = true } = options;
    if (syncAll) {
      await syncAllIntegrations(token, silentSync);
    }
    const [dashboardResponse, integrationsResponse] = await Promise.all([
      fetch(apiUrl('/api/v1/dashboard/primary'), {
        headers: { ...authHeader(token) },
        credentials: 'include',
      }),
      fetch(apiUrl('/api/v1/integrations'), {
        headers: { ...authHeader(token) },
        credentials: 'include',
      }),
    ]);

    if (dashboardResponse.ok) {
      setDashboard((await readJsonResponse<DashboardData>(dashboardResponse)) ?? null);
    }
    if (integrationsResponse.ok) {
      setIntegrationConnections((await readJsonResponse<IntegrationConnection[]>(integrationsResponse)) ?? []);
    }
  }

  async function refreshDashboardNow() {
    if (!accessToken) {
      return;
    }
    setRefreshingDashboard(true);
    setError(null);
    try {
      const syncSummary = await syncAllIntegrations(accessToken, false);
      await refreshWorkspaceData(accessToken);
      if (syncSummary) {
        setError(`Tableau de bord mis a jour. Sync: ${syncSummary.synced} ok, ${syncSummary.skipped} ignores, ${syncSummary.failed} en erreur.`);
      } else {
        setError('Tableau de bord mis a jour.');
      }
    } catch {
      setError('Rafraichissement du tableau de bord impossible.');
    } finally {
      setRefreshingDashboard(false);
    }
  }

  async function submitSettingsUpdate(options: { silent?: boolean } = {}): Promise<boolean> {
    const { silent = false } = options;
    if (!accessToken) {
      return false;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/auth/me/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: settingsForm.fullName,
          phone_number: settingsForm.phoneNumber || null,
          client_context: clientContext,
          personal_settings: buildPersonalSettingsPayload(),
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
      if (!silent) {
        setError('Preferences et coordonnees mises a jour.');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible');
      return false;
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
        const method = payload.mfa_method;
        setLoginMfaMethod(method === 'email' || method === 'sms' || method === 'whatsapp' || method === 'google_chat' ? method : 'totp');
        setMfaDeliveryHint(payload.mfa_delivery_hint ?? null);
        setMfaPreviewCode(payload.mfa_preview_code ?? null);
        setError(payload.mfa_method === 'totp' ? 'Code MFA requis. Entrez votre code d application ou un code de recuperation.' : 'Code MFA envoye. Saisissez le code recu.');
        return;
      }
      persistSession(COOKIE_SESSION_MARKER, COOKIE_SESSION_MARKER, true);
      setAccessToken(COOKIE_SESSION_MARKER);
      setRefreshToken(COOKIE_SESSION_MARKER);
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
            ...authHeader(accessToken),
          },
          credentials: 'include',
          body: JSON.stringify(refreshToken === COOKIE_SESSION_MARKER ? {} : { refresh_token: refreshToken }),
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
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
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({}),
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

  async function savePortfolioLabel(providerCode: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/v1/integrations/credentials'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          provider_code: providerCode,
          account_label: providerLabels[providerCode] || null,
        }),
      });
      const payload = await readJsonResponse<IntegrationConnection | { detail?: unknown }>(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Enregistrement du libellé impossible'));
      }
      await refreshWorkspaceData(accessToken);
      setError('Libellé du portefeuille enregistré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement du libellé impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitSettingsUpdate();
  }

  function toggleSettingsTile(tileId: string) {
    setSettingsTileCollapsed((state) => ({ ...state, [tileId]: !state[tileId] }));
  }

  async function runCommunicationTest(channel: 'email' | 'whatsapp' | 'google_chat' | 'telegram' | 'sms' | 'push') {
    if (!accessToken) {
      setCommunicationTestResult('Session invalide. Reconnectez-vous.');
      return;
    }
    if (channel === 'email' && !settingsForm.notifyEmail) {
      setCommunicationTestResult('Email inactif. Activez le canal avant test.');
      return;
    }
    if (channel === 'whatsapp' && (!settingsForm.notifyWhatsapp || !settingsForm.phoneNumber.trim())) {
      setCommunicationTestResult('WhatsApp actif requis avec numéro valide.');
      return;
    }
    if (channel === 'google_chat' && (!commGoogleChat.enabled || !commGoogleChat.webhook.trim())) {
      setCommunicationTestResult('Google Chat actif requis avec URL webhook.');
      return;
    }
    if (channel === 'telegram' && (!commTelegram.enabled || !commTelegram.botToken.trim() || !commTelegram.chatId.trim())) {
      setCommunicationTestResult('Telegram actif requis avec bot token et chat id.');
      return;
    }
    if (channel === 'sms' && (!settingsForm.notifySms || !settingsForm.phoneNumber.trim())) {
      setCommunicationTestResult('SMS actif requis avec numéro mobile.');
      return;
    }
    if (channel === 'push' && !settingsForm.notifyPush) {
      setCommunicationTestResult('Push navigateur inactif. Activez le canal avant test.');
      return;
    }
    const synced = await submitSettingsUpdate({ silent: true });
    if (!synced) {
      setCommunicationTestResult('Impossible de sauvegarder la configuration avant test.');
      return;
    }
    try {
      setSubmitting(true);
      const requestPayload: CommunicationTestRequest = {
        channel,
        phone_number: settingsForm.phoneNumber || null,
        google_chat_webhook: commGoogleChat.webhook || null,
        telegram_bot_token: commTelegram.botToken || null,
        telegram_chat_id: commTelegram.chatId || null,
      };
      const response = await fetch(apiUrl('/auth/me/communication/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify(requestPayload),
      });
      const payload = await readJsonResponse<CommunicationTestResponse | { detail?: unknown }>(response);
      if (!response.ok) {
        setCommunicationTestResult(extractErrorMessage(payload, 'Test du canal impossible.'));
        return;
      }
      if (!payload || !("message" in payload)) {
        setCommunicationTestResult('Test effectué.');
        return;
      }
      setCommunicationTestResult(payload.message);
    } catch {
      setCommunicationTestResult('Test du canal impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  async function startMfaSetup(method: 'email' | 'totp' | 'sms' | 'whatsapp' | 'google_chat') {
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
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
      setError(mfaSetupMethod === 'totp' ? 'MFA TOTP activee. Les comptes admin devront se reconnecter avec leur code MFA pour administrer la plateforme.' : `MFA ${mfaSetupMethod.replace('_', ' ')} activee. Les prochains codes seront envoyes sur ce canal.`);
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
          ...authHeader(accessToken),
        },
        credentials: 'include',
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
  const coinbaseConnection = findIntegration('coinbase');

  const allPortfolios = buildAllPortfolios(
    dashboard,
    integrationConnections,
    portfolioVisibility
  );
  const visiblePortfolios = allPortfolios.filter((portfolio) => portfolio.visible && portfolio.status === 'active');
  const realVisiblePortfolios = visiblePortfolios.filter((portfolio) => portfolio.type === 'integration');
  const aggregateAllHistory = aggregatePortfolioHistory(visiblePortfolios);
  const evolution24h = formatPortfolioEvolution(aggregateAllHistory, 1);
  const evolution7d = formatPortfolioEvolution(aggregateAllHistory, 7);
  const evolution1m = formatPortfolioEvolution(aggregateAllHistory, 30);
  const selectedHistory = selectedPortfolio ? filterHistoryByScale(selectedPortfolio.history, portfolioHistoryScale) : [];
  const duckSpeed = evolution24h.tone === 'up' ? 2.4 : evolution24h.tone === 'down' ? 7 : 3.8;
  const portfolioEvolutionRows = visiblePortfolios.map((portfolio) => ({
    id: portfolio.id,
    label: portfolio.label,
    currentValue: portfolio.current_value,
    evolution24h: formatPortfolioEvolution(portfolio.history, 1),
    evolution7d: formatPortfolioEvolution(portfolio.history, 7),
  }));
  const suggestionInsights: InsightItem[] = (dashboard?.suggestions ?? []).flatMap((item, index) => {
    const targetPortfolio = visiblePortfolios[0] ?? allPortfolios[0];
    if (!targetPortfolio) {
      return [];
    }
    return [{
      id: `decision-suggestion-${index}`,
      title: item.title,
      value: `Confiance ${scoreToConfidenceLevel(item.score)}/3`,
      trend: `Projection future · ${trendFromScore(item.score)}`,
      detail: `${item.justification} (projection future)`,
      section: 'decisions',
      portfolio_id: targetPortfolio.id,
      portfolio_label: targetPortfolio.label,
    }];
  });
  const aiDecisionInsights: InsightItem[] = visiblePortfolios.flatMap((portfolio) => {
    const actionable = portfolio.ai_advice.filter((advice) => advice.kind === 'buy' || advice.kind === 'sell');
    const confidenceLevel = projectionConfidenceFromHistory(portfolio.history);
    return actionable.map((advice, index) => ({
      id: `decision-ai-${portfolio.id}-${index}`,
      title: `${portfolio.label} · ${advice.kind === 'buy' ? 'Achat suggere' : 'Vente suggeree'}`,
      value: `Confiance ${confidenceLevel}/3`,
      trend: advice.kind === 'buy' ? 'Projection future · ↑ Opportunite detectee' : 'Projection future · ↓ Repli anticipe',
      detail: `${advice.text} (projection future)`,
      section: 'decisions',
      portfolio_id: portfolio.id,
      portfolio_label: portfolio.label,
    }));
  });
  const decisionInsightKey = (insight: InsightItem) => `${insight.portfolio_id ?? 'none'}||${insight.title}||${insight.detail}||${insight.trend}`;
  const decisionInsights: InsightItem[] = [...suggestionInsights, ...aiDecisionInsights].filter((insight) => !resolvedDecisionKeys[decisionInsightKey(insight)]);
  const pendingDecisionCount = decisionInsights.length;
  const annualizedProjectionConfidence = projectionConfidenceFromHistory(aggregateAllHistory);
  const indicatorInsights: InsightItem[] = (dashboard?.key_indicators ?? []).map((item, index) => ({
    id: `indicator-${index}`,
    title: item.label,
    value: item.value,
    trend: `${trendPrefix(item.trend)} ${item.trend}`.trim(),
    detail: 'Lecture issue des donnees consolidees des portefeuilles reels synchronises.',
    section: 'indicator',
  }));

  function inferDecisionSide(insight: InsightItem): 'buy' | 'sell' {
    const text = `${insight.title} ${insight.detail} ${insight.trend}`.toLowerCase();
    return text.includes('vente') || text.includes('sell') ? 'sell' : 'buy';
  }

  function inferDecisionAsset(insight: InsightItem): string {
    const candidate = `${insight.title} ${insight.detail}`.match(/\b[A-Z]{2,10}\b/g)?.find((token) => token !== 'ROI' && token !== 'EUR');
    if (candidate) {
      return candidate;
    }
    const lower = `${insight.title} ${insight.detail}`.toLowerCase();
    if (lower.includes('bitcoin')) return 'BTC';
    if (lower.includes('ethereum')) return 'ETH';
    return 'CW8';
  }

  function inferDecisionPortfolioId(insight: InsightItem): string | null {
    return insight.portfolio_id ?? null;
  }

  function inferDecisionDomain(assetSymbol: string, insight: InsightItem): AgentDomain {
    const normalizedAsset = assetSymbol.toUpperCase();
    const text = `${insight.title} ${insight.detail}`.toLowerCase();
    if (['BTC', 'ETH', 'SOL', 'ADA', 'XRP'].includes(normalizedAsset) || text.includes('crypto')) {
      return 'crypto';
    }
    if (normalizedAsset.includes('ETF') || text.includes('etf')) {
      return 'etf';
    }
    if (text.includes('obligation') || normalizedAsset.includes('BOND')) {
      return 'obligations';
    }
    return 'actions';
  }

  function getAgentConfig(portfolioId: string): AgentQuotaConfig {
    return agentConfigs[portfolioId] ?? DEFAULT_AGENT_CONFIG;
  }

  function countTodayOperations(portfolioId: string) {
    const portfolio = allPortfolios.find((entry) => entry.id === portfolioId);
    if (!portfolio) {
      return 0;
    }
    const now = new Date();
    return portfolio.operations.filter((op) => {
      const date = new Date(op.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    }).length;
  }

  function isDecisionAllowedByAgentPolicy(insight: InsightItem, portfolioId: string) {
    const cfg = getAgentConfig(portfolioId);
    const asset = inferDecisionAsset(insight);
    const domain = inferDecisionDomain(asset, insight);
    if (cfg.domain_policy[domain] === 'reject') {
      return { allowed: false, reason: `Domaine ${domain} rejeté par votre quota agent.` };
    }
    if (countTodayOperations(portfolioId) >= cfg.max_transactions_per_day) {
      return { allowed: false, reason: 'Quota quotidien de transactions atteint.' };
    }
    return { allowed: true, reason: '' };
  }

  async function runDecisionAction(insight: InsightItem, approved: boolean, options: { silent?: boolean; source?: 'manual' | 'autopilot' } = {}) {
    if (!accessToken) {
      return;
    }
    if (emergencyStopActive) {
      if (!options.silent) {
        setError('Arrêt d urgence actif. Toutes les transactions sont bloquées. Désactivez le verrou dans Admin.');
      }
      return;
    }
    const portfolioId = inferDecisionPortfolioId(insight);
    if (!portfolioId) {
      setError('Cette décision n est liée à aucun portefeuille cible.');
      return;
    }

    setDecisionActionLoading(true);
    if (!options.silent) {
      setError(null);
    }
    try {
      const side = inferDecisionSide(insight);
      const linkedPortfolio = allPortfolios.find((portfolio) => portfolio.id === portfolioId);
      let notional = linkedPortfolio && linkedPortfolio.current_value > 0
        ? Math.max(10, Math.min(250, linkedPortfolio.current_value * 0.03))
        : 25;
      const config = getAgentConfig(portfolioId);
      const policyCheck = isDecisionAllowedByAgentPolicy(insight, portfolioId);
      if (!policyCheck.allowed) {
        throw new Error(policyCheck.reason);
      }
      notional = Math.min(notional, config.max_amount);

      const proposalResponse = await fetch(apiUrl('/api/v1/orders/propose'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          portfolio_id: portfolioId,
          asset_symbol: inferDecisionAsset(insight),
          side,
          quantity: Number(notional.toFixed(2)),
          order_type: 'market',
          rationale: `Decision utilisateur depuis dashboard: ${insight.title} | ${insight.detail}`,
        }),
      });
      const proposalPayload = await readJsonResponse<TradeProposalResponse>(proposalResponse);
      if (!proposalResponse.ok || !proposalPayload) {
        throw new Error(extractErrorMessage(proposalPayload, 'Création de transaction impossible'));
      }

      let finalStatus = proposalPayload.status;
      if (proposalPayload.approval_required || !approved) {
        const approvalResponse = await fetch(apiUrl('/api/v1/orders/approve'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader(accessToken),
          },
          credentials: 'include',
          body: JSON.stringify({
            proposal_id: proposalPayload.proposal_id,
            approved,
          }),
        });
        const approvalPayload = await readJsonResponse<TradeApprovalResponse>(approvalResponse);
        if (!approvalResponse.ok || !approvalPayload) {
          throw new Error(extractErrorMessage(approvalPayload, approved ? 'Validation impossible' : 'Refus impossible'));
        }
        finalStatus = approvalPayload.status;
      }

      await refreshWorkspaceData(accessToken);
      const processedKey = decisionInsightKey(insight);
      const nextResolved: Record<string, true> = { ...resolvedDecisionKeys, [processedKey]: true };
      setResolvedDecisionKeys(nextResolved);
      await persistDecisionResolutions(nextResolved);
      if (approved && finalStatus === 'approved') {
        setAppliedDecisions((state) => [
          {
            id: processedKey,
            title: insight.title,
            portfolio_label: insight.portfolio_label ?? 'Portefeuille connecté',
            action: side,
            amount: Number(notional.toFixed(2)),
            applied_at: new Date().toISOString(),
          },
          ...state.filter((entry) => entry.id !== processedKey),
        ].slice(0, 12));
        // Log to admin transaction history
        if (hasAdminRole(user)) {
          setAdminTransactionLog((prev) => [{
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            user_id: user?.id ?? 'unknown',
            user_name: user?.full_name ?? 'Utilisateur',
            portfolio_id: portfolioId,
            asset: inferDecisionAsset(insight),
            side,
            amount: Number(notional.toFixed(2)),
            status: finalStatus,
            created_at: new Date().toISOString(),
          }, ...prev].slice(0, 100));
        }
      }
      setSelectedInsight((current) => {
        if (!current) {
          return current;
        }
        return decisionInsightKey(current) === processedKey ? null : current;
      });
      if (!options.silent) {
        setError(
          approved
            ? `Décision validée. Transaction ${finalStatus === 'approved' ? 'approuvée' : finalStatus}.`
            : `Décision refusée. Transaction marquée ${finalStatus}.`
        );
      }
    } catch (err) {
      if (!options.silent) {
        setError(err instanceof Error ? err.message : 'Action sur décision impossible');
      }
    } finally {
      setDecisionActionLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken || decisionActionLoading || autopilotRunning || emergencyStopActive) {
      return;
    }
    const autopilotDecisions = decisionInsights.filter((insight) => {
      const portfolioId = inferDecisionPortfolioId(insight);
      if (!portfolioId) {
        return false;
      }
      const cfg = getAgentConfig(portfolioId);
      if (!cfg.enabled || cfg.mode !== 'autopilot') {
        return false;
      }
      return isDecisionAllowedByAgentPolicy(insight, portfolioId).allowed;
    });
    if (autopilotDecisions.length === 0) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setAutopilotRunning(true);
      for (const insight of autopilotDecisions.slice(0, 3)) {
        if (cancelled) {
          break;
        }
        await runDecisionAction(insight, true, { silent: true, source: 'autopilot' });
      }
      if (!cancelled) {
        setError(`Pilote automatique: ${Math.min(autopilotDecisions.length, 3)} décision(s) exécutée(s).`);
      }
      setAutopilotRunning(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, decisionActionLoading, autopilotRunning, emergencyStopActive, decisionInsights, agentConfigs]);

  function acknowledgeAppliedDecision(decisionId: string) {
    setAppliedDecisions((state) => state.filter((entry) => entry.id !== decisionId));
  }

  return (
    <main className="investShell">
      <header className="heroTopbar">
        <div className="brandCluster">
          <div className="brandBadge" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Water ripple */}
              <ellipse cx="50" cy="88" rx="40" ry="10" fill="#bae6fd" opacity="0.7"/>
              {/* Body */}
              <ellipse cx="48" cy="64" rx="32" ry="26" fill="#FDE047"/>
              {/* Wing highlight */}
              <ellipse cx="44" cy="72" rx="18" ry="12" fill="#EAB308" opacity="0.6"/>
              {/* Tail */}
              <path d="M20 60 Q6 44 22 36 Q14 52 20 60Z" fill="#EAB308"/>
              {/* Head */}
              <circle cx="72" cy="42" r="20" fill="#FDE047"/>
              {/* Eye */}
              <circle cx="80" cy="36" r="5" fill="#111"/>
              <circle cx="81.5" cy="34.5" r="1.8" fill="white"/>
              {/* Beak upper */}
              <path d="M88 40 L100 35 L100 42 Z" fill="#F97316"/>
              {/* Beak lower */}
              <path d="M88 42 L100 42 L100 47 Z" fill="#EA580C"/>
              {/* Feet */}
              <path d="M38 87 Q32 95 27 93 Q32 90 36 93 Q38 86 43 89Z" fill="#F97316"/>
              <path d="M56 87 Q50 95 45 93 Q50 90 54 93 Q56 86 61 89Z" fill="#F97316"/>
              {/* Hat */}
              <rect x="57" y="16" width="30" height="20" rx="3" fill="#1e293b"/>
              <rect x="52" y="33" width="40" height="7" rx="3.5" fill="#1e293b"/>
              <rect x="57" y="24" width="30" height="7" fill="#FDE047"/>
            </svg>
          </div>
          <div className="brandInfo">
            <strong>Picsou IA</strong>
            <div className="duckPool" aria-hidden="true" style={{ ['--duck-speed' as string]: `${duckSpeed}s` }}>
              <div className="duckPoolWater" />
              <div className={`duckPoolDuck${evolution24h.tone === 'down' ? ' sad' : ''}`}>🦆</div>
              <div className="duckPoolBill">€</div>
              <div className="duckPoolBill">€</div>
            </div>
            <div className="topbarKpis">
              <button
                className={`smallPill selectedPortfolioPill ${evolution24h.tone}`}
                onClick={() => {
                  setSelectedInsight({
                    id: 'topbar-real-24h',
                    title: 'Réels 24h',
                    value: evolution24h.value,
                    trend: `${evolution24h.tone === 'up' ? '↑' : evolution24h.tone === 'down' ? '↓' : '→'} Variation portefeuille réel`,
                    detail: 'Variation consolidée sur 24h des portefeuilles visibles sur le dashboard.',
                    section: 'indicator',
                  });
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                type="button"
              >
                Réels 24h: {evolution24h.value}
              </button>
              <button
                className="smallPill selectedPortfolioPill"
                onClick={() => {
                  if (decisionInsights.length > 0) {
                    setSelectedInsight(decisionInsights[0]);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  } else {
                    setError('Aucune décision active pour le moment.');
                  }
                }}
                type="button"
              >
                Décisions: {pendingDecisionCount}
              </button>
            </div>
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
      {selectedInsight ? (
        <article className="featureCard indicatorFocusCard">
          <div className="cardHeader">
            <h2>{selectedInsight.title}</h2>
            <button className="ghostButton" onClick={() => setSelectedInsight(null)} type="button">Fermer</button>
          </div>
          <div className="compactList">
            <div className="compactRow">
              <span>Valeur</span>
              <strong>{selectedInsight.value}</strong>
            </div>
            <div className="compactRow">
              <span>Tendance</span>
              <strong className={toneFromTrend(selectedInsight.trend)}>{selectedInsight.trend}</strong>
            </div>
          </div>
          <p className="helperText" style={{ marginTop: 10 }}>{selectedInsight.detail}</p>
          {selectedInsight.section === 'decisions' && selectedInsight.portfolio_label ? <p className="helperText">Portefeuille cible: {selectedInsight.portfolio_label}</p> : null}
          {selectedInsight.section === 'decisions' ? (
            <div className="providerActions fullWidth" style={{ marginTop: 12 }}>
              <button className="secondaryButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(selectedInsight, true)} type="button">
                {decisionActionLoading ? 'Traitement...' : 'Confirmer la transaction'}
              </button>
              <button className="ghostButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(selectedInsight, false)} type="button">
                Refuser la transaction
              </button>
            </div>
          ) : null}
        </article>
      ) : null}

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
                      {loginMfaMethod === 'totp' ? 'Code MFA' : `Code recu par ${loginMfaMethod.replace('_', ' ')}`}
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
                    {loginMfaMethod !== 'totp' ? (
                      <button className="textLinkButton" onClick={() => void resendEmailMfaCode()} type="button">
                        {submitting ? 'Renvoi...' : 'Renvoyer un code MFA'}
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
            <button className={appView === 'dashboard' && !portfolioDetailOpen ? 'navButton active' : 'navButton'} onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); setAppView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
              Tableau de bord
            </button>
            <button className={appView === 'portfolios' && !portfolioDetailOpen ? 'navButton active' : 'navButton'} onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
              Portefeuilles
            </button>
            <button className={appView === 'settings' && !portfolioDetailOpen ? 'navButton active' : 'navButton'} onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); setAppView('settings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
              Configuration
            </button>
            {canAccessAdmin ? (
              <button className={appView === 'admin' && !portfolioDetailOpen ? 'navButton active' : 'navButton'} onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); setAppView('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                Admin
              </button>
            ) : null}
          </nav>

          {!portfolioDetailOpen && appView === 'dashboard' ? (
            <section className="selectedPortfolioStrip">
              <span>Portefeuilles affichés:</span>
              <div className="selectedPortfolioList">
                {allPortfolios.filter((portfolio) => portfolio.status === 'active').map((portfolio) => (
                  <button className={portfolioVisibility[portfolio.id] !== false ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'} key={portfolio.id} onClick={() => void updatePortfolioVisibilityPreference(portfolio.id, portfolioVisibility[portfolio.id] === false)} type="button">
                    {portfolio.label}
                  </button>
                ))}
              </div>
              {allPortfolios.filter((p) => p.status === 'active').length === 0 ? (
                <span className="helperText" style={{ fontSize: '.76rem' }}>Connectez un portefeuille dans Configuration → Intégrations</span>
              ) : null}
            </section>
          ) : null}

          {portfolioDetailOpen && selectedPortfolio ? (
            <div style={{ display: 'grid', gap: 22 }}>
              <button className="ghostButton" onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ width: 'fit-content' }} type="button">← Retour</button>
              {selectedPortfolio.type === 'virtual' ? (
                <div className="infoPanel" style={{ background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚗️</span>
                  <div>
                    <strong>Bac à sable virtuel — 100 € simulés</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '.82rem' }}>Ce portefeuille est un espace d entraînement sans argent réel. Picsou IA teste ici ses stratégies avant de vous les proposer sur vos vrais portefeuilles. Utilisez-le pour évaluer ses performances et vous familiariser avec l application.</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className="metaPill">Budget initial : {selectedPortfolio.budget.toFixed(0)} €</span>
                      <span className="metaPill">Valeur actuelle : {selectedPortfolio.current_value.toFixed(2)} €</span>
                      {selectedPortfolio.pnl !== 0 ? (
                        <span className={`metaPill ${selectedPortfolio.pnl >= 0 ? '' : ''}`} style={{ color: selectedPortfolio.pnl >= 0 ? 'var(--ok)' : 'var(--danger)', borderColor: selectedPortfolio.pnl >= 0 ? 'var(--ok-border)' : 'var(--danger-border)' }}>
                          Perf. Picsou : {selectedPortfolio.pnl >= 0 ? '+' : ''}{selectedPortfolio.pnl.toFixed(2)} €
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="portfolioDetailHeader">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span className="agentBadge">{selectedPortfolio.agent_name}</span>
                    <span className="metaPill">{selectedPortfolio.type === 'virtual' ? '⚗️ Virtuel' : 'Intégration'}</span>
                  </div>
                  <h1 style={{ fontSize: '1.6rem' }}>{selectedPortfolio.label}</h1>
                </div>
                <div className="heroValueCard" style={{ minWidth: 210 }}>
                  <span>{selectedPortfolio.type === 'virtual' ? 'Valeur simulée' : 'Valeur actuelle'}</span>
                  <strong style={{ fontSize: '1.8rem' }}>{selectedPortfolio.current_value > 0 ? `${selectedPortfolio.current_value.toFixed(2)} €` : selectedPortfolio.type === 'virtual' ? `${selectedPortfolio.budget.toFixed(2)} €` : '–'}</strong>
                  {selectedPortfolio.pnl !== 0 ? <small className={selectedPortfolio.pnl >= 0 ? 'up' : 'down'}>{selectedPortfolio.pnl >= 0 ? '+' : ''}{selectedPortfolio.pnl.toFixed(2)} € · ROI {selectedPortfolio.roi >= 0 ? '+' : ''}{selectedPortfolio.roi.toFixed(1)}%</small> : null}
                  {selectedPortfolio.type === 'virtual' ? <small style={{ color: 'var(--indigo)' }}>⚗️ Argent simulé — budget : {selectedPortfolio.budget.toFixed(0)} €</small> : <small>Dernière synchro : {selectedPortfolio.last_sync_at ? new Date(selectedPortfolio.last_sync_at).toLocaleString('fr-FR') : 'jamais'}</small>}
                </div>
              </div>
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Historique</h2>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['5m', '15m', '1h', '6h', '24h', '7d', '1m', '3m', '1y', '2y'] as const).map((scale) => (
                      <button key={scale} className={portfolioHistoryScale === scale ? 'tagButton active' : 'tagButton'} onClick={() => setPortfolioHistoryScale(scale)} type="button">{scale}</button>
                    ))}
                  </div>
                </div>
                <Sparkline data={selectedHistory} color={selectedPortfolio.pnl >= 0 ? 'var(--teal)' : 'var(--danger)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.73rem', color: 'var(--muted)' }}>
                  <span>{selectedHistory[0]?.date ? new Date(selectedHistory[0].date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}</span>
                  <span>{selectedHistory[selectedHistory.length - 1]?.date ? new Date(selectedHistory[selectedHistory.length - 1].date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Maintenant'}</span>
                </div>
              </article>

              {/* === Positions détaillées === */}
              {(() => {
                const holdings = computeHoldings(selectedPortfolio.operations, selectedPortfolio.roi);
                const isVirtual = selectedPortfolio.type === 'virtual';
                if (holdings.length === 0) return null;
                return (
                  <article className="featureCard">
                    <div className="cardHeader">
                      <h2>Positions détaillées</h2>
                      <span style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                        {isVirtual ? '⚗️ Virtuel — ' : ''}Valeurs estimées · PFU 30% = 12.8% IR + 17.2% PS
                        {selectedPortfolio.roi === 0 ? ' · Synchronisez pour les +/− valeurs' : ''}
                      </span>
                    </div>
                    <div className="operationLedgerWrap">
                      <table className="operationLedger">
                        <thead>
                          <tr>
                            <th>Support / Actif</th>
                            <th>Date d entrée</th>
                            <th>Investi net</th>
                            <th>Valeur estimée</th>
                            <th>+/− latent</th>
                            <th>Frais vente est.</th>
                            <th>Imposition FR si vente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holdings.map((h) => (
                            <tr key={h.asset}>
                              <td><strong>{h.asset}</strong><br /><span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{h.intermediary} · {h.operationCount} opération(s)</span></td>
                              <td>{new Date(h.firstBuyDate).toLocaleDateString('fr-FR')}</td>
                              <td>{h.netInvested.toFixed(2)} €</td>
                              <td>{h.estimatedCurrentValue.toFixed(2)} €</td>
                              <td>
                                <span className={h.unrealizedPnl >= 0 ? 'up' : 'down'}>
                                  {h.unrealizedPnl >= 0 ? '+' : ''}{h.unrealizedPnl.toFixed(2)} €
                                  {selectedPortfolio.roi !== 0 ? ` (${h.unrealizedPct >= 0 ? '+' : ''}${h.unrealizedPct.toFixed(1)}%)` : ' (n/d sync)'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--muted)' }}>
                                {isVirtual ? '—' : `~${h.estimatedSellFee.toFixed(2)} €`}
                                <br /><span style={{ fontSize: '.7rem' }}>{isVirtual ? '' : '~0.30%'}</span>
                              </td>
                              <td style={{ color: h.taxFRIfSold > 0 ? 'var(--warn)' : 'var(--muted)' }}>
                                {isVirtual ? '— (virtuel)' : h.taxFRIfSold > 0 ? `~${h.taxFRIfSold.toFixed(2)} €` : 'Aucune si perte'}
                                {!isVirtual && h.taxFRIfSold > 0 ? <><br /><span style={{ fontSize: '.7rem' }}>PFU 30%</span></> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2}><strong>Total</strong></td>
                            <td><strong>{holdings.reduce((s, h) => s + h.netInvested, 0).toFixed(2)} €</strong></td>
                            <td><strong>{holdings.reduce((s, h) => s + h.estimatedCurrentValue, 0).toFixed(2)} €</strong></td>
                            <td>
                              <strong className={holdings.reduce((s, h) => s + h.unrealizedPnl, 0) >= 0 ? 'up' : 'down'}>
                                {holdings.reduce((s, h) => s + h.unrealizedPnl, 0) >= 0 ? '+' : ''}
                                {holdings.reduce((s, h) => s + h.unrealizedPnl, 0).toFixed(2)} €
                              </strong>
                            </td>
                            <td>{isVirtual ? '—' : `~${holdings.reduce((s, h) => s + h.estimatedSellFee, 0).toFixed(2)} €`}</td>
                            <td>{isVirtual ? '—' : `~${holdings.reduce((s, h) => s + h.taxFRIfSold, 0).toFixed(2)} €`}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="helperText" style={{ marginTop: 8 }}>
                      Estimations basées sur les opérations enregistrées.{selectedPortfolio.roi === 0 ? ' Synchronisez le portefeuille pour obtenir les plus/moins-values réelles.' : ' Le taux PFU de 30% (12.8% IR + 17.2% PS) s applique aux plus-values nettes lors de la cession.'}
                    </p>
                  </article>
                );
              })()}

              <article className="featureCard">
                <div className="cardHeader"><h2>Achats / Ventes et Taxes</h2><span>Etat FR et intermédiaire</span></div>
                {selectedPortfolio.operations.length > 0 ? (
                  <div className="operationLedgerWrap">
                    <table className="operationLedger">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Actif</th>
                          <th>Montant</th>
                          <th>Taxe Etat FR</th>
                          <th>Taxe/Frais intermédiaire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPortfolio.operations.map((op) => (
                          <tr key={op.id}>
                            <td>{new Date(op.date).toLocaleString('fr-FR')}</td>
                            <td><span className={op.side === 'buy' ? 'statusBadge ok' : 'statusBadge warn'}>{op.side === 'buy' ? 'Achat' : 'Vente'}</span></td>
                            <td>{op.asset}</td>
                            <td>{op.amount.toFixed(2)} €</td>
                            <td>{op.tax_state !== null ? `${op.tax_state.toFixed(2)} €` : 'n/d réel'}</td>
                            <td>{op.tax_intermediary !== null ? `${op.tax_intermediary.toFixed(2)} €` : 'n/d réel'} · {op.intermediary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="helperText">Aucune opération disponible pour ce portefeuille pour le moment.</p>
                )}
              </article>
              <section className="workspaceGrid">
                {selectedPortfolio.allocation.length > 0 ? (
                  <article className="featureCard">
                    <div className="cardHeader"><h2>Allocation</h2><span>Répartition</span></div>
                    <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                      {selectedPortfolio.allocation.map((a) => (
                        <div key={a.class}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '.82rem' }}><span>{a.class}</span><strong>{a.weight}% · {a.value.toFixed(2)} €</strong></div>
                          <div className="allocBar"><div className="allocFill" style={{ width: `${a.weight}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
                <article className="featureCard accentCard">
                  <div className="cardHeader"><h2>Conseils IA</h2><span>{selectedPortfolio.agent_name}</span></div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                    {selectedPortfolio.ai_advice.map((advice, idx) => (
                      <div key={idx} className={`adviceRow ${advice.kind}`}>
                        <span className="adviceBadge">{advice.kind === 'buy' ? 'ACHAT' : advice.kind === 'sell' ? 'VENTE' : advice.kind === 'hold' ? 'CONSERVER' : 'INFO'}</span>
                        <p>{advice.text}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
              <article className="featureCard">
                <div className="cardHeader"><h2>Paramètres du portefeuille</h2><span>Visibilité et libellé</span></div>
                <div className="preferenceGroup">
                  {selectedPortfolio.type === 'virtual' ? (
                    <>
                      <p className="helperText">Le portefeuille virtuel est toujours actif. Il sert de bac à sable pour Picsou IA. Vous pouvez choisir de l afficher ou non sur le cockpit.</p>
                      <label className="checkRow">
                        <input type="checkbox" checked={portfolioVisibility[selectedPortfolio.id] !== false} onChange={(e) => void updatePortfolioVisibilityPreference(selectedPortfolio.id, e.target.checked)} />
                        <span>Afficher sur le tableau de bord</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="checkRow">
                        <input type="checkbox" checked={portfolioVisibility[selectedPortfolio.id] !== false} onChange={(e) => void updatePortfolioVisibilityPreference(selectedPortfolio.id, e.target.checked)} />
                        <span>Afficher sur le dashboard</span>
                      </label>
                      <label className="checkRow">
                        <input type="checkbox" checked={selectedPortfolio.status === 'active'} onChange={(e) => void togglePortfolioActivation(selectedPortfolio, e.target.checked)} />
                        <span>Activer ce portefeuille connecté</span>
                      </label>
                      {selectedPortfolio.provider_code ? (
                        <>
                          <label>Libellé affiché<input type="text" value={providerLabels[selectedPortfolio.provider_code] ?? selectedPortfolio.label} onChange={(e) => setProviderLabels((v) => ({ ...v, [selectedPortfolio.provider_code!]: e.target.value }))} placeholder="Nom affiché dans le dashboard" /></label>
                          <button className="secondaryButton" disabled={submitting} onClick={() => void savePortfolioLabel(selectedPortfolio.provider_code!)} type="button">Sauvegarder le libellé</button>
                          <button className="secondaryButton" disabled={submitting} onClick={() => void syncIntegration(selectedPortfolio.provider_code!)} type="button">Synchroniser maintenant</button>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              </article>
            </div>
          ) : null}

          {!portfolioDetailOpen && appView === 'dashboard' ? (
            <>
              <section className="portfolioHero">
                <div className="portfolioIntro">
                  <p className="sectionTag">Cockpit investisseur</p>
                  <h1>Vue d ensemble de votre patrimoine.</h1>
                  <p className="bodyText">Tous vos portefeuilles consolidés, les alertes prioritaires et les actions recommandées par votre agent IA. Cliquez sur les portefeuilles ci-dessus pour filtrer l affichage.</p>
                  <div className="profileMeta">
                    <span className="metaPill">Profil: {user.role}</span>
                    <span className="metaPill">Theme: {String(user.personal_settings.theme ?? 'family')}</span>
                    {autopilotRunning ? <span className="metaPill" style={{ color: 'var(--warn)', borderColor: 'var(--warn-border)' }}>⚡ Pilote auto actif</span> : null}
                  </div>
                </div>
                <div className="heroValueCard portfolioEvolutionCard">
                  <span>Portefeuilles connectés et évolution</span>
                  <div className="activePortfolioSplit">
                    <div className="activePortfolioChip real"><strong>{realVisiblePortfolios.length}</strong><small>Actifs réels</small></div>
                    <div className="activePortfolioChip total"><strong>{allPortfolios.length}</strong><small>Total</small></div>
                  </div>
                  <div className="evolutionKpiBars">
                    <div className="evolutionBarRow"><span>24h</span><strong className={evolution24h.tone}>{evolution24h.value}</strong></div>
                    <div className="evolutionBarRow"><span>7j</span><strong className={evolution7d.tone}>{evolution7d.value}</strong></div>
                    <div className="evolutionBarRow"><span>1m</span><strong className={evolution1m.tone}>{evolution1m.value}</strong></div>
                  </div>
                  <div className="evolutionRows">
                    {portfolioEvolutionRows.map((row) => (
                      <div className="evolutionRow" key={row.id}>
                        <strong>{row.label}</strong>
                        <span>{row.currentValue > 0 ? `${row.currentValue.toFixed(2)} €` : 'n/d'}</span>
                        <span className={row.evolution24h.tone}>{row.evolution24h.value}</span>
                        <span className={row.evolution7d.tone}>{row.evolution7d.value}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <small style={{ display: 'block', fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>Évolution consolidée</small>
                    <Sparkline data={aggregateAllHistory.slice(-90)} color="var(--teal)" />
                  </div>
                </div>
              </section>

              {/* Vigilance section */}
              {(() => {
                const vigilanceItems: Array<{ level: 'danger' | 'warn' | 'info'; message: string; action?: string; actionView?: 'portfolios' | 'settings' }> = [];
                const realPortfolios = allPortfolios.filter((p) => p.type === 'integration');
                if (realPortfolios.length === 0 && allPortfolios.every((p) => p.type === 'virtual')) {
                  vigilanceItems.push({ level: 'info', message: 'Aucune intégration connectée. Le portefeuille virtuel ⚗️ est actif en bac à sable. Ajoutez une intégration pour suivre vos actifs réels.', action: 'Configurer', actionView: 'settings' });
                }
                for (const p of visiblePortfolios) {
                  if (p.type === 'virtual') continue; // skip sync/value warnings for virtual sandbox
                  if (!p.last_sync_at) {
                    vigilanceItems.push({ level: 'warn', message: `${p.label}: jamais synchronisé. Lancez une synchronisation pour obtenir des données en temps réel.`, action: 'Voir portefeuille', actionView: 'portfolios' });
                  } else {
                    const syncAge = Date.now() - Date.parse(p.last_sync_at);
                    if (syncAge > 24 * 60 * 60 * 1000) {
                      vigilanceItems.push({ level: 'info', message: `${p.label}: dernière synchronisation il y a plus de 24h.`, action: 'Voir portefeuille', actionView: 'portfolios' });
                    }
                  }
                  if (p.current_value <= 0 && p.status === 'active') {
                    vigilanceItems.push({ level: 'info', message: `${p.label}: valeur nulle. Synchronisez pour récupérer les positions.` });
                  }
                }
                if (decisionInsights.length > 5) {
                  vigilanceItems.push({ level: 'warn', message: `${decisionInsights.length} décisions IA en attente de validation. Traitez-les dans Portefeuilles.`, action: 'Portefeuilles', actionView: 'portfolios' });
                }
                const autopilotPortfolios = allPortfolios.filter((p) => (agentConfigs[p.id] ?? DEFAULT_AGENT_CONFIG).enabled && (agentConfigs[p.id] ?? DEFAULT_AGENT_CONFIG).mode === 'autopilot');
                if (autopilotPortfolios.length > 0) {
                  vigilanceItems.push({ level: 'info', message: `Pilote automatique actif sur ${autopilotPortfolios.map((p) => p.label).join(', ')}. Transactions exécutées dans les limites de vos quotas.` });
                }
                if (vigilanceItems.length === 0) {
                  return null;
                }
                return (
                  <section style={{ marginBottom: 18 }}>
                    <div className="cardHeader" style={{ marginBottom: 10 }}>
                      <h2>Points de vigilance</h2>
                      <span>{vigilanceItems.length} point(s) à surveiller</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {vigilanceItems.map((item, idx) => (
                        <div key={idx} className={`infoPanel ${item.level === 'danger' ? 'warn' : item.level === 'warn' ? '' : 'mutedPanel'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{item.level === 'danger' ? '🔴' : item.level === 'warn' ? '🟡' : '🔵'}</span>
                            <p style={{ margin: 0, fontSize: '.84rem' }}>{item.message}</p>
                          </div>
                          {item.action && item.actionView ? (
                            <button className="ghostButton" style={{ whiteSpace: 'nowrap', fontSize: '.78rem' }} onClick={() => { setAppView(item.actionView!); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">{item.action} →</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              {loading ? <article className="featureCard">Chargement de votre espace...</article> : null}
              {dashboard ? (
                <>
                  {decisionInsights.length > 0 ? (
                    <section style={{ marginBottom: 18 }}>
                      <div className="cardHeader" style={{ marginBottom: 10 }}>
                        <h2>Décisions prioritaires</h2>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>Cliquez puis confirmez ou refusez</span>
                          <button className="ghostButton" style={{ fontSize: '.78rem' }} onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir tout dans Portefeuilles →</button>
                        </div>
                      </div>
                      <div className="suggestionGrid">
                        {decisionInsights.slice(0, 4).map((decision) => (
                          <div className="suggestionCard" key={decision.id}>
                            <button
                              className="compactRow compactRowButton"
                              onClick={() => {
                                setSelectedInsight(decision);
                                window.scrollTo({ top: 120, behavior: 'smooth' });
                              }}
                              type="button"
                            >
                              <span>{decision.title}</span>
                              <strong>{decision.value}</strong>
                            </button>
                            <p>{decision.detail}</p>
                            {decision.portfolio_label ? <p className="helperText">Portefeuille: {decision.portfolio_label}</p> : null}
                            <small className={trendTone(decision.trend)}>{decision.trend}</small>
                            <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                              <button className="secondaryButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(decision, true)} type="button">Confirmer</button>
                              <button className="ghostButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(decision, false)} type="button">Refuser</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {appliedDecisions.length > 0 ? (
                    <section style={{ marginBottom: 18 }}>
                      <div className="cardHeader" style={{ marginBottom: 10 }}>
                        <h2>Décisions appliquées</h2>
                        <span>En attente de validation finale utilisateur</span>
                      </div>
                      <div className="suggestionGrid">
                        {appliedDecisions.map((decision) => (
                          <div className="suggestionCard" key={decision.id}>
                            <div className="compactRow"><strong>{decision.title}</strong><span>{decision.action === 'buy' ? 'Achat' : 'Vente'}</span></div>
                            <p>{decision.portfolio_label} · {decision.amount.toFixed(2)} €</p>
                            <small>Appliquée le {new Date(decision.applied_at).toLocaleString('fr-FR')}</small>
                            <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                              <button className="secondaryButton" onClick={() => acknowledgeAppliedDecision(decision.id)} type="button">Valider définitivement</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      <p className="sectionTag" style={{ marginBottom: 0 }}>Aperçu des portefeuilles</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="ghostButton" disabled={refreshingDashboard} onClick={() => void refreshDashboardNow()} type="button">
                          {refreshingDashboard ? 'Rafraichissement...' : 'Rafraichir maintenant'}
                        </button>
                        <button className="ghostButton" onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Tous les portefeuilles →</button>
                      </div>
                    </div>
                    <div className="portfolioDeck">
                      {visiblePortfolios.map((p) => (
                        <button key={p.id} className="portfolioCard" onClick={() => { setSelectedPortfolio(p); setPortfolioDetailOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                          <div className="pCardHeader">
                            <span className="agentBadge">{p.agent_name}</span>
                            <span className="metaPill">{p.type === 'virtual' ? '⚗️ Virtuel' : 'Intégration'}</span>
                          </div>
                          <strong className="pCardLabel">{p.label}</strong>
                          <div className="pCardValue">{p.current_value > 0 ? `${p.current_value.toFixed(2)} €` : '–'}</div>
                          <div className={`pCardPnl${p.pnl >= 0 ? ' up' : ' down'}`}>{p.pnl !== 0 ? `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} € · ROI ${p.roi >= 0 ? '+' : ''}${p.roi.toFixed(1)}%` : 'Synchronisez pour le ROI'}</div>
                          <div className="pCardSparkline"><Sparkline data={p.history.slice(-30)} color={p.pnl >= 0 ? 'var(--ok)' : 'var(--danger)'} /></div>
                          {p.ai_advice[0] ? <p className="pCardAdvice">{p.ai_advice[0].text}</p> : null}
                          <div className="pCardFooter">Voir le détail →</div>
                        </button>
                      ))}
                      {visiblePortfolios.length === 0 ? (
                        <div className="infoPanel mutedPanel" style={{ gridColumn: '1/-1' }}><strong>Aucun portefeuille actif</strong><p>Activez un connecteur dans Configuration → Intégrations.</p></div>
                      ) : null}
                    </div>
                  </section>

                  {/* === Marchés & Opportunités === */}
                  {(() => {
                    const filtered = marketSignalFilter === 'all' ? MARKET_SIGNALS : MARKET_SIGNALS.filter((s) => s.category === marketSignalFilter);
                    const activePorts = allPortfolios.filter((p) => p.status === 'active' || p.type === 'virtual');
                    const subscribeTarget = MARKET_SIGNALS.find((s) => s.id === subscribeSignalId);
                    return (
                      <section style={{ marginBottom: 18 }}>
                        <div className="cardHeader" style={{ marginBottom: 12 }}>
                          <div>
                            <h2>Marchés &amp; Opportunités</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>Indicatif — données de marché mars 2026. Investir comporte des risques.</p>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(['all', 'crypto', 'actions', 'etf', 'obligations'] as const).map((cat) => (
                              <button
                                key={cat}
                                className={marketSignalFilter === cat ? 'tagButton active' : 'tagButton'}
                                onClick={() => setMarketSignalFilter(cat)}
                                type="button"
                              >
                                {cat === 'all' ? 'Tous' : cat === 'crypto' ? '₿ Crypto' : cat === 'actions' ? '📈 Actions' : cat === 'etf' ? '🗂 ETF' : '🏦 Obligations'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subscribe panel */}
                        {subscribeTarget ? (
                          <div className="infoPanel" style={{ marginBottom: 16, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <strong>Souscrire à {subscribeTarget.name} ({subscribeTarget.symbol})</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '.82rem' }}>{subscribeTarget.rationale}</p>
                              </div>
                              <button className="ghostButton" onClick={() => setSubscribeSignalId(null)} type="button">✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 12, alignItems: 'end' }}>
                              <label style={{ fontSize: '.82rem' }}>
                                Portefeuille cible
                                <select
                                  value={subscribePortfolioId}
                                  onChange={(e) => setSubscribePortfolioId(e.target.value)}
                                  style={{ marginTop: 4 }}
                                >
                                  <option value="">— Choisir —</option>
                                  {activePorts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.type === 'virtual' ? '⚗️ ' : ''}{p.label}{p.type === 'virtual' ? ' (virtuel)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ fontSize: '.82rem' }}>
                                Montant (€)
                                <input
                                  type="number"
                                  min={subscribeTarget.min_investment}
                                  value={subscribeAmount}
                                  onChange={(e) => setSubscribeAmount(Math.max(subscribeTarget.min_investment, Number(e.target.value) || subscribeTarget.min_investment))}
                                  style={{ marginTop: 4 }}
                                />
                              </label>
                              <button
                                className="primaryButton"
                                disabled={subscribeLoading || !subscribePortfolioId}
                                onClick={() => void subscribeToMarketSignal(subscribeTarget, subscribePortfolioId, subscribeAmount)}
                                type="button"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {subscribeLoading ? 'Envoi...' : 'Confirmer l achat'}
                              </button>
                            </div>
                            {subscribePortfolioId && allPortfolios.find((p) => p.id === subscribePortfolioId)?.type === 'virtual' ? (
                              <p style={{ margin: '8px 0 0', fontSize: '.75rem', color: 'var(--indigo)' }}>⚗️ Ordre simulé sur le portefeuille virtuel — aucun argent réel engagé.</p>
                            ) : null}
                            <p style={{ margin: '6px 0 0', fontSize: '.72rem', color: 'var(--muted)' }}>Montant minimum : {subscribeTarget.min_investment} €. L ordre sera soumis à validation avant exécution.</p>
                          </div>
                        ) : null}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                          {filtered.map((signal) => (
                            <div
                              key={signal.id}
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--card-radius-sm)',
                                padding: '14px 16px',
                                display: 'grid',
                                gap: 8,
                                boxShadow: 'var(--shadow-xs)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                    <span className="metaPill" style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                      {signal.category === 'crypto' ? '₿ Crypto' : signal.category === 'actions' ? '📈 Action' : signal.category === 'etf' ? '🗂 ETF' : '🏦 Obligation'}
                                    </span>
                                    <span className={`statusBadge ${signal.risk === 'faible' ? 'ok' : signal.risk === 'modere' ? 'idle' : 'warn'}`} style={{ fontSize: '.68rem' }}>
                                      <span className={`statusDot ${signal.risk === 'faible' ? 'ok' : signal.risk === 'modere' ? 'idle' : 'warn'}`} />
                                      Risque {signal.risk}
                                    </span>
                                  </div>
                                  <strong style={{ fontSize: '1.0rem' }}>{signal.name}</strong>
                                  <p style={{ margin: 0, fontSize: '.74rem', color: 'var(--muted)' }}>{signal.symbol}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <strong className={signal.performance_30d >= 0 ? 'up' : 'down'} style={{ display: 'block', fontSize: '1.15rem' }}>
                                    {signal.performance_30d >= 0 ? '+' : ''}{signal.performance_30d.toFixed(1)}%
                                  </strong>
                                  <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>30 jours</span>
                                </div>
                              </div>
                              {/* Confidence bar */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: '.72rem', color: 'var(--muted)' }}>
                                  <span>Indice de confiance Picsou</span>
                                  <strong style={{ color: signal.confidence >= 4 ? 'var(--ok)' : signal.confidence === 3 ? 'var(--gold)' : 'var(--warn)' }}>
                                    {['●', '●', '●', '●', '●'].map((dot, i) => (
                                      <span key={i} style={{ opacity: i < signal.confidence ? 1 : 0.2 }}>{dot}</span>
                                    ))} {signal.confidence}/5
                                  </strong>
                                </div>
                                <div style={{ height: 4, background: 'var(--bg-alt)', borderRadius: 4 }}>
                                  <div style={{ height: 4, borderRadius: 4, width: `${signal.confidence * 20}%`, background: signal.confidence >= 4 ? 'var(--ok)' : signal.confidence === 3 ? 'var(--gold)' : 'var(--warn)' }} />
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '.8rem', lineHeight: 1.4 }}>{signal.rationale}</p>
                              <button
                                className="secondaryButton"
                                onClick={() => {
                                  setSubscribeSignalId(signal.id);
                                  setSubscribeAmount(signal.min_investment);
                                  setSubscribePortfolioId(activePorts[0]?.id ?? '');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                type="button"
                                style={{ fontSize: '.82rem', padding: '7px 14px' }}
                              >
                                Souscrire — à partir de {signal.min_investment} €
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })()}

                  <section className="indicatorDeck">
                    {dashboard.key_indicators.map((item) => (
                      <button
                        className="signalCard"
                        key={item.label}
                        onClick={() => {
                          const match = indicatorInsights.find((entry) => entry.title === item.label);
                          if (match) {
                            setSelectedInsight(match);
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }
                        }}
                        type="button"
                      >
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small className={trendTone(item.trend)}>{trendPrefix(item.trend) ? `${trendPrefix(item.trend)} ` : ''}{item.trend}</small>
                      </button>
                    ))}
                  </section>
                  <section className="workspaceGrid">
                    <article className="featureCard">
                      <div className="cardHeader"><h2>Vue coach réel</h2><span>Actions et crypto</span></div>
                      <div className="compactList">
                        <button className="compactRow compactRowButton" onClick={() => setSelectedInsight({ id: 'coach-pnl-realized', title: 'PnL realise', value: formatNullableCurrency(dashboard.pnl_realized), trend: `${evolution24h.tone === 'up' ? '↑' : evolution24h.tone === 'down' ? '↓' : '→'} Variation 24h ${evolution24h.value}`, detail: 'Profit ou perte deja cristallise(e) par les ordres executes.', section: 'coach' })} type="button"><span>PnL realise</span><strong>{formatNullableCurrency(dashboard.pnl_realized)}</strong></button>
                        <button className="compactRow compactRowButton" onClick={() => setSelectedInsight({ id: 'coach-pnl-unrealized', title: 'PnL latent', value: formatNullableCurrency(dashboard.pnl_unrealized), trend: `${evolution7d.tone === 'up' ? '↑' : evolution7d.tone === 'down' ? '↓' : '→'} Variation 7j ${evolution7d.value}`, detail: 'Profit ou perte en cours sur les positions ouvertes.', section: 'coach' })} type="button"><span>PnL latent</span><strong>{formatNullableCurrency(dashboard.pnl_unrealized)}</strong></button>
                        <button className="compactRow compactRowButton" onClick={() => setSelectedInsight({ id: 'coach-annualized', title: 'Projection annuelle', value: formatNullablePercent(dashboard.annualized_return), trend: `Projection future · Confiance ${annualizedProjectionConfidence}/3`, detail: `Projection annuelle calculee depuis les donnees reelles synchronisees. Niveau de confiance: ${annualizedProjectionConfidence}/3.`, section: 'coach' })} type="button"><span>Projection annuelle</span><strong>{formatNullablePercent(dashboard.annualized_return)} · C{annualizedProjectionConfidence}/3</strong></button>
                        <button className="compactRow compactRowButton" onClick={() => setSelectedInsight({ id: 'coach-volatility', title: 'Volatilite glissante', value: formatNullablePercent(dashboard.rolling_volatility), trend: '→ Mesure de dispersion en cours', detail: 'Amplitude recente des variations: plus elle monte, plus le risque court terme augmente.', section: 'coach' })} type="button"><span>Volatilite glissante</span><strong>{formatNullablePercent(dashboard.rolling_volatility)}</strong></button>
                        <button className="compactRow compactRowButton" onClick={() => setSelectedInsight({ id: 'coach-drawdown', title: 'Drawdown max', value: formatNullablePercent(dashboard.max_drawdown), trend: '↓ Protection du capital', detail: 'Perte maximale observee depuis un plus haut recent.', section: 'coach' })} type="button"><span>Drawdown max</span><strong>{formatNullablePercent(dashboard.max_drawdown)}</strong></button>
                      </div>
                    </article>
                    <article className="featureCard accentCard">
                      <div className="cardHeader"><h2>Feuille de route</h2><span>Accompagnement</span></div>
                      <div className="taskList">
                        {dashboard.next_steps.map((step) => (
                          <button
                            className="taskRow"
                            key={step}
                            onClick={() => setSelectedInsight({
                              id: `next-step-${step}`,
                              title: 'Feuille de route',
                              value: 'Action planifiée',
                              trend: '→ Exécution recommandée',
                              detail: step,
                              section: 'coach',
                            })}
                            type="button"
                          >
                            <span className="benefitDot" />
                            <p>{step}</p>
                          </button>
                        ))}
                      </div>
                    </article>
                  </section>
                  <section className="workspaceGrid">
                    <article className="featureCard">
                      <div className="cardHeader"><h2>Suggestions accompagnees</h2><span>Jamais sans validation</span></div>
                      <div className="suggestionGrid">
                        {suggestionInsights.map((item) => (
                          <button
                            className="suggestionCard"
                            key={item.id}
                            onClick={() => setSelectedInsight({
                              title: item.title,
                              id: item.id,
                              value: item.value,
                              trend: item.trend,
                              detail: item.detail,
                              section: 'decisions',
                              portfolio_id: item.portfolio_id,
                              portfolio_label: item.portfolio_label,
                            })}
                            type="button"
                          >
                            <div className="compactRow"><strong>{item.title}</strong><span>{item.value}</span></div>
                            <p>{item.detail}</p>
                            {item.portfolio_label ? <p className="helperText">Portefeuille: {item.portfolio_label}</p> : null}
                            <small className={trendTone(item.trend)}>{item.trend}</small>
                          </button>
                        ))}
                      </div>
                    </article>
                    <article className="featureCard">
                      <div className="cardHeader"><h2>{dashboard.is_empty ? 'Sources en attente' : 'Integrations actives'}</h2><span>{coinbaseConnection?.last_sync_at ? `Coinbase sync: ${new Date(coinbaseConnection.last_sync_at).toLocaleTimeString('fr-FR')}` : 'Coinbase: jamais synchronise'}</span></div>
                      {dashboard.connected_accounts.length > 0 ? (
                        <div className="taskList">
                          {dashboard.connected_accounts.map((account) => (
                            <button
                              className="compactRow compactRowButton"
                              key={`${account.provider_name}-${account.account_label ?? 'default'}`}
                              onClick={() => setSelectedInsight({
                                id: `source-${account.provider_code}-${account.account_label ?? 'default'}`,
                                title: account.provider_name,
                                value: statusLabel(account.status),
                                trend: account.status === 'active' ? '↑ Source opérationnelle' : account.status === 'pending_user_consent' ? '→ Validation utilisateur attendue' : '↓ Source inactive',
                                detail: account.account_label ? `Compte: ${account.account_label}` : 'Compte principal',
                                section: 'source',
                              })}
                              type="button"
                            >
                              <span>{account.provider_name}{account.account_label ? ` · ${account.account_label}` : ''}</span>
                              <span className={statusBadgeClass(account.status)}><span className={statusDotClass(account.status)} />{statusLabel(account.status)}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="infoPanel mutedPanel"><strong>Aucune intégration active</strong><p>Ajoutez une source dans Configuration → Intégrations pour connecter vos portefeuilles réels. Le bac à sable virtuel ⚗️ fonctionne sans intégration.</p></div>
                      )}
                    </article>
                  </section>
                </>
              ) : null}
            </>
          ) : null}

          {appView === 'portfolios' ? (
            <section style={{ display: 'grid', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p className="sectionTag" style={{ marginBottom: 4 }}>Portefeuilles</p>
                  <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Gestion et pilotage de vos portefeuilles</h1>
                </div>
                <button className="ghostButton" disabled={refreshingDashboard} onClick={() => void refreshDashboardNow()} type="button">
                  {refreshingDashboard ? 'Rafraichissement...' : 'Rafraichir maintenant'}
                </button>
              </div>

              {allPortfolios.length === 0 ? (
                <div className="infoPanel mutedPanel">
                  <strong>Aucun portefeuille disponible</strong>
                  <p>Le portefeuille virtuel ⚗️ se charge automatiquement. Si vous ne le voyez pas, rechargez la page ou vérifiez votre connexion.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 24 }}>
                  {allPortfolios.map((p) => {
                    const cfg = agentConfigs[p.id] ?? DEFAULT_AGENT_CONFIG;
                    const portfolioDecisions = decisionInsights.filter((d) => d.portfolio_id === p.id);
                    return (
                      <article key={p.id} className="featureCard" style={{ display: 'grid', gap: 18 }}>
                        {/* Portfolio header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span className="agentBadge">{p.agent_name}</span>
                              <span className="metaPill">{p.type === 'virtual' ? '⚗️ Virtuel' : 'Intégration'}</span>
                              <span className={statusBadgeClass(p.status)}><span className={statusDotClass(p.status)} />{statusLabel(p.status)}</span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{p.label}</h2>
                            {p.last_sync_at ? <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--muted)' }}>Dernière sync: {new Date(p.last_sync_at).toLocaleString('fr-FR')}</p> : <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--warn)' }}>Jamais synchronisé</p>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <strong style={{ fontSize: '1.5rem' }}>{p.current_value > 0 ? `${p.current_value.toFixed(2)} €` : '–'}</strong>
                            {p.pnl !== 0 ? <small className={p.pnl >= 0 ? 'up' : 'down'}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)} € · ROI {p.roi >= 0 ? '+' : ''}{p.roi.toFixed(1)}%</small> : null}
                            <button className="ghostButton" onClick={() => { setSelectedPortfolio(p); setPortfolioDetailOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Détail complet →</button>
                          </div>
                        </div>

                        {/* Sparkline */}
                        {p.history.length >= 2 ? (
                          <div>
                            <Sparkline data={p.history.slice(-30)} color={p.pnl >= 0 ? 'var(--ok)' : 'var(--danger)'} />
                          </div>
                        ) : null}

                        {/* AI Proposals */}
                        {portfolioDecisions.length > 0 ? (
                          <div>
                            <div className="cardHeader" style={{ marginBottom: 10 }}>
                              <h3 style={{ margin: 0, fontSize: '1rem' }}>Propositions IA en attente</h3>
                              <span>{portfolioDecisions.length} décision(s)</span>
                            </div>
                            <div className="suggestionGrid">
                              {portfolioDecisions.map((decision) => (
                                <div className="suggestionCard" key={decision.id}>
                                  <div className="compactRow"><strong>{decision.title}</strong><span className="metaPill">{decision.value}</span></div>
                                  <p style={{ fontSize: '.82rem', margin: '6px 0 4px' }}>{decision.detail}</p>
                                  <small className={trendTone(decision.trend)}>{decision.trend}</small>
                                  {cfg.enabled && cfg.mode === 'autopilot' ? (
                                    <p className="helperText" style={{ color: 'var(--warn)', marginTop: 6 }}>⚡ Pilote auto — exécution automatique selon vos quotas</p>
                                  ) : (
                                    <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                                      <button className="secondaryButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(decision, true)} type="button">
                                        {decisionActionLoading ? 'Traitement...' : 'Valider la transaction'}
                                      </button>
                                      <button className="ghostButton" disabled={decisionActionLoading} onClick={() => void runDecisionAction(decision, false)} type="button">Refuser</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="helperText" style={{ fontSize: '.82rem' }}>Aucune proposition IA en attente pour ce portefeuille.</p>
                        )}

                        {/* Agent IA configuration */}
                        <div style={{ background: 'var(--surface-3)', borderRadius: 'var(--card-radius-sm)', padding: '14px 16px', display: 'grid', gap: 12 }}>
                          <div className="cardHeader" style={{ margin: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '.95rem' }}>Pilotage Agent IA</h3>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <label className="checkRow" style={{ margin: 0 }}>
                                <input type="checkbox" checked={cfg.enabled} onChange={(e) => void updateAgentConfig(p.id, { enabled: e.target.checked })} />
                                <span style={{ fontSize: '.78rem' }}>Agent activé</span>
                              </label>
                            </div>
                          </div>
                          {cfg.enabled ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              <div>
                                <p style={{ margin: '0 0 6px', fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Mode de pilotage</p>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button
                                    className={cfg.mode === 'manual' ? 'tagButton active' : 'tagButton'}
                                    onClick={() => void updateAgentConfig(p.id, { mode: 'manual' })}
                                    type="button"
                                  >
                                    ✋ Mode manuel — validation humaine requise
                                  </button>
                                  <button
                                    className={cfg.mode === 'autopilot' ? 'tagButton active' : 'tagButton'}
                                    onClick={() => void updateAgentConfig(p.id, { mode: 'autopilot' })}
                                    type="button"
                                    style={cfg.mode === 'autopilot' ? { borderColor: 'var(--warn)', color: 'var(--warn)' } : {}}
                                  >
                                    ⚡ Pilote automatique — IA exécute seule
                                  </button>
                                </div>
                                {cfg.mode === 'autopilot' ? (
                                  <div className="infoPanel" style={{ marginTop: 8, padding: '8px 12px', background: 'var(--warn-soft)', border: '1px solid var(--warn-border)' }}>
                                    <p style={{ margin: 0, fontSize: '.78rem' }}>⚠️ En pilote automatique, l agent IA exécute les transactions dans vos limites sans validation. Vérifiez vos quotas.</p>
                                  </div>
                                ) : (
                                  <p style={{ margin: '6px 0 0', fontSize: '.75rem', color: 'var(--muted)' }}>Chaque transaction vous sera proposée avant exécution.</p>
                                )}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <label style={{ fontSize: '.82rem' }}>
                                  Montant max / transaction (€)
                                  <input
                                    type="number" min={1}
                                    value={cfg.max_amount}
                                    onChange={(e) => void updateAgentConfig(p.id, { max_amount: Number(e.target.value) || 1 })}
                                    style={{ marginTop: 4 }}
                                  />
                                </label>
                                <label style={{ fontSize: '.82rem' }}>
                                  Max transactions / jour
                                  <input
                                    type="number" min={1}
                                    value={cfg.max_transactions_per_day}
                                    onChange={(e) => void updateAgentConfig(p.id, { max_transactions_per_day: Number(e.target.value) || 1 })}
                                    style={{ marginTop: 4 }}
                                  />
                                </label>
                              </div>
                              <div>
                                <p style={{ margin: '0 0 6px', fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Politique par domaine</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                                  {(['crypto', 'actions', 'etf', 'obligations'] as AgentDomain[]).map((domain) => (
                                    <label key={`${p.id}-${domain}`} style={{ fontSize: '.8rem' }}>
                                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                                      <select
                                        value={cfg.domain_policy[domain]}
                                        onChange={(e) => void updateAgentConfig(p.id, { domain_policy: { ...cfg.domain_policy, [domain]: e.target.value as AgentDomainPolicy } })}
                                        style={{ marginTop: 4 }}
                                      >
                                        <option value="prefer">Préférence</option>
                                        <option value="allow">Autoriser</option>
                                        <option value="reject">Rejeter</option>
                                      </select>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="helperText" style={{ margin: 0, fontSize: '.8rem' }}>Activez l agent pour configurer le mode de pilotage et les quotas.</p>
                          )}
                        </div>

                        {/* Visibility toggle */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                          <label className="checkRow" style={{ margin: 0, padding: '4px 8px' }}>
                            <input type="checkbox" checked={portfolioVisibility[p.id] !== false} onChange={(e) => void updatePortfolioVisibilityPreference(p.id, e.target.checked)} />
                            <span style={{ fontSize: '.78rem' }}>Afficher sur le tableau de bord</span>
                          </label>
                          <label className="checkRow" style={{ margin: 0, padding: '4px 8px' }}>
                            <input type="checkbox" checked={p.status === 'active'} onChange={(e) => void togglePortfolioActivation(p, e.target.checked)} />
                            <span style={{ fontSize: '.78rem' }}>Activer le suivi</span>
                          </label>
                          {p.provider_code ? (
                            <button className="ghostButton" style={{ fontSize: '.78rem' }} disabled={submitting} onClick={() => void syncIntegration(p.provider_code!)} type="button">Synchroniser maintenant</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsIntroCard">
                <div className="cardHeader">
                  <h2>Configuration</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Compte, intégrations et communication</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('intro')} type="button">{settingsTileCollapsed.intro ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.intro ? <p className="helperText">Gérez votre profil, activez vos connecteurs de portefeuilles et configurez vos canaux de communication. Le pilotage de l agent IA se définit directement dans l onglet Portefeuilles.</p> : null}
              </article>

              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>Mon espace personnel et coordonnees</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Preferences, accompagnement et canaux de contact</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('profile')} type="button">{settingsTileCollapsed.profile ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.profile ? (
                <form className="authForm" onSubmit={saveSettings}>
                  <label>
                    Nom affiche
                    <input value={settingsForm.fullName} onChange={(event) => setSettingsForm((state) => ({ ...state, fullName: event.target.value }))} type="text" required />
                  </label>
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
                    Frequence auto-refresh portefeuilles
                    <select value={settingsForm.autoRefreshSeconds} onChange={(event) => setSettingsForm((state) => ({ ...state, autoRefreshSeconds: event.target.value }))}>
                      <option value="15">15 secondes</option>
                      <option value="30">30 secondes</option>
                      <option value="60">60 secondes</option>
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
                  <p className="helperText">Prefill navigateur: {clientContext.country || clientContext.locale} · {clientContext.time_zone}</p>
                  <button className="primaryButton" disabled={submitting} type="submit">
                    {submitting ? 'Enregistrement...' : 'Sauvegarder ma configuration'}
                  </button>
                </form>
                ) : null}
              </article>

                <article className="featureCard settingsCard">
                  <div className="cardHeader">
                    <h2>Raccourci Agent IA</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Pilotage par portefeuille</span>
                    </div>
                  </div>
                  <div className="infoPanel mutedPanel">
                    <strong>Configuration déplacée dans Portefeuilles</strong>
                    <p>Le mode de pilotage (manuel / pilote automatique) et les quotas se configurent directement dans chaque fiche portefeuille.</p>
                    <button className="secondaryButton" style={{ marginTop: 10 }} onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Aller à Portefeuilles →</button>
                  </div>
                </article>

              {/* Virtual Portfolio settings tile */}
              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>⚗️ Portefeuille Virtuel IA</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Bac à sable &bull; 100 €</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('virtual')} type="button">{settingsTileCollapsed.virtual ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.virtual ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="infoPanel" style={{ background: 'rgba(250,200,40,.08)', border: '1px solid rgba(250,200,40,.3)', borderRadius: 8, padding: '10px 14px' }}>
                      <strong>Actif par défaut — aucune intégration requise</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '.8rem' }}>Picsou IA dispose d'un portefeuille bac à sable de <strong>100 €</strong> pour tester ses stratégies sans risque. Il est toujours disponible, même sans connecteur bancaire.</p>
                    </div>
                    {(() => {
                      const vp = allPortfolios.find((p) => p.type === 'virtual');
                      if (!vp) return <p className="helperText">Chargement du portefeuille virtuel…</p>;
                      const isVisible = portfolioVisibility[vp.id] !== false;
                      return (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={(e) => void updatePortfolioVisibilityPreference(vp.id, e.target.checked)}
                            />
                            <span><strong>{isVisible ? 'Actif' : 'Désactivé'}</strong> — {isVisible ? 'Visible sur le tableau de bord et dans Portefeuilles.' : 'Masqué. Vous pouvez le réactiver à tout moment.'}</span>
                          </label>
                          <div className="compactRow" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                            <span>Valeur simulée</span><strong>{vp.current_value.toFixed(2)} €</strong>
                          </div>
                          <div className="compactRow" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                            <span>Budget initial</span><strong>{vp.budget.toFixed(2)} €</strong>
                          </div>
                          <button className="ghostButton" onClick={() => { setSelectedPortfolio(vp); setPortfolioDetailOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir le détail →</button>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </article>

              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>Intégrations et sources</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Connecteurs déclarés et credentials API</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('sources')} type="button">{settingsTileCollapsed.sources ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.sources ? (
                  <>
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
                            <p>{provider.code === 'coinbase' ? 'Connecteur reel disponible en lecture seule via API Coinbase Advanced Trade. Les secrets restent chiffrés côté serveur.' : provider.code === 'interactive_brokers' ? 'Connecteur configurable pour Interactive Brokers: activez le suivi, renseignez les identifiants/API et votre compte de référence.' : 'Source declaree pour alimenter le dashboard. Les autres connecteurs restent pour l instant en mode declaratif.'}</p>
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
                          {provider.code === 'coinbase' || provider.code === 'interactive_brokers' ? (
                            <div className="integrationCredentialBox">
                              <label>
                                {provider.code === 'coinbase' ? 'API key Coinbase' : 'API key Interactive Brokers'}
                                <input value={providerKeyState.apiKey} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, apiKey: event.target.value } }))} type="text" placeholder={provider.code === 'coinbase' ? 'organizations/.../apiKeys/...' : 'ibkr_api_key_...'} />
                              </label>
                              {provider.code === 'coinbase' ? (
                                <label>
                                  API secret Coinbase
                                  <textarea value={providerKeyState.apiSecret} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, apiSecret: event.target.value } }))} placeholder="-----BEGIN EC PRIVATE KEY-----" rows={5} />
                                </label>
                              ) : null}
                              <label>
                                {provider.code === 'coinbase' ? 'Portfolio ID Coinbase (optionnel)' : 'Compte / Portfolio ID IBKR (optionnel)'}
                                <input value={providerKeyState.portfolioId} onChange={(event) => setProviderKeys((state) => ({ ...state, [provider.code]: { ...providerKeyState, portfolioId: event.target.value } }))} type="text" placeholder={provider.code === 'coinbase' ? 'portfolio uuid' : 'U1234567'} />
                              </label>
                              {providerConnection?.last_sync_error ? <p className="helperText">Derniere erreur: {providerConnection.last_sync_error}</p> : null}
                              <div className="providerActions fullWidth">
                                <button className="secondaryButton" disabled={submitting} onClick={() => void saveIntegrationCredentials(provider.code)} type="button">
                                  {submitting ? 'Sauvegarde...' : 'Sauvegarder les credentials'}
                                </button>
                                {provider.code === 'coinbase' ? (
                                  <button className="ghostButton" disabled={submitting || !providerConnection?.has_credentials} onClick={() => void syncIntegration(provider.code)} type="button">
                                    {submitting ? 'Synchronisation...' : 'Synchroniser Coinbase'}
                                  </button>
                                ) : null}
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
                  </>
                ) : null}
              </article>

              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>Intégrations de communication</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Canaux et fréquences</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('communication')} type="button">{settingsTileCollapsed.communication ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.communication ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {/* Email */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>✉️ Email</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Notifications et rapports</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={settingsForm.notifyEmail} onChange={(e) => setSettingsForm((s) => ({ ...s, notifyEmail: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {settingsForm.notifyEmail ? (
                      <>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className={settingsForm.communicationFrequency === 'important_only' ? 'tagButton active' : 'tagButton'} onClick={() => setSettingsForm((s) => ({ ...s, communicationFrequency: 'important_only' }))} type="button">Immédiat</button>
                          <button className={settingsForm.communicationFrequency === 'daily' ? 'tagButton active' : 'tagButton'} onClick={() => setSettingsForm((s) => ({ ...s, communicationFrequency: 'daily' }))} type="button">Digest quotidien</button>
                          <button className={settingsForm.communicationFrequency === 'weekly' ? 'tagButton active' : 'tagButton'} onClick={() => setSettingsForm((s) => ({ ...s, communicationFrequency: 'weekly' }))} type="button">Digest hebdo</button>
                        </div>
                        <button className="ghostButton" onClick={() => runCommunicationTest('email')} style={{ width: 'fit-content' }} type="button">Tester email</button>
                      </>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px' }}>
                        <input type="checkbox" checked={settingsForm.weeklyDigest} onChange={(e) => setSettingsForm((s) => ({ ...s, weeklyDigest: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Digest marché hebdo</span>
                      </label>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px' }}>
                        <input type="checkbox" checked={settingsForm.marketAlerts} onChange={(e) => setSettingsForm((s) => ({ ...s, marketAlerts: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Alertes marché</span>
                      </label>
                    </div>
                  </div>
                  {/* WhatsApp */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>💬 WhatsApp</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Récaps et alertes critiques</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={settingsForm.notifyWhatsapp} onChange={(e) => setSettingsForm((s) => ({ ...s, notifyWhatsapp: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {settingsForm.notifyWhatsapp ? (
                      <>
                        <label>Numéro WhatsApp<input type="tel" value={settingsForm.phoneNumber} onChange={(e) => setSettingsForm((s) => ({ ...s, phoneNumber: e.target.value }))} placeholder="+33 6 12 34 56 78" /></label>
                        <button className="ghostButton" onClick={() => runCommunicationTest('whatsapp')} style={{ width: 'fit-content' }} type="button">Tester WhatsApp</button>
                      </>
                    ) : null}
                  </div>
                  {/* Google Chat */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>💼 Google Chat</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Webhook vers un espace Google Chat</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={commGoogleChat.enabled} onChange={(e) => setCommGoogleChat((s) => ({ ...s, enabled: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {commGoogleChat.enabled ? (
                      <>
                        <label>URL Webhook<input type="url" value={commGoogleChat.webhook} onChange={(e) => setCommGoogleChat((s) => ({ ...s, webhook: e.target.value }))} placeholder="https://chat.googleapis.com/v1/spaces/..." /></label>
                        <button className="ghostButton" onClick={() => runCommunicationTest('google_chat')} style={{ width: 'fit-content' }} type="button">Tester Google Chat</button>
                      </>
                    ) : null}
                  </div>
                  {/* Telegram */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>✈️ Telegram</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Bot Telegram personnalisé</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={commTelegram.enabled} onChange={(e) => setCommTelegram((s) => ({ ...s, enabled: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {commTelegram.enabled ? (
                      <>
                        <label>Bot Token<input type="text" value={commTelegram.botToken} onChange={(e) => setCommTelegram((s) => ({ ...s, botToken: e.target.value }))} placeholder="123456:ABC-DEF..." /></label>
                        <label>Chat ID<input type="text" value={commTelegram.chatId} onChange={(e) => setCommTelegram((s) => ({ ...s, chatId: e.target.value }))} placeholder="-1001234567890" /></label>
                        <button className="ghostButton" onClick={() => runCommunicationTest('telegram')} style={{ width: 'fit-content' }} type="button">Tester Telegram</button>
                      </>
                    ) : null}
                  </div>
                  {/* SMS */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>📱 SMS</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Alertes critiques uniquement</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={settingsForm.notifySms} onChange={(e) => setSettingsForm((s) => ({ ...s, notifySms: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {settingsForm.notifySms ? (
                      <>
                        <p className="helperText">Numéro utilisé: {settingsForm.phoneNumber || 'non renseigné dans Coordonnées de contact'}</p>
                        <button className="ghostButton" onClick={() => runCommunicationTest('sms')} style={{ width: 'fit-content' }} type="button">Tester SMS</button>
                      </>
                    ) : null}
                  </div>
                  {/* Push */}
                  <div className="inlineServicePanel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div><strong style={{ fontSize: '.9rem' }}>🔔 Push navigateur</strong><p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>Notifications en temps réel dans le navigateur</p></div>
                      <label className="checkRow" style={{ margin: 0, padding: '6px 10px', width: 'max-content' }}>
                        <input type="checkbox" checked={settingsForm.notifyPush} onChange={(e) => setSettingsForm((s) => ({ ...s, notifyPush: e.target.checked }))} />
                        <span style={{ fontSize: '.78rem' }}>Activé</span>
                      </label>
                    </div>
                    {settingsForm.notifyPush ? <button className="ghostButton" onClick={() => runCommunicationTest('push')} style={{ width: 'fit-content' }} type="button">Tester Push</button> : null}
                  </div>
                  {communicationTestResult ? <p className="helperText">{communicationTestResult}</p> : null}
                  <button className="primaryButton" disabled={submitting} onClick={() => void submitSettingsUpdate()} type="button">
                    {submitting ? 'Sauvegarde...' : 'Enregistrer les préférences de communication'}
                  </button>
                </div>
                ) : null}
              </article>

              <article className="featureCard accentCard settingsCard">
                <div className="cardHeader">
                  <h2>Securite et MFA</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={user.mfa_enabled ? 'statusBadge ok' : 'statusBadge warn'}>
                      <span className={user.mfa_enabled ? 'statusDot ok' : 'statusDot warn'} />
                      {user.mfa_enabled ? 'Protege' : 'Non active'}
                    </span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('security')} type="button">{settingsTileCollapsed.security ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.security ? (
                  <>
                    {user.mfa_enabled && !mfaSecret ? (
                      <div className="infoPanel">
                        <strong>MFA active ✓</strong>
                        <p>Votre compte est protege par une authentification a deux facteurs. Mode actif: {String(user.personal_settings.preferred_mfa_method ?? 'email')}.</p>
                        <div className="providerActions fullWidth" style={{ marginTop: '10px' }}>
                          <button className="secondaryButton" disabled={submitting} onClick={() => void startMfaSetup('email')} type="button">
                            {submitting && mfaSetupMethod === 'email' ? 'Envoi...' : 'Reconfigurer par email'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('sms')} type="button">
                            {submitting && mfaSetupMethod === 'sms' ? 'Envoi...' : 'Configurer SMS'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('whatsapp')} type="button">
                            {submitting && mfaSetupMethod === 'whatsapp' ? 'Envoi...' : 'Configurer WhatsApp'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('google_chat')} type="button">
                            {submitting && mfaSetupMethod === 'google_chat' ? 'Envoi...' : 'Configurer Google Chat'}
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
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('sms')} type="button">
                            {submitting && mfaSetupMethod === 'sms' ? 'Envoi...' : 'Code SMS'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('whatsapp')} type="button">
                            {submitting && mfaSetupMethod === 'whatsapp' ? 'Envoi...' : 'Code WhatsApp'}
                          </button>
                          <button className="ghostButton" disabled={submitting} onClick={() => void startMfaSetup('google_chat')} type="button">
                            {submitting && mfaSetupMethod === 'google_chat' ? 'Envoi...' : 'Code Google Chat'}
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
                    ) : mfaSetupMethod !== 'totp' && (mfaDeliveryHint || mfaPreviewCode) ? (
                      <div className="mfaStep">
                        <div className="mfaStepNum">2</div>
                        <div className="mfaStepBody">
                          <strong>Valider le code {mfaSetupMethod.replace('_', ' ')}</strong>
                          <p>Le code est envoyé sur le canal choisi pour finaliser l activation.</p>
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
                              {submitting ? 'Verification...' : `Activer MFA ${mfaSetupMethod.replace('_', ' ')}`}
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
                  </>
                ) : null}
              </article>
            </section>
          ) : null}

          {appView === 'admin' ? (
            <section className="workspaceGrid adminGrid">
              {/* Emergency Stop Banner */}
              <article className="featureCard" style={{ background: emergencyStopActive ? 'var(--danger-soft)' : 'var(--surface)', border: emergencyStopActive ? '2px solid var(--danger)' : 'var(--card-border)', gridColumn: '1 / -1' }}>
                <div className="cardHeader">
                  <div>
                    <h2 style={{ margin: 0 }}>Contrôle des transactions</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>Interrompez toutes les transactions en cours et à venir en cas d urgence.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {emergencyStopActive ? (
                      <span className="statusBadge warn"><span className="statusDot warn" />Arrêt d urgence actif — toutes transactions bloquées</span>
                    ) : (
                      <span className="statusBadge ok"><span className="statusDot ok" />Transactions opérationnelles</span>
                    )}
                    <button
                      className={emergencyStopActive ? 'secondaryButton' : 'primaryButton'}
                      style={emergencyStopActive ? { background: 'var(--ok)', color: 'white', borderColor: 'var(--ok)' } : { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}
                      onClick={() => {
                        const next = !emergencyStopActive;
                        setEmergencyStopActive(next);
                        if (next) {
                          setAutopilotRunning(false);
                          setAdminFeedback('🛑 Arrêt d urgence activé. Toutes les transactions automatiques sont bloquées jusqu à désactivation manuelle.');
                        } else {
                          setAdminFeedback('✅ Arrêt d urgence désactivé. Le système reprend normalement.');
                        }
                      }}
                      type="button"
                    >
                      {emergencyStopActive ? '✅ Reprendre les transactions' : '🛑 Arrêt d urgence'}
                    </button>
                  </div>
                </div>
                {emergencyStopActive ? (
                  <div className="infoPanel" style={{ marginTop: 12, background: 'var(--danger-soft)', border: '1px solid var(--danger-border)' }}>
                    <strong>Arrêt d urgence activé</strong>
                    <p>Toutes les transactions automatiques (pilote auto) sont suspendues. Les propositions manuelles sont également bloquées. Désactivez le verrou pour reprendre.</p>
                  </div>
                ) : null}
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Gestion des utilisateurs</h2>
                  <span>Roles, bannissement, activite</span>
                </div>
                {adminFeedback ? <p className="helperText">{adminFeedback}</p> : null}
                {!user.mfa_enabled ? (
                  <div className="infoPanel">
                    <strong>MFA requise</strong>
                    <p>Activez MFA dans Configuration puis reconnectez-vous pour administrer la plateforme.</p>
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
                  <h2>Historique des transactions</h2>
                  <span>Ordres exécutés sur la plateforme</span>
                </div>
                {adminTransactionLog.length === 0 ? (
                  <div className="infoPanel mutedPanel">
                    <strong>Aucune transaction enregistrée</strong>
                    <p>L historique des transactions sera affiché ici dès que des ordres auront été exécutés via l agent IA ou validés manuellement par les utilisateurs.</p>
                    <p style={{ marginTop: 6, fontSize: '.76rem', color: 'var(--muted)' }}>Les transactions sont cumulées localement en session. Un historique persistant nécessite une extension du backend.</p>
                  </div>
                ) : (
                  <div className="operationLedgerWrap">
                    <table className="operationLedger">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Utilisateur</th>
                          <th>Portefeuille</th>
                          <th>Actif</th>
                          <th>Type</th>
                          <th>Montant</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTransactionLog.map((tx) => (
                          <tr key={tx.id}>
                            <td>{new Date(tx.created_at).toLocaleString('fr-FR')}</td>
                            <td>{tx.user_name}</td>
                            <td>{tx.portfolio_id}</td>
                            <td>{tx.asset}</td>
                            <td><span className={tx.side === 'buy' ? 'statusBadge ok' : 'statusBadge warn'}>{tx.side === 'buy' ? 'Achat' : 'Vente'}</span></td>
                            <td>{tx.amount.toFixed(2)} €</td>
                            <td><span className={tx.status === 'approved' ? 'statusBadge ok' : tx.status === 'rejected' ? 'statusBadge warn' : 'statusBadge idle'}>{tx.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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