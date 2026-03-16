'use client';

import { FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AdminConsoleHeader } from './components/admin-console-header';
import { AccountWorkspace } from './components/account-workspace';
import { AppBreadcrumbs } from './components/app-breadcrumbs';
import { HomeOverview } from './components/home-overview';
import { TopbarNavigation } from './components/topbar-navigation';

type UserProfile = {
  id: string;
  email: string;
  phone_number?: string | null;
  birth_date?: string | null;
  last_login_at?: string | null;
  full_name: string;
  role: string;
  assigned_roles: string[];
  access_profile?: 'read' | 'write' | 'admin';
  app_access?: Array<'finance' | 'betting' | 'racing' | 'loto'>;
  is_verified: boolean;
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
  suggestions?: Array<{
    title: string;
    score: number;
    justification: string;
  }>;
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

type BettingAnalyticsSummary = {
  roi_pct: number;
  yield_pct: number;
  variance: number;
  max_drawdown_pct: number;
  bets: number;
  win_rate_pct: number;
};

type BettingThemeKey = 'football' | 'tennis' | 'basketball' | 'rugby' | 'other';
type BettingThemeVisibility = Record<BettingThemeKey, boolean>;

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

type DecisionActionOptions = {
  silent?: boolean;
  source?: 'manual' | 'autopilot';
  targetPortfolioId?: string;
  side?: 'buy' | 'sell';
  amount?: number;
};

type PendingDecisionConfirmation = {
  insight: InsightItem;
  approved: boolean;
  options: DecisionActionOptions;
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
  confidence: number;
  rationale: string;
  risk: 'faible' | 'modere' | 'eleve';
  min_investment: number;
};

type AgentMode = 'manual' | 'supervised' | 'autopilot';
type AgentDomain = 'crypto' | 'actions' | 'etf' | 'obligations';
type AgentDomainPolicy = 'prefer' | 'allow' | 'reject';
type GoalPeriod = '7d' | '1m' | '3m' | '1y';

type FinanceVirtualSimulation = {
  currentValue: number;
  history: Array<{ date: string; value: number }>;
  operations: Portfolio['operations'];
};

function normalizeFinanceVirtualRuntime(raw: unknown): FinanceVirtualSimulation | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const currentValue = Number(source.currentValue);
  const historySource = Array.isArray(source.history) ? source.history : [];
  const operationsSource = Array.isArray(source.operations) ? source.operations : [];
  const history = historySource
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      date: typeof entry.date === 'string' && entry.date.trim() ? entry.date : new Date().toISOString(),
      value: Number.isFinite(Number(entry.value)) ? Number(entry.value) : (Number.isFinite(currentValue) ? currentValue : 100),
    }))
    .slice(-180);
  const operations = operationsSource
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `virtual-op-restored-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: typeof entry.date === 'string' && entry.date.trim() ? entry.date : new Date().toISOString(),
      side: String(entry.side ?? '').toLowerCase() === 'sell' ? 'sell' as const : 'buy' as const,
      asset: typeof entry.asset === 'string' && entry.asset.trim() ? entry.asset : 'CW8',
      amount: Number.isFinite(Number(entry.amount)) ? Math.max(0, Number(entry.amount)) : 0,
      tax_state: Number.isFinite(Number(entry.tax_state)) ? Number(entry.tax_state) : null,
      tax_intermediary: Number.isFinite(Number(entry.tax_intermediary)) ? Number(entry.tax_intermediary) : null,
      intermediary: typeof entry.intermediary === 'string' && entry.intermediary.trim() ? entry.intermediary : 'Robin IA (virtuel)',
    }))
    .slice(0, 240);
  return {
    currentValue: Number.isFinite(currentValue) ? currentValue : (history[history.length - 1]?.value ?? 100),
    history: history.length > 0 ? history : [{ date: new Date().toISOString(), value: Number.isFinite(currentValue) ? currentValue : 100 }],
    operations,
  };
}

type BetSport = 'football' | 'tennis' | 'basketball' | 'rugby' | 'other';

type BetRecord = {
  id: string;
  date: string;
  sport: BetSport;
  event: string;
  market: string;
  bookmaker: string;
  odds: number;
  stake: number;
  result: 'won' | 'lost' | 'pending' | 'void';
  profit: number;
  strategyId: string;
};

type BettingStrategy = {
  id: string;
  name: string;
  type: 'value_betting' | 'arbitrage' | 'statistical' | 'predictive' | 'personal';
  description: string;
  isVirtual: boolean;
  bankroll: number;
  roi: number;
  winRate: number;
  variance: number;
  enabled: boolean;
  betsTotal: number;
  betsWon: number;
  ai_enabled: boolean;
  mode: 'manual' | 'supervised' | 'autonomous';
  max_stake: number;
  max_bets_per_day: number;
  risk_profile?: 'low' | 'medium' | 'high';
  history: Array<{ date: string; value: number }>;
  recentBets: BetRecord[];
};

type BettingStrategySettings = {
  enabled: boolean;
  ai_enabled: boolean;
  mode: BettingStrategy['mode'];
  max_stake: number;
  max_bets_per_day: number;
  risk_profile?: BettingStrategy['risk_profile'];
};

type BettingStrategyRuntime = {
  bankroll: number;
  roi: number;
  winRate: number;
  variance: number;
  betsTotal: number;
  betsWon: number;
  risk_profile?: BettingStrategy['risk_profile'];
  history: Array<{ date: string; value: number }>;
  recentBets: BetRecord[];
};

type TipsterSignal = {
  id: string;
  sport: BetSport;
  event: string;
  market: string;
  odds: number;
  value_pct: number;
  confidence: number;
  rationale: string;
  risk: 'faible' | 'modere' | 'eleve';
  bookmaker: string;
  deadline: string;
  potentialGain: number;
  status: 'pending' | 'approved' | 'rejected';
};

type LotteryGame = 'loto' | 'euromillions';

type LotteryDrawRecord = {
  date: string;
  numbers: number[];
  stars: number[];
};

type LotteryPrediction = {
  id: string;
  game: LotteryGame;
  numbers: number[];
  stars: number[];
  confidenceIndex: number;
  rationale: string;
};

type LotteryBacktestHit = {
  drawDate: string;
  matchedNumbers: number;
  matchedStars: number;
  estimatedPrize: number;
  rankLabel: string;
};

type LotteryBacktestSummary = {
  analyzedDraws: number;
  ticketCost: number;
  totalCost: number;
  totalEstimatedWinnings: number;
  netResult: number;
  winningDraws: number;
  hits: LotteryBacktestHit[];
};

type LotteryUpcomingDraw = {
  game: LotteryGame;
  drawDate: string;
  closeAt: string;
  jackpotLabel: string;
};

type LotteryVirtualTicket = {
  id: string;
  game: LotteryGame;
  drawDate: string;
  gridLabel: string;
  subscriptionLabel: string | null;
  numbers: number[];
  stars: number[];
  stake: number;
  status: 'pending' | 'won' | 'lost';
  payout: number;
  profit: number;
  matchedNumbers: number;
  matchedStars: number;
  rankLabel: string | null;
  createdAt: string;
  settledAt: string | null;
};

type LotteryVirtualPortfolio = {
  enabled: boolean;
  ai_enabled: boolean;
  mode: BettingStrategy['mode'];
  initial_balance: number;
  bankroll: number;
  max_grids_per_draw: number;
  tickets: LotteryVirtualTicket[];
};

type LotteryExecutionRequest = {
  id: string;
  game: LotteryGame;
  drawDate: string;
  gridLabel: string;
  subscriptionLabel: string | null;
  numbers: number[];
  stars: number[];
  targetPortfolioId: string;
  targetPortfolioLabel: string;
  executionMode: 'simulation' | 'real';
  status: 'confirmed';
  createdAt: string;
};

type AssistantTip = {
  id: string;
  title: string;
  detail: string;
  insight?: InsightItem;
  value?: string;
  trend?: string;
};

type HomePortfolioRow = {
  id: string;
  appKey: 'finance' | 'betting' | 'racing' | 'loto';
  kind: 'real' | 'virtual';
  source: 'portfolio' | 'strategy' | 'loto';
  targetId: string;
  label: string;
  subtitle: string;
  history: Array<{ date: string; value: number }>;
  valueLabel: string;
  statusLabel: string;
  statusTone: 'ok' | 'idle' | 'warn';
  trendLabel: string;
  trendTone: 'up' | 'down' | 'neutral';
  aiEnabled: boolean;
  autonomousActive: boolean;
};

type HomeRecommendationRow = {
  id: string;
  appKey: 'finance' | 'betting' | 'racing' | 'loto';
  badge: string;
  title: string;
  detail: string;
  confidenceLevel: 1 | 2 | 3;
  insight?: InsightItem;
  game?: LotteryGame;
};

type HomeTransactionRow = {
  id: string;
  appKey: 'finance' | 'betting' | 'racing' | 'loto';
  targetId: string;
  lane: 'upcoming' | 'closed';
  title: string;
  portfolioLabel: string;
  date: string;
  timestamp: number;
  amount: number | null;
  note: string;
  gainLoss: number | null;
  taxes: number | null;
  moodImpact: number;
};

type CockpitUpcomingRow = {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  portfolioLabel: string;
  amountLabel: string;
  detail: string;
  isLive?: boolean;
  liveKind?: 'betting' | 'racing';
  liveLabel?: string;
};

type CockpitRecentRow = {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  portfolioLabel: string;
  pnlAmount: number;
  pnlPct: number | null;
  fees: number;
  taxesFr: number;
  detail: string;
};

const APP_LABELS: Record<'finance' | 'betting' | 'racing' | 'loto', string> = {
  finance: 'Finance',
  betting: 'Paris sportifs',
  racing: 'Paris hippiques',
  loto: 'Loto',
};

const HOME_MOOD_THRESHOLDS = {
  sensitive: 20,
  balanced: 40,
  conservative: 80,
} as const;

const HOME_MOOD_PROFILE: keyof typeof HOME_MOOD_THRESHOLDS = 'sensitive';
const LIVE_CLOCK_TICK_MS = 15_000;

const BETTING_EVENT_LIVE_WINDOWS_MS: Record<BetSport, number> = {
  football: 2 * 60 * 60 * 1000 + 20 * 60 * 1000,
  tennis: 3 * 60 * 60 * 1000 + 30 * 60 * 1000,
  basketball: 2 * 60 * 60 * 1000 + 45 * 60 * 1000,
  rugby: 2 * 60 * 60 * 1000 + 25 * 60 * 1000,
  other: 2 * 60 * 60 * 1000,
};

const RACING_EVENT_LIVE_WINDOW_MS = 35 * 60 * 1000;
const LOTTERY_DRAW_LIVE_WINDOW_MS = 18 * 60 * 1000;

function normalizeFinanceVirtualPortfolioLabel(rawLabel: string | null | undefined): string {
  const label = String(rawLabel ?? '').trim();
  if (!label) {
    return 'Portefeuille fictif Cryptos';
  }
  if (label === 'Portefeuille Virtuel IA' || label === 'Portefeuille Virtuel IA (inactif)' || label === 'Portefeuille Fictif Cryptos') {
    return 'Portefeuille fictif Cryptos';
  }
  return label;
}

function getBettingEventLiveWindowMs(sport: BetSport): number {
  return BETTING_EVENT_LIVE_WINDOWS_MS[sport] ?? BETTING_EVENT_LIVE_WINDOWS_MS.other;
}

function isWithinTimedWindow(startAt: string, durationMs: number, nowTs: number): boolean {
  const startTs = Date.parse(startAt);
  return Number.isFinite(startTs) && startTs <= nowTs && (startTs + durationMs) > nowTs;
}

function isWindowElapsed(startAt: string, durationMs: number, nowTs: number): boolean {
  const startTs = Date.parse(startAt);
  return Number.isFinite(startTs) && (startTs + durationMs) <= nowTs;
}

const PARIS_SECTION_APPS = ['betting', 'racing', 'loto'] as const;
type ParisApp = typeof PARIS_SECTION_APPS[number];
type HeaderMenuSection = 'home' | 'finance' | 'paris' | 'account' | 'admin';

const DEFAULT_BETTING_THEME_VISIBILITY: BettingThemeVisibility = {
  football: true,
  tennis: true,
  basketball: true,
  rugby: true,
  other: false,
};

const BETTING_THEME_LABELS: Record<BettingThemeKey, string> = {
  football: 'Football',
  tennis: 'Tennis',
  basketball: 'Basketball',
  rugby: 'Rugby',
  other: 'Autres sports',
};

const ALL_APP_KEYS: Array<'finance' | 'betting' | 'racing' | 'loto'> = ['finance', 'betting', 'racing', 'loto'];
type FrontendAppKey = typeof ALL_APP_KEYS[number];

function normalizeFrontendAppAccess(raw: unknown): Array<'finance' | 'betting' | 'racing' | 'loto'> {
  if (!Array.isArray(raw)) {
    return [...ALL_APP_KEYS];
  }
  const cleaned: Array<'finance' | 'betting' | 'racing' | 'loto'> = [];
  raw.forEach((value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if ((normalized === 'finance' || normalized === 'betting' || normalized === 'racing' || normalized === 'loto') && !cleaned.includes(normalized as 'finance' | 'betting' | 'racing' | 'loto')) {
      cleaned.push(normalized as 'finance' | 'betting' | 'racing' | 'loto');
    }
  });
  if (cleaned.length === 0) {
    cleaned.push('finance');
  }
  if (!cleaned.includes('loto')) {
    cleaned.push('loto');
  }
  if (!cleaned.includes('racing')) {
    cleaned.push('racing');
  }
  return cleaned;
}

function normalizeSelectedAppAccess(raw: unknown): Array<'finance' | 'betting' | 'racing' | 'loto'> {
  if (!Array.isArray(raw)) {
    return ['finance'];
  }
  const cleaned: Array<'finance' | 'betting' | 'racing' | 'loto'> = [];
  raw.forEach((value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if ((normalized === 'finance' || normalized === 'betting' || normalized === 'racing' || normalized === 'loto') && !cleaned.includes(normalized as FrontendAppKey)) {
      cleaned.push(normalized as FrontendAppKey);
    }
  });
  if (cleaned.length === 0) {
    cleaned.push('finance');
  }
  return cleaned;
}

function normalizeAdminUsersPayload(raw: unknown): UserProfile[] {
  if (Array.isArray(raw)) {
    return raw as UserProfile[];
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const candidates = [record.users, record.items, record.results, record.data];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as UserProfile[];
      }
    }
  }
  return [];
}

function isUserPendingApproval(entry: UserProfile) {
  return !entry.is_active && !entry.assigned_roles.includes('banned');
}

const LOTTERY_CONFIG: Record<LotteryGame, { label: string; numbersCount: number; maxNumber: number; starsCount: number; maxStar: number; starLabel: string }> = {
  loto: {
    label: 'Loto',
    numbersCount: 5,
    maxNumber: 49,
    starsCount: 1,
    maxStar: 10,
    starLabel: 'Numero Chance',
  },
  euromillions: {
    label: 'Euromillions',
    numbersCount: 5,
    maxNumber: 50,
    starsCount: 2,
    maxStar: 12,
    starLabel: 'Etoiles',
  },
};

const MAX_LOTTERY_GRID_COUNT = 6;
const LOTTERY_BACKTEST_DRAW_COUNT = 100;
const LOTTERY_DISPLAY_BACKTEST_DRAW_COUNT = 20;
const LOTTERY_SUBSCRIPTION_WEEK_OPTIONS = [1, 2, 4, 8] as const;
const LOTTERY_SIMPLE_GRID_COST: Record<LotteryGame, number> = {
  loto: 2.2,
  euromillions: 2.5,
};
const LOTTERY_ESTIMATED_PRIZE_RULES: Record<LotteryGame, Array<{ matchedNumbers: number; matchedStars: number; estimatedPrize: number; label: string }>> = {
  loto: [
    { matchedNumbers: 5, matchedStars: 1, estimatedPrize: 3000000, label: '5 + Numero Chance' },
    { matchedNumbers: 5, matchedStars: 0, estimatedPrize: 100000, label: '5 bons numeros' },
    { matchedNumbers: 4, matchedStars: 1, estimatedPrize: 1000, label: '4 + Numero Chance' },
    { matchedNumbers: 4, matchedStars: 0, estimatedPrize: 200, label: '4 bons numeros' },
    { matchedNumbers: 3, matchedStars: 1, estimatedPrize: 50, label: '3 + Numero Chance' },
    { matchedNumbers: 3, matchedStars: 0, estimatedPrize: 20, label: '3 bons numeros' },
    { matchedNumbers: 2, matchedStars: 1, estimatedPrize: 10, label: '2 + Numero Chance' },
  ],
  euromillions: [
    { matchedNumbers: 5, matchedStars: 2, estimatedPrize: 17000000, label: '5 + 2 etoiles' },
    { matchedNumbers: 5, matchedStars: 1, estimatedPrize: 220000, label: '5 + 1 etoile' },
    { matchedNumbers: 5, matchedStars: 0, estimatedPrize: 25000, label: '5 bons numeros' },
    { matchedNumbers: 4, matchedStars: 2, estimatedPrize: 1200, label: '4 + 2 etoiles' },
    { matchedNumbers: 4, matchedStars: 1, estimatedPrize: 120, label: '4 + 1 etoile' },
    { matchedNumbers: 4, matchedStars: 0, estimatedPrize: 50, label: '4 bons numeros' },
    { matchedNumbers: 3, matchedStars: 2, estimatedPrize: 25, label: '3 + 2 etoiles' },
    { matchedNumbers: 3, matchedStars: 1, estimatedPrize: 12, label: '3 + 1 etoile' },
    { matchedNumbers: 3, matchedStars: 0, estimatedPrize: 10, label: '3 bons numeros' },
    { matchedNumbers: 2, matchedStars: 2, estimatedPrize: 8, label: '2 + 2 etoiles' },
    { matchedNumbers: 2, matchedStars: 1, estimatedPrize: 5, label: '2 + 1 etoile' },
    { matchedNumbers: 2, matchedStars: 0, estimatedPrize: 4, label: '2 bons numeros' },
    { matchedNumbers: 1, matchedStars: 2, estimatedPrize: 4, label: '1 + 2 etoiles' },
    { matchedNumbers: 0, matchedStars: 2, estimatedPrize: 4, label: '2 etoiles' },
  ],
};

const LOTO_HISTORY: LotteryDrawRecord[] = [
  { date: '2026-01-03T20:45:00+01:00', numbers: [3, 11, 22, 37, 44], stars: [8] },
  { date: '2026-01-06T20:45:00+01:00', numbers: [7, 14, 19, 33, 41], stars: [5] },
  { date: '2026-01-10T20:45:00+01:00', numbers: [2, 9, 24, 28, 46], stars: [4] },
  { date: '2026-01-13T20:45:00+01:00', numbers: [6, 17, 21, 30, 47], stars: [10] },
  { date: '2026-01-17T20:45:00+01:00', numbers: [1, 12, 23, 34, 45], stars: [2] },
  { date: '2026-01-20T20:45:00+01:00', numbers: [4, 16, 25, 32, 49], stars: [7] },
  { date: '2026-01-24T20:45:00+01:00', numbers: [8, 13, 27, 36, 42], stars: [9] },
  { date: '2026-01-27T20:45:00+01:00', numbers: [5, 10, 18, 31, 43], stars: [1] },
  { date: '2026-01-31T20:45:00+01:00', numbers: [9, 15, 22, 29, 48], stars: [6] },
  { date: '2026-02-03T20:45:00+01:00', numbers: [2, 14, 26, 35, 40], stars: [3] },
  { date: '2026-02-07T20:45:00+01:00', numbers: [7, 11, 24, 38, 44], stars: [8] },
  { date: '2026-02-10T20:45:00+01:00', numbers: [3, 16, 21, 33, 47], stars: [5] },
  { date: '2026-02-14T20:45:00+01:00', numbers: [6, 12, 27, 34, 45], stars: [10] },
  { date: '2026-02-17T20:45:00+01:00', numbers: [1, 18, 25, 30, 41], stars: [7] },
  { date: '2026-02-21T20:45:00+01:00', numbers: [4, 13, 23, 37, 46], stars: [2] },
  { date: '2026-02-24T20:45:00+01:00', numbers: [8, 17, 26, 31, 49], stars: [9] },
  { date: '2026-02-28T20:45:00+01:00', numbers: [5, 10, 22, 36, 42], stars: [4] },
  { date: '2026-03-03T20:45:00+01:00', numbers: [7, 15, 24, 32, 43], stars: [6] },
  { date: '2026-03-07T20:45:00+01:00', numbers: [2, 11, 28, 35, 44], stars: [1] },
  { date: '2026-03-10T20:45:00+01:00', numbers: [9, 14, 21, 33, 47], stars: [8] },
];

const EUROMILLIONS_HISTORY: LotteryDrawRecord[] = [
  { date: '2026-01-02T21:00:00+01:00', numbers: [4, 18, 23, 36, 47], stars: [3, 11] },
  { date: '2026-01-06T21:00:00+01:00', numbers: [9, 14, 27, 39, 44], stars: [2, 7] },
  { date: '2026-01-09T21:00:00+01:00', numbers: [5, 12, 25, 33, 50], stars: [1, 10] },
  { date: '2026-01-13T21:00:00+01:00', numbers: [8, 19, 24, 37, 42], stars: [4, 9] },
  { date: '2026-01-16T21:00:00+01:00', numbers: [3, 11, 22, 35, 46], stars: [5, 12] },
  { date: '2026-01-20T21:00:00+01:00', numbers: [7, 15, 28, 31, 49], stars: [2, 8] },
  { date: '2026-01-23T21:00:00+01:00', numbers: [1, 13, 26, 34, 45], stars: [6, 10] },
  { date: '2026-01-27T21:00:00+01:00', numbers: [6, 17, 21, 40, 48], stars: [3, 11] },
  { date: '2026-01-30T21:00:00+01:00', numbers: [2, 16, 29, 32, 43], stars: [1, 9] },
  { date: '2026-02-03T21:00:00+01:00', numbers: [10, 18, 24, 38, 47], stars: [4, 7] },
  { date: '2026-02-06T21:00:00+01:00', numbers: [5, 14, 27, 33, 50], stars: [2, 12] },
  { date: '2026-02-10T21:00:00+01:00', numbers: [8, 19, 23, 36, 44], stars: [5, 10] },
  { date: '2026-02-13T21:00:00+01:00', numbers: [4, 12, 25, 37, 49], stars: [3, 8] },
  { date: '2026-02-17T21:00:00+01:00', numbers: [7, 11, 22, 34, 46], stars: [1, 9] },
  { date: '2026-02-20T21:00:00+01:00', numbers: [6, 15, 28, 31, 45], stars: [4, 11] },
  { date: '2026-02-24T21:00:00+01:00', numbers: [3, 13, 26, 40, 48], stars: [2, 7] },
  { date: '2026-02-27T21:00:00+01:00', numbers: [9, 17, 21, 32, 43], stars: [6, 12] },
  { date: '2026-03-03T21:00:00+01:00', numbers: [2, 18, 24, 39, 47], stars: [3, 10] },
  { date: '2026-03-06T21:00:00+01:00', numbers: [5, 14, 27, 35, 50], stars: [1, 8] },
  { date: '2026-03-10T21:00:00+01:00', numbers: [8, 16, 23, 37, 44], stars: [4, 11] },
];

const LOTTERY_UPCOMING_DRAWS: LotteryUpcomingDraw[] = [
  { game: 'loto', drawDate: '2026-03-16T20:45:00+01:00', closeAt: '20:20', jackpotLabel: '3 M€ estimes' },
  { game: 'loto', drawDate: '2026-03-18T20:45:00+01:00', closeAt: '20:20', jackpotLabel: '4 M€ estimes' },
  { game: 'euromillions', drawDate: '2026-03-17T21:00:00+01:00', closeAt: '20:45', jackpotLabel: '38 M€ estimes' },
  { game: 'euromillions', drawDate: '2026-03-20T21:00:00+01:00', closeAt: '20:45', jackpotLabel: '44 M€ estimes' },
];

const LOTTERY_VIRTUAL_INITIAL_BALANCE = 50;
const DEFAULT_LOTTERY_VIRTUAL_PORTFOLIO: LotteryVirtualPortfolio = {
  enabled: false,
  ai_enabled: false,
  mode: 'manual',
  initial_balance: LOTTERY_VIRTUAL_INITIAL_BALANCE,
  bankroll: LOTTERY_VIRTUAL_INITIAL_BALANCE,
  max_grids_per_draw: 3,
  tickets: [],
};

const LOTTERY_GRID_TEMPLATES = [
  [0, 1, 2, 3, 4],
  [0, 2, 4, 6, 8],
  [1, 3, 5, 7, 9],
  [0, 3, 6, 9, 12],
  [2, 5, 8, 11, 14],
  [1, 4, 7, 10, 13],
  [0, 5, 9, 12, 15],
  [3, 6, 9, 13, 16],
];

function computeFrequencies(values: number[][], max: number): number[] {
  const frequencies = Array.from({ length: max + 1 }, () => 0);
  values.forEach((row) => {
    row.forEach((value) => {
      if (Number.isInteger(value) && value >= 1 && value <= max) {
        frequencies[value] += 1;
      }
    });
  });
  return frequencies;
}

function computeRecencyWeightedFrequencies(values: number[][], max: number, decay = 0.93): number[] {
  const frequencies = Array.from({ length: max + 1 }, () => 0);
  values.forEach((row, index) => {
    const weight = Math.pow(decay, Math.max(0, values.length - 1 - index));
    row.forEach((value) => {
      if (Number.isInteger(value) && value >= 1 && value <= max) {
        frequencies[value] += weight;
      }
    });
  });
  return frequencies;
}

function computeOverdueScores(values: number[][], max: number): number[] {
  const lastSeenIndex = Array.from({ length: max + 1 }, () => -1);
  values.forEach((row, index) => {
    row.forEach((value) => {
      if (Number.isInteger(value) && value >= 1 && value <= max) {
        lastSeenIndex[value] = index;
      }
    });
  });
  const drawsCount = values.length;
  const raw = Array.from({ length: max + 1 }, (_, value) => {
    if (value === 0) {
      return 0;
    }
    const seenAt = lastSeenIndex[value];
    return seenAt === -1 ? drawsCount + 1 : drawsCount - 1 - seenAt;
  });
  const maxRaw = Math.max(1, ...raw);
  return raw.map((score) => score / maxRaw);
}

function computePairFrequency(values: number[][]): Map<string, number> {
  const map = new Map<string, number>();
  values.forEach((row) => {
    const unique = [...new Set(row.filter((value) => Number.isInteger(value)).sort((a, b) => a - b))];
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const key = `${unique[i]}-${unique[j]}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
  });
  return map;
}

function normalizeScores(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  if (range <= 0) {
    return scores.map(() => 0.5);
  }
  return scores.map((score) => (score - min) / range);
}

function buildRankedByScore(scores: number[]): number[] {
  return Array.from({ length: scores.length - 1 }, (_, index) => index + 1)
    .sort((a, b) => {
      const diff = (scores[b] ?? 0) - (scores[a] ?? 0);
      if (diff !== 0) {
        return diff;
      }
      return a - b;
    });
}

function average(numbers: number[]) {
  if (numbers.length === 0) {
    return 0;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function stdDev(numbers: number[]) {
  if (numbers.length < 2) {
    return 1;
  }
  const mean = average(numbers);
  const variance = average(numbers.map((value) => (value - mean) ** 2));
  return Math.sqrt(Math.max(variance, 1e-6));
}

function buildGridFromTemplate(rankedValues: number[], template: number[], requiredCount: number): number[] {
  const selected: number[] = [];
  template.forEach((offset, index) => {
    const candidate = rankedValues[(offset + index) % rankedValues.length];
    if (candidate && !selected.includes(candidate)) {
      selected.push(candidate);
    }
  });
  let cursor = 0;
  while (selected.length < requiredCount && cursor < rankedValues.length) {
    const candidate = rankedValues[cursor];
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
    cursor += 1;
  }
  return selected.slice(0, requiredCount).sort((a, b) => a - b);
}

function rebalanceLotteryBlueNumbers(grids: LotteryPrediction[], rankedStars: number[], requiredCount: number): LotteryPrediction[] {
  const usedBlueNumbers = new Set<number>();
  return grids.map((grid) => {
    const reassignedStars: number[] = [];

    grid.stars.forEach((value) => {
      if (!usedBlueNumbers.has(value) && !reassignedStars.includes(value)) {
        reassignedStars.push(value);
        usedBlueNumbers.add(value);
      }
    });

    for (const candidate of rankedStars) {
      if (reassignedStars.length >= requiredCount) {
        break;
      }
      if (usedBlueNumbers.has(candidate) || reassignedStars.includes(candidate)) {
        continue;
      }
      reassignedStars.push(candidate);
      usedBlueNumbers.add(candidate);
    }

    return {
      ...grid,
      stars: reassignedStars.sort((a, b) => a - b),
    };
  });
}

function rebalanceLotteryMainNumbers(
  grids: LotteryPrediction[],
  rankedNumbers: number[],
  requiredCount: number,
  preferredDistinctPerLine: number,
): LotteryPrediction[] {
  const usedNumbers = new Set<number>();
  return grids.map((grid, index) => {
    if (index === 0) {
      grid.numbers.forEach((value) => usedNumbers.add(value));
      return grid;
    }

    const rebalancedNumbers = [...grid.numbers].sort((a, b) => a - b);
    const targetDistinct = Math.min(requiredCount, Math.max(1, preferredDistinctPerLine));
    const countDistinctFromUsed = () => rebalancedNumbers.filter((value) => !usedNumbers.has(value)).length;

    let guard = 0;
    while (countDistinctFromUsed() < targetDistinct && guard < 20) {
      const replaceIdx = rebalancedNumbers.findIndex((value) => usedNumbers.has(value));
      if (replaceIdx < 0) {
        break;
      }
      const replacement = rankedNumbers.find((candidate) => !rebalancedNumbers.includes(candidate) && !usedNumbers.has(candidate))
        ?? rankedNumbers.find((candidate) => !rebalancedNumbers.includes(candidate));
      if (!replacement) {
        break;
      }
      rebalancedNumbers[replaceIdx] = replacement;
      rebalancedNumbers.sort((a, b) => a - b);
      guard += 1;
    }

    rebalancedNumbers.forEach((value) => usedNumbers.add(value));
    return {
      ...grid,
      numbers: rebalancedNumbers,
    };
  });
}

function enforceDistinctLotteryNumberSeries(
  grids: LotteryPrediction[],
  rankedNumbers: number[],
  requiredCount: number,
  minimumDifferences = 2,
): LotteryPrediction[] {
  const selectedNumberRows: number[][] = [];
  const selectedKeys = new Set<string>();

  return grids.map((grid, gridIndex) => {
    let nextNumbers = [...grid.numbers].sort((a, b) => a - b);
    let nextKey = nextNumbers.join('-');

    const isDifferentEnough = (candidate: number[]) => selectedNumberRows.every((row) => {
      const shared = candidate.filter((value) => row.includes(value)).length;
      const differences = requiredCount - shared;
      return differences >= minimumDifferences;
    });

    if (selectedKeys.has(nextKey) || !isDifferentEnough(nextNumbers)) {
      for (let attempt = 0; attempt < rankedNumbers.length; attempt += 1) {
        const offset = (gridIndex * 7 + attempt * 3) % rankedNumbers.length;
        const pool = [...rankedNumbers.slice(offset), ...rankedNumbers.slice(0, offset)];
        const template = LOTTERY_GRID_TEMPLATES[(gridIndex + attempt) % LOTTERY_GRID_TEMPLATES.length];
        const candidateNumbers = buildGridFromTemplate(pool, template, requiredCount);
        const candidateKey = candidateNumbers.join('-');
        if (!selectedKeys.has(candidateKey) && isDifferentEnough(candidateNumbers)) {
          nextNumbers = candidateNumbers;
          nextKey = candidateKey;
          break;
        }
      }
    }

    selectedKeys.add(nextKey);
    selectedNumberRows.push(nextNumbers);
    return {
      ...grid,
      numbers: nextNumbers,
    };
  });
}

function toTopValues(frequencies: number[], max: number, limit: number): number[] {
  return Array.from({ length: max }, (_, index) => index + 1)
    .sort((a, b) => {
      const byFrequency = frequencies[b] - frequencies[a];
      if (byFrequency !== 0) {
        return byFrequency;
      }
      return a - b;
    })
    .slice(0, limit);
}

function evaluateLotteryGridHit(game: LotteryGame, grid: LotteryPrediction, draw: LotteryDrawRecord): LotteryBacktestHit | null {
  const matchedNumbers = grid.numbers.filter((value) => draw.numbers.includes(value)).length;
  const matchedStars = grid.stars.filter((value) => draw.stars.includes(value)).length;
  const prizeRule = LOTTERY_ESTIMATED_PRIZE_RULES[game].find((rule) => rule.matchedNumbers === matchedNumbers && rule.matchedStars === matchedStars);
  if (!prizeRule) {
    return null;
  }
  return {
    drawDate: draw.date,
    matchedNumbers,
    matchedStars,
    estimatedPrize: prizeRule.estimatedPrize,
    rankLabel: prizeRule.label,
  };
}

function computeLotteryBacktest(game: LotteryGame, grid: LotteryPrediction, history: LotteryDrawRecord[], drawCount = LOTTERY_BACKTEST_DRAW_COUNT): LotteryBacktestSummary {
  const analyzedHistory = history.slice(-drawCount).reverse();
  const hits = analyzedHistory
    .map((draw) => evaluateLotteryGridHit(game, grid, draw))
    .filter((entry): entry is LotteryBacktestHit => entry !== null);
  const totalEstimatedWinnings = hits.reduce((sum, hit) => sum + hit.estimatedPrize, 0);
  const ticketCost = LOTTERY_SIMPLE_GRID_COST[game];
  const totalCost = Number((analyzedHistory.length * ticketCost).toFixed(2));
  const netResult = Number((totalEstimatedWinnings - totalCost).toFixed(2));
  return {
    analyzedDraws: analyzedHistory.length,
    ticketCost,
    totalCost,
    totalEstimatedWinnings,
    netResult,
    winningDraws: hits.length,
    hits,
  };
}

function buildLotteryBacktestMap(game: LotteryGame, grids: LotteryPrediction[], history: LotteryDrawRecord[], drawCount = LOTTERY_BACKTEST_DRAW_COUNT): Record<string, LotteryBacktestSummary> {
  return Object.fromEntries(
    grids.map((grid) => [grid.id, computeLotteryBacktest(game, grid, history, drawCount)]),
  ) as Record<string, LotteryBacktestSummary>;
}

function buildDeterministicLotteryDraw(game: LotteryGame, drawDate: string): LotteryDrawRecord {
  const config = LOTTERY_CONFIG[game];
  const numbers: number[] = [];
  const stars: number[] = [];
  let cursor = 0;

  while (numbers.length < config.numbersCount && cursor < 400) {
    const candidate = 1 + Math.floor(stablePseudoRandom(`${game}|${drawDate}|n|${cursor}`) * config.maxNumber);
    if (!numbers.includes(candidate)) {
      numbers.push(candidate);
    }
    cursor += 1;
  }

  cursor = 0;
  while (stars.length < config.starsCount && cursor < 200) {
    const candidate = 1 + Math.floor(stablePseudoRandom(`${game}|${drawDate}|s|${cursor}`) * config.maxStar);
    if (!stars.includes(candidate)) {
      stars.push(candidate);
    }
    cursor += 1;
  }

  return {
    date: drawDate,
    numbers: numbers.sort((a, b) => a - b),
    stars: stars.sort((a, b) => a - b),
  };
}

function addDays(dateIso: string, days: number) {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function buildLotteryUpcomingDrawSeries(game: LotteryGame, weeks: number): LotteryUpcomingDraw[] {
  const weekCount = Math.max(1, weeks);
  const baseDraws = LOTTERY_UPCOMING_DRAWS
    .filter((draw) => draw.game === game)
    .slice()
    .sort((a, b) => Date.parse(a.drawDate) - Date.parse(b.drawDate));

  if (baseDraws.length === 0) {
    return [];
  }

  return Array.from({ length: weekCount }).flatMap((_, weekIndex) => (
    baseDraws.map((draw, drawIndex) => ({
      ...draw,
      drawDate: addDays(draw.drawDate, weekIndex * 7),
      jackpotLabel: weekIndex === 0 ? draw.jackpotLabel : `${LOTTERY_CONFIG[game].label} · semaine ${weekIndex + 1}`,
      closeAt: draw.closeAt,
      game: draw.game,
      id: `${game}-${weekIndex}-${drawIndex}`,
    }))
  )).map(({ id, ...draw }) => draw);
}

function computeLotteryPredictions(
  game: LotteryGame,
  history: LotteryDrawRecord[],
  profile: UserRiskProfile,
  topCount = 5,
): { hotNumbers: number[]; hotStars: number[]; predictedGrids: LotteryPrediction[]; totalDraws: number } {
  const config = LOTTERY_CONFIG[game];
  const numberRows = history.map((draw) => draw.numbers);
  const starRows = history.map((draw) => draw.stars);
  const numbersFreq = computeFrequencies(numberRows, config.maxNumber);
  const starsFreq = computeFrequencies(starRows, config.maxStar);
  const numbersRecency = computeRecencyWeightedFrequencies(numberRows, config.maxNumber, 0.935);
  const starsRecency = computeRecencyWeightedFrequencies(starRows, config.maxStar, 0.92);
  const numbersOverdue = computeOverdueScores(numberRows, config.maxNumber);
  const starsOverdue = computeOverdueScores(starRows, config.maxStar);

  const recentWindow = Math.max(4, Math.round(history.length * 0.3));
  const numbersRecentFreq = computeFrequencies(numberRows.slice(-recentWindow), config.maxNumber);
  const starsRecentFreq = computeFrequencies(starRows.slice(-recentWindow), config.maxStar);

  const normalizedNumberFreq = normalizeScores(numbersFreq);
  const normalizedStarFreq = normalizeScores(starsFreq);
  const normalizedNumberRecency = normalizeScores(numbersRecency);
  const normalizedStarRecency = normalizeScores(starsRecency);
  const normalizedNumberRecent = normalizeScores(numbersRecentFreq);
  const normalizedStarRecent = normalizeScores(starsRecentFreq);

  const numberComposite = Array.from({ length: config.maxNumber + 1 }, (_, value) => {
    if (value === 0) {
      return 0;
    }
    const momentum = Math.max(-1, Math.min(1, (normalizedNumberRecent[value] ?? 0) - (normalizedNumberFreq[value] ?? 0)));
    return (normalizedNumberFreq[value] ?? 0) * 0.3
      + (normalizedNumberRecency[value] ?? 0) * 0.25
      + (numbersOverdue[value] ?? 0) * 0.2
      + Math.max(0, momentum) * 0.15
      + (normalizedNumberRecent[value] ?? 0) * 0.1;
  });
  const starComposite = Array.from({ length: config.maxStar + 1 }, (_, value) => {
    if (value === 0) {
      return 0;
    }
    const momentum = Math.max(-1, Math.min(1, (normalizedStarRecent[value] ?? 0) - (normalizedStarFreq[value] ?? 0)));
    return (normalizedStarFreq[value] ?? 0) * 0.32
      + (normalizedStarRecency[value] ?? 0) * 0.28
      + (starsOverdue[value] ?? 0) * 0.2
      + Math.max(0, momentum) * 0.2;
  });

  const rankedNumbers = buildRankedByScore(numberComposite);
  const rankedStars = buildRankedByScore(starComposite);

  const pairNumbersMap = computePairFrequency(numberRows);
  const pairStarsMap = computePairFrequency(starRows);
  const maxPairNumbers = Math.max(1, ...pairNumbersMap.values(), 1);
  const maxPairStars = Math.max(1, ...pairStarsMap.values(), 1);

  const sumsHistory = numberRows.map((row) => row.reduce((sum, value) => sum + value, 0));
  const spreadHistory = numberRows.map((row) => (row.length > 0 ? row[row.length - 1] - row[0] : 0));
  const oddCountsHistory = numberRows.map((row) => row.filter((value) => value % 2 !== 0).length);
  const sumMean = average(sumsHistory);
  const sumStd = stdDev(sumsHistory);
  const spreadMean = average(spreadHistory);
  const spreadStd = stdDev(spreadHistory);
  const oddCountMode = oddCountsHistory.length > 0
    ? oddCountsHistory
        .sort((a, b) => oddCountsHistory.filter((v) => v === b).length - oddCountsHistory.filter((v) => v === a).length)[0]
    : Math.round(config.numbersCount / 2);

  const candidateGrids: LotteryPrediction[] = [];
  const numberTemplateSeeds = Math.min(24, rankedNumbers.length);
  const starTemplateSeeds = Math.min(14, rankedStars.length);

  for (let i = 0; i < numberTemplateSeeds; i += 1) {
    const numberPool = [...rankedNumbers.slice(i), ...rankedNumbers.slice(0, i)];
    const template = LOTTERY_GRID_TEMPLATES[i % LOTTERY_GRID_TEMPLATES.length];
    const numbers = buildGridFromTemplate(numberPool, template, config.numbersCount);
    for (let j = 0; j < Math.max(6, Math.min(12, starTemplateSeeds)); j += 1) {
      const starPool = [...rankedStars.slice(j), ...rankedStars.slice(0, j)];
      const stars = buildGridFromTemplate(starPool, LOTTERY_GRID_TEMPLATES[(i + j) % LOTTERY_GRID_TEMPLATES.length], config.starsCount);

      const numberCore = average(numbers.map((value) => numberComposite[value] ?? 0));
      const starCore = average(stars.map((value) => starComposite[value] ?? 0));

      const numberPairs: number[] = [];
      for (let a = 0; a < numbers.length; a += 1) {
        for (let b = a + 1; b < numbers.length; b += 1) {
          const key = `${Math.min(numbers[a], numbers[b])}-${Math.max(numbers[a], numbers[b])}`;
          numberPairs.push((pairNumbersMap.get(key) ?? 0) / maxPairNumbers);
        }
      }
      const starPairs: number[] = [];
      for (let a = 0; a < stars.length; a += 1) {
        for (let b = a + 1; b < stars.length; b += 1) {
          const key = `${Math.min(stars[a], stars[b])}-${Math.max(stars[a], stars[b])}`;
          starPairs.push((pairStarsMap.get(key) ?? 0) / maxPairStars);
        }
      }
      const pairScore = average(numberPairs) * 0.8 + average(starPairs) * 0.2;

      const sum = numbers.reduce((acc, value) => acc + value, 0);
      const spread = numbers[numbers.length - 1] - numbers[0];
      const oddCount = numbers.filter((value) => value % 2 !== 0).length;
      const consecutiveCount = numbers.slice(1).filter((value, idx) => value === numbers[idx] + 1).length;
      const decadesCovered = new Set(numbers.map((value) => Math.floor((value - 1) / 10))).size;

      const sumScore = Math.exp(-Math.abs(sum - sumMean) / (sumStd + 1));
      const spreadScore = Math.exp(-Math.abs(spread - spreadMean) / (spreadStd + 1));
      const oddScore = 1 - Math.min(1, Math.abs(oddCount - oddCountMode) / Math.max(1, config.numbersCount));
      const diversityScore = decadesCovered / Math.max(1, Math.ceil(config.maxNumber / 10));
      const consecutivePenalty = Math.min(1, consecutiveCount / Math.max(1, config.numbersCount - 1));
      const hotNumberHits = numbers.filter((value) => (normalizedNumberRecent[value] ?? 0) >= 0.66 || (normalizedNumberFreq[value] ?? 0) >= 0.72).length;
      const overdueNumberHits = numbers.filter((value) => (numbersOverdue[value] ?? 0) >= 0.6).length;
      const hotStarHits = stars.filter((value) => (normalizedStarRecent[value] ?? 0) >= 0.66 || (normalizedStarFreq[value] ?? 0) >= 0.72).length;
      const pairAffinity = pairScore >= 0.58 ? 'fortes' : pairScore >= 0.38 ? 'equilibrees' : 'diversifiees';

      const profileAdjustment = profile === 'low'
        ? (sumScore * 0.22 + spreadScore * 0.26 + oddScore * 0.22 + diversityScore * 0.1)
        : profile === 'high'
          ? (pairScore * 0.3 + Math.max(0.15, diversityScore) * 0.2 + (1 - consecutivePenalty) * 0.12)
          : (sumScore * 0.16 + spreadScore * 0.16 + oddScore * 0.16 + pairScore * 0.14 + diversityScore * 0.1);

      const rawScore = numberCore * 0.34
        + starCore * 0.2
        + pairScore * 0.18
        + sumScore * 0.1
        + spreadScore * 0.07
        + oddScore * 0.06
        + diversityScore * 0.05
        - consecutivePenalty * 0.08
        + profileAdjustment;

      const confidenceIndex = Math.max(42, Math.min(98, Math.round(46 + rawScore * 52)));
      const rationale = `${config.label}: ${hotNumberHits}/${config.numbersCount} numero(s) en momentum, ${overdueNumberHits} en retard statistique, ${hotStarHits}/${config.starsCount} ${config.starLabel.toLowerCase()} recurrent(s), couverture ${decadesCovered} dizaine(s), ${oddCount} impair(s), somme ${sum}, paires ${pairAffinity}. Recalculee sur le dernier tirage connu pour jouer ${topCount} grilles complementaires avec ${config.starLabel.toLowerCase()} differents entre les grilles, adaptees au profil ${profile}.`;

      candidateGrids.push({
        id: `${game}-grid-${i + 1}-${j + 1}`,
        game,
        numbers,
        stars,
        confidenceIndex,
        rationale,
      });
    }
  }

  const uniqueByGrid = new Map<string, LotteryPrediction>();
  candidateGrids.forEach((grid) => {
    const key = `${grid.numbers.join('-')}|${grid.stars.join('-')}`;
    if (!uniqueByGrid.has(key)) {
      uniqueByGrid.set(key, grid);
    }
  });

  const sortedUniqueGrids = [...uniqueByGrid.values()]
    .sort((a, b) => b.confidenceIndex - a.confidenceIndex);
  const diversifiedTopGrids: LotteryPrediction[] = [];
  const usedBlueNumbers = new Set<number>();
  for (const candidate of sortedUniqueGrids) {
    if (diversifiedTopGrids.length >= topCount) {
      break;
    }
    const isDifferentEnough = diversifiedTopGrids.every((selected) => {
      const sharedNumbers = candidate.numbers.filter((value) => selected.numbers.includes(value)).length;
      const numberDifferences = config.numbersCount - sharedNumbers;
      return numberDifferences >= 2;
    });
    const hasExclusiveBlueNumbers = candidate.stars.every((value) => !usedBlueNumbers.has(value));
    if (isDifferentEnough && hasExclusiveBlueNumbers) {
      diversifiedTopGrids.push(candidate);
      candidate.stars.forEach((value) => usedBlueNumbers.add(value));
    }
  }
  if (diversifiedTopGrids.length < topCount) {
    for (const candidate of sortedUniqueGrids) {
      if (diversifiedTopGrids.length >= topCount) {
        break;
      }
      const key = `${candidate.numbers.join('-')}|${candidate.stars.join('-')}`;
      const alreadySelected = diversifiedTopGrids.some((selected) => `${selected.numbers.join('-')}|${selected.stars.join('-')}` === key);
      const hasEnoughNumberDifference = diversifiedTopGrids.every((selected) => {
        const sharedNumbers = candidate.numbers.filter((value) => selected.numbers.includes(value)).length;
        const numberDifferences = config.numbersCount - sharedNumbers;
        return numberDifferences >= 2;
      });
      if (!alreadySelected && hasEnoughNumberDifference) {
        diversifiedTopGrids.push(candidate);
        candidate.stars.forEach((value) => usedBlueNumbers.add(value));
      }
    }
  }
  if (diversifiedTopGrids.length < topCount) {
    for (const candidate of sortedUniqueGrids) {
      if (diversifiedTopGrids.length >= topCount) {
        break;
      }
      const key = `${candidate.numbers.join('-')}|${candidate.stars.join('-')}`;
      const alreadySelected = diversifiedTopGrids.some((selected) => `${selected.numbers.join('-')}|${selected.stars.join('-')}` === key);
      const hasMinimumNumberDifference = diversifiedTopGrids.every((selected) => {
        const sharedNumbers = candidate.numbers.filter((value) => selected.numbers.includes(value)).length;
        const numberDifferences = config.numbersCount - sharedNumbers;
        return numberDifferences >= 1;
      });
      if (!alreadySelected && hasMinimumNumberDifference) {
        diversifiedTopGrids.push(candidate);
        candidate.stars.forEach((value) => usedBlueNumbers.add(value));
      }
    }
  }

  const hotNumberScores = numberComposite.map((score, index) => index === 0 ? -1 : score + (numbersRecency[index] ?? 0) * 0.08);
  const hotStarScores = starComposite.map((score, index) => index === 0 ? -1 : score + (starsRecency[index] ?? 0) * 0.08);
  const topDiversifiedGrids = diversifiedTopGrids.slice(0, topCount);
  const withRebalancedNumbers = rebalanceLotteryMainNumbers(topDiversifiedGrids, rankedNumbers, config.numbersCount, 3);
  const withDistinctSeries = enforceDistinctLotteryNumberSeries(withRebalancedNumbers, rankedNumbers, config.numbersCount, 2);
  const finalPredictedGrids = rebalanceLotteryBlueNumbers(withDistinctSeries, rankedStars, config.starsCount);

  return {
    hotNumbers: buildRankedByScore(hotNumberScores).slice(0, 10),
    hotStars: buildRankedByScore(hotStarScores).slice(0, Math.min(6, config.maxStar)),
    predictedGrids: finalPredictedGrids,
    totalDraws: history.length,
  };
}

type AgentQuotaConfig = {
  enabled: boolean;
  mode: AgentMode;
  max_amount: number;
  max_transactions_per_day: number;
  max_transactions_per_period: number;
  period_days: number;
  max_investment_amount: number;
  max_loss_amount: number;
  domain_policy: Record<AgentDomain, AgentDomainPolicy>;
};

type UserRiskProfile = 'low' | 'medium' | 'high';

const DEFAULT_AGENT_CONFIG: AgentQuotaConfig = {
  enabled: false,
  mode: 'manual',
  max_amount: 250,
  max_transactions_per_day: 3,
  max_transactions_per_period: 12,
  period_days: 30,
  max_investment_amount: 1500,
  max_loss_amount: 300,
  domain_policy: {
    crypto: 'allow',
    actions: 'allow',
    etf: 'prefer',
    obligations: 'allow',
  },
};

const GLOBAL_AGENT_CONFIG_KEY = '__global__';

const RISK_PROFILE_DEFAULT_QUOTAS: Record<UserRiskProfile, {
  max_amount: number;
  max_transactions_per_day: number;
  max_transactions_per_period: number;
  period_days: number;
  max_investment_amount: number;
  max_loss_amount: number;
}> = {
  low: {
    max_amount: 120,
    max_transactions_per_day: 2,
    max_transactions_per_period: 8,
    period_days: 30,
    max_investment_amount: 800,
    max_loss_amount: 150,
  },
  medium: {
    max_amount: 250,
    max_transactions_per_day: 3,
    max_transactions_per_period: 16,
    period_days: 30,
    max_investment_amount: 1800,
    max_loss_amount: 400,
  },
  high: {
    max_amount: 600,
    max_transactions_per_day: 8,
    max_transactions_per_period: 32,
    period_days: 30,
    max_investment_amount: 5000,
    max_loss_amount: 1200,
  },
};

const GOAL_PERIOD_DAYS: Record<GoalPeriod, number> = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
};

const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  '7d': '7 jours',
  '1m': '1 mois',
  '3m': '3 mois',
  '1y': '1 an',
};

const ESTIMATED_TAX_RATE = 0.30;
const MIN_MONETARY_LIMIT = 0.1;
const MAX_AGENT_TRANSACTION_AMOUNT = 2000;
const MAX_AGENT_TRANSACTIONS_PER_DAY = 1000;

function normalizeGoalPeriod(value: unknown): GoalPeriod {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === '7d') {
    return '7d';
  }
  if (normalized === '3m') {
    return '3m';
  }
  if (normalized === '1y') {
    return '1y';
  }
  return '1m';
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function randomDelayMs(minMs: number, maxMs: number): number {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) {
    return Math.max(0, Math.round(minMs || 0));
  }
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

function stablePseudoRandom(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function scoreTipsterSignal(signal: TipsterSignal): number {
  return (signal.confidence * 20) + (signal.value_pct * 3) + signal.potentialGain;
}

function normalizeUserRiskProfile(value: unknown): UserRiskProfile {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['low', 'prudent', 'faible'].includes(normalized)) {
    return 'low';
  }
  if (['high', 'offensive', 'eleve'].includes(normalized)) {
    return 'high';
  }
  return 'medium';
}

function resolveUserRiskProfile(user: UserProfile | null): UserRiskProfile {
  if (!user || !user.personal_settings || typeof user.personal_settings !== 'object') {
    return 'medium';
  }
  const settings = user.personal_settings as Record<string, unknown>;
  return normalizeUserRiskProfile(
    settings.risk_profile
      ?? settings.investor_risk_profile
      ?? settings.portfolio_risk_profile
      ?? settings.riskLevel
      ?? settings.risk_level,
  );
}

function defaultAgentConfigFromUserRisk(user: UserProfile | null): AgentQuotaConfig {
  const profile = resolveUserRiskProfile(user);
  const quotas = RISK_PROFILE_DEFAULT_QUOTAS[profile];
  return {
    enabled: DEFAULT_AGENT_CONFIG.enabled,
    mode: DEFAULT_AGENT_CONFIG.mode,
    max_amount: quotas.max_amount,
    max_transactions_per_day: quotas.max_transactions_per_day,
    max_transactions_per_period: quotas.max_transactions_per_period,
    period_days: quotas.period_days,
    max_investment_amount: quotas.max_investment_amount,
    max_loss_amount: quotas.max_loss_amount,
    domain_policy: { ...DEFAULT_AGENT_CONFIG.domain_policy },
  };
}

function normalizeAgentQuotaConfig(source: Record<string, unknown>, fallback: AgentQuotaConfig): AgentQuotaConfig {
  const domainSource = (source.domain_policy ?? {}) as Record<string, unknown>;
  const sourceMode = String(source.mode ?? '').toLowerCase();
  return {
    enabled: source.enabled === true,
    mode: sourceMode === 'autopilot' ? 'autopilot' : sourceMode === 'supervised' ? 'supervised' : 'manual',
    max_amount: Math.max(MIN_MONETARY_LIMIT, Number(source.max_amount ?? fallback.max_amount) || fallback.max_amount),
    max_transactions_per_day: Math.max(1, Number(source.max_transactions_per_day ?? fallback.max_transactions_per_day) || fallback.max_transactions_per_day),
    max_transactions_per_period: Math.max(1, Number(source.max_transactions_per_period ?? source.max_transactions_per_day ?? fallback.max_transactions_per_period) || fallback.max_transactions_per_period),
    period_days: Math.max(1, Math.min(365, Number(source.period_days ?? fallback.period_days) || fallback.period_days)),
    max_investment_amount: Math.max(MIN_MONETARY_LIMIT, Number(source.max_investment_amount ?? source.max_amount ?? fallback.max_investment_amount) || fallback.max_investment_amount),
    max_loss_amount: Math.max(MIN_MONETARY_LIMIT, Number(source.max_loss_amount ?? fallback.max_loss_amount) || fallback.max_loss_amount),
    domain_policy: {
      crypto: domainSource.crypto === 'reject' || domainSource.crypto === 'prefer' ? domainSource.crypto : 'allow',
      actions: domainSource.actions === 'reject' || domainSource.actions === 'prefer' ? domainSource.actions : 'allow',
      etf: domainSource.etf === 'reject' || domainSource.etf === 'prefer' ? domainSource.etf : 'allow',
      obligations: domainSource.obligations === 'reject' || domainSource.obligations === 'prefer' ? domainSource.obligations : 'allow',
    },
  };
}

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
    });
}

function buildAllPortfolios(
  dashboard: DashboardData | null,
  integrations: IntegrationConnection[],
  visibility: Record<string, boolean>,
  activation: Record<string, boolean>,
  virtualSimulation: FinanceVirtualSimulation | null,
  localOperationsByPortfolio: Record<string, Portfolio['operations']> = {}
): Portfolio[] {
  if (!dashboard) {
    return [];
  }

  const dashboardByProvider = new Map(
    dashboard.portfolios
      .filter((item) => item.provider_code !== 'virtual_alpha')
      .filter((item) => {
        const text = `${item.provider_code ?? ''} ${item.label ?? ''}`.toLowerCase();
        return !/\b(test|demo|sandbox|paper)\b/.test(text);
      })
      .map((item) => [item.provider_code, item])
  );

  const integrationPortfolios: Portfolio[] = integrations
    .filter((connection) => {
      const linkedItem = dashboardByProvider.get(connection.provider_code);
      const text = `${connection.provider_code ?? ''} ${connection.account_label ?? ''} ${connection.provider_name ?? ''} ${linkedItem?.label ?? ''}`.toLowerCase();
      return !/\b(test|demo|sandbox|paper)\b/.test(text);
    })
    .map((connection) => {
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
    const localOps = localOperationsByPortfolio[connection.provider_code] ?? [];
    const mergedOperations = [...localOps, ...operations].filter((operation, index, arr) => arr.findIndex((entry) => entry.id === operation.id) === index);

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
      status: activation[connection.provider_code] === false
        ? 'disabled'
        : connection.status as 'active' | 'disabled' | 'pending_user_consent' | 'available',
      last_sync_at: connection.last_sync_at ?? null,
      agent_name: item?.agent_name || resolveAgentNameFe(connection.provider_code),
      history,
      operations: mergedOperations,
      ai_advice: [
        { kind: 'info', text: `${connection.provider_name} connecté. Statut sync: ${connection.last_sync_status ?? 'inconnu'}.` },
        { kind: 'hold', text: backendActions.length > 0 ? 'Les derniers mouvements proviennent des synchronisations Coinbase.' : rawValue > 0 ? 'Données disponibles. Synchronisez régulièrement pour des conseils IA affinés.' : 'Synchronisez pour récupérer vos positions et des conseils personnalisés.' },
      ],
      allocation: rawValue > 0 ? [{ class: 'Investissements', weight: 100, value: rawValue }] : [],
    };
  });

  const vp = dashboard.virtual_portfolio;
  const vpHistory = virtualSimulation?.history ?? vp.history_points;
  const vpValue = virtualSimulation?.currentValue ?? (parseFloat(vp.current_value) || 0);
  const vpBudget = parseFloat(vp.budget_initial) || 100;
  const vpPnl = vpValue - vpBudget;
  const vpOps = virtualSimulation?.operations ?? vp.latest_actions.map((a, i) => ({
    id: `virtual-op-${i}`,
    date: new Date(Date.now() - (vp.latest_actions.length - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
    side: a.action.toLowerCase() === 'sell' ? 'sell' as const : 'buy' as const,
    asset: a.asset,
    amount: Math.max(0, a.amount),
    tax_state: null,
    tax_intermediary: null,
    intermediary: 'Robin IA (virtuel)',
  }));
  const virtualPortfolio: Portfolio = {
    id: vp.portfolio_id,
    type: 'virtual',
    label: normalizeFinanceVirtualPortfolioLabel(vp.label),
    current_value: vpValue,
    budget: vpBudget,
    pnl: vpPnl,
    roi: vp.roi,
    visible: visibility[vp.portfolio_id] !== false,
    status: activation[vp.portfolio_id] === false ? 'disabled' : 'active',
    last_sync_at: vpHistory.length > 0 ? vpHistory[vpHistory.length - 1].date : null,
    agent_name: vp.agent_name,
    history: vpHistory,
    operations: vpOps,
    ai_advice: [
      { kind: 'info', text: `Bac à sable virtuel — budget initial : ${vpBudget.toFixed(0)} €. Portefeuille Bitcoin simulé sans risque réel.` },
      vpPnl > 0
        ? { kind: 'hold', text: `Performance actuelle : +${vpPnl.toFixed(2)} € (+${(vp.roi >= 0 ? '+' : '')}${(vp.roi).toFixed(1)}%). L IA surperforme.` }
        : vpPnl < 0
          ? { kind: 'sell', text: `Sous-performance virtuelle : ${vpPnl.toFixed(2)} €. L IA ajuste son portefeuille sans impact réel.` }
          : { kind: 'info', text: 'Aucune activité virtuelle pour l instant. Activez l IA pour simuler des transactions Bitcoin.' },
    ],
    allocation: vp.strategy_mix.length > 0
      ? vp.strategy_mix.map((m) => ({ class: m.class, weight: m.weight, value: vpValue * m.weight / 100 }))
      : (vpValue > 0 ? [{ class: 'Cash IA', weight: 100, value: vpValue }] : []),
  };

  return [virtualPortfolio, ...integrationPortfolios];
}

function serializeBettingStrategySettings(strategies: BettingStrategy[]): Record<string, BettingStrategySettings> {
  return strategies.reduce<Record<string, BettingStrategySettings>>((acc, strategy) => {
    acc[strategy.id] = {
      enabled: strategy.enabled,
      ai_enabled: strategy.ai_enabled,
      mode: strategy.mode,
      max_stake: Math.max(MIN_MONETARY_LIMIT, Number(strategy.max_stake) || MIN_MONETARY_LIMIT),
      max_bets_per_day: Math.max(1, Number(strategy.max_bets_per_day) || 1),
      risk_profile: strategy.risk_profile,
    };
    return acc;
  }, {});
}

function serializeBettingStrategyRuntime(strategies: BettingStrategy[]): Record<string, BettingStrategyRuntime> {
  return strategies.reduce<Record<string, BettingStrategyRuntime>>((acc, strategy) => {
    acc[strategy.id] = {
      bankroll: Number(strategy.bankroll) || 0,
      roi: Number(strategy.roi) || 0,
      winRate: Number(strategy.winRate) || 0,
      variance: Number(strategy.variance) || 0,
      betsTotal: Math.max(0, Math.round(Number(strategy.betsTotal) || 0)),
      betsWon: Math.max(0, Math.round(Number(strategy.betsWon) || 0)),
      risk_profile: strategy.risk_profile,
      history: strategy.history.slice(-180),
      recentBets: strategy.recentBets.slice(0, 120),
    };
    return acc;
  }, {});
}

function applyBettingStrategySettings(
  baseStrategies: BettingStrategy[],
  rawSettings: unknown,
): BettingStrategy[] {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return baseStrategies;
  }
  const settings = rawSettings as Record<string, unknown>;
  return baseStrategies.map((strategy) => {
    const raw = settings[strategy.id];
    if (!raw || typeof raw !== 'object') {
      return strategy;
    }
    const source = raw as Record<string, unknown>;
    const rawMode = String(source.mode ?? '').toLowerCase();
    const mode: BettingStrategy['mode'] = rawMode === 'autonomous'
      ? 'autonomous'
      : rawMode === 'supervised'
        ? 'supervised'
        : 'manual';
    const riskSource = source.risk_profile;
    const riskProfile: BettingStrategy['risk_profile'] =
      riskSource === 'low' || riskSource === 'medium' || riskSource === 'high'
        ? riskSource
        : strategy.risk_profile;
    return {
      ...strategy,
      enabled: source.enabled !== false,
      ai_enabled: source.ai_enabled !== false,
      mode,
      max_stake: Math.max(MIN_MONETARY_LIMIT, Number(source.max_stake ?? strategy.max_stake) || strategy.max_stake),
      max_bets_per_day: Math.max(1, Number(source.max_bets_per_day ?? strategy.max_bets_per_day) || strategy.max_bets_per_day),
      risk_profile: riskProfile,
    };
  });
}

function applyBettingStrategyRuntime(
  baseStrategies: BettingStrategy[],
  rawRuntime: unknown,
): BettingStrategy[] {
  if (!rawRuntime || typeof rawRuntime !== 'object') {
    return baseStrategies;
  }
  const runtimeById = rawRuntime as Record<string, unknown>;
  return baseStrategies.map((strategy) => {
    const raw = runtimeById[strategy.id];
    if (!raw || typeof raw !== 'object') {
      return strategy;
    }
    const source = raw as Record<string, unknown>;
    const historySource = Array.isArray(source.history) ? source.history : [];
    const normalizedHistory = historySource
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry) => {
        const date = typeof entry.date === 'string' && entry.date.trim() ? entry.date : new Date().toISOString().slice(0, 10);
        const value = Number(entry.value);
        return {
          date,
          value: Number.isFinite(value) ? value : strategy.bankroll,
        };
      })
      .slice(-180);

    const betsSource = Array.isArray(source.recentBets) ? source.recentBets : [];
    const normalizedBets = betsSource
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry): BetRecord => {
        const resultRaw = String(entry.result ?? 'pending').toLowerCase();
        const result: BetRecord['result'] = resultRaw === 'won' || resultRaw === 'lost' || resultRaw === 'void' ? resultRaw : 'pending';
        const sportRaw = String(entry.sport ?? '').toLowerCase();
        const sport: BetSport = sportRaw === 'football'
          ? 'football'
          : sportRaw === 'tennis'
            ? 'tennis'
            : sportRaw === 'basketball'
              ? 'basketball'
              : sportRaw === 'rugby'
                ? 'rugby'
                : 'other';
        return {
          id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `restored-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: typeof entry.date === 'string' && entry.date.trim() ? entry.date : new Date().toISOString(),
          sport,
          event: typeof entry.event === 'string' ? entry.event : 'Pari restauré',
          market: typeof entry.market === 'string' ? entry.market : 'Marché inconnu',
          bookmaker: typeof entry.bookmaker === 'string' ? entry.bookmaker : 'Simulateur Robin',
          odds: Number.isFinite(Number(entry.odds)) ? Number(entry.odds) : 0,
          stake: Number.isFinite(Number(entry.stake)) ? Number(entry.stake) : 0,
          result,
          profit: Number.isFinite(Number(entry.profit)) ? Number(entry.profit) : 0,
          strategyId: strategy.id,
        };
      })
      .slice(0, 120);

    const bankroll = Number(source.bankroll);
    const roi = Number(source.roi);
    const winRate = Number(source.winRate);
    const variance = Number(source.variance);
    const betsTotal = Number(source.betsTotal);
    const betsWon = Number(source.betsWon);
    const riskProfile = source.risk_profile;

    return {
      ...strategy,
      bankroll: Number.isFinite(bankroll) ? bankroll : strategy.bankroll,
      roi: Number.isFinite(roi) ? roi : strategy.roi,
      winRate: Number.isFinite(winRate) ? winRate : strategy.winRate,
      variance: Number.isFinite(variance) ? variance : strategy.variance,
      betsTotal: Number.isFinite(betsTotal) ? Math.max(0, Math.round(betsTotal)) : strategy.betsTotal,
      betsWon: Number.isFinite(betsWon) ? Math.max(0, Math.round(betsWon)) : strategy.betsWon,
      risk_profile: (riskProfile === 'low' || riskProfile === 'medium' || riskProfile === 'high')
        ? riskProfile
        : strategy.risk_profile,
      history: normalizedHistory.length > 0 ? normalizedHistory : strategy.history,
      recentBets: normalizedBets,
    };
  });
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

const ACCESS_TOKEN_KEY = 'robin_access_token';
const REFRESH_TOKEN_KEY = 'robin_refresh_token';
const SESSION_LAST_ACTIVITY_AT_KEY = 'robin_session_last_activity_at';
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const ADMIN_CONNECTED_WINDOW_MS = 15 * 60 * 1000;
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

function normalizeAmountInput(value: string, minAmount: number): number {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return minAmount;
  }
  return Math.max(minAmount, Number(parsed.toFixed(2)));
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

function splitFullNameParts(fullName: string | null | undefined) {
  const normalized = String(fullName ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }
  const [firstName, ...rest] = normalized.split(' ');
  return {
    firstName,
    lastName: rest.join(' '),
  };
}

type SettingsFormState = {
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  currency: string;
  theme: string;
  dashboardDensity: string;
  onboardingStyle: string;
  country: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyPush: boolean;
  weeklyDigest: boolean;
  marketAlerts: boolean;
  communicationFrequency: string;
  autoRefreshSeconds: string;
  homeTransactionsLimit: string;
  objectiveNetGain: string;
  objectivePeriod: GoalPeriod;
  riskProfile: UserRiskProfile;
  realTradeMfaRequired: boolean;
  maxLossType: 'amount' | 'percent';
  maxLossValue: string;
  maxLossDays: string;
};

function defaultSettingsFromUser(user: UserProfile | null): SettingsFormState {
  const rawGoal = user?.personal_settings.net_goal_after_tax;
  const goalConfig = rawGoal && typeof rawGoal === 'object' ? rawGoal as Record<string, unknown> : {};
  const rawLossGuard = user?.personal_settings.loss_guard;
  const lossGuardConfig = rawLossGuard && typeof rawLossGuard === 'object' ? rawLossGuard as Record<string, unknown> : {};
  const lossGuardType = lossGuardConfig.type === 'amount' ? 'amount' : 'percent';
  const personalSettings = user?.personal_settings && typeof user.personal_settings === 'object'
    ? user.personal_settings as Record<string, unknown>
    : {};
  const fallbackNames = splitFullNameParts(user?.full_name);
  return {
    fullName: user?.full_name ?? '',
    firstName: String(personalSettings.first_name ?? fallbackNames.firstName),
    lastName: String(personalSettings.last_name ?? fallbackNames.lastName),
    phoneNumber: user?.phone_number ?? '',
    address: String(personalSettings.address ?? personalSettings.address_line ?? personalSettings.address_line_1 ?? ''),
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
    homeTransactionsLimit: String(Math.max(1, Math.min(20, Number(personalSettings.home_transactions_limit) || 5))),
    objectiveNetGain: String(toPositiveNumber(goalConfig.target_eur, 250)),
    objectivePeriod: normalizeGoalPeriod(goalConfig.period),
    riskProfile: normalizeUserRiskProfile(user?.personal_settings.risk_profile),
    realTradeMfaRequired: readBooleanSetting(user?.personal_settings.real_trade_mfa_required, false),
    maxLossType: lossGuardType,
    maxLossValue: String(toPositiveNumber(lossGuardConfig.value, lossGuardType === 'amount' ? 1000 : 30)),
    maxLossDays: String(Math.max(1, Math.min(365, Number(lossGuardConfig.days) || 30))),
  };
}

function dedupeHomeTransactions(rows: HomeTransactionRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const signature = [row.lane, row.appKey, row.targetId, row.title, row.portfolioLabel, row.date, row.note].join('||');
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function normalizeOtpInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

function formatDateTimeFr(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return 'n/d';
  }
  return new Date(parsed).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSignedEuro(value: number | null, fallback = 'n/d') {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} €`;
}

function numericChangeTone(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'neutral' as const;
  }
  if (value > 0.01) {
    return 'up' as const;
  }
  if (value < -0.01) {
    return 'down' as const;
  }
  return 'neutral' as const;
}

function historyValueDelta(history: Array<{ date: string; value: number }>, days: number) {
  if (history.length < 2) {
    return null;
  }
  const points = history
    .map((point) => ({ ...point, ts: Date.parse(point.date) }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  if (points.length < 2) {
    return null;
  }
  const nowTs = points[points.length - 1].ts;
  const targetTs = nowTs - days * 24 * 60 * 60 * 1000;
  const basePoint = [...points].reverse().find((point) => point.ts <= targetTs) ?? points[0];
  const current = points[points.length - 1]?.value ?? 0;
  const base = basePoint?.value ?? 0;
  if (!Number.isFinite(current) || !Number.isFinite(base)) {
    return null;
  }
  return Number((current - base).toFixed(2));
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
    return 'Connecte';
  }
  if (status === 'disabled') {
    return 'Non connecte';
  }
  if (status === 'pending_user_consent') {
    return 'En attente';
  }
  if (status === 'available') {
    return 'Connecte';
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

function confidenceLevelFromScale(score: number, scale: 3 | 5 | 100 = 100): 1 | 2 | 3 {
  if (scale === 3) {
    return Math.max(1, Math.min(3, Math.round(score))) as 1 | 2 | 3;
  }
  if (scale === 5) {
    if (score >= 4) {
      return 3;
    }
    if (score >= 3) {
      return 2;
    }
    return 1;
  }
  return scoreToConfidenceLevel(score) as 1 | 2 | 3;
}

function discreteConfidenceLabel(level: 1 | 2 | 3) {
  if (level === 3) {
    return 'élevée';
  }
  if (level === 2) {
    return 'modérée';
  }
  return 'faible';
}

function extractDiscreteConfidenceLevel(text: string | null | undefined): 1 | 2 | 3 | null {
  if (!text) {
    return null;
  }
  const threeScale = text.match(/Confiance\s+([123])\/3/i);
  if (threeScale) {
    return confidenceLevelFromScale(Number(threeScale[1]), 3);
  }
  const fiveScale = text.match(/Confiance\s+([1-5])\/5/i);
  if (fiveScale) {
    return confidenceLevelFromScale(Number(fiveScale[1]), 5);
  }
  const hundredScale = text.match(/(\d{1,3})\/100/);
  if (hundredScale) {
    return confidenceLevelFromScale(Math.max(0, Math.min(100, Number(hundredScale[1]))), 100);
  }
  return null;
}

function ConfidenceDots({
  level,
  label,
  maxDots = 3,
}: {
  level: 1 | 2 | 3;
  label?: string;
  maxDots?: number;
}) {
  const resolvedLabel = label ?? `Confiance ${discreteConfidenceLabel(level)}`;
  return (
    <span className="confidenceInline" aria-label={resolvedLabel} title={resolvedLabel}>
      <span className="confidenceDots" aria-hidden="true">
        {Array.from({ length: maxDots }).map((_, index) => (
          <span key={`confidence-${resolvedLabel}-${index}`} className={index < level ? 'confidenceDot filled' : 'confidenceDot'} />
        ))}
      </span>
      <span className="confidenceInlineLabel">{resolvedLabel}</span>
    </span>
  );
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

function computePortfolioEvolutionPct(history: Array<{ date: string; value: number }>, days: number) {
  if (history.length < 2) {
    return null;
  }
  const points = history
    .map((point) => ({ ...point, ts: Date.parse(point.date) }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  if (points.length < 2) {
    return null;
  }
  const nowTs = points[points.length - 1].ts;
  const targetTs = nowTs - days * 24 * 60 * 60 * 1000;
  const basePoint = [...points].reverse().find((point) => point.ts <= targetTs) ?? points[0];
  const current = points[points.length - 1]?.value ?? 0;
  const base = basePoint?.value ?? 0;
  if (base <= 0) {
    return null;
  }
  return ((current - base) / base) * 100;
}

function buildRecentWeeksEvolution(history: Array<{ date: string; value: number }>) {
  return [1, 2, 4].map((weeks) => {
    const evolution = formatPortfolioEvolution(history, weeks * 7);
    return {
      key: `${weeks}w`,
      label: `${weeks} sem`,
      value: evolution.value,
      tone: evolution.tone,
    };
  });
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

const PEA_BANKS = [
  { code: 'pea-boursobank', name: 'BoursoBank PEA' },
  { code: 'pea-credit-agricole', name: 'Credit Agricole Investore Integral' },
  { code: 'pea-bnp', name: 'BNP Paribas PEA' },
  { code: 'pea-societe-generale', name: 'Societe Generale Bourse' },
  { code: 'pea-fortuneo', name: 'Fortuneo PEA' },
] as const;

/* ============================================================
   MOCK DATA — Paris Sportifs (Tipster IA)
   ============================================================ */
const MOCK_STRATEGIES: BettingStrategy[] = [
  {
    id: 's4', name: 'Portefeuille fictif Paris Sportifs', type: 'predictive',
    description: 'Portefeuille fictif Paris Sportifs : simulation 100 € avec IA configurable (manuel, supervise, autopilot).',
    isVirtual: true,
    bankroll: 100, roi: 0, winRate: 0, variance: 0, enabled: false, betsTotal: 0, betsWon: 0,
    ai_enabled: true,
    mode: 'supervised',
    max_stake: 20,
    max_bets_per_day: 100,
    risk_profile: 'medium',
    history: [
      { date: '2026-03-14', value: 100 },
    ],
    recentBets: [],
  },
];

const MOCK_RACING_STRATEGIES: BettingStrategy[] = [
  {
    id: 'rc1', name: 'Portefeuille fictif Hippiques', type: 'predictive',
    description: 'Portefeuille fictif Hippiques : simulation locale 100 €. Aucune transaction réelle.',
    isVirtual: true, bankroll: 100, roi: 0, winRate: 0, variance: 0, enabled: false, betsTotal: 0, betsWon: 0,
    ai_enabled: true, mode: 'supervised', max_stake: 15, max_bets_per_day: 5, risk_profile: 'medium',
    history: [{ date: '2026-03-14', value: 100 }], recentBets: [],
  },
];

const RACING_SIGNALS: TipsterSignal[] = [
  { id: 'rcs1', sport: 'other', event: "Prix du Président — Longchamp (R3C4)", market: "Victoire — Paladin d'Or (n°3)", odds: 3.80, value_pct: 12.4, confidence: 4, rationale: "Forme récente : 3 victoires sur 5 sorties. Jockey T. Piccone +18% sur 30 jours. Piste souple favorable.", risk: 'faible', bookmaker: 'PMU', deadline: '2026-03-16T13:30:00Z', potentialGain: 28.0, status: 'pending' },
  { id: 'rcs2', sport: 'other', event: 'Prix du Muguet — Chantilly (R5C1)', market: 'Placé — Roi Soleil (n°7)', odds: 2.10, value_pct: 7.2, confidence: 5, rationale: 'Entraîneur C. Head 72% de réussite sur Chantilly plat. Distance favorite 1600m. Cote sous-évaluée de 7%.', risk: 'faible', bookmaker: 'PMU', deadline: '2026-03-17T15:00:00Z', potentialGain: 13.0, status: 'pending' },
  { id: 'rcs3', sport: 'other', event: "Grand Prix d'Auteuil — Obstacle (R1C5)", market: 'Victoire — Brume Matinale (n°2)', odds: 5.20, value_pct: 15.8, confidence: 3, rationale: "Spécialiste obstacles : 4/6 victoires piste lourde. Concurrent principal blessé. ELO gap +240.", risk: 'modere', bookmaker: 'Winamax', deadline: '2026-03-20T14:45:00Z', potentialGain: 52.0, status: 'pending' },
  { id: 'rcs4', sport: 'other', event: 'Prix de Diane — Chantilly (R2C3)', market: "Tiercé dans l'ordre", odds: 12.50, value_pct: 22.1, confidence: 3, rationale: 'Combinaison statistiquement cohérente : top-3 forme + classement ELO + jockeys expérimentés. Retour estimé +22%.', risk: 'eleve', bookmaker: 'PMU', deadline: '2026-06-15T15:30:00Z', potentialGain: 125.0, status: 'pending' },
  { id: 'rcs5', sport: 'other', event: "Prix de l'Arc de Triomphe — Longchamp (R1C1)", market: 'Victoire — Galaxie Royale (n°1)', odds: 4.10, value_pct: 9.7, confidence: 4, rationale: 'Favori confirmé par 3 modèles ML. Poids favorable, distance maîtrisée (3/3 sur 2400m). Préparation optimale.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-10-04T15:30:00Z', potentialGain: 41.0, status: 'pending' },
  { id: 'rcs6', sport: 'other', event: 'Prix du Jockey Club — Chantilly (R2C1)', market: 'Victoire — Vent du Nord (n°4)', odds: 3.30, value_pct: 8.5, confidence: 4, rationale: 'Invaincu à 3 ans. Jockey top 5 France. Entraîneur 4/4 dans ce groupe. Distance 2100m native.', risk: 'faible', bookmaker: 'Winamax', deadline: '2026-06-07T15:15:00Z', potentialGain: 33.0, status: 'pending' },
  { id: 'rcs7', sport: 'other', event: 'Criterium de Saint-Cloud (R6C2)', market: 'Placé — Mystère Bleu (n°9)', odds: 1.85, value_pct: 5.3, confidence: 5, rationale: 'Très régulier piste souple : 7 podiums sur 9. Cote sous-évaluée selon modèle probabiliste.', risk: 'faible', bookmaker: 'PMU', deadline: '2026-11-01T14:00:00Z', potentialGain: 9.25, status: 'pending' },
  { id: 'rcs8', sport: 'other', event: 'Prix Ganay — Longchamp (R3C5)', market: 'Victoire — Dame de Fer (n°6)', odds: 2.90, value_pct: 10.2, confidence: 4, rationale: '3 victoires à 2 ans sur Longchamp. Profil adapté piste légère. Reprise après 3 mois de repos.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-04-26T15:00:00Z', potentialGain: 29.0, status: 'pending' },
];

const TIPSTER_SIGNALS: TipsterSignal[] = [
  { id: 'ts1', sport: 'football', event: 'Real Madrid vs Barcelona', market: 'Over 2.5 buts', odds: 1.82, value_pct: 8.4, confidence: 5, rationale: 'Modèle prédictif 87% : les 4 dernières confrontations ont produit 3+ buts. Défense du Real récente poreuse (7 concédés en 3 matchs).', risk: 'faible', bookmaker: 'Winamax', deadline: '2026-03-16T20:45:00Z', potentialGain: 16.4, status: 'pending' },
  { id: 'ts2', sport: 'tennis', event: 'Sinner vs Alcaraz — Miami Open', market: 'Moins de 3 sets', odds: 1.68, value_pct: 5.2, confidence: 4, rationale: 'Historique direct : 7/9 matchs en 2 sets. Alcaraz avec gêne à l épaule gauche. Sinner dominant sur quick court.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-03-17T18:00:00Z', potentialGain: 13.6, status: 'pending' },
  { id: 'ts3', sport: 'basketball', event: 'Lakers vs Warriors — NBA', market: 'Total Over 225', odds: 1.91, value_pct: 6.8, confidence: 3, rationale: 'Warriors 2e attaque away (116 pts/match). Lakers Over 225 à 68% cette saison à domicile. Rythme de jeu élevé attendu.', risk: 'modere', bookmaker: 'Unibet', deadline: '2026-03-15T02:00:00Z', potentialGain: 18.2, status: 'pending' },
  { id: 'ts4', sport: 'football', event: 'Arsenal vs Chelsea — Premier League', market: 'BTTS — Oui', odds: 1.75, value_pct: 4.1, confidence: 4, rationale: 'BTTS 71% sur les 7 derniers Derby anglais cette saison. Chelsea marque à l extérieur 5/6. Arsenal encaisse sur corner récemment.', risk: 'faible', bookmaker: 'Betway', deadline: '2026-03-15T15:00:00Z', potentialGain: 15.0, status: 'pending' },
  { id: 'ts5', sport: 'rugby', event: 'France vs Angleterre — 6 Nations', market: 'France -7', odds: 1.95, value_pct: 9.3, confidence: 3, rationale: 'XV de France invaincu au Stade de France en 6N depuis 2022. Modèle ELO attribue 62% de prob à une victoire +7. Cote sous-évaluée de 9.3%.', risk: 'modere', bookmaker: 'Winamax', deadline: '2026-03-16T15:45:00Z', potentialGain: 19.0, status: 'pending' },
  { id: 'ts6', sport: 'football', event: 'Bayern Munich vs Dortmund — Bundesliga', market: '1N2 — Bayern 1', odds: 1.55, value_pct: 6.1, confidence: 5, rationale: 'Bayern invaincus à domicile depuis 9 matchs. Dortmund : 3 défaites en 4 déplacements récents. ELO Bayern +220 pts.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-03-21T17:30:00Z', potentialGain: 11.0, status: 'pending' },
  { id: 'ts7', sport: 'tennis', event: 'Djokovic vs Zverev — Roland-Garros', market: 'Djokovic vainqueur', odds: 1.72, value_pct: 7.3, confidence: 4, rationale: 'Djokovic 6/6 demi-finales RG depuis 2012. Zverev jamais en finale Slam. Surface favorize le style Djokovic.', risk: 'faible', bookmaker: 'Unibet', deadline: '2026-06-06T14:00:00Z', potentialGain: 14.4, status: 'pending' },
  { id: 'ts8', sport: 'football', event: 'PSG vs Marseille — Classique', market: 'Over 2.5 buts', odds: 1.78, value_pct: 5.9, confidence: 4, rationale: 'Classique Ligue 1 : 80% des 10 derniers matchs ont vu 3+ buts. Les deux équipes en forme offensive (PSG 3.1 buts/match).', risk: 'faible', bookmaker: 'Winamax', deadline: '2026-03-22T20:45:00Z', potentialGain: 15.6, status: 'pending' },
  { id: 'ts9', sport: 'basketball', event: 'Celtics vs Bucks — NBA Playoffs', market: 'Total Over 218', odds: 1.85, value_pct: 4.7, confidence: 3, rationale: 'Bucks top 3 attaque (119 pts/m). Celtics Over 218 à 72% à domicile. Rytme élevé attendu sans Middleton.', risk: 'modere', bookmaker: 'Betway', deadline: '2026-04-20T00:30:00Z', potentialGain: 17.0, status: 'pending' },
  { id: 'ts10', sport: 'football', event: 'Liverpool vs Man City — Premier League', market: 'BTTS — Oui', odds: 1.80, value_pct: 7.2, confidence: 5, rationale: 'BTTS 80% sur les 5 derniers Liverpool-City. Salah retrouve sa forme. City vulnérable en trajet récent.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-03-29T16:30:00Z', potentialGain: 16.0, status: 'pending' },
  { id: 'ts11', sport: 'rugby', event: 'Irlande vs Écosse — 6 Nations', market: 'Irlande -10', odds: 2.05, value_pct: 10.8, confidence: 3, rationale: 'Irlande #1 mondial. Modèle ELO écart anticipé +14 pts. Écosse 2 défaites de suite au Tournoi.', risk: 'modere', bookmaker: 'Unibet', deadline: '2026-03-22T14:45:00Z', potentialGain: 21.0, status: 'pending' },
  { id: 'ts12', sport: 'tennis', event: 'Sabalenka vs Swiatek — US Open', market: 'Swiatek vainqueure', odds: 1.90, value_pct: 6.5, confidence: 4, rationale: 'Swiatek 4/4 victoires récentes contre Sabalenka sur surface dure. Swiatek # 1 au classement WTA cette semaine.', risk: 'faible', bookmaker: 'Winamax', deadline: '2026-09-07T21:00:00Z', potentialGain: 18.0, status: 'pending' },
  { id: 'ts13', sport: 'football', event: 'Inter Milan vs AC Milan — Derby della Madonnina', market: 'Over 1.5 buts 1ère MT', odds: 2.10, value_pct: 8.8, confidence: 3, rationale: 'Derby milanais : 78% des 9 derniers ont vu 2+ buts avant la mi-temps. Deux attaques en forme.', risk: 'modere', bookmaker: 'Betway', deadline: '2026-04-05T18:00:00Z', potentialGain: 22.0, status: 'pending' },
  { id: 'ts14', sport: 'basketball', event: 'Nuggets vs Suns — NBA Western', market: 'Total Under 228', odds: 1.78, value_pct: 5.0, confidence: 4, rationale: 'Jokic impact défensif massif. Suns 3 matchs Under de suite (219, 221, 213). Pace lent attendu en altitude à Denver.', risk: 'faible', bookmaker: 'Betclic', deadline: '2026-04-02T02:00:00Z', potentialGain: 15.6, status: 'pending' },
  { id: 'ts15', sport: 'football', event: 'Atletico Madrid vs Sevilla — La Liga', market: 'Atletico Clean Sheet', odds: 2.30, value_pct: 9.5, confidence: 3, rationale: 'Atletico 5/6 matchs sans encaisser à domicile. Simeone : défense prioritaire. Sevilla : 0 but en 3 déplacements récents.', risk: 'modere', bookmaker: 'Unibet', deadline: '2026-03-28T19:00:00Z', potentialGain: 26.0, status: 'pending' },
  { id: 'ts16', sport: 'tennis', event: 'Medvedev vs Rublev — Wimbledon', market: 'Medvedev vainqueur', odds: 1.65, value_pct: 4.8, confidence: 4, rationale: 'Medvedev 8/10 contre Rublev en circuit. Herbe avantage Medvedev (service). Rublev éliminé au 2e tour 3 ans de suite.', risk: 'faible', bookmaker: 'Winamax', deadline: '2026-07-04T13:00:00Z', potentialGain: 13.0, status: 'pending' },
  { id: 'ts17', sport: 'football', event: 'Ajax vs PSV — Eredivisie', market: '1N2 — PSV 2', odds: 2.15, value_pct: 11.2, confidence: 3, rationale: 'PSV mène le championnat avec +8 pts. Ajax en crise (4 défaites en 7). Modèle ELO PSV +180.', risk: 'modere', bookmaker: 'Betclic', deadline: '2026-04-12T14:30:00Z', potentialGain: 23.0, status: 'pending' },
  { id: 'ts18', sport: 'rugby', event: 'Toulouse vs La Rochelle — Top 14', market: 'Toulouse -5', odds: 1.88, value_pct: 7.6, confidence: 4, rationale: 'Toulouse 9 victoires en 10 matchs à domicile. La Rochelle absences clés (Skelton, Alldritt). Stade Ernest-Wallon avantage.', risk: 'faible', bookmaker: 'Unibet', deadline: '2026-04-18T20:45:00Z', potentialGain: 17.6, status: 'pending' },
  { id: 'ts19', sport: 'football', event: 'Juventus vs Napoli — Serie A', market: 'BTTS — Non + X', odds: 2.40, value_pct: 12.1, confidence: 3, rationale: 'Juventus 4/7 derniers matchs à domicile se terminent 1-0. Napoli efficacité réduite en déplacement (0.8 buts/m).', risk: 'eleve', bookmaker: 'Betway', deadline: '2026-04-25T19:45:00Z', potentialGain: 28.0, status: 'pending' },
  { id: 'ts20', sport: 'basketball', event: 'Heat vs Knicks — NBA East Playoffs', market: 'Heat vainqueur', odds: 2.20, value_pct: 8.0, confidence: 3, rationale: 'Heat culture : 5/7 séries playoffs gagnées en outsider depuis 2020. Spoelstra tactique supérieure. Knicks sans Brunson.', risk: 'modere', bookmaker: 'Winamax', deadline: '2026-04-28T00:30:00Z', potentialGain: 24.0, status: 'pending' },
];

/* sport emoji helper */
function sportEmoji(sport: BetSport): string {
  return sport === 'football' ? '⚽' : sport === 'tennis' ? '🎾' : sport === 'basketball' ? '🏀' : sport === 'rugby' ? '🏉' : '🏆';
}

type VirtualRiskProfile = 'low' | 'medium' | 'high';

const VIRTUAL_RISK_PRESETS: Record<VirtualRiskProfile, {
  label: string;
  guardrail: string;
  maxDrawdownPct: number;
  minGainPct: number;
  maxGainPct: number;
}> = {
  low: {
    label: 'Risque faible',
    guardrail: 'Capital garanti (simulation interne Robin)',
    maxDrawdownPct: 0,
    minGainPct: 0.2,
    maxGainPct: 1.1,
  },
  medium: {
    label: 'Risque moyen',
    guardrail: 'Perte potentielle tolérée jusqu à -30%',
    maxDrawdownPct: 30,
    minGainPct: 0.8,
    maxGainPct: 3.8,
  },
  high: {
    label: 'Risque fort',
    guardrail: 'Perte potentielle tolérée jusqu à -70%',
    maxDrawdownPct: 70,
    minGainPct: 1.4,
    maxGainPct: 9.5,
  },
};

export default function RobinApp() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeApp, setActiveApp] = useState<'finance' | 'betting' | 'racing' | 'loto'>('finance');
  const [financeSubApp, setFinanceSubApp] = useState<'crypto' | 'actions'>('crypto');
  const [appView, setAppView] = useState<'overview' | 'dashboard' | 'portfolios' | 'settings' | 'admin' | 'strategies' | 'account'>('overview');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgressPct, setLoadingProgressPct] = useState(12);
  const [liveClockTs, setLiveClockTs] = useState(() => Date.now());
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
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [adminSection, setAdminSection] = useState<'home' | 'approvals' | 'users' | 'audit' | 'transactions' | 'security'>('home');
  const [approvalsSearch, setApprovalsSearch] = useState('');
  const [approvalsSort, setApprovalsSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<Record<string, true>>({});
  const [approvalAppSelections, setApprovalAppSelections] = useState<Record<string, Array<'finance' | 'betting' | 'racing' | 'loto'>>>({});
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
  const [portfolioActivation, setPortfolioActivation] = useState<Record<string, boolean>>({});
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [communicationTestResult, setCommunicationTestResult] = useState<string | null>(null);
  const [commGoogleChat, setCommGoogleChat] = useState({ enabled: false, webhook: '' });
  const [commTelegram, setCommTelegram] = useState({ enabled: false, botToken: '', chatId: '' });
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);
  const [selectedDecisionPortfolioId, setSelectedDecisionPortfolioId] = useState<string>('');
  const [selectedDecisionSide, setSelectedDecisionSide] = useState<'buy' | 'sell'>('buy');
  const [selectedDecisionAmount, setSelectedDecisionAmount] = useState<number>(25);
  const [assistantDockOpen, setAssistantDockOpen] = useState(false);
  const [assistantWizardDecisionId, setAssistantWizardDecisionId] = useState<string | null>(null);
  const [assistantExecutionMode] = useState<'recommendation' | 'direct'>('recommendation');
  const [pendingDecisionConfirmation, setPendingDecisionConfirmation] = useState<PendingDecisionConfirmation | null>(null);
  const [virtualAppsEnabled, setVirtualAppsEnabled] = useState<{ finance: boolean; betting: boolean; racing: boolean; loto: boolean }>({ finance: true, betting: false, racing: false, loto: false });
  const [visitedMenuKeys, setVisitedMenuKeys] = useState<Record<string, true>>({});
  const [portfolioSetupStepDone, setPortfolioSetupStepDone] = useState(false);
  const [bettingThemeVisibility, setBettingThemeVisibility] = useState<BettingThemeVisibility>(DEFAULT_BETTING_THEME_VISIBILITY);
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
  const [adminDailyTransactionLimit, setAdminDailyTransactionLimit] = useState(1000);
  const [adminTransactionLog, setAdminTransactionLog] = useState<Array<{ id: string; user_id: string; user_name: string; portfolio_id: string; asset: string; side: string; amount: number; status: string; created_at: string }>>([]);
  const [marketSignalFilter, setMarketSignalFilter] = useState<'all' | 'crypto' | 'actions' | 'etf' | 'obligations'>('all');
  const [subscribeSignalId, setSubscribeSignalId] = useState<string | null>(null);
  const [subscribePortfolioId, setSubscribePortfolioId] = useState<string>('');
  const [subscribeAmount, setSubscribeAmount] = useState<number>(50);
  const [subscribeAmountInput, setSubscribeAmountInput] = useState<string>('50');
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  /* ---- Paris Sportifs state ---- */
  const [bettingStrategies, setBettingStrategies] = useState<BettingStrategy[]>(MOCK_STRATEGIES);
  const [tipsterSignals, setTipsterSignals] = useState<TipsterSignal[]>(TIPSTER_SIGNALS);
  const [racingStrategies, setRacingStrategies] = useState<BettingStrategy[]>(MOCK_RACING_STRATEGIES);
  const [racingSignals, setRacingSignals] = useState<TipsterSignal[]>(RACING_SIGNALS);
  const [selectedRacingStrategy, setSelectedRacingStrategy] = useState<BettingStrategy | null>(null);
  const [racingStrategyDetailOpen, setRacingStrategyDetailOpen] = useState(false);
  const [selectedRacingRecommendationStrategyId, setSelectedRacingRecommendationStrategyId] = useState<string>('');
  const [selectedBettingRecommendationStrategyId, setSelectedBettingRecommendationStrategyId] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<BettingStrategy | null>(null);
  const [strategyDetailOpen, setStrategyDetailOpen] = useState(false);
  const [bettingDetailFocus, setBettingDetailFocus] = useState<'active' | 'recent' | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [bettingAlert, setBettingAlert] = useState<string | null>(null);
  const [bettingAnalytics, setBettingAnalytics] = useState<BettingAnalyticsSummary | null>(null);
  const [overviewAppFilter, setOverviewAppFilter] = useState<'all' | 'finance' | 'betting' | 'racing' | 'loto'>('all');
  const [overviewTargetFilter, setOverviewTargetFilter] = useState<string>('all');
  const [lotteryGameFocus, setLotteryGameFocus] = useState<LotteryGame>('loto');
  const [lotteryGridCount, setLotteryGridCount] = useState(3);
  const [lotterySubscriptionWeeks, setLotterySubscriptionWeeks] = useState<number>(2);
  const [selectedLotteryRecommendationPortfolioId, setSelectedLotteryRecommendationPortfolioId] = useState<string>('loto-virtual');
  const [lotoPortfolioMenuSelection, setLotoPortfolioMenuSelection] = useState<string>('loto-virtual');
  const [lotteryVirtualPortfolio, setLotteryVirtualPortfolio] = useState<LotteryVirtualPortfolio>(DEFAULT_LOTTERY_VIRTUAL_PORTFOLIO);
  const [lotteryExecutionRequests, setLotteryExecutionRequests] = useState<LotteryExecutionRequest[]>([]);
  const [myActivityTrail, setMyActivityTrail] = useState<AuditEntry[]>([]);
  const [loadingMyActivity, setLoadingMyActivity] = useState(false);
  const [virtualRiskProfile, setVirtualRiskProfile] = useState<VirtualRiskProfile>('medium');
  const [financeVirtualSimulation, setFinanceVirtualSimulation] = useState<FinanceVirtualSimulation | null>(null);
  const [localPortfolioOperations, setLocalPortfolioOperations] = useState<Record<string, Portfolio['operations']>>({});
  const agentConfigsRef = useRef<Record<string, AgentQuotaConfig>>({});
  const latestAgentConfigPersistRequestRef = useRef(0);
  const defaultAgentConfig = useMemo(() => defaultAgentConfigFromUserRisk(user), [user]);
  const allowedApps = useMemo(() => normalizeFrontendAppAccess(user?.app_access), [user?.app_access]);
  const deferredAdminUserSearch = useDeferredValue(adminUserSearch);
  const deferredApprovalsSearch = useDeferredValue(approvalsSearch);
  const deferredAuditSearch = useDeferredValue(auditSearch);

  useEffect(() => {
    agentConfigsRef.current = agentConfigs;
  }, [agentConfigs]);

  useEffect(() => {
    if (!selectedStrategy) {
      return;
    }
    const liveStrategy = bettingStrategies.find((strategy) => strategy.id === selectedStrategy.id);
    if (!liveStrategy) {
      setSelectedStrategy(null);
      return;
    }
    setSelectedStrategy(liveStrategy);
  }, [bettingStrategies, selectedStrategy]);

  useEffect(() => {
    const recommendationTargets = bettingStrategies.filter((strategy) => strategy.enabled || strategy.isVirtual);
    if (recommendationTargets.some((strategy) => strategy.id === selectedBettingRecommendationStrategyId)) {
      return;
    }
    setSelectedBettingRecommendationStrategyId(recommendationTargets[0]?.id ?? '');
  }, [bettingStrategies, selectedBettingRecommendationStrategyId]);

  function openHomeParentMenu() {
    clearViewSelections();
    setAppView('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openFinanceParentMenu() {
    setActiveApp('finance');
    clearViewSelections();
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openParisParentMenu() {
    const targetApp = topbarParisActiveApp;
    setActiveApp(targetApp);
    clearViewSelections();
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!loading) {
      setLoadingProgressPct(100);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingProgressPct((prev) => {
        if (prev >= 94) {
          return prev;
        }
        const step = prev < 35 ? 8 : prev < 70 ? 4 : 2;
        return Math.min(94, prev + step);
      });
    }, 320);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClockTs(Date.now());
    }, LIVE_CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.featureCard'));
    cards.forEach((card, index) => {
      const header = card.querySelector<HTMLElement>('.cardHeader');
      if (!header) {
        return;
      }
      const title = header.querySelector('h2')?.textContent?.trim() ?? `bloc-${index + 1}`;
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!card.dataset.collapseKey) {
        card.dataset.collapseKey = `${activeApp}-${appView}-${normalizedTitle || 'bloc'}-${index + 1}`;
      }
      header.classList.add('cardHeaderCollapsible');
      if (!header.getAttribute('title')) {
        header.setAttribute('title', 'Cliquez pour réduire ou étendre ce bloc');
      }
      const key = card.dataset.collapseKey;
      if (key && collapsedCards[key]) {
        card.classList.add('isCollapsed');
      } else {
        card.classList.remove('isCollapsed');
      }
    });
  }, [activeApp, appView, collapsedCards, portfolioDetailOpen, strategyDetailOpen, racingStrategyDetailOpen]);

  useEffect(() => {
    const handleCollapseClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest('button, a, input, select, textarea, label, [role="button"]')) {
        return;
      }
      const header = target.closest('.featureCard .cardHeader') as HTMLElement | null;
      if (!header) {
        return;
      }
      const card = header.closest('.featureCard') as HTMLElement | null;
      const key = card?.dataset.collapseKey;
      if (!card || !key) {
        return;
      }
      setCollapsedCards((state) => ({ ...state, [key]: !state[key] }));
    };
    document.addEventListener('click', handleCollapseClick);
    return () => {
      document.removeEventListener('click', handleCollapseClick);
    };
  }, []);

  useEffect(() => {
    if (activeApp !== 'betting' || appView !== 'dashboard') {
      setBettingDetailFocus(null);
    }
  }, [activeApp, appView]);

  useEffect(() => {
    if (adminSection !== 'approvals') {
      setSelectedApprovalIds({});
      setApprovalAppSelections({});
    }
  }, [adminSection]);

  useEffect(() => {
    if (adminSection !== 'approvals') {
      return;
    }
    const filteredAdminEntries = adminUsers.filter((entry) => {
      const matchesUser = !deferredAdminUserSearch || matchesSearch(`${entry.full_name} ${entry.email}`, deferredAdminUserSearch);
      const matchesRole = adminRoleFilter === 'all' || entry.assigned_roles.includes(adminRoleFilter);
      const isPendingApproval = isUserPendingApproval(entry);
      const matchesStatus =
        adminStatusFilter === 'all' ||
        (adminStatusFilter === 'active' && entry.is_active) ||
        (adminStatusFilter === 'pending' && isPendingApproval) ||
        (adminStatusFilter === 'inactive' && !entry.is_active && !isPendingApproval);
      return matchesUser && matchesRole && matchesStatus;
    });
    const queueRows = filteredAdminEntries
      .filter((entry) => isUserPendingApproval(entry))
      .filter((entry) => !deferredApprovalsSearch.trim() || matchesSearch(`${entry.full_name} ${entry.email} ${entry.id}`, deferredApprovalsSearch));
    const sortedQueueRows = approvalsSort === 'name'
      ? [...queueRows].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr-FR'))
      : approvalsSort === 'oldest'
        ? [...queueRows].reverse()
        : queueRows;
    setApprovalAppSelections((state) => {
      const queueIds = new Set(sortedQueueRows.map((entry) => entry.id));
      const next: Record<string, Array<'finance' | 'betting' | 'racing' | 'loto'>> = {};
      sortedQueueRows.forEach((entry) => {
        next[entry.id] = normalizeSelectedAppAccess(state[entry.id] ?? entry.app_access);
      });
      const hasSameSize = Object.keys(state).length === queueIds.size;
      const hasSameKeys = hasSameSize && Object.keys(state).every((id) => queueIds.has(id));
      if (hasSameKeys) {
        const unchanged = sortedQueueRows.every((entry) => {
          const current = state[entry.id] ?? [];
          const normalizedCurrent = normalizeSelectedAppAccess(current);
          const normalizedNext = normalizeSelectedAppAccess(next[entry.id]);
          return normalizedCurrent.length === normalizedNext.length
            && normalizedCurrent.every((app, index) => app === normalizedNext[index]);
        });
        if (unchanged) {
          return state;
        }
      }
      return next;
    });
  }, [adminSection, adminUsers, deferredAdminUserSearch, adminRoleFilter, adminStatusFilter, deferredApprovalsSearch, approvalsSort]);

  useEffect(() => {
    if (racingStrategies.some((strategy) => strategy.id === selectedRacingRecommendationStrategyId)) {
      return;
    }
    setSelectedRacingRecommendationStrategyId(
      racingStrategies.find((strategy) => strategy.isVirtual)?.id
        ?? racingStrategies[0]?.id
        ?? '',
    );
  }, [racingStrategies, selectedRacingRecommendationStrategyId]);

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
    // A browser refresh should keep the server-backed session alive.
    sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
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
      setPortfolioSetupStepDone(false);
      setLotteryVirtualPortfolio(DEFAULT_LOTTERY_VIRTUAL_PORTFOLIO);
      return;
    }
    setSettingsForm(defaultSettingsFromUser(user));
    const setupDone = (user.personal_settings?.portfolio_setup_done === true) || (user.personal_settings?.onboarding_done === true);
    setPortfolioSetupStepDone(setupDone);
    const savedVisibility = (user.personal_settings.portfolio_visibility ?? {}) as Record<string, unknown>;
    const nextVisibility: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(savedVisibility)) {
      nextVisibility[key] = value !== false;
    }
    setPortfolioVisibility(nextVisibility);

    const savedActivation = (user.personal_settings.portfolio_activation ?? {}) as Record<string, unknown>;
    const nextActivation: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(savedActivation)) {
      nextActivation[key] = value !== false;
    }
    setPortfolioActivation(nextActivation);

    const savedDecisionResolutions = (user.personal_settings.decision_resolutions ?? {}) as Record<string, unknown>;
    const nextDecisionResolutions: Record<string, true> = {};
    for (const [key, value] of Object.entries(savedDecisionResolutions)) {
      if (value === true) {
        nextDecisionResolutions[key] = true;
      }
    }
    setResolvedDecisionKeys(nextDecisionResolutions);

    const riskBasedDefaults = defaultAgentConfigFromUserRisk(user);
    const savedGlobalAgentConfig = user.personal_settings.agent_global_quota;
    const savedAgentConfigs = (user.personal_settings.agent_quotas ?? {}) as Record<string, unknown>;
    let nextGlobalAgentConfig = riskBasedDefaults;
    if (savedGlobalAgentConfig && typeof savedGlobalAgentConfig === 'object') {
      nextGlobalAgentConfig = normalizeAgentQuotaConfig(savedGlobalAgentConfig as Record<string, unknown>, riskBasedDefaults);
    } else {
      const firstLegacyConfig = Object.values(savedAgentConfigs).find((raw) => raw && typeof raw === 'object');
      if (firstLegacyConfig && typeof firstLegacyConfig === 'object') {
        nextGlobalAgentConfig = normalizeAgentQuotaConfig(firstLegacyConfig as Record<string, unknown>, riskBasedDefaults);
      }
    }
    const nextAgentConfigs: Record<string, AgentQuotaConfig> = {
      [GLOBAL_AGENT_CONFIG_KEY]: nextGlobalAgentConfig,
    };
    for (const [key, raw] of Object.entries(savedAgentConfigs)) {
      if (key === GLOBAL_AGENT_CONFIG_KEY || !raw || typeof raw !== 'object') {
        continue;
      }
      nextAgentConfigs[key] = normalizeAgentQuotaConfig(raw as Record<string, unknown>, nextGlobalAgentConfig);
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

    const adminLimitRaw = Number(user.personal_settings.admin_transaction_daily_limit);
    setAdminDailyTransactionLimit(Math.max(1, Math.min(1000, Number.isFinite(adminLimitRaw) && adminLimitRaw > 0 ? adminLimitRaw : 1000)));

    const rawVirtualApps = (user.personal_settings.virtual_apps ?? {}) as Record<string, unknown>;
    setVirtualAppsEnabled({
      finance: rawVirtualApps.finance !== false,
      betting: rawVirtualApps.betting === true,
      racing: rawVirtualApps.racing === true,
      loto: rawVirtualApps.loto === true,
    });

    const rawLotteryVirtual = (user.personal_settings.lottery_virtual_portfolio ?? {}) as Record<string, unknown>;
    const rawTickets = Array.isArray(rawLotteryVirtual.tickets) ? rawLotteryVirtual.tickets : [];
    const hydratedLotteryTickets: LotteryVirtualTicket[] = rawTickets
      .filter((item) => item && typeof item === 'object')
      .map<LotteryVirtualTicket>((item) => {
        const source = item as Record<string, unknown>;
        const game = source.game === 'euromillions' ? 'euromillions' : 'loto';
        return {
          id: String(source.id ?? `lottery-ticket-${Math.random().toString(36).slice(2, 7)}`),
          game,
          drawDate: String(source.drawDate ?? new Date().toISOString()),
          gridLabel: String(source.gridLabel ?? `${LOTTERY_CONFIG[game].label} #1`),
          subscriptionLabel: typeof source.subscriptionLabel === 'string' && source.subscriptionLabel.trim() ? source.subscriptionLabel : null,
          numbers: Array.isArray(source.numbers) ? source.numbers.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [],
          stars: Array.isArray(source.stars) ? source.stars.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [],
          stake: Number(source.stake ?? LOTTERY_SIMPLE_GRID_COST[game]) || LOTTERY_SIMPLE_GRID_COST[game],
          status: source.status === 'won' || source.status === 'lost' ? source.status : 'pending',
          payout: Number(source.payout ?? 0) || 0,
          profit: Number(source.profit ?? 0) || 0,
          matchedNumbers: Number(source.matchedNumbers ?? 0) || 0,
          matchedStars: Number(source.matchedStars ?? 0) || 0,
          rankLabel: typeof source.rankLabel === 'string' ? source.rankLabel : null,
          createdAt: String(source.createdAt ?? new Date().toISOString()),
          settledAt: typeof source.settledAt === 'string' ? source.settledAt : null,
        };
      })
      .slice(0, 220);
    const initialBalance = Math.max(
      LOTTERY_VIRTUAL_INITIAL_BALANCE,
      Number(rawLotteryVirtual.initial_balance ?? LOTTERY_VIRTUAL_INITIAL_BALANCE) || LOTTERY_VIRTUAL_INITIAL_BALANCE,
    );
    setLotteryVirtualPortfolio({
      enabled: rawLotteryVirtual.enabled === true,
      ai_enabled: rawLotteryVirtual.ai_enabled === true,
      mode: rawLotteryVirtual.mode === 'autonomous' || rawLotteryVirtual.mode === 'supervised' ? rawLotteryVirtual.mode : 'manual',
      initial_balance: initialBalance,
      bankroll: Math.max(0, Number(rawLotteryVirtual.bankroll ?? initialBalance) || initialBalance),
      max_grids_per_draw: Math.max(1, Math.min(MAX_LOTTERY_GRID_COUNT, Number(rawLotteryVirtual.max_grids_per_draw ?? 3) || 3)),
      tickets: hydratedLotteryTickets,
    });

    const rawLotteryRequests = Array.isArray(user.personal_settings.lottery_execution_requests)
      ? user.personal_settings.lottery_execution_requests
      : [];
    setLotteryExecutionRequests(
      rawLotteryRequests
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map<LotteryExecutionRequest>((item) => ({
          id: String(item.id ?? `lottery-request-${Math.random().toString(36).slice(2, 7)}`),
          game: item.game === 'euromillions' ? 'euromillions' : 'loto',
          drawDate: String(item.drawDate ?? new Date().toISOString()),
          gridLabel: String(item.gridLabel ?? 'Grille IA'),
          subscriptionLabel: typeof item.subscriptionLabel === 'string' && item.subscriptionLabel.trim() ? item.subscriptionLabel : null,
          numbers: Array.isArray(item.numbers) ? item.numbers.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [],
          stars: Array.isArray(item.stars) ? item.stars.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [],
          targetPortfolioId: String(item.targetPortfolioId ?? 'loto-virtual'),
          targetPortfolioLabel: String(item.targetPortfolioLabel ?? 'Portefeuille fictif Loto'),
          executionMode: item.executionMode === 'real' ? 'real' : 'simulation',
          status: 'confirmed',
          createdAt: String(item.createdAt ?? new Date().toISOString()),
        }))
        .slice(0, 240),
    );

    const rawBettingThemes = (user.personal_settings.betting_theme_visibility ?? {}) as Record<string, unknown>;
    setBettingThemeVisibility({
      football: rawBettingThemes.football !== false,
      tennis: rawBettingThemes.tennis !== false,
      basketball: rawBettingThemes.basketball !== false,
      rugby: rawBettingThemes.rugby !== false,
      other: rawBettingThemes.other === true,
    });

    const rawBettingStrategies = user.personal_settings.betting_strategy_settings;
    const rawBettingRuntime = user.personal_settings.betting_strategy_runtime;
    const hydratedStrategies = applyBettingStrategyRuntime(
      applyBettingStrategySettings(MOCK_STRATEGIES, rawBettingStrategies),
      rawBettingRuntime,
    );
    setBettingStrategies(hydratedStrategies);
    setSelectedStrategy((current) => {
      if (!current) {
        return current;
      }
      return hydratedStrategies.find((strategy) => strategy.id === current.id) ?? null;
    });

    const rawRacingStrategies = user.personal_settings.racing_strategy_settings;
    const rawRacingRuntime = user.personal_settings.racing_strategy_runtime;
    const hydratedRacingStrategies = applyBettingStrategyRuntime(
      applyBettingStrategySettings(MOCK_RACING_STRATEGIES, rawRacingStrategies),
      rawRacingRuntime,
    );
    setRacingStrategies(hydratedRacingStrategies);
    setSelectedRacingStrategy((current) => {
      if (!current) {
        return current;
      }
      return hydratedRacingStrategies.find((strategy) => strategy.id === current.id) ?? null;
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
          if (meResponse.status === 401 || meResponse.status === 403) {
            clearSession();
          }
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
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_AT_KEY, String(Date.now()));
      scheduleInactivityTimeout(SESSION_TIMEOUT_MS);
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
    if (appView !== 'account' || !accessToken) {
      return;
    }
    let cancelled = false;
    const loadMyActivity = async () => {
      setLoadingMyActivity(true);
      try {
        const response = await fetch(apiUrl('/api/v1/me/activity'), {
          headers: { ...authHeader(accessToken) },
          credentials: 'include',
        });
        const payload = await readJsonResponse<AuditEntry[] | { detail?: unknown }>(response);
        if (!response.ok) {
          return;
        }
        if (!cancelled) {
          setMyActivityTrail((payload as AuditEntry[] | null) ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoadingMyActivity(false);
        }
      }
    };
    void loadMyActivity();
    return () => {
      cancelled = true;
    };
  }, [appView, accessToken]);

  useEffect(() => {
    if (!accessToken || !user) {
      setBettingAnalytics(null);
      return;
    }
    let cancelled = false;

    const loadBettingAnalytics = async () => {
      try {
        const response = await fetch(apiUrl('/api/v1/betting/analytics/summary'), {
          headers: { ...authHeader(accessToken) },
          credentials: 'include',
        });
        const payload = await readJsonResponse<BettingAnalyticsSummary | { detail?: unknown }>(response);
        if (!response.ok || !payload) {
          return;
        }
        if (!cancelled) {
          setBettingAnalytics(payload as BettingAnalyticsSummary);
        }
      } catch {
        // Keep existing frontend-only metrics if backend analytics are unavailable.
      }
    };

    void loadBettingAnalytics();
    const intervalId = window.setInterval(() => {
      void loadBettingAnalytics();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [accessToken, user?.id]);

  useEffect(() => {
    if (!dashboard?.virtual_portfolio) {
      setFinanceVirtualSimulation(null);
      return;
    }
    const vp = dashboard.virtual_portfolio;
    const initialValue = Number.parseFloat(vp.current_value) || Number.parseFloat(vp.budget_initial) || 100;
    const initialHistory = vp.history_points.length > 0
      ? vp.history_points
      : [{ date: new Date().toISOString(), value: initialValue }];
    const initialOps = vp.latest_actions.map((a, i) => ({
      id: `virtual-op-init-${i}`,
      date: new Date(Date.now() - (vp.latest_actions.length - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
      side: a.action.toLowerCase() === 'sell' ? 'sell' as const : 'buy' as const,
      asset: a.asset,
      amount: Math.max(0, a.amount),
      tax_state: null,
      tax_intermediary: null,
      intermediary: 'Robin IA (virtuel)',
    }));
    const savedRuntime = normalizeFinanceVirtualRuntime(user?.personal_settings?.finance_virtual_runtime);
    if (savedRuntime) {
      setFinanceVirtualSimulation(savedRuntime);
      return;
    }
    setFinanceVirtualSimulation({
      currentValue: initialValue,
      history: initialHistory,
      operations: initialOps,
    });
  }, [dashboard?.virtual_portfolio?.portfolio_id, dashboard?.virtual_portfolio?.current_value, user?.personal_settings]);

  useEffect(() => {
    if (!accessToken || !user || !financeVirtualSimulation || !dashboard?.virtual_portfolio?.portfolio_id) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(apiUrl('/auth/me/settings'), {
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
          personal_settings: buildPersonalSettingsPayload({ finance_virtual_runtime: financeVirtualSimulation }),
        }),
      }).catch(() => {
        // Keep local runtime even if persistence fails.
      });
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    accessToken,
    user,
    dashboard?.virtual_portfolio?.portfolio_id,
    financeVirtualSimulation,
    settingsForm.fullName,
    settingsForm.phoneNumber,
  ]);

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

  useEffect(() => {
    if (!user) {
      setVisitedMenuKeys({});
      return;
    }
    const trackableView =
      appView === 'overview'
      || appView === 'dashboard'
      || appView === 'portfolios'
      || appView === 'strategies'
      || appView === 'settings';
    if (!trackableView) {
      return;
    }
    const key = `${activeApp}:${appView}`;
    setVisitedMenuKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, [user, activeApp, appView]);

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
    setActiveApp('finance');
    setAppView('overview');
    setMfaQrDataUrl(null);
  }

  async function loadAdminData(token: string) {
    const [usersResponse, auditResponse] = await Promise.all([
      fetch(apiUrl('/api/v1/admin/users'), { headers: { ...authHeader(token) }, credentials: 'include' }),
      fetch(apiUrl('/api/v1/admin/audit-trail'), { headers: { ...authHeader(token) }, credentials: 'include' }),
    ]);

    let usersLoadError: string | null = null;
    let auditLoadError: string | null = null;

    if (usersResponse.ok) {
      const usersPayload = await readJsonResponse<unknown>(usersResponse);
      setAdminUsers(normalizeAdminUsersPayload(usersPayload));
    } else {
      const failedUsersPayload = await readJsonResponse(usersResponse);
      usersLoadError = extractErrorMessage(failedUsersPayload, 'Chargement des comptes impossible.');
      if (user) {
        setAdminUsers((prev) => prev.length > 0 ? prev : [user]);
      }
    }

    if (auditResponse.ok) {
      setAuditTrail((await readJsonResponse<AuditEntry[]>(auditResponse)) ?? []);
    } else {
      const failedAuditPayload = await readJsonResponse(auditResponse);
      auditLoadError = extractErrorMessage(failedAuditPayload, 'Chargement de la piste d audit impossible.');
    }

    if (usersLoadError && auditLoadError) {
      setAdminFeedback(`${usersLoadError} ${auditLoadError}`);
    } else if (usersLoadError) {
      setAdminFeedback(usersLoadError);
    } else if (auditLoadError) {
      setAdminFeedback(auditLoadError);
    } else {
      setAdminFeedback(null);
    }

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
    decisionState: Record<string, true> = resolvedDecisionKeys,
    virtualAppsState: { finance: boolean; betting: boolean; racing: boolean; loto: boolean } = virtualAppsEnabled,
    bettingStrategiesState: BettingStrategy[] = bettingStrategies,
    racingStrategiesState: BettingStrategy[] = racingStrategies,
    agentConfigsState: Record<string, AgentQuotaConfig> = agentConfigsRef.current,
  ) {
    const globalAgentConfig = agentConfigsState[GLOBAL_AGENT_CONFIG_KEY] ?? defaultAgentConfig;
    return {
      first_name: settingsForm.firstName,
      last_name: settingsForm.lastName,
      address: settingsForm.address,
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
      home_transactions_limit: Math.max(1, Math.min(20, Number.parseInt(settingsForm.homeTransactionsLimit, 10) || 5)),
      net_goal_after_tax: {
        target_eur: toPositiveNumber(settingsForm.objectiveNetGain, 0),
        period: normalizeGoalPeriod(settingsForm.objectivePeriod),
      },
      risk_profile: settingsForm.riskProfile,
      real_trade_mfa_required: settingsForm.realTradeMfaRequired,
      loss_guard: {
        type: settingsForm.maxLossType === 'amount' ? 'amount' : 'percent',
        value: toPositiveNumber(settingsForm.maxLossValue, settingsForm.maxLossType === 'amount' ? 1000 : 30),
        days: Math.max(1, Math.min(365, Number(settingsForm.maxLossDays) || 30)),
      },
      admin_transaction_daily_limit: Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000)),
      portfolio_visibility: visibilityState,
      portfolio_activation: portfolioActivation,
      virtual_apps: {
        finance: virtualAppsState.finance !== false,
        betting: virtualAppsState.betting === true,
        racing: virtualAppsState.racing === true,
        loto: virtualAppsState.loto === true,
      },
      lottery_virtual_portfolio: lotteryVirtualPortfolio,
      lottery_execution_requests: lotteryExecutionRequests,
      betting_theme_visibility: bettingThemeVisibility,
      betting_strategy_settings: serializeBettingStrategySettings(bettingStrategiesState),
      betting_strategy_runtime: serializeBettingStrategyRuntime(bettingStrategiesState),
      racing_strategy_settings: serializeBettingStrategySettings(racingStrategiesState),
      racing_strategy_runtime: serializeBettingStrategyRuntime(racingStrategiesState),
      finance_virtual_runtime: financeVirtualSimulation,
      decision_resolutions: decisionState,
      agent_global_quota: globalAgentConfig,
      agent_quotas: agentConfigsState,
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

  async function updateVirtualAppPreference(app: 'finance' | 'betting' | 'racing' | 'loto', enabled: boolean) {
    const nextVirtualApps = {
      ...virtualAppsEnabled,
      [app]: enabled,
    };
    setVirtualAppsEnabled(nextVirtualApps);
    const nextLotteryVirtualPortfolio = app === 'loto'
      ? {
        ...lotteryVirtualPortfolio,
        enabled,
        ai_enabled: enabled ? lotteryVirtualPortfolio.ai_enabled : false,
        mode: enabled ? lotteryVirtualPortfolio.mode : 'manual',
      }
      : lotteryVirtualPortfolio;
    if (app === 'loto') {
      setLotteryVirtualPortfolio(nextLotteryVirtualPortfolio);
    }

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
            ...buildPersonalSettingsPayload({}, portfolioVisibility, resolvedDecisionKeys, nextVirtualApps),
            lottery_virtual_portfolio: nextLotteryVirtualPortfolio,
          },
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

  async function completePortfolioSetupStep() {
    if (!accessToken || !user) {
      return;
    }
    const hasEnabledVirtual = virtualAppsEnabled.finance || virtualAppsEnabled.betting || virtualAppsEnabled.racing || virtualAppsEnabled.loto;
    const hasRealIntegration = integrationConnections.some((connection) => connection.status === 'active');
    if (!hasEnabledVirtual && !hasRealIntegration) {
      setError('Activez au moins un portefeuille virtuel ou une intégration réelle pour continuer.');
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
            portfolio_setup_done: true,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (response.ok && payload) {
        setUser(payload);
      }
      setPortfolioSetupStepDone(true);
      setError(null);
    } catch {
      setPortfolioSetupStepDone(true);
    }
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
    const nextActivation = { ...portfolioActivation, [portfolio.id]: enabled };
    setPortfolioActivation(nextActivation);

    if (portfolio.provider_code) {
      await toggleIntegration(portfolio.provider_code, enabled, providerLabels[portfolio.provider_code] ?? portfolio.label);
    }

    const nextVisibility = !enabled
      ? { ...portfolioVisibility, [portfolio.id]: false }
      : portfolioVisibility;
    if (!enabled) {
      setPortfolioVisibility(nextVisibility);
    }

    await persistDashboardPreferences(nextVisibility, 'Activation des portefeuilles mise à jour.');

    if (accessToken) {
      try {
        await fetch(apiUrl('/auth/me/settings'), {
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
              ...buildPersonalSettingsPayload({}, nextVisibility),
              portfolio_activation: nextActivation,
            },
          }),
        });
      } catch {
        // Keep local state even if persistence fails.
      }
    }
  }

  async function updateAgentConfig(portfolioId: string, patch: Partial<AgentQuotaConfig>) {
    const currentConfigs = agentConfigsRef.current;
    const current = currentConfigs[portfolioId] ?? currentConfigs[GLOBAL_AGENT_CONFIG_KEY] ?? defaultAgentConfig;
    const nextConfig: AgentQuotaConfig = {
      ...current,
      ...patch,
      domain_policy: {
        ...current.domain_policy,
        ...(patch.domain_policy ?? {}),
      },
      max_amount: Math.max(MIN_MONETARY_LIMIT, Number((patch.max_amount ?? current.max_amount) || defaultAgentConfig.max_amount)),
      max_transactions_per_day: Math.max(1, Math.min(1000, Number((patch.max_transactions_per_day ?? current.max_transactions_per_day) || defaultAgentConfig.max_transactions_per_day))),
      max_transactions_per_period: Math.max(1, Math.min(1000, Number((patch.max_transactions_per_period ?? current.max_transactions_per_period) || defaultAgentConfig.max_transactions_per_period))),
      period_days: Math.max(1, Math.min(365, Number((patch.period_days ?? current.period_days) || defaultAgentConfig.period_days))),
      max_investment_amount: Math.max(MIN_MONETARY_LIMIT, Number((patch.max_investment_amount ?? current.max_investment_amount) || defaultAgentConfig.max_investment_amount)),
      max_loss_amount: Math.max(MIN_MONETARY_LIMIT, Number((patch.max_loss_amount ?? current.max_loss_amount) || defaultAgentConfig.max_loss_amount)),
    };
    const nextConfigs = {
      ...currentConfigs,
      [portfolioId]: nextConfig,
    };
    agentConfigsRef.current = nextConfigs;
    setAgentConfigs(nextConfigs);

    if (!accessToken) {
      return;
    }

    try {
      const requestId = ++latestAgentConfigPersistRequestRef.current;
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
            agent_global_quota: nextConfigs[GLOBAL_AGENT_CONFIG_KEY] ?? nextConfig,
            agent_quotas: nextConfigs,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (response.ok && payload && requestId === latestAgentConfigPersistRequestRef.current) {
        setUser(payload);
      }
    } catch {
      // Keep local settings even if persistence fails.
    }
  }

  async function saveAdminDailyTransactionLimit() {
    if (!accessToken || !hasAdminRole(user)) {
      return;
    }
    const normalizedLimit = Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000));
    setAdminDailyTransactionLimit(normalizedLimit);
    setSubmitting(true);
    setAdminFeedback(null);
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
            admin_transaction_daily_limit: normalizedLimit,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (!response.ok || !payload) {
        throw new Error(extractErrorMessage(payload, 'Mise a jour de la limite impossible'));
      }
      setUser(payload);
      setAdminFeedback(`Limite quotidienne globale mise à jour: ${normalizedLimit} transaction(s)/jour.`);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Mise a jour de la limite impossible');
    } finally {
      setSubmitting(false);
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
          rationale: `Signal marché Robin IA — ${signal.name} (${signal.symbol}). ${signal.rationale}`,
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
      setError('Profil cree. Votre compte est en attente de validation administrateur avant la premiere connexion.');
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
      setActiveApp('finance');
      setAppView('overview');
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
      // Reload page to show login screen
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
        setCommunicationTestResult('Test effectué. Robin IA a bien fait son petit echauffement de notification.');
        return;
      }
      const funnySuccessNotes = [
        'Robin IA confirme: aucun pigeon voyageur n a ete blesse pendant le test.',
        'Message livre. Le hamster des serveurs a recu une prime de cacahuetes.',
        'Canal valide. Meme la machine a cafe est au courant.',
        'Signal envoye avec succes. Robin IA danse une samba binaire.',
      ];
      const funnyNote = funnySuccessNotes[Math.floor(Math.random() * funnySuccessNotes.length)] ?? funnySuccessNotes[0];
      setCommunicationTestResult(`${payload.message} ${funnyNote}`);
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

  async function updateAdminUser(
    target: UserProfile,
    assignedRoles: string[],
    isActive: boolean,
    appAccess?: Array<'finance' | 'betting' | 'racing' | 'loto'>,
    extras: Record<string, unknown> = {},
  ) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setAdminFeedback(null);
    try {
      const nextAppAccess = appAccess
        ? normalizeSelectedAppAccess(appAccess)
        : normalizeFrontendAppAccess(target.app_access);
      const response = await fetch(apiUrl(`/api/v1/admin/users/${target.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          assigned_roles: assignedRoles,
          is_active: isActive,
          app_access: nextAppAccess,
          ...extras,
        }),
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

  async function deleteAdminUser(target: UserProfile) {
    if (!accessToken) {
      return;
    }
    if (!window.confirm(`Supprimer définitivement le compte ${target.email} ? Cette action est irreversible.`)) {
      return;
    }
    setSubmitting(true);
    setAdminFeedback(null);
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/users/${target.id}`), {
        method: 'DELETE',
        headers: {
          ...authHeader(accessToken),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await readJsonResponse<{ detail?: unknown }>(response);
        throw new Error(extractErrorMessage(payload, 'Suppression utilisateur impossible'));
      }
      setAdminUsers((state) => state.filter((entry) => entry.id !== target.id));
      setAdminFeedback(`Compte supprimé: ${target.email}`);
      await loadAdminData(accessToken);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Suppression utilisateur impossible');
    } finally {
      setSubmitting(false);
    }
  }

  async function approvePendingUsersBatch(
    userIds: string[],
    selectedAppsByUser: Record<string, Array<'finance' | 'betting' | 'racing' | 'loto'>> = {},
  ) {
    if (!accessToken || userIds.length === 0) {
      return;
    }
    setSubmitting(true);
    setAdminFeedback(null);
    let approvedCount = 0;
    try {
      for (const userId of userIds) {
        const target = adminUsers.find((entry) => entry.id === userId);
        if (!target) {
          continue;
        }
        const roles = new Set(target.assigned_roles);
        const nextRoles = roles.has('banned') ? ['user'] : target.assigned_roles;
        const response = await fetch(apiUrl(`/api/v1/admin/users/${target.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader(accessToken),
          },
          credentials: 'include',
          body: JSON.stringify({
            assigned_roles: nextRoles,
            is_active: true,
            app_access: normalizeSelectedAppAccess(selectedAppsByUser[target.id] ?? target.app_access),
            access_profile: 'write',
          }),
        });
        const payload = await readJsonResponse<UserProfile | { detail?: unknown }>(response);
        if (!response.ok || !payload || !('id' in payload)) {
          throw new Error(extractErrorMessage(payload, `Validation impossible pour ${target.email}`));
        }
        setAdminUsers((state) => state.map((entry) => (entry.id === target.id ? payload : entry)));
        approvedCount += 1;
      }
      setSelectedApprovalIds({});
      setAdminFeedback(`${approvedCount} compte(s) validé(s).`);
      await loadAdminData(accessToken);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Validation en lot impossible');
    } finally {
      setSubmitting(false);
    }
  }

  const canAccessAdmin = hasAdminRole(user);
  const filteredAdminUsers = useMemo(() => adminUsers.filter((entry) => {
    const matchesUser = !deferredAdminUserSearch || matchesSearch(`${entry.full_name} ${entry.email}`, deferredAdminUserSearch);
    const matchesRole = adminRoleFilter === 'all' || entry.assigned_roles.includes(adminRoleFilter);
    const isPendingApproval = isUserPendingApproval(entry);
    const matchesStatus =
      adminStatusFilter === 'all' ||
      (adminStatusFilter === 'active' && entry.is_active) ||
      (adminStatusFilter === 'inactive' && !entry.is_active) ||
      (adminStatusFilter === 'pending' && isPendingApproval);
    return matchesUser && matchesRole && matchesStatus;
  }), [adminUsers, deferredAdminUserSearch, adminRoleFilter, adminStatusFilter]);
  const filteredAuditTrail = useMemo(() => auditTrail.filter((entry) => {
    const matchesText =
      !deferredAuditSearch ||
      matchesSearch(`${entry.event_type} ${entry.actor_id} ${entry.ip_address ?? ''} ${JSON.stringify(entry.payload)}`, deferredAuditSearch);
    const matchesSeverity = auditSeverityFilter === 'all' || entry.severity === auditSeverityFilter;
    return matchesText && matchesSeverity;
  }), [auditTrail, deferredAuditSearch, auditSeverityFilter]);
  const pendingAdminUsers = useMemo(
    () => adminUsers.filter((entry) => isUserPendingApproval(entry)),
    [adminUsers],
  );
  const pendingFilteredAdminUsers = useMemo(
    () => filteredAdminUsers.filter((entry) => isUserPendingApproval(entry)),
    [filteredAdminUsers],
  );
  const approvalQueueRows = useMemo(() => {
    const filteredRows = pendingFilteredAdminUsers.filter((entry) => {
      if (!deferredApprovalsSearch.trim()) {
        return true;
      }
      return matchesSearch(`${entry.full_name} ${entry.email} ${entry.id}`, deferredApprovalsSearch);
    });
    if (approvalsSort === 'name') {
      return [...filteredRows].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr-FR'));
    }
    if (approvalsSort === 'oldest') {
      return [...filteredRows].reverse();
    }
    return filteredRows;
  }, [pendingFilteredAdminUsers, deferredApprovalsSearch, approvalsSort]);
  const selectedApprovalCount = Object.keys(selectedApprovalIds)
    .filter((id) => approvalQueueRows.some((entry) => entry.id === id)).length;
  const selectableApprovalRows = selectedApprovalCount > 0
    ? approvalQueueRows.filter((entry) => Boolean(selectedApprovalIds[entry.id]))
    : approvalQueueRows;
  const applyApprovalAppPreset = (preset: 'finance' | 'paris' | 'all') => {
    const nextApps: Array<'finance' | 'betting' | 'racing' | 'loto'> = preset === 'finance'
      ? ['finance']
      : preset === 'paris'
        ? ['betting', 'racing', 'loto']
        : [...ALL_APP_KEYS];
    setApprovalAppSelections((state) => {
      const nextState = { ...state };
      selectableApprovalRows.forEach((entry) => {
        nextState[entry.id] = nextApps;
      });
      return nextState;
    });
    const scopeLabel = selectedApprovalCount > 0
      ? `${selectedApprovalCount} compte(s) sélectionné(s)`
      : `${approvalQueueRows.length} compte(s) en attente`;
    const presetLabel = preset === 'finance'
      ? 'Pack Finance seulement'
      : preset === 'paris'
        ? 'Pack Paris'
        : 'Tout activer';
    setAdminFeedback(`${presetLabel} appliqué sur ${scopeLabel}.`);
  };
  const lastLoginAuditRows = useMemo(
    () => [...adminUsers]
      .sort((a, b) => Date.parse(b.last_login_at ?? '') - Date.parse(a.last_login_at ?? ''))
      .slice(0, 20),
    [adminUsers],
  );
  const adminConnectedUsersCount = useMemo(() => {
    const now = Date.now();
    return adminUsers.filter((entry) => {
      if (!entry.is_active) {
        return false;
      }
      const lastLoginTs = Date.parse(entry.last_login_at ?? '');
      if (!Number.isFinite(lastLoginTs)) {
        return false;
      }
      return now - lastLoginTs <= ADMIN_CONNECTED_WINDOW_MS;
    }).length;
  }, [adminUsers]);
  const adminActiveUsersCount = useMemo(
    () => adminUsers.filter((entry) => entry.is_active).length,
    [adminUsers],
  );
  const adminMfaEnabledCount = useMemo(
    () => adminUsers.filter((entry) => entry.mfa_enabled).length,
    [adminUsers],
  );
  const siteAuditSummary = useMemo(() => {
    const warnings = auditTrail.filter((entry) => entry.severity === 'warning').length;
    const authEvents = auditTrail.filter((entry) => entry.event_type.startsWith('auth.')).length;
    const adminEvents = auditTrail.filter((entry) => entry.event_type.startsWith('admin.')).length;
    return {
      total: auditTrail.length,
      warnings,
      authEvents,
      adminEvents,
    };
  }, [auditTrail]);
  const recentSiteAudit = useMemo(() => auditTrail.slice(0, 8), [auditTrail]);
  const findIntegration = (providerCode: string) => integrationConnections.find((item) => item.provider_code === providerCode);
  const coinbaseConnection = findIntegration('coinbase');

  function focusBettingDetailPanel(target: 'active' | 'recent') {
    setBettingDetailFocus(target);
    const panelId = target === 'active' ? 'betting-active-detail' : 'betting-recent-detail';
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }
    const key = panel.dataset.collapseKey;
    if (key) {
      setCollapsedCards((state) => ({ ...state, [key]: false }));
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openFinancePortfolioDetail(portfolio: Portfolio) {
    setActiveApp('finance');
    setSelectedPortfolio(portfolio);
    setPortfolioDetailOpen(true);
    setAppView('portfolios');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) {
      console.warn(`Section not found: ${sectionId}`);
      return;
    }
    // Measure sticky header
    const header = document.querySelector('.heroTopbar') as HTMLElement | null;
    const headerH = header ? header.offsetHeight : 100;
    // Add extra offset for safety
    const extraOffset = 12;
    const totalOffset = headerH + extraOffset;
    const scrollTop = section.getBoundingClientRect().top + window.scrollY - totalOffset;
    window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
  }

  function scrollToSectionSoon(sectionId: string, attempts = 10) {
    const tryScroll = (remaining: number) => {
      const section = document.getElementById(sectionId);
      if (section) {
        scrollToSection(sectionId);
        return;
      }
      if (remaining <= 0) {
        return;
      }
      window.requestAnimationFrame(() => tryScroll(remaining - 1));
    };
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        tryScroll(attempts);
      });
    });
  }

  function openOverviewSection(sectionId?: string) {
    clearViewSelections();
    setAppView('overview');
    if (sectionId) {
      scrollToSectionSoon(sectionId);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAccountWorkspace(sectionId?: string) {
    clearViewSelections();
    setAppView('account');
    scrollToSectionSoon(sectionId ?? 'account-profile');
  }

  function openAdminWorkspace() {
    clearViewSelections();
    setAppView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const allPortfolios = buildAllPortfolios(
    dashboard,
    integrationConnections,
    portfolioVisibility,
    portfolioActivation,
    financeVirtualSimulation,
    localPortfolioOperations,
  );
  const lotoIntegrationPortfolios = useMemo(
    () => integrationConnections
      .filter((connection) => connection.provider_code !== 'coinbase')
      .filter((connection) => connection.status === 'active' || connection.status === 'available')
      .map((connection, index) => ({
        id: `loto-integration-${connection.provider_code}-${index}`,
        label: connection.account_label?.trim() ? connection.account_label : connection.provider_name,
        providerName: connection.provider_name,
        providerCode: connection.provider_code,
        status: connection.status,
      })),
    [integrationConnections],
  );
  const lotteryAssignablePortfolios = useMemo(
    () => ([
      { id: 'loto-virtual', label: 'Portefeuille fictif Loto', executionMode: 'simulation' as const },
      ...lotoIntegrationPortfolios.map((portfolio) => ({
        id: portfolio.id,
        label: portfolio.label,
        executionMode: 'real' as const,
      })),
    ]),
    [lotoIntegrationPortfolios],
  );
  useEffect(() => {
    if (lotteryAssignablePortfolios.some((portfolio) => portfolio.id === selectedLotteryRecommendationPortfolioId)) {
      return;
    }
    setSelectedLotteryRecommendationPortfolioId(lotteryAssignablePortfolios[0]?.id ?? 'loto-virtual');
  }, [lotteryAssignablePortfolios, selectedLotteryRecommendationPortfolioId]);
  const selectedLotoIntegrationPortfolio = lotoIntegrationPortfolios.find((portfolio) => portfolio.id === lotoPortfolioMenuSelection) ?? null;
  const visiblePortfolios = allPortfolios.filter((portfolio) => portfolio.visible && portfolio.status === 'active');
  const realVisiblePortfolios = visiblePortfolios.filter((portfolio) => portfolio.type === 'integration');
  const aggregateAllHistory = aggregatePortfolioHistory(visiblePortfolios);
  const evolution24h = formatPortfolioEvolution(aggregateAllHistory, 1);
  const evolution7d = formatPortfolioEvolution(aggregateAllHistory, 7);
  const evolution1m = formatPortfolioEvolution(aggregateAllHistory, 30);
  const selectedHistory = selectedPortfolio ? filterHistoryByScale(selectedPortfolio.history, portfolioHistoryScale) : [];
  const goalPeriod = normalizeGoalPeriod(settingsForm.objectivePeriod);
  const goalPeriodDays = GOAL_PERIOD_DAYS[goalPeriod];
  const goalPeriodLabel = GOAL_PERIOD_LABELS[goalPeriod];
  const goalTargetNet = toPositiveNumber(settingsForm.objectiveNetGain, 0);
  const aggregatePoints = aggregateAllHistory
    .map((point) => ({ ts: Date.parse(point.date), value: point.value }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  const goalNowPoint = aggregatePoints[aggregatePoints.length - 1] ?? null;
  const goalBasePoint = goalNowPoint
    ? [...aggregatePoints].reverse().find((point) => point.ts <= (goalNowPoint.ts - goalPeriodDays * 24 * 60 * 60 * 1000)) ?? aggregatePoints[0] ?? null
    : null;
  const grossGainPeriod = goalNowPoint && goalBasePoint ? (goalNowPoint.value - goalBasePoint.value) : 0;
  const estimatedNetGainPeriod = grossGainPeriod > 0 ? grossGainPeriod * (1 - ESTIMATED_TAX_RATE) : grossGainPeriod;
  const goalProgressRaw = goalTargetNet > 0 ? (estimatedNetGainPeriod / goalTargetNet) : 0;
  const goalProgress = goalTargetNet > 0 ? Math.max(-1.2, Math.min(1.2, goalProgressRaw)) : 0;
  const goalReached = goalTargetNet > 0 && estimatedNetGainPeriod >= goalTargetNet;
  const riskLossProfilePct = settingsForm.riskProfile === 'low' ? 8 : settingsForm.riskProfile === 'high' ? 45 : 25;
  const configuredLossGuardValue = toPositiveNumber(settingsForm.maxLossValue, settingsForm.maxLossType === 'amount' ? 1000 : 30);
  const objectiveLossGuardEstimate = settingsForm.maxLossType === 'amount'
    ? configuredLossGuardValue
    : (goalTargetNet * configuredLossGuardValue) / 100;
  const objectiveRiskLossEstimate = (goalTargetNet * riskLossProfilePct) / 100;
  const objectiveEstimatedLoss = Math.max(0, Math.max(objectiveLossGuardEstimate, objectiveRiskLossEstimate));
  const goalWindowMs = goalPeriodDays * 24 * 60 * 60 * 1000;
  const goalNowTs = goalNowPoint?.ts ?? null;
  const goalBaseTs = goalBasePoint?.ts ?? null;
  const elapsedRatio = (goalWindowMs > 0 && goalNowTs !== null && goalBaseTs !== null)
    ? Math.max(0, Math.min(1, (goalNowTs - goalBaseTs) / goalWindowMs))
    : 0;
  const goalTrajectoryGap = goalProgressRaw - elapsedRatio;
  const goalTrajectoryTone = goalReached
    ? 'up'
    : goalTargetNet > 0
      ? goalTrajectoryGap >= -0.03 && estimatedNetGainPeriod >= 0 ? 'up' : 'down'
      : 'neutral';
  const goalProgressText = goalTargetNet > 0
    ? `${estimatedNetGainPeriod >= 0 ? '+' : ''}${estimatedNetGainPeriod.toFixed(0)}€ / ${goalTargetNet.toFixed(0)}€`
    : 'Objectif non défini';
  const goalMoodTone = loading
    ? 'neutral'
    : goalReached
      ? 'up'
      : estimatedNetGainPeriod < 0
        ? 'down'
        : goalProgressRaw >= 0.2
          ? 'up'
          : 'neutral';
  const goalMoodLabel = loading
    ? '⛅ Radar météo en chauffe'
    : goalMoodTone === 'up'
      ? '☀️ Grand soleil: les gains bronzent'
      : goalMoodTone === 'down'
        ? '🌧️ Averse de volatilité: sortez le parapluie'
        : '🌤️ Ciel variable: cap maintenu';
  const trendArrowSpeed = goalTrajectoryTone === 'up' ? 1.9 : goalTrajectoryTone === 'down' ? 3.2 : 2.5;
  const trendArrowScale = goalTrajectoryTone === 'up' ? 1.08 : goalTrajectoryTone === 'down' ? 0.88 : 0.96;
  const progressMenuKeys = useMemo(() => {
    const keys: string[] = [];
    for (const app of allowedApps) {
      keys.push(`${app}:dashboard`);
      if (app !== 'loto') {
        keys.push(`${app}:strategies`);
        keys.push(`${app}:settings`);
      }
    }
    return keys;
  }, [allowedApps]);
  const visitedProgressCount = progressMenuKeys.filter((key) => visitedMenuKeys[key]).length;
  const uiNavigationProgress = progressMenuKeys.length > 0 ? Math.max(0, Math.min(1, visitedProgressCount / progressMenuKeys.length)) : 0;
  const uiNavigationProgressPct = Math.round(uiNavigationProgress * 100);
  const objectiveProgressPct = Math.round(Math.max(0, Math.min(1, goalProgress)) * 100);
  const objectiveVisualPct = Math.round(Math.max(0, Math.min(1, Math.abs(goalProgress))) * 100);
  const objectiveTimeConsumedPct = Math.round(Math.max(0, Math.min(1, elapsedRatio)) * 100);
  const topbarProgressPct = loading ? loadingProgressPct : objectiveVisualPct;
  const topbarProgressRatio = Math.max(0, Math.min(1, topbarProgressPct / 100));
  const topbarDelayConsumedPct = loading ? 0 : objectiveTimeConsumedPct;
  const batteryTone = loading
    ? 'neutral'
    : goalMoodTone === 'down'
      ? 'down'
      : topbarProgressRatio >= 0.34
        ? 'up'
        : 'neutral';
  const topbarRealValue = realVisiblePortfolios.reduce((sum, portfolio) => sum + portfolio.current_value, 0);
  const topbarFinanceVirtualPortfolio = allPortfolios.find((portfolio) => portfolio.type === 'virtual') ?? null;
  const topbarBettingVirtualStrategy = bettingStrategies.find((strategy) => strategy.isVirtual && strategy.enabled) ?? null;
  const topbarRacingVirtualStrategy = racingStrategies.find((strategy) => strategy.isVirtual && strategy.enabled) ?? null;
  const topbarBettingVirtualBankroll = virtualAppsEnabled.betting
    ? (topbarBettingVirtualStrategy?.bankroll ?? 0)
    : 0;
  const topbarRacingVirtualBankroll = virtualAppsEnabled.racing
    ? (topbarRacingVirtualStrategy?.bankroll ?? 0)
    : 0;
  const topbarFinanceVirtualValue = virtualAppsEnabled.finance
    ? (topbarFinanceVirtualPortfolio?.current_value ?? 0)
    : 0;
  const topbarVirtualValue =
    topbarFinanceVirtualValue
    + topbarBettingVirtualBankroll
    + topbarRacingVirtualBankroll
    + (virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled ? lotteryVirtualPortfolio.bankroll : 0);
  const topbarLotteryVirtualTrend = virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled
    ? Number((lotteryVirtualPortfolio.bankroll - lotteryVirtualPortfolio.initial_balance).toFixed(2))
    : 0;
  const topbarVirtualTrendAmount =
    (virtualAppsEnabled.finance ? (historyValueDelta(topbarFinanceVirtualPortfolio?.history ?? [], 7) ?? 0) : 0)
    + (virtualAppsEnabled.betting ? (historyValueDelta(topbarBettingVirtualStrategy?.history ?? [], 7) ?? 0) : 0)
    + (virtualAppsEnabled.racing ? (historyValueDelta(topbarRacingVirtualStrategy?.history ?? [], 7) ?? 0) : 0)
    + topbarLotteryVirtualTrend;
  const topbarVirtualTrendBase = topbarVirtualValue - topbarVirtualTrendAmount;
  const topbarVirtualTrendPct = topbarVirtualTrendBase > 0
    ? (topbarVirtualTrendAmount / topbarVirtualTrendBase) * 100
    : null;
  const topbarVirtualTrendTone = numericChangeTone(topbarVirtualTrendAmount);
  const topbarProgressLabel = loading
    ? `Chargement ${topbarProgressPct}%`
    : `${goalProgress >= 0 ? '+' : ''}${Math.round(goalProgress * 100)}% vs cible`;
  const topbarRealTrendLabel = `24h ${evolution24h.value}`;
  const topbarVirtualTrendLabel = topbarVirtualTrendPct !== null
    ? `Tendance ${formatSignedEuro(topbarVirtualTrendAmount, 'n/d')} (${topbarVirtualTrendPct >= 0 ? '+' : ''}${topbarVirtualTrendPct.toFixed(1)}%)`
    : `Tendance ${formatSignedEuro(topbarVirtualTrendAmount, 'n/d')}`;
  const objectiveDeadlineLabel = goalBaseTs !== null
    ? new Date(goalBaseTs + goalWindowMs).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    : 'n/d';
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
  const coinbaseDecisionInsights: InsightItem[] = visiblePortfolios
    .filter((portfolio) => portfolio.provider_code === 'coinbase')
    .flatMap((portfolio) => {
      const buyOps = portfolio.operations.filter((op) => op.side === 'buy');
      const sellOps = portfolio.operations.filter((op) => op.side === 'sell');
      const grossBuy = buyOps.reduce((sum, op) => sum + op.amount, 0);
      const grossSell = sellOps.reduce((sum, op) => sum + op.amount, 0);
      const netExposure = Math.max(0, grossBuy - grossSell);
      const recentWindow = portfolio.operations.slice(0, 10);
      const recentBuys = recentWindow.filter((op) => op.side === 'buy').length;
      const recentSells = recentWindow.filter((op) => op.side === 'sell').length;
      const topBuyAsset = buyOps
        .reduce<Record<string, number>>((acc, op) => {
          acc[op.asset] = (acc[op.asset] ?? 0) + op.amount;
          return acc;
        }, {});
      const topAsset = Object.entries(topBuyAsset).sort((a, b) => b[1] - a[1])[0];
      const topAssetShare = topAsset && grossBuy > 0 ? topAsset[1] / grossBuy : 0;

      const insights: InsightItem[] = [];
      const assetBuyTotals = buyOps.reduce<Record<string, number>>((acc, op) => {
        const key = op.asset.toUpperCase();
        acc[key] = (acc[key] ?? 0) + op.amount;
        return acc;
      }, {});
      const topAssets = Object.entries(assetBuyTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      const assetShares = topAssets.map(([asset, amount]) => ({
        asset,
        share: grossBuy > 0 ? amount / grossBuy : 0,
      }));
      const recentNetByAsset = recentWindow.reduce<Record<string, number>>((acc, op) => {
        const key = op.asset.toUpperCase();
        const signedAmount = op.side === 'buy' ? op.amount : -op.amount;
        acc[key] = (acc[key] ?? 0) + signedAmount;
        return acc;
      }, {});
      const heldAssets = new Set(Object.keys(assetBuyTotals));
      const cryptoMarketSignals = MARKET_SIGNALS.filter((signal) => signal.category === 'crypto');

      if (portfolio.current_value > 0 && netExposure < portfolio.current_value * 0.55) {
        insights.push({
          id: `decision-coinbase-dca-${portfolio.id}`,
          title: `${portfolio.label} · Achat suggere BTC`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↑ Renfort progressif',
          detail: 'Approche DCA: fractionner le renfort en 3 ordres (BTC/ETH) pour lisser le prix et rester dans vos quotas de risque.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (portfolio.current_value > 0 && netExposure < portfolio.current_value * 0.35) {
        insights.push({
          id: `decision-coinbase-redeploy-${portfolio.id}`,
          title: `${portfolio.label} · Achat suggere progressif`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↑ Redeploiement du cash',
          detail: 'Exposition crypto faible par rapport a la valeur du portefeuille. Redeployer en 4 ordres progressifs sur BTC/ETH/SOL pour remonter le potentiel de rendement.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (topAsset && topAssetShare >= 0.62) {
        insights.push({
          id: `decision-coinbase-rebalance-${portfolio.id}`,
          title: `${portfolio.label} · Vente suggeree ${topAsset[0]}`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↓ Concentration elevée',
          detail: `Le portefeuille est concentré à ${(topAssetShare * 100).toFixed(0)}% sur ${topAsset[0]}. Vente partielle puis rotation vers BTC/ETH/SOL pour diversifier le risque.`,
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      for (const assetShare of assetShares) {
        if (assetShare.share < 0.35) {
          continue;
        }
        insights.push({
          id: `decision-coinbase-trim-${portfolio.id}-${assetShare.asset}`,
          title: `${portfolio.label} · Vente suggeree ${assetShare.asset}`,
          value: assetShare.share >= 0.5 ? 'Confiance 3/3' : 'Confiance 2/3',
          trend: 'Projection future · ↓ Reduction concentration',
          detail: `${assetShare.asset} represente ${(assetShare.share * 100).toFixed(0)}% des achats historiques. Alleger partiellement pour equilibrer le couple risque/rendement.`,
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (portfolio.roi >= 9 || recentBuys >= recentSells + 3) {
        insights.push({
          id: `decision-coinbase-protect-${portfolio.id}`,
          title: `${portfolio.label} · Vente suggeree partielle`,
          value: 'Confiance 3/3',
          trend: 'Projection future · ↓ Protection des gains',
          detail: 'Sécuriser 10% à 20% des gains latents via une vente partielle et replacer sur prochain repli pour améliorer le ratio rendement/risque.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (portfolio.roi <= -8) {
        insights.push({
          id: `decision-coinbase-riskoff-${portfolio.id}`,
          title: `${portfolio.label} · Vente suggeree defensive`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↓ Controle drawdown',
          detail: 'ROI negatif marque. Reduire 10% a 15% des expositions les plus volatiles pour stabiliser le portefeuille avant nouveau renfort.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (recentSells >= recentBuys + 3) {
        insights.push({
          id: `decision-coinbase-accumulate-${portfolio.id}`,
          title: `${portfolio.label} · Achat suggere de reprise`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↑ Re-accumulation controlee',
          detail: 'Flux recents majoritairement vendeurs. Mettre en place un plan de re-accumulation progressif pour lisser un eventuel rebond de marche.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      const diversifyCandidates = cryptoMarketSignals
        .filter((signal) => signal.confidence >= 3 && !heldAssets.has(signal.symbol.toUpperCase()))
        .sort((a, b) => b.performance_30d - a.performance_30d)
        .slice(0, 3);
      for (const candidate of diversifyCandidates) {
        insights.push({
          id: `decision-coinbase-diversify-${portfolio.id}-${candidate.id}`,
          title: `${portfolio.label} · Achat suggere ${candidate.symbol}`,
          value: `Confiance ${Math.max(1, Math.min(3, candidate.confidence - 1))}/3`,
          trend: 'Projection future · ↑ Diversification crypto',
          detail: `${candidate.name}: ${candidate.rationale} Position d entree progressive recommandee pour diversifier le portefeuille Coinbase.`,
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      const assetMomentum = Object.entries(recentNetByAsset)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);
      for (const [asset, flow] of assetMomentum) {
        if (flow <= 0) {
          continue;
        }
        insights.push({
          id: `decision-coinbase-momentum-${portfolio.id}-${asset}`,
          title: `${portfolio.label} · Achat suggere ${asset}`,
          value: 'Confiance 2/3',
          trend: 'Projection future · ↑ Momentum acheteur',
          detail: `${asset} montre un flux acheteur net recent de ${flow.toFixed(0)} €. Poursuivre le renfort par paliers pour confirmer la tendance.`,
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      if (insights.length === 0) {
        insights.push({
          id: `decision-coinbase-keep-${portfolio.id}`,
          title: `${portfolio.label} · Achat suggere ETH`,
          value: 'Confiance 1/3',
          trend: 'Projection future · → Scenario neutre',
          detail: 'Portefeuille équilibré. Ajouter de petites lignes progressives en ETH/BTC si volatilité contenue, sinon rester en observation active.',
          section: 'decisions',
          portfolio_id: portfolio.id,
          portfolio_label: portfolio.label,
        });
      }

      return insights.slice(0, 12);
    });
  const decisionInsightKey = (insight: InsightItem) => `${insight.portfolio_id ?? 'none'}||${insight.title}||${insight.detail}||${insight.trend}`;
  const decisionInsights: InsightItem[] = [...suggestionInsights, ...aiDecisionInsights, ...coinbaseDecisionInsights]
    .filter((insight) => !resolvedDecisionKeys[decisionInsightKey(insight)]);
  const financeAiEnabledPortfolioIds = useMemo(() => {
    const enabledIds = new Set<string>();
    allPortfolios.forEach((portfolio) => {
      if (portfolio.status !== 'active') {
        return;
      }
      if (portfolio.type === 'virtual' && (!virtualAppsEnabled.finance || portfolioActivation[portfolio.id] === false)) {
        return;
      }
      const cfg = getAgentConfig(portfolio.id);
      if (cfg.enabled) {
        enabledIds.add(portfolio.id);
      }
    });
    return enabledIds;
  }, [allPortfolios, virtualAppsEnabled.finance, portfolioActivation, agentConfigs, defaultAgentConfig]);
  const visibleDecisionInsights = useMemo(
    () => decisionInsights.filter((insight) => {
      const portfolioId = inferDecisionPortfolioId(insight);
      return Boolean(portfolioId && financeAiEnabledPortfolioIds.has(portfolioId));
    }),
    [decisionInsights, financeAiEnabledPortfolioIds],
  );
  const pendingDecisionCount = visibleDecisionInsights.length;
  const userBettingRiskProfile = resolveUserRiskProfile(user);
  const normalizedLotteryGridCount = Math.max(1, Math.min(MAX_LOTTERY_GRID_COUNT, lotteryGridCount));
  const lotteryPredictions = useMemo(() => ({
    loto: computeLotteryPredictions('loto', LOTO_HISTORY, userBettingRiskProfile, normalizedLotteryGridCount),
    euromillions: computeLotteryPredictions('euromillions', EUROMILLIONS_HISTORY, userBettingRiskProfile, normalizedLotteryGridCount),
  }), [userBettingRiskProfile, normalizedLotteryGridCount]);
  const lotteryBacktests = useMemo(() => ({
    loto: buildLotteryBacktestMap('loto', lotteryPredictions.loto.predictedGrids, LOTO_HISTORY, LOTTERY_DISPLAY_BACKTEST_DRAW_COUNT),
    euromillions: buildLotteryBacktestMap('euromillions', lotteryPredictions.euromillions.predictedGrids, EUROMILLIONS_HISTORY, LOTTERY_DISPLAY_BACKTEST_DRAW_COUNT),
  }), [lotteryPredictions]);
  const lotteryUpcoming = useMemo(
    () => ['loto', 'euromillions']
      .flatMap((game) => buildLotteryUpcomingDrawSeries(game as LotteryGame, Math.max(2, lotterySubscriptionWeeks)))
      .sort((a, b) => Date.parse(a.drawDate) - Date.parse(b.drawDate)),
    [lotterySubscriptionWeeks],
  );
  const pendingTipsterSignals = useMemo(
    () => tipsterSignals.filter((signal) => signal.status === 'pending'),
    [tipsterSignals]
  );
  const archivedTipsterSignals = useMemo(
    () => tipsterSignals.filter((signal) => signal.status !== 'pending').slice(0, 12),
    [tipsterSignals]
  );
  const confidenceIndexForSignal = (signal: TipsterSignal) => {
    const riskAlignment = userBettingRiskProfile === 'low'
      ? (signal.risk === 'faible' ? 1.12 : signal.risk === 'modere' ? 0.96 : 0.78)
      : userBettingRiskProfile === 'medium'
        ? (signal.risk === 'modere' ? 1.08 : signal.risk === 'faible' ? 1.0 : 0.9)
        : (signal.risk === 'eleve' ? 1.1 : signal.risk === 'modere' ? 1.0 : 0.9);
    const base = (signal.confidence / 5) * 72 + Math.min(28, signal.value_pct * 2.4);
    return Math.max(0, Math.min(100, Math.round(base * riskAlignment)));
  };
  const topTipsterRecommendations = useMemo(
    () => [...pendingTipsterSignals]
      .map((signal) => ({
        ...signal,
        profileConfidenceIndex: confidenceIndexForSignal(signal),
      }))
      .sort((a, b) => b.profileConfidenceIndex - a.profileConfidenceIndex)
      .slice(0, 20),
    [pendingTipsterSignals, userBettingRiskProfile]
  );
  const filteredTopTipsterRecommendations = useMemo(
    () => {
      const base = topTipsterRecommendations.filter((signal) => bettingThemeVisibility[signal.sport as BettingThemeKey] !== false);
      const bettingAgentEnabled = bettingStrategies.some((strategy) => strategy.enabled && strategy.ai_enabled);
      return bettingAgentEnabled ? base : [];
    },
    [topTipsterRecommendations, bettingThemeVisibility, bettingStrategies]
  );
  const racingPendingSignalsDisplay = useMemo(
    () => {
      const racingAgentEnabled = racingStrategies.some((strategy) => strategy.enabled && strategy.ai_enabled);
      return racingAgentEnabled ? racingSignals.filter((signal) => signal.status === 'pending') : [];
    },
    [racingStrategies, racingSignals],
  );
  const lotoAiRecommendationsEnabled = useMemo(
    () => {
      const virtualEnabled = virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled && lotteryVirtualPortfolio.ai_enabled;
      const realEnabled = lotoIntegrationPortfolios.some((portfolio) => {
        const cfg = getAgentConfig(portfolio.id);
        return portfolio.status === 'active' && cfg.enabled;
      });
      return virtualEnabled || realEnabled;
    },
    [virtualAppsEnabled.loto, lotteryVirtualPortfolio.enabled, lotteryVirtualPortfolio.ai_enabled, lotoIntegrationPortfolios, agentConfigs, defaultAgentConfig],
  );
  const lotteryPredictionsDisplay = useMemo(
    () => {
      if (lotoAiRecommendationsEnabled) {
        return lotteryPredictions;
      }
      return {
        loto: { ...lotteryPredictions.loto, predictedGrids: [] },
        euromillions: { ...lotteryPredictions.euromillions, predictedGrids: [] },
      };
    },
    [lotoAiRecommendationsEnabled, lotteryPredictions],
  );
  const activeBettingVirtualPortfolio = useMemo(
    () => bettingStrategies.find((strategy) => strategy.isVirtual),
    [bettingStrategies]
  );
  const bettingVirtualEvolution = useMemo(() => {
    if (!activeBettingVirtualPortfolio) {
      return { delta: 0, label: '0.00 €', tone: 'neutral' as const };
    }
    const history = activeBettingVirtualPortfolio.history;
    const last = history[history.length - 1]?.value ?? activeBettingVirtualPortfolio.bankroll;
    const prev = history[history.length - 2]?.value ?? 100;
    const delta = Number((last - prev).toFixed(2));
    return {
      delta,
      label: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €`,
      tone: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'neutral' as const,
    };
  }, [activeBettingVirtualPortfolio]);
  const overviewItems = useMemo(() => {
    const financeItems = allPortfolios
      .filter((portfolio) => portfolio.status === 'active')
      .map((portfolio) => {
        const evo7 = formatPortfolioEvolution(portfolio.history, 7);
        return {
          key: `finance:${portfolio.id}`,
          app: 'finance' as const,
          id: portfolio.id,
          label: portfolio.label,
          portfolioKind: portfolio.type,
          valueLabel: `${portfolio.current_value.toFixed(2)} €`,
          trendLabel: `7j: ${evo7.value}`,
          riskLabel: portfolio.type === 'virtual' ? 'Simulation' : 'Réel',
        };
      });
    const bettingItems = bettingStrategies
      .filter((strategy) => strategy.enabled)
      .map((strategy) => ({
        key: `betting:${strategy.id}`,
        app: 'betting' as const,
        id: strategy.id,
        label: strategy.name,
        portfolioKind: 'real' as const,
        valueLabel: `${strategy.bankroll.toFixed(0)} €`,
        trendLabel: `ROI ${strategy.roi >= 0 ? '+' : ''}${strategy.roi.toFixed(1)} %`,
        riskLabel: strategy.mode === 'autonomous' ? 'Auto' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel',
      }));
    const lotoItems = (['loto', 'euromillions'] as LotteryGame[]).map((game) => {
      const prediction = lotteryPredictions[game];
      const nextDraw = lotteryUpcoming.find((entry) => entry.game === game);
      return {
        key: `loto:${game}`,
        app: 'loto' as const,
        id: game,
        label: LOTTERY_CONFIG[game].label,
        portfolioKind: 'real' as const,
        valueLabel: nextDraw?.jackpotLabel ?? 'Jackpot a confirmer',
        trendLabel: `Confiance max ${prediction.predictedGrids[0]?.confidenceIndex ?? 0}/100`,
        riskLabel: `${prediction.totalDraws} tirages analyses`,
      };
    });
    return [...financeItems, ...bettingItems, ...lotoItems];
  }, [allPortfolios, bettingStrategies, lotteryPredictions, lotteryUpcoming]);
  const filteredOverviewItems = useMemo(
    () => overviewItems.filter((item) => {
      const allowedMatch = allowedApps.includes(item.app);
      const appMatch = overviewAppFilter === 'all' || item.app === overviewAppFilter;
      const targetMatch = overviewTargetFilter === 'all' || item.key === overviewTargetFilter;
      return allowedMatch && appMatch && targetMatch;
    }),
    [overviewItems, overviewAppFilter, overviewTargetFilter, allowedApps]
  );
  const assistantOptimizationTips = useMemo<AssistantTip[]>(() => {
    if (activeApp === 'finance') {
      const decisionTips = visibleDecisionInsights.slice(0, 4).map((insight) => ({
        id: `assistant-decision-${insight.id}`,
        title: insight.title,
        detail: insight.detail,
        insight,
        value: insight.value,
        trend: insight.trend,
      }));
      if (decisionTips.length > 0) {
        return decisionTips;
      }
      const tips = visiblePortfolios.slice(0, 4).map((portfolio) => {
        const evo7 = formatPortfolioEvolution(portfolio.history, 7);
        if (evo7.tone === 'down') {
          return {
            id: `finance-tip-${portfolio.id}`,
            title: `${portfolio.label}: ralentissement détecté`,
            detail: 'Réduire l exposition sur les actifs les plus volatils et renforcer le suivi quotidien.',
          };
        }
        return {
          id: `finance-tip-${portfolio.id}`,
          title: `${portfolio.label}: momentum exploitable`,
          detail: 'Maintenir le cap et prioriser les opportunités IA à forte confiance sur ce portefeuille.',
        };
      });
      return tips;
    }
    if (activeApp === 'loto') {
      const focusPrediction = lotteryPredictionsDisplay[lotteryGameFocus];
      const tips = focusPrediction.predictedGrids.slice(0, 3).map((grid, index) => ({
        id: `loto-tip-${grid.id}`,
        title: `Grille #${index + 1} ${LOTTERY_CONFIG[lotteryGameFocus].label}`,
        detail: `Indice ${grid.confidenceIndex}/100 · ${grid.rationale}`,
      }));
      return tips;
    }
    const tips = filteredTopTipsterRecommendations.slice(0, 4).map((signal) => ({
      id: `betting-tip-${signal.id}`,
      title: `${signal.event} (${signal.bookmaker})`,
      detail: `Indice confiance profil ${signal.profileConfidenceIndex}/100 · Value +${signal.value_pct.toFixed(1)}%.`,
    }));
    if (activeApp === 'racing') {
      return racingPendingSignalsDisplay.slice(0, 4).map((signal) => ({
        id: `racing-tip-${signal.id}`,
        title: signal.event,
        detail: `${signal.market} · Cote ${signal.odds} · Value +${signal.value_pct.toFixed(1)}%`,
      }));
    }
    return tips;
  }, [activeApp, visiblePortfolios, filteredTopTipsterRecommendations, lotteryPredictionsDisplay, lotteryGameFocus, visibleDecisionInsights, racingPendingSignalsDisplay]);
  const showAssistantDock = appView === 'dashboard' && activeApp !== 'loto' && assistantOptimizationTips.length > 0;
  const assistantDockVisible = showAssistantDock && assistantDockOpen;
  const isFinanceSectionActive = activeApp === 'finance';
  const isFinanceCryptoActive = activeApp === 'finance' && financeSubApp === 'crypto';
  const isFinanceActionsActive = activeApp === 'finance' && financeSubApp === 'actions';
  const isParisSectionActive = activeApp === 'betting' || activeApp === 'racing' || activeApp === 'loto';
  const hasParisApps = allowedApps.includes('betting') || allowedApps.includes('racing') || allowedApps.includes('loto');
  const topbarParisActiveApp: ParisApp = isParisSectionActive
    ? activeApp
    : (allowedApps.includes('betting')
      ? 'betting'
      : allowedApps.includes('racing')
        ? 'racing'
        : 'loto');
  const currentHeaderSection: HeaderMenuSection = appView === 'overview'
    ? 'home'
    : appView === 'account'
      ? 'account'
      : appView === 'admin'
        ? 'admin'
        : activeApp === 'finance'
          ? 'finance'
          : 'paris';
  const topbarNavAnimationKey = `${currentHeaderSection}:${financeSubApp}:${topbarParisActiveApp}:${appView}`;
  const breadcrumbItems = useMemo(() => {
    if (currentHeaderSection === 'home') {
      return [
        { key: 'home', label: 'Home', onClick: () => openOverviewSection() },
        { key: 'home-overview', label: 'Vue globale', active: true },
      ];
    }
    if (currentHeaderSection === 'finance') {
      return [
        { key: 'finance', label: 'Finance', onClick: openFinanceParentMenu },
        { key: `finance-${financeSubApp}`, label: financeSubApp === 'crypto' ? 'Cryptos' : 'Actions', onClick: () => openFinanceTopbarBranch(financeSubApp) },
        { key: `finance-view-${appView}`, label: appView === 'portfolios' ? 'Portefeuilles' : appView === 'settings' ? 'Options' : 'Cockpit', active: true },
      ];
    }
    if (currentHeaderSection === 'paris') {
      return [
        { key: 'paris', label: 'Paris en ligne', onClick: openParisParentMenu },
        { key: `paris-${topbarParisActiveApp}`, label: topbarParisActiveApp === 'betting' ? 'Paris sportifs' : topbarParisActiveApp === 'racing' ? 'Paris hippiques' : 'Loto', onClick: () => openParisTopbarBranch(topbarParisActiveApp) },
        { key: `paris-view-${appView}`, label: appView === 'settings' ? 'Options' : topbarParisActiveApp === 'loto' && appView === 'portfolios' ? 'Portefeuilles' : appView === 'strategies' ? 'Portefeuilles' : 'Cockpit', active: true },
      ];
    }
    if (currentHeaderSection === 'account') {
      return [
        { key: 'account', label: 'Mon compte', onClick: () => openAccountWorkspace() },
        { key: 'account-active', label: 'Réglages personnels', active: true },
      ];
    }
    return [
      { key: 'admin', label: 'Admin', onClick: openAdminWorkspace },
      { key: `admin-${adminSection}`, label: adminSection === 'home' ? 'Console' : adminSection === 'approvals' ? 'Validations' : adminSection === 'users' ? 'Utilisateurs' : adminSection === 'audit' ? 'Audit' : adminSection === 'transactions' ? 'Transactions' : 'Sécurité', active: true },
    ];
  }, [currentHeaderSection, openOverviewSection, openFinanceParentMenu, financeSubApp, appView, openFinanceTopbarBranch, openParisParentMenu, topbarParisActiveApp, openParisTopbarBranch, openAccountWorkspace, openAdminWorkspace, adminSection]);
  const peaMarketSignals = useMemo(
    () => MARKET_SIGNALS.filter((signal) => signal.category === 'actions' || signal.category === 'etf'),
    [],
  );
  const activeBettingVirtualStrategy = useMemo(
    () => bettingStrategies.find((strategy) => strategy.isVirtual) ?? null,
    [bettingStrategies],
  );
  const activeRacingVirtualStrategy = useMemo(
    () => racingStrategies.find((strategy) => strategy.isVirtual) ?? null,
    [racingStrategies],
  );
  const activeBettingBets = useMemo(
    () => bettingStrategies
      .flatMap((strategy) => strategy.recentBets
        .filter((bet) => bet.result === 'pending')
        .map((bet) => ({ ...bet, strategyName: strategy.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bettingStrategies]
  );
  const activeBettingExposure = useMemo(
    () => activeBettingBets.reduce((sum, bet) => sum + bet.stake, 0),
    [activeBettingBets]
  );
  const settledBettingBets = useMemo(
    () => bettingStrategies
      .flatMap((strategy) => strategy.recentBets
        .filter((bet) => bet.result !== 'pending')
        .map((bet) => ({ ...bet, strategyName: strategy.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bettingStrategies]
  );
  const settledBettingProfit = useMemo(
    () => settledBettingBets.reduce((sum, bet) => sum + bet.profit, 0),
    [settledBettingBets],
  );
  const activeBettingStrategies = useMemo(
    () => bettingStrategies.filter((strategy) => strategy.enabled),
    [bettingStrategies],
  );
  const recentBettingBets = useMemo(
    () => bettingStrategies
      .flatMap((strategy) => strategy.recentBets.map((bet) => ({ ...bet, strategyName: strategy.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
    [bettingStrategies]
  );
  const lotteryPendingTickets = useMemo(
    () => {
      const seen = new Set<string>();
      return lotteryVirtualPortfolio.tickets
        .filter((ticket) => ticket.status === 'pending')
        .filter((ticket) => {
          const signature = `${ticket.game}|${ticket.drawDate}|${ticket.numbers.join('-')}|${ticket.stars.join('-')}`;
          if (seen.has(signature)) {
            return false;
          }
          seen.add(signature);
          return true;
        })
        .sort((a, b) => {
          const aTs = Date.parse(a.drawDate);
          const bTs = Date.parse(b.drawDate);
          const aInProgress = isWithinTimedWindow(a.drawDate, LOTTERY_DRAW_LIVE_WINDOW_MS, liveClockTs);
          const bInProgress = isWithinTimedWindow(b.drawDate, LOTTERY_DRAW_LIVE_WINDOW_MS, liveClockTs);
          if (aInProgress !== bInProgress) {
            return aInProgress ? -1 : 1;
          }
          return aTs - bTs;
        });
    },
    [lotteryVirtualPortfolio.tickets, liveClockTs],
  );
  const lotterySettledTickets = useMemo(
    () => lotteryVirtualPortfolio.tickets
      .filter((ticket) => ticket.status !== 'pending')
      .sort((a, b) => Date.parse(b.settledAt ?? b.drawDate) - Date.parse(a.settledAt ?? a.drawDate)),
    [lotteryVirtualPortfolio.tickets],
  );
  const lotteryVirtualPnl = useMemo(
    () => Number((lotteryVirtualPortfolio.bankroll - lotteryVirtualPortfolio.initial_balance).toFixed(2)),
    [lotteryVirtualPortfolio.bankroll, lotteryVirtualPortfolio.initial_balance],
  );
  const lotteryRecentExecutionRequests = useMemo(
    () => [...lotteryExecutionRequests]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 6),
    [lotteryExecutionRequests],
  );
  const homePortfolioRows = useMemo<HomePortfolioRow[]>(() => {
    const financeRows = allPortfolios
      .filter((portfolio) => portfolio.type === 'virtual'
        || portfolio.status === 'active'
        || portfolio.current_value > 0
        || portfolio.operations.length > 0
        || portfolio.history.length > 1)
      .map<HomePortfolioRow>((portfolio) => {
      const evolution = formatPortfolioEvolution(portfolio.history, 7);
      const cfg = getAgentConfig(portfolio.id);
      return {
        id: `home-finance-${portfolio.id}`,
        appKey: 'finance',
        kind: portfolio.type === 'virtual' ? 'virtual' : 'real',
        source: 'portfolio',
        targetId: portfolio.id,
        label: portfolio.label,
        subtitle: `Finance · ${portfolio.type === 'virtual' ? 'portefeuille fictif' : 'portefeuille reel'}`,
        history: portfolio.history,
        valueLabel: `${portfolio.current_value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`,
        statusLabel: statusLabel(portfolio.status),
        statusTone: portfolio.status === 'active' ? 'ok' : portfolio.status === 'pending_user_consent' ? 'warn' : 'idle',
        trendLabel: `7j: ${evolution.value}`,
        trendTone: evolution.tone,
        aiEnabled: portfolio.status === 'active' && cfg.enabled,
        autonomousActive: portfolio.status === 'active' && cfg.enabled && cfg.mode === 'autopilot',
      };
    });
    const bettingRows = bettingStrategies.map<HomePortfolioRow>((strategy) => {
      const evolution = formatPortfolioEvolution(strategy.history, 7);
      return {
        id: `home-betting-${strategy.id}`,
        appKey: 'betting',
        kind: strategy.isVirtual ? 'virtual' : 'real',
        source: 'strategy',
        targetId: strategy.id,
        label: strategy.name,
        subtitle: `Paris sportifs · ${strategy.isVirtual ? 'simulation' : 'portefeuille reel'}`,
        history: strategy.history,
        valueLabel: `${strategy.bankroll.toFixed(0)} €`,
        statusLabel: strategy.enabled ? 'Actif' : 'Inactif',
        statusTone: strategy.enabled ? 'ok' : 'idle',
        trendLabel: `7j: ${evolution.value}`,
        trendTone: evolution.tone,
        aiEnabled: strategy.enabled && strategy.ai_enabled,
        autonomousActive: strategy.enabled && strategy.ai_enabled && strategy.mode === 'autonomous',
      };
    });
    const racingRows = racingStrategies.map<HomePortfolioRow>((strategy) => {
      const evolution = formatPortfolioEvolution(strategy.history, 7);
      return {
        id: `home-racing-${strategy.id}`,
        appKey: 'racing',
        kind: strategy.isVirtual ? 'virtual' : 'real',
        source: 'strategy',
        targetId: strategy.id,
        label: strategy.name,
        subtitle: `Paris hippiques · ${strategy.isVirtual ? 'simulation' : 'portefeuille reel'}`,
        history: strategy.history,
        valueLabel: `${strategy.bankroll.toFixed(0)} €`,
        statusLabel: strategy.enabled ? 'Actif' : 'Inactif',
        statusTone: strategy.enabled ? 'ok' : 'idle',
        trendLabel: `7j: ${evolution.value}`,
        trendTone: evolution.tone,
        aiEnabled: strategy.enabled && strategy.ai_enabled,
        autonomousActive: strategy.enabled && strategy.ai_enabled && strategy.mode === 'autonomous',
      };
    });
    const lotoRows: HomePortfolioRow[] = [
      {
        id: 'home-loto-virtual',
        appKey: 'loto',
        kind: 'virtual',
        source: 'loto',
        targetId: 'loto-virtual',
        label: 'Portefeuille fictif Loto',
        subtitle: 'Loto / EuroMillions · simulation',
        history: [{ date: new Date().toISOString(), value: lotteryVirtualPortfolio.bankroll }],
        valueLabel: `${lotteryVirtualPortfolio.bankroll.toFixed(0)} €`,
        statusLabel: virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled ? 'Actif' : 'Inactif',
        statusTone: virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled ? 'ok' : 'idle',
        trendLabel: `PnL ${lotteryVirtualPnl >= 0 ? '+' : ''}${lotteryVirtualPnl.toFixed(2)} €`,
        trendTone: lotteryVirtualPnl > 0 ? 'up' : lotteryVirtualPnl < 0 ? 'down' : 'neutral',
        aiEnabled: virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled && lotteryVirtualPortfolio.ai_enabled,
        autonomousActive: virtualAppsEnabled.loto && lotteryVirtualPortfolio.enabled && lotteryVirtualPortfolio.ai_enabled && lotteryVirtualPortfolio.mode === 'autonomous',
      },
      ...lotoIntegrationPortfolios.map<HomePortfolioRow>((portfolio) => {
        const relatedCount = lotteryExecutionRequests.filter((request) => request.targetPortfolioId === portfolio.id).length;
        const cfg = getAgentConfig(portfolio.id);
        return {
          id: `home-loto-${portfolio.id}`,
          appKey: 'loto',
          kind: 'real',
          source: 'loto',
          targetId: portfolio.id,
          label: portfolio.label,
          subtitle: `Loto reel · ${portfolio.providerName}`,
          history: [],
          valueLabel: `${relatedCount} reco`,
          statusLabel: portfolio.status === 'active' ? 'Connecte' : 'Disponible',
          statusTone: portfolio.status === 'active' ? 'ok' : 'idle',
          trendLabel: cfg.enabled ? `IA ${cfg.mode}` : 'IA inactive',
          trendTone: cfg.enabled && cfg.mode === 'autopilot' ? 'up' : 'neutral',
          aiEnabled: portfolio.status === 'active' && cfg.enabled,
          autonomousActive: portfolio.status === 'active' && cfg.enabled && cfg.mode === 'autopilot',
        };
      }),
    ];
    return [...financeRows, ...bettingRows, ...racingRows, ...lotoRows];
  }, [allPortfolios, bettingStrategies, racingStrategies, lotteryVirtualPortfolio, virtualAppsEnabled.loto, lotteryVirtualPnl, lotoIntegrationPortfolios, lotteryExecutionRequests, agentConfigs, defaultAgentConfig]);
  const homeImportantRecommendations = useMemo<HomeRecommendationRow[]>(() => {
    const financeItems = visibleDecisionInsights.slice(0, 3).map<HomeRecommendationRow>((insight) => ({
      id: `home-reco-finance-${insight.id}`,
      appKey: 'finance',
      badge: insight.portfolio_label ? `Finance · ${insight.portfolio_label}` : 'Finance',
      title: insight.title,
      detail: insight.detail,
      confidenceLevel: extractDiscreteConfidenceLevel(insight.value) ?? 2,
      insight,
    }));
    const bettingItems = filteredTopTipsterRecommendations.slice(0, 2).map<HomeRecommendationRow>((signal) => ({
      id: `home-reco-betting-${signal.id}`,
      appKey: 'betting',
      badge: 'Paris sportifs',
      title: signal.event,
      detail: `${signal.market} · Value +${signal.value_pct.toFixed(1)}%`,
      confidenceLevel: confidenceLevelFromScale(signal.profileConfidenceIndex, 100),
    }));
    const racingItems = racingPendingSignalsDisplay
      .slice(0, 2)
      .map<HomeRecommendationRow>((signal) => ({
        id: `home-reco-racing-${signal.id}`,
        appKey: 'racing',
        badge: 'Paris hippiques',
        title: signal.event,
        detail: `${signal.market} · Cote ${signal.odds.toFixed(2)}`,
        confidenceLevel: confidenceLevelFromScale(signal.confidence, 5),
      }));
    const lotoItems = (['loto', 'euromillions'] as LotteryGame[])
      .flatMap((game) => lotteryPredictionsDisplay[game].predictedGrids.slice(0, 1).map<HomeRecommendationRow>((grid, index) => ({
        id: `home-reco-loto-${game}-${grid.id}-${index}`,
        appKey: 'loto',
        badge: game === 'loto' ? 'Loto' : 'EuroMillions',
        title: `${game === 'loto' ? 'Grille prioritaire' : 'Grille prioritaire EuroMillions'}`,
        detail: `${grid.numbers.join(' - ')}${grid.stars.length > 0 ? ` · ${grid.stars.join(' - ')}` : ''}`,
        confidenceLevel: confidenceLevelFromScale(grid.confidenceIndex, 100),
        game,
      })));
    return [...financeItems, ...bettingItems, ...racingItems, ...lotoItems]
      .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
      .slice(0, 6);
  }, [visibleDecisionInsights, filteredTopTipsterRecommendations, racingPendingSignalsDisplay, lotteryPredictionsDisplay]);
  const homeRealPortfolioRows = useMemo(
    () => homePortfolioRows.filter((row) => row.kind === 'real'),
    [homePortfolioRows],
  );
  const homeVirtualPortfolioRows = useMemo(
    () => homePortfolioRows.filter((row) => row.kind === 'virtual'),
    [homePortfolioRows],
  );
  const homePendingAiCount = visibleDecisionInsights.length + filteredTopTipsterRecommendations.length + racingPendingSignalsDisplay.length;
  const homeTransactionsInFlight = activeBettingBets.length + racingStrategies.flatMap((strategy) => strategy.recentBets).filter((bet) => bet.result === 'pending').length + lotteryPendingTickets.length;
  const homeUpcomingTransactionsAll = useMemo<HomeTransactionRow[]>(() => {
    const nowTs = Date.now();
    const financeUpcoming = allPortfolios.flatMap((portfolio) => portfolio.operations
      .filter((operation) => {
        const ts = Date.parse(operation.date);
        return Number.isFinite(ts) && ts >= nowTs;
      })
      .map<HomeTransactionRow>((operation) => {
        const ts = Date.parse(operation.date);
        return {
          id: `home-up-finance-${portfolio.id}-${operation.id}`,
          appKey: 'finance',
          targetId: portfolio.id,
          lane: 'upcoming',
          title: `${operation.side === 'buy' ? 'Achat' : 'Vente'} ${operation.asset}`,
          portfolioLabel: portfolio.label,
          date: operation.date,
          timestamp: ts,
          amount: operation.amount,
          note: `${operation.amount.toFixed(2)} € · ${operation.intermediary}`,
          gainLoss: null,
          taxes: null,
          moodImpact: 0,
        };
      }));
    const bettingUpcoming = bettingStrategies.flatMap((strategy) => strategy.recentBets
      .filter((bet) => bet.result === 'pending')
      .map<HomeTransactionRow>((bet) => {
        const matchedSignal = tipsterSignals.find((signal) => signal.event === bet.event && signal.market === bet.market);
        const eventDate = matchedSignal?.deadline ?? bet.date;
        const ts = Date.parse(eventDate);
        return {
          id: `home-up-betting-${strategy.id}-${bet.id}`,
          appKey: 'betting',
          targetId: strategy.id,
          lane: 'upcoming',
          title: bet.event,
          portfolioLabel: strategy.name,
          date: eventDate,
          timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
          amount: bet.stake,
          note: `${bet.market} · Mise ${bet.stake.toFixed(2)} €`,
          gainLoss: null,
          taxes: null,
          moodImpact: 0,
        };
      }));
    const racingUpcoming = racingStrategies.flatMap((strategy) => strategy.recentBets
      .filter((bet) => bet.result === 'pending')
      .map<HomeTransactionRow>((bet) => {
        const matchedSignal = racingSignals.find((signal) => signal.event === bet.event && signal.market === bet.market);
        const eventDate = matchedSignal?.deadline ?? bet.date;
        const ts = Date.parse(eventDate);
        return {
          id: `home-up-racing-${strategy.id}-${bet.id}`,
          appKey: 'racing',
          targetId: strategy.id,
          lane: 'upcoming',
          title: bet.event,
          portfolioLabel: strategy.name,
          date: eventDate,
          timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
          amount: bet.stake,
          note: `${bet.market} · Mise ${bet.stake.toFixed(2)} €`,
          gainLoss: null,
          taxes: null,
          moodImpact: 0,
        };
      }));
    const lotoTicketUpcoming = lotteryPendingTickets.map<HomeTransactionRow>((ticket) => {
      const ts = Date.parse(ticket.drawDate);
      return {
        id: `home-up-loto-ticket-${ticket.id}`,
        appKey: 'loto',
        targetId: 'loto-virtual',
        lane: 'upcoming',
        title: `${LOTTERY_CONFIG[ticket.game].label} · ${ticket.gridLabel}`,
        portfolioLabel: 'Portefeuille fictif Loto',
        date: ticket.drawDate,
        timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
        amount: ticket.stake,
        note: `${ticket.subscriptionLabel ?? 'Ponctuel'} · Mise ${ticket.stake.toFixed(2)} €`,
        gainLoss: null,
        taxes: null,
        moodImpact: 0,
      };
    });
    const lotoExecutionUpcoming = lotteryExecutionRequests.map<HomeTransactionRow>((request) => {
      const ts = Date.parse(request.drawDate);
      return {
        id: `home-up-loto-request-${request.id}`,
        appKey: 'loto',
        targetId: request.targetPortfolioId,
        lane: 'upcoming',
        title: `${LOTTERY_CONFIG[request.game].label} · ${request.gridLabel}`,
        portfolioLabel: request.targetPortfolioLabel,
        date: request.drawDate,
        timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
        amount: null,
        note: `${request.executionMode === 'real' ? 'Execution reelle' : 'Simulation'} · ${request.subscriptionLabel ?? 'Ponctuel'}`,
        gainLoss: null,
        taxes: null,
        moodImpact: 0,
      };
    });
    const financeAiQueue = visibleDecisionInsights.map<HomeTransactionRow>((insight, index) => {
      const ts = nowTs + ((index + 1) * 5 * 60 * 1000);
      return {
        id: `home-up-finance-ai-${insight.id}`,
        appKey: 'finance',
        targetId: insight.portfolio_id ?? 'finance-virtual',
        lane: 'upcoming',
        title: insight.title,
        portfolioLabel: insight.portfolio_label ?? 'Portefeuille finance',
        date: new Date(ts).toISOString(),
        timestamp: ts,
        amount: null,
        note: insight.detail,
        gainLoss: null,
        taxes: null,
        moodImpact: 0,
      };
    });
    const bettingAiQueue = activeBettingVirtualStrategy && activeBettingVirtualStrategy.enabled && activeBettingVirtualStrategy.ai_enabled
      ? filteredTopTipsterRecommendations.map<HomeTransactionRow>((signal) => {
        const ts = Date.parse(signal.deadline);
        return {
          id: `home-up-betting-ai-${signal.id}`,
          appKey: 'betting',
          targetId: activeBettingVirtualStrategy.id,
          lane: 'upcoming',
          title: signal.event,
          portfolioLabel: activeBettingVirtualStrategy.name,
          date: signal.deadline,
          timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
          amount: null,
          note: `${signal.market} · IA ${activeBettingVirtualStrategy.mode}`,
          gainLoss: null,
          taxes: null,
          moodImpact: 0,
        };
      })
      : [];
    const racingAiQueue = activeRacingVirtualStrategy && activeRacingVirtualStrategy.enabled && activeRacingVirtualStrategy.ai_enabled
      ? racingPendingSignalsDisplay.map<HomeTransactionRow>((signal) => {
        const ts = Date.parse(signal.deadline);
        return {
          id: `home-up-racing-ai-${signal.id}`,
          appKey: 'racing',
          targetId: activeRacingVirtualStrategy.id,
          lane: 'upcoming',
          title: signal.event,
          portfolioLabel: activeRacingVirtualStrategy.name,
          date: signal.deadline,
          timestamp: Number.isFinite(ts) ? ts : nowTs + 9_999_999,
          amount: null,
          note: `${signal.market} · IA ${activeRacingVirtualStrategy.mode}`,
          gainLoss: null,
          taxes: null,
          moodImpact: 0,
        };
      })
      : [];
    return dedupeHomeTransactions([
      ...financeUpcoming,
      ...bettingUpcoming,
      ...racingUpcoming,
      ...lotoTicketUpcoming,
      ...lotoExecutionUpcoming,
      ...financeAiQueue,
      ...bettingAiQueue,
      ...racingAiQueue,
    ]).sort((a, b) => a.timestamp - b.timestamp);
  }, [allPortfolios, bettingStrategies, racingStrategies, lotteryPendingTickets, lotteryExecutionRequests, visibleDecisionInsights, activeBettingVirtualStrategy, filteredTopTipsterRecommendations, activeRacingVirtualStrategy, racingPendingSignalsDisplay, tipsterSignals, racingSignals]);
  const homeClosedTransactionsAll = useMemo<HomeTransactionRow[]>(() => {
    const financeClosed = allPortfolios.flatMap((portfolio) => portfolio.operations.map<HomeTransactionRow>((operation) => {
      const ts = Date.parse(operation.date);
      const taxes = (operation.tax_state ?? 0) + (operation.tax_intermediary ?? 0);
      return {
        id: `home-closed-finance-${portfolio.id}-${operation.id}`,
        appKey: 'finance',
        targetId: portfolio.id,
        lane: 'closed',
        title: `${operation.side === 'buy' ? 'Achat' : 'Vente'} ${operation.asset}`,
        portfolioLabel: portfolio.label,
        date: operation.date,
        timestamp: Number.isFinite(ts) ? ts : 0,
        amount: operation.amount,
        note: `${operation.intermediary}`,
        gainLoss: operation.side === 'sell' ? operation.amount : -operation.amount,
        taxes,
        moodImpact: 0,
      };
    }));
    const bettingClosed = bettingStrategies.flatMap((strategy) => strategy.recentBets
      .filter((bet) => bet.result !== 'pending')
      .map<HomeTransactionRow>((bet) => {
        const ts = Date.parse(bet.date);
        return {
          id: `home-closed-betting-${strategy.id}-${bet.id}`,
          appKey: 'betting',
          targetId: strategy.id,
          lane: 'closed',
          title: bet.event,
          portfolioLabel: strategy.name,
          date: bet.date,
          timestamp: Number.isFinite(ts) ? ts : 0,
          amount: bet.stake,
          note: `${bet.market} · ${bet.result}`,
          gainLoss: bet.profit,
          taxes: 0,
          moodImpact: bet.profit,
        };
      }));
    const racingClosed = racingStrategies.flatMap((strategy) => strategy.recentBets
      .filter((bet) => bet.result !== 'pending')
      .map<HomeTransactionRow>((bet) => {
        const ts = Date.parse(bet.date);
        return {
          id: `home-closed-racing-${strategy.id}-${bet.id}`,
          appKey: 'racing',
          targetId: strategy.id,
          lane: 'closed',
          title: bet.event,
          portfolioLabel: strategy.name,
          date: bet.date,
          timestamp: Number.isFinite(ts) ? ts : 0,
          amount: bet.stake,
          note: `${bet.market} · ${bet.result}`,
          gainLoss: bet.profit,
          taxes: 0,
          moodImpact: bet.profit,
        };
      }));
    const lotoClosed = lotterySettledTickets.map<HomeTransactionRow>((ticket) => {
      const resolvedAt = ticket.settledAt ?? ticket.drawDate;
      const ts = Date.parse(resolvedAt);
      return {
        id: `home-closed-loto-${ticket.id}`,
        appKey: 'loto',
        targetId: 'loto-virtual',
        lane: 'closed',
        title: `${LOTTERY_CONFIG[ticket.game].label} · ${ticket.gridLabel}`,
        portfolioLabel: 'Portefeuille fictif Loto',
        date: resolvedAt,
        timestamp: Number.isFinite(ts) ? ts : 0,
        amount: ticket.stake,
        note: ticket.rankLabel ?? (ticket.status === 'won' ? 'Gagnant' : 'Perdant'),
        gainLoss: ticket.profit,
        taxes: 0,
        moodImpact: ticket.profit,
      };
    });
    return [...financeClosed, ...bettingClosed, ...racingClosed, ...lotoClosed]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allPortfolios, bettingStrategies, racingStrategies, lotterySettledTickets]);
  const homeTransactionsRowLimit = useMemo(
    () => Math.max(1, Math.min(20, Number.parseInt(settingsForm.homeTransactionsLimit, 10) || 5)),
    [settingsForm.homeTransactionsLimit],
  );
  const homeClosedTransactions = useMemo(
    () => homeClosedTransactionsAll.slice(0, homeTransactionsRowLimit),
    [homeClosedTransactionsAll, homeTransactionsRowLimit],
  );
  const homeMood = useMemo(() => {
    const threshold = HOME_MOOD_THRESHOLDS[HOME_MOOD_PROFILE];
    const net = homeClosedTransactionsAll.reduce((sum, row) => sum + row.moodImpact, 0);
    if (net >= threshold) {
      return {
        tone: 'up' as const,
        title: 'Mood offensif',
        detail: `Gains recents ${formatSignedEuro(net, '+0.00 €')}`,
      };
    }
    if (net <= -threshold) {
      return {
        tone: 'down' as const,
        title: 'Mood defensif',
        detail: `Pertes recentes ${formatSignedEuro(net, '-0.00 €')}`,
      };
    }
    return {
      tone: 'neutral' as const,
      title: 'Mood stable',
      detail: `Equilibre recent ${formatSignedEuro(net, '0.00 €')}`,
    };
  }, [homeClosedTransactionsAll]);
  const homeUpcomingTransactions48h = useMemo(() => {
    const nowTs = Date.now();
    const horizonTs = nowTs + 48 * 60 * 60 * 1000;
    return homeUpcomingTransactionsAll
      .filter((row) => row.timestamp >= nowTs && row.timestamp <= horizonTs)
      .slice(0, homeTransactionsRowLimit);
  }, [homeUpcomingTransactionsAll, homeTransactionsRowLimit]);
  const homePortfolioActivity = useMemo(() => {
    const nowTs = Date.now();
    const rolling7dStart = nowTs - (7 * 24 * 60 * 60 * 1000);
    const rolling30dStart = nowTs - (30 * 24 * 60 * 60 * 1000);
    const rolling180dStart = nowTs - (180 * 24 * 60 * 60 * 1000);
    const rolling365dStart = nowTs - (365 * 24 * 60 * 60 * 1000);
    return homePortfolioRows.reduce<Record<string, {
      upcoming: HomeTransactionRow[];
      rollingBalance7d: number;
      rollingBalance1m: number;
      rollingBalance6m: number;
      rollingBalance1y: number;
      rollingTone7d: 'up' | 'down' | 'neutral';
      rollingTone1m: 'up' | 'down' | 'neutral';
      rollingTone6m: 'up' | 'down' | 'neutral';
      rollingTone1y: 'up' | 'down' | 'neutral';
    }>>((acc, row) => {
      const upcoming = homeUpcomingTransactionsAll
        .filter((item) => item.appKey === row.appKey && item.targetId === row.targetId)
        .slice(0, 2);
      const rollingBalance7d = homeClosedTransactionsAll
        .filter((item) => item.appKey === row.appKey && item.targetId === row.targetId && item.timestamp >= rolling7dStart)
        .reduce((sum, item) => sum + (item.gainLoss ?? 0), 0);
      const rollingBalance1m = homeClosedTransactionsAll
        .filter((item) => item.appKey === row.appKey && item.targetId === row.targetId && item.timestamp >= rolling30dStart)
        .reduce((sum, item) => sum + (item.gainLoss ?? 0), 0);
      const rollingBalance6m = homeClosedTransactionsAll
        .filter((item) => item.appKey === row.appKey && item.targetId === row.targetId && item.timestamp >= rolling180dStart)
        .reduce((sum, item) => sum + (item.gainLoss ?? 0), 0);
      const rollingBalance1y = homeClosedTransactionsAll
        .filter((item) => item.appKey === row.appKey && item.targetId === row.targetId && item.timestamp >= rolling365dStart)
        .reduce((sum, item) => sum + (item.gainLoss ?? 0), 0);
      acc[row.id] = {
        upcoming,
        rollingBalance7d,
        rollingBalance1m,
        rollingBalance6m,
        rollingBalance1y,
        rollingTone7d: numericChangeTone(rollingBalance7d),
        rollingTone1m: numericChangeTone(rollingBalance1m),
        rollingTone6m: numericChangeTone(rollingBalance6m),
        rollingTone1y: numericChangeTone(rollingBalance1y),
      };
      return acc;
    }, {});
  }, [homePortfolioRows, homeUpcomingTransactionsAll, homeClosedTransactionsAll]);
  const homeFinanceVirtualPortfolio = useMemo(
    () => allPortfolios.find((portfolio) => portfolio.type === 'virtual') ?? null,
    [allPortfolios],
  );
  const homeCumulativeRows = useMemo(() => {
    const bettingReal = bettingStrategies.filter((strategy) => !strategy.isVirtual);
    const racingReal = racingStrategies.filter((strategy) => !strategy.isVirtual);

    const realRows = [
      {
        key: 'finance-real',
        category: 'Finance réel',
        value: `${topbarRealValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        evolution: `Évolution 7j: ${evolution7d.value}`,
      },
      {
        key: 'betting-real',
        category: 'Sportif réel',
        value: `${bettingReal.reduce((sum, strategy) => sum + strategy.bankroll, 0).toFixed(2)} €`,
        evolution: `PnL clôturé: ${formatSignedEuro(bettingReal.flatMap((strategy) => strategy.recentBets).filter((bet) => bet.result !== 'pending').reduce((sum, bet) => sum + bet.profit, 0), '0.00 €')}`,
      },
      {
        key: 'racing-real',
        category: 'Hippique réel',
        value: `${racingReal.reduce((sum, strategy) => sum + strategy.bankroll, 0).toFixed(2)} €`,
        evolution: `PnL clôturé: ${formatSignedEuro(racingReal.flatMap((strategy) => strategy.recentBets).filter((bet) => bet.result !== 'pending').reduce((sum, bet) => sum + bet.profit, 0), '0.00 €')}`,
      },
      {
        key: 'loto-real',
        category: 'Loto réel',
        value: `${lotoIntegrationPortfolios.length} portefeuille(s)`,
        evolution: `${lotteryExecutionRequests.filter((request) => request.executionMode === 'real').length} confirmation(s)`,
      },
    ];

    const virtualRows = [
      {
        key: 'finance-virtual',
        category: 'Finance fictif',
        value: `${(homeFinanceVirtualPortfolio?.current_value ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        evolution: `Évolution 7j: ${homeFinanceVirtualPortfolio ? formatPortfolioEvolution(homeFinanceVirtualPortfolio.history, 7).value : 'n/d'}`,
      },
      {
        key: 'betting-virtual',
        category: 'Sportif fictif',
        value: `${(activeBettingVirtualStrategy?.bankroll ?? 0).toFixed(2)} €`,
        evolution: `Évolution 7j: ${activeBettingVirtualStrategy ? formatPortfolioEvolution(activeBettingVirtualStrategy.history, 7).value : 'n/d'}`,
      },
      {
        key: 'racing-virtual',
        category: 'Hippique fictif',
        value: `${(activeRacingVirtualStrategy?.bankroll ?? 0).toFixed(2)} €`,
        evolution: `Évolution 7j: ${activeRacingVirtualStrategy ? formatPortfolioEvolution(activeRacingVirtualStrategy.history, 7).value : 'n/d'}`,
      },
      {
        key: 'loto-virtual',
        category: 'Loto fictif',
        value: `${lotteryVirtualPortfolio.bankroll.toFixed(2)} €`,
        evolution: `PnL: ${formatSignedEuro(lotteryVirtualPnl, '0.00 €')}`,
      },
    ];

    return { realRows, virtualRows };
  }, [
    topbarRealValue,
    evolution7d.value,
    bettingStrategies,
    racingStrategies,
    lotoIntegrationPortfolios,
    lotteryExecutionRequests,
    homeFinanceVirtualPortfolio,
    activeBettingVirtualStrategy,
    activeRacingVirtualStrategy,
    lotteryVirtualPortfolio.bankroll,
    lotteryVirtualPnl,
  ]);
  const selectedLotteryRecommendationPortfolio = lotteryAssignablePortfolios.find((portfolio) => portfolio.id === selectedLotteryRecommendationPortfolioId) ?? lotteryAssignablePortfolios[0] ?? null;
  const financeVirtualLastOperation = useMemo(() => {
    const virtualPortfolio = allPortfolios.find((portfolio) => portfolio.type === 'virtual');
    if (!virtualPortfolio || virtualPortfolio.operations.length === 0) {
      return null;
    }
    return [...virtualPortfolio.operations]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;
  }, [allPortfolios]);
  const financeCryptoEvaluation = useMemo(() => {
    const virtualPortfolio = allPortfolios.find((portfolio) => portfolio.type === 'virtual');
    if (!virtualPortfolio) {
      return null;
    }
    const perfBySymbol = new Map(MARKET_SIGNALS.map((signal) => [signal.symbol.toUpperCase(), signal.performance_30d]));
    const relevantOps = virtualPortfolio.operations.filter((operation) => perfBySymbol.has(operation.asset.toUpperCase()));
    if (relevantOps.length === 0) {
      return null;
    }
    const estimatedNet = relevantOps.reduce((sum, operation) => {
      const perf = perfBySymbol.get(operation.asset.toUpperCase()) ?? 0;
      const sign = operation.side === 'buy' ? 1 : -1;
      return sum + (operation.amount * (perf / 100) * sign);
    }, 0);
    return {
      operationsCount: relevantOps.length,
      estimatedNet: Number(estimatedNet.toFixed(2)),
    };
  }, [allPortfolios]);
  const financeValueDistribution = useMemo(() => {
    const total = Math.max(1, realVisiblePortfolios.reduce((sum, portfolio) => sum + Math.max(0, portfolio.current_value || 0), 0));
    return realVisiblePortfolios
      .map((portfolio) => {
        const value = Math.max(0, portfolio.current_value || 0);
        return {
          id: portfolio.id,
          label: portfolio.label,
          value,
          weight: (value / total) * 100,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [realVisiblePortfolios]);
  const financeMomentumBars = useMemo(() => {
    const rows = visiblePortfolios.map((portfolio) => {
      const change7d = computePortfolioEvolutionPct(portfolio.history, 7);
      return {
        id: portfolio.id,
        label: portfolio.label,
        change7d,
      };
    });
    const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.change7d ?? 0)));
    return rows
      .map((row) => ({
        ...row,
        normalized: Math.max(6, Math.round((Math.abs(row.change7d ?? 0) / maxAbs) * 100)),
      }))
      .sort((a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0));
  }, [visiblePortfolios]);
  const financeOps7d = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      return {
        key,
        label: day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
        full: day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      };
    });
    const counts = new Map<string, number>();
    visiblePortfolios.forEach((portfolio) => {
      portfolio.operations.forEach((operation) => {
        const ts = Date.parse(operation.date);
        if (!Number.isFinite(ts)) {
          return;
        }
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    const rows = keys.map((day) => ({ ...day, count: counts.get(day.key) ?? 0 }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, normalized: Math.round((row.count / max) * 100) }));
  }, [visiblePortfolios]);
  const bettingBankrollDistribution = useMemo(() => {
    const enabledStrategies = bettingStrategies.filter((strategy) => strategy.enabled);
    const total = Math.max(1, enabledStrategies.reduce((sum, strategy) => sum + Math.max(0, strategy.bankroll), 0));
    return enabledStrategies
      .map((strategy) => ({
        id: strategy.id,
        label: strategy.name,
        bankroll: strategy.bankroll,
        roi: strategy.roi,
        weight: (Math.max(0, strategy.bankroll) / total) * 100,
      }))
      .sort((a, b) => b.bankroll - a.bankroll)
      .slice(0, 6);
  }, [bettingStrategies]);
  const bettingRoiMomentum = useMemo(() => {
    const rows = bettingStrategies.map((strategy) => ({
      id: strategy.id,
      label: strategy.name,
      change7d: computePortfolioEvolutionPct(strategy.history, 7),
    }));
    const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.change7d ?? 0)));
    return rows
      .map((row) => ({
        ...row,
        normalized: Math.max(6, Math.round((Math.abs(row.change7d ?? 0) / maxAbs) * 100)),
      }))
      .sort((a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0));
  }, [bettingStrategies]);
  const bettingActivity7d = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      return {
        key,
        label: day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
        full: day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      };
    });
    const counts = new Map<string, number>();
    bettingStrategies.forEach((strategy) => {
      strategy.recentBets.forEach((bet) => {
        const ts = Date.parse(bet.date);
        if (!Number.isFinite(ts)) {
          return;
        }
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    const rows = keys.map((day) => ({ ...day, count: counts.get(day.key) ?? 0 }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, normalized: Math.round((row.count / max) * 100) }));
  }, [bettingStrategies]);
  const financeRealPortfoliosForCockpit = useMemo(
    () => allPortfolios.filter((portfolio) => portfolio.type === 'integration' && (portfolio.status === 'active' || portfolio.current_value > 0 || portfolio.operations.length > 0)),
    [allPortfolios],
  );
  const financeVirtualPortfoliosForCockpit = useMemo(
    () => allPortfolios.filter((portfolio) => portfolio.type === 'virtual'),
    [allPortfolios],
  );
  const bettingRealStrategiesForCockpit = useMemo(
    () => bettingStrategies.filter((strategy) => !strategy.isVirtual && (strategy.enabled || strategy.recentBets.length > 0 || strategy.history.length > 1)),
    [bettingStrategies],
  );
  const bettingVirtualStrategiesForCockpit = useMemo(
    () => bettingStrategies.filter((strategy) => strategy.isVirtual),
    [bettingStrategies],
  );
  const bettingRecommendationTargets = useMemo(
    () => bettingStrategies.filter((strategy) => strategy.enabled || strategy.isVirtual),
    [bettingStrategies],
  );
  const financeUpcomingCockpitRows = useMemo<CockpitUpcomingRow[]>(() => {
    const nowTs = Date.now();
    const scheduledOperations = allPortfolios.flatMap((portfolio) => portfolio.operations
      .filter((operation) => {
        const ts = Date.parse(operation.date);
        return Number.isFinite(ts) && ts >= nowTs;
      })
      .map<CockpitUpcomingRow>((operation) => {
        const ts = Date.parse(operation.date);
        return {
          id: `finance-upcoming-${portfolio.id}-${operation.id}`,
          date: operation.date,
          timestamp: Number.isFinite(ts) ? ts : nowTs,
          title: `${operation.side === 'buy' ? 'Achat' : 'Vente'} ${operation.asset}`,
          portfolioLabel: portfolio.label,
          amountLabel: `${operation.amount.toFixed(2)} €`,
          detail: `${operation.intermediary} · ${operation.side === 'buy' ? 'ordre entrant' : 'ordre sortant'}`,
        };
      }));
    const aiQueue = visibleDecisionInsights.map<CockpitUpcomingRow>((insight, index) => {
      const ts = nowTs + ((index + 1) * 5 * 60 * 1000);
      const resolvedPortfolioId = resolveDecisionPortfolioId(insight.portfolio_id ?? null);
      const linkedPortfolio = resolvedPortfolioId
        ? allPortfolios.find((portfolio) => portfolio.id === resolvedPortfolioId)
        : null;
      const suggestedAmount = linkedPortfolio && linkedPortfolio.current_value > 0
        ? Math.max(10, Math.min(250, linkedPortfolio.current_value * 0.03))
        : 25;
      return {
        id: `finance-upcoming-ai-${insight.id}`,
        date: new Date(ts).toISOString(),
        timestamp: ts,
        title: insight.title,
        portfolioLabel: linkedPortfolio?.label ?? insight.portfolio_label ?? 'Portefeuille Finance',
        amountLabel: `${suggestedAmount.toFixed(2)} €`,
        detail: insight.detail,
      };
    });
    return [...scheduledOperations, ...aiQueue]
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 8);
  }, [allPortfolios, visibleDecisionInsights]);
  const financeRecentCockpitRows = useMemo<CockpitRecentRow[]>(() => {
    const nowTs = Date.now();
    return allPortfolios.flatMap((portfolio) => portfolio.operations
      .filter((operation) => {
        const ts = Date.parse(operation.date);
        return Number.isFinite(ts) && ts < nowTs;
      })
      .map<CockpitRecentRow>((operation) => {
        const fees = operation.tax_intermediary ?? 0;
        const taxesFr = operation.tax_state ?? 0;
        const pnlAmount = operation.side === 'sell' ? operation.amount - fees - taxesFr : -(operation.amount + fees + taxesFr);
        const pctBase = operation.amount > 0 ? Math.abs(operation.amount) : 0;
        const fallbackPct = portfolio.roi !== 0 ? portfolio.roi : computePortfolioEvolutionPct(portfolio.history, 30);
        const pnlPct = pctBase > 0 ? (pnlAmount / pctBase) * 100 : fallbackPct;
        const ts = Date.parse(operation.date);
        return {
          id: `finance-recent-${portfolio.id}-${operation.id}`,
          date: operation.date,
          timestamp: Number.isFinite(ts) ? ts : 0,
          title: `${operation.side === 'buy' ? 'Achat' : 'Vente'} ${operation.asset}`,
          portfolioLabel: portfolio.label,
          pnlAmount,
          pnlPct,
          fees,
          taxesFr,
          detail: `${operation.intermediary} · ${operation.side === 'buy' ? 'flux sortant' : 'flux encaissé'}`,
        };
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [allPortfolios]);
  const bettingUpcomingCockpitRows = useMemo<CockpitUpcomingRow[]>(() => activeBettingBets
    .map((bet) => {
      const matchedSignal = tipsterSignals.find((signal) => signal.event === bet.event && signal.market === bet.market);
      const eventDate = matchedSignal?.deadline ?? bet.date;
      const sport = matchedSignal?.sport ?? bet.sport;
      const bookmaker = matchedSignal?.bookmaker ?? bet.bookmaker;
      return {
        id: `betting-upcoming-${bet.id}`,
        date: eventDate,
        timestamp: Date.parse(eventDate),
        title: bet.event,
        portfolioLabel: bet.strategyName,
        amountLabel: `${bet.stake.toFixed(2)} €`,
        detail: `${bet.market} · ${bookmaker}`,
        isLive: isWithinTimedWindow(eventDate, getBettingEventLiveWindowMs(sport), liveClockTs),
        liveKind: 'betting' as const,
        liveLabel: `${bookmaker} en live`,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 8), [activeBettingBets, tipsterSignals, liveClockTs]);
  const bettingRecentCockpitRows = useMemo<CockpitRecentRow[]>(() => settledBettingBets
    .map((bet) => ({
      id: `betting-recent-${bet.id}`,
      date: bet.date,
      timestamp: Date.parse(bet.date),
      title: bet.event,
      portfolioLabel: bettingStrategies.find((strategy) => strategy.id === bet.strategyId)?.name ?? 'Portefeuille Paris',
      pnlAmount: bet.profit,
      pnlPct: bet.stake > 0 ? (bet.profit / bet.stake) * 100 : null,
      fees: 0,
      taxesFr: 0,
      detail: `${bet.market} · ${bet.bookmaker}`,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8), [settledBettingBets, bettingStrategies]);
  const racingActiveBets = useMemo(
    () => racingStrategies
      .flatMap((strategy) => strategy.recentBets
        .filter((bet) => bet.result === 'pending')
        .map((bet) => ({ ...bet, strategyName: strategy.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [racingStrategies],
  );
  const racingSettledBets = useMemo(
    () => racingStrategies
      .flatMap((strategy) => strategy.recentBets
        .filter((bet) => bet.result !== 'pending')
        .map((bet) => ({ ...bet, strategyName: strategy.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [racingStrategies],
  );
  const racingRealStrategiesForCockpit = useMemo(
    () => racingStrategies.filter((strategy) => !strategy.isVirtual && (strategy.enabled || strategy.recentBets.length > 0 || strategy.history.length > 1)),
    [racingStrategies],
  );
  const racingVirtualStrategiesForCockpit = useMemo(
    () => racingStrategies.filter((strategy) => strategy.isVirtual),
    [racingStrategies],
  );
  const racingUpcomingCockpitRows = useMemo<CockpitUpcomingRow[]>(() => racingActiveBets
    .map((bet) => {
      const matchedSignal = racingSignals.find((signal) => signal.event === bet.event && signal.market === bet.market);
      const eventDate = matchedSignal?.deadline ?? bet.date;
      const bookmaker = matchedSignal?.bookmaker ?? bet.bookmaker;
      return {
        id: `racing-upcoming-${bet.id}`,
        date: eventDate,
        timestamp: Date.parse(eventDate),
        title: bet.event,
        portfolioLabel: bet.strategyName,
        amountLabel: `${bet.stake.toFixed(2)} €`,
        detail: `${bet.market} · ${bookmaker}`,
        isLive: isWithinTimedWindow(eventDate, RACING_EVENT_LIVE_WINDOW_MS, liveClockTs),
        liveKind: 'racing' as const,
        liveLabel: `Chevaux en course · ${bookmaker}`,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 8), [racingActiveBets, racingSignals, liveClockTs]);
  const racingRecentCockpitRows = useMemo<CockpitRecentRow[]>(() => racingSettledBets
    .map((bet) => ({
      id: `racing-recent-${bet.id}`,
      date: bet.date,
      timestamp: Date.parse(bet.date),
      title: bet.event,
      portfolioLabel: bet.strategyName,
      pnlAmount: bet.profit,
      pnlPct: bet.stake > 0 ? (bet.profit / bet.stake) * 100 : null,
      fees: 0,
      taxesFr: 0,
      detail: `${bet.market} · ${bet.bookmaker}`,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8), [racingSettledBets]);
  const supervisedFinanceMessages = useMemo(() => {
    const supervisedPortfolios = allPortfolios.filter((portfolio) => {
      if (portfolio.status !== 'active') {
        return false;
      }
      const cfg = getAgentConfig(portfolio.id);
      return cfg.enabled && cfg.mode === 'supervised';
    });
    return supervisedPortfolios.map((portfolio) => {
      const pending = visibleDecisionInsights.filter((insight) => insight.portfolio_id === portfolio.id).length;
      const evolution = formatPortfolioEvolution(portfolio.history, 7);
      return {
        id: `supervised-finance-${portfolio.id}`,
        title: `${portfolio.label} en mode supervisé`,
        detail: pending > 0
          ? `${pending} recommandation(s) en attente de validation utilisateur.`
          : 'Aucune recommandation bloquante pour le moment, surveillance active.',
        trend: `7j ${evolution.value}`,
      };
    });
  }, [allPortfolios, visibleDecisionInsights, agentConfigs]);
  const supervisedBettingMessages = useMemo(() => {
    const supervisedStrategies = bettingStrategies.filter((strategy) => strategy.enabled && strategy.ai_enabled && strategy.mode === 'supervised');
    return supervisedStrategies.map((strategy) => {
      const pendingSignals = filteredTopTipsterRecommendations.length;
      return {
        id: `supervised-betting-${strategy.id}`,
        title: `${strategy.name} en mode supervisé`,
        detail: pendingSignals > 0
          ? `${pendingSignals} signal(s) IA visible(s) à valider avant exécution.`
          : 'Aucun signal prioritaire en attente, veille Tipster IA active.',
        trend: `ROI ${strategy.roi >= 0 ? '+' : ''}${strategy.roi.toFixed(1)}%`,
      };
    });
  }, [bettingStrategies, filteredTopTipsterRecommendations]);
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

  function resolveDecisionPortfolioId(requestedPortfolioId: string | null): string | null {
    const activePortfolios = allPortfolios.filter((portfolio) => portfolio.status === 'active');
    if (requestedPortfolioId) {
      const requested = allPortfolios.find((portfolio) => portfolio.id === requestedPortfolioId);
      if (requested?.status === 'active') {
        return requested.id;
      }
      if (requested?.type === 'virtual' && virtualAppsEnabled.finance === false) {
        return activePortfolios.find((portfolio) => portfolio.type === 'integration')?.id ?? activePortfolios[0]?.id ?? null;
      }
      if (requested) {
        return activePortfolios.find((portfolio) => portfolio.type === requested.type)?.id ?? activePortfolios[0]?.id ?? null;
      }
    }
    return activePortfolios.find((portfolio) => portfolio.type === 'integration')?.id
      ?? activePortfolios.find((portfolio) => portfolio.type === 'virtual')?.id
      ?? activePortfolios[0]?.id
      ?? null;
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
    return agentConfigs[portfolioId] ?? agentConfigs[GLOBAL_AGENT_CONFIG_KEY] ?? defaultAgentConfig;
  }

  function updateSettingsFormField(
    field:
      | 'firstName'
      | 'lastName'
      | 'phoneNumber'
      | 'address'
      | 'country'
      | 'homeTransactionsLimit'
      | 'objectiveNetGain'
      | 'objectivePeriod'
      | 'riskProfile'
      | 'realTradeMfaRequired'
      | 'maxLossType'
      | 'maxLossValue'
      | 'maxLossDays',
    value: string | boolean,
  ) {
    setSettingsForm((state) => {
      const nextState = {
        ...state,
        [field]: value,
      };
      if (field === 'firstName' || field === 'lastName') {
        nextState.fullName = `${field === 'firstName' ? String(value) : state.firstName} ${field === 'lastName' ? String(value) : state.lastName}`.trim();
      }
      return nextState;
    });
  }

  function getGlobalAiManagedOperations(periodDays: number) {
    const nowTs = Date.now();
    const startTs = nowTs - (Math.max(1, periodDays) * 24 * 60 * 60 * 1000);
    return allPortfolios.flatMap((portfolio) => portfolio.operations.filter((operation) => {
      const ts = Date.parse(operation.date);
      return Number.isFinite(ts)
        && ts >= startTs
        && String(operation.intermediary ?? '').toLowerCase().includes('robin ia');
    }));
  }

  function getGlobalPortfolioLossOnPeriod(periodDays: number) {
    if (aggregateAllHistory.length < 2) {
      return 0;
    }
    const nowPoint = aggregateAllHistory[aggregateAllHistory.length - 1] ?? null;
    if (!nowPoint) {
      return 0;
    }
    const nowTs = Date.parse(nowPoint.date);
    if (!Number.isFinite(nowTs)) {
      return 0;
    }
    const basePoint = [...aggregateAllHistory]
      .reverse()
      .find((point) => {
        const pointTs = Date.parse(point.date);
        return Number.isFinite(pointTs) && pointTs <= (nowTs - (periodDays * 24 * 60 * 60 * 1000));
      }) ?? aggregateAllHistory[0] ?? null;
    if (!basePoint) {
      return 0;
    }
    return Math.max(0, Number((basePoint.value - nowPoint.value).toFixed(2)));
  }

  function applyRiskProfileAgentPreset(profile: UserRiskProfile) {
    const preset = RISK_PROFILE_DEFAULT_QUOTAS[profile];
    void updateAgentConfig(GLOBAL_AGENT_CONFIG_KEY, {
      max_amount: preset.max_amount,
      max_transactions_per_day: preset.max_transactions_per_day,
      max_transactions_per_period: preset.max_transactions_per_period,
      period_days: preset.period_days,
      max_investment_amount: preset.max_investment_amount,
      max_loss_amount: preset.max_loss_amount,
    });
  }

  function toggleHomePortfolioAi(row: HomePortfolioRow, enabled: boolean) {
    if (row.appKey === 'finance') {
      const cfg = getAgentConfig(row.targetId);
      void updateAgentConfig(row.targetId, {
        enabled,
        mode: enabled ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual',
      });
      return;
    }
    if (row.appKey === 'betting') {
      const strategy = bettingStrategies.find((entry) => entry.id === row.targetId);
      updateBettingStrategy(row.targetId, {
        ai_enabled: enabled,
        enabled: enabled ? true : strategy?.enabled,
        mode: enabled && strategy?.mode === 'manual' ? 'supervised' : strategy?.mode,
      });
      return;
    }
    if (row.appKey === 'racing') {
      const strategy = racingStrategies.find((entry) => entry.id === row.targetId);
      updateRacingStrategy(row.targetId, {
        ai_enabled: enabled,
        enabled: enabled ? true : strategy?.enabled,
        mode: enabled && strategy?.mode === 'manual' ? 'supervised' : strategy?.mode,
      });
      return;
    }
    if (row.targetId === 'loto-virtual') {
      persistLotteryVirtualPortfolio({
        ...lotteryVirtualPortfolio,
        ai_enabled: enabled,
        mode: enabled && lotteryVirtualPortfolio.mode === 'manual' ? 'supervised' : enabled ? lotteryVirtualPortfolio.mode : 'manual',
      });
      return;
    }
    const cfg = getAgentConfig(row.targetId);
    void updateAgentConfig(row.targetId, {
      enabled,
      mode: enabled ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual',
    });
  }

  function pushLocalPortfolioOperation(portfolioId: string, operation: Portfolio['operations'][number]) {
    setLocalPortfolioOperations((prev) => {
      const current = prev[portfolioId] ?? [];
      if (current.some((entry) => entry.id === operation.id)) {
        return prev;
      }
      return {
        ...prev,
        [portfolioId]: [operation, ...current],
      };
    });
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

  function countTodayOperationsAll() {
    const now = new Date();
    return allPortfolios.reduce((sum, portfolio) => (
      sum + portfolio.operations.filter((op) => {
        const date = new Date(op.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
      }).length
    ), 0);
  }

  function getEffectiveDailyTransactionLimit(portfolioId: string) {
    const cfg = getAgentConfig(portfolioId);
    const adminCap = Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000));
    return Math.min(Math.max(1, cfg.max_transactions_per_day), adminCap);
  }

  function isDecisionAllowedByAgentPolicy(insight: InsightItem, portfolioId: string, additionalAmount = 0) {
    const cfg = getAgentConfig(portfolioId);
    const asset = inferDecisionAsset(insight);
    const domain = inferDecisionDomain(asset, insight);
    const recentAiOperations = getGlobalAiManagedOperations(cfg.period_days);
    const investedAmount = recentAiOperations.reduce((sum, operation) => sum + operation.amount, 0);
    const recentLossAmount = getGlobalPortfolioLossOnPeriod(cfg.period_days);
    if (cfg.domain_policy[domain] === 'reject') {
      return { allowed: false, reason: `Domaine ${domain} rejeté par votre quota agent.` };
    }
    const effectiveLimit = getEffectiveDailyTransactionLimit(portfolioId);
    if (countTodayOperationsAll() >= Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000))) {
      return { allowed: false, reason: `Limite globale quotidienne atteinte (${Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000))}).` };
    }
    if (countTodayOperations(portfolioId) >= effectiveLimit) {
      return { allowed: false, reason: `Quota quotidien atteint (${effectiveLimit} transaction(s)).` };
    }
    if (recentAiOperations.length >= cfg.max_transactions_per_period) {
      return { allowed: false, reason: `Quota agent atteint sur ${cfg.period_days} jour(s) (${cfg.max_transactions_per_period} transaction(s)).` };
    }
    if ((investedAmount + Math.max(0, additionalAmount)) >= cfg.max_investment_amount) {
      return { allowed: false, reason: `Plafond d investissement agent atteint sur ${cfg.period_days} jour(s) (${cfg.max_investment_amount.toFixed(0)} €).` };
    }
    if (recentLossAmount >= cfg.max_loss_amount) {
      return { allowed: false, reason: `Plafond de perte atteint sur ${cfg.period_days} jour(s) (${cfg.max_loss_amount.toFixed(0)} €).` };
    }
    return { allowed: true, reason: '' };
  }

  async function runDecisionAction(
    insight: InsightItem,
    approved: boolean,
    options: DecisionActionOptions = {},
  ) {
    if (!accessToken) {
      return;
    }
    if (emergencyStopActive) {
      if (!options.silent) {
        setError('Arrêt d urgence actif. Toutes les transactions sont bloquées. Désactivez le verrou dans Admin.');
      }
      return;
    }
    const requestedPortfolioId = options.targetPortfolioId ?? inferDecisionPortfolioId(insight);
    const portfolioId = resolveDecisionPortfolioId(requestedPortfolioId);
    if (!portfolioId) {
      setError('Aucun portefeuille actif disponible pour exécuter cette décision.');
      return;
    }

    setDecisionActionLoading(true);
    if (!options.silent) {
      setError(null);
    }
    try {
      const side = options.side ?? inferDecisionSide(insight);
      const linkedPortfolio = allPortfolios.find((portfolio) => portfolio.id === portfolioId);
      if (!linkedPortfolio || linkedPortfolio.status !== 'active') {
        throw new Error('Le portefeuille cible est inactif. Activez-le depuis Mon compte.');
      }
      let notional = linkedPortfolio && linkedPortfolio.current_value > 0
        ? Math.max(10, Math.min(250, linkedPortfolio.current_value * 0.03))
        : 25;
      const config = getAgentConfig(portfolioId);
      const requestedAmount = typeof options.amount === 'number' && Number.isFinite(options.amount)
        ? Math.max(MIN_MONETARY_LIMIT, options.amount)
        : notional;
      notional = Math.min(requestedAmount, config.max_amount);
      const policyCheck = isDecisionAllowedByAgentPolicy(insight, portfolioId, notional);
      if (!policyCheck.allowed) {
        throw new Error(policyCheck.reason);
      }

      const processedKey = decisionInsightKey(insight);

      if (linkedPortfolio.type === 'virtual') {
        if (virtualAppsEnabled.finance === false) {
          throw new Error('Le portefeuille virtuel Finance est désactivé dans Mon compte.');
        }

        if (approved) {
          const nowIso = new Date().toISOString();
          const simulatedMove = side === 'buy'
            ? ((Math.random() * 0.05) - 0.012)
            : ((Math.random() * 0.05) - 0.02);
          const delta = Number((notional * simulatedMove).toFixed(2));
          const asset = inferDecisionAsset(insight);
          const operation: Portfolio['operations'][number] = {
            id: `finance-virtual-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            date: nowIso,
            side,
            asset,
            amount: Number(notional.toFixed(2)),
            tax_state: null,
            tax_intermediary: null,
            intermediary: 'Robin IA (virtuel)',
          };
          setFinanceVirtualSimulation((prev) => {
            const fallbackHistory = linkedPortfolio.history.length > 0
              ? linkedPortfolio.history
              : [{ date: nowIso, value: linkedPortfolio.current_value > 0 ? linkedPortfolio.current_value : 100 }];
            const fallbackOps = linkedPortfolio.operations;
            const current = prev ?? {
              currentValue: linkedPortfolio.current_value > 0 ? linkedPortfolio.current_value : 100,
              history: fallbackHistory,
              operations: fallbackOps,
            };
            const nextValue = Math.max(20, Number((current.currentValue + delta).toFixed(2)));
            return {
              currentValue: nextValue,
              history: [...current.history, { date: nowIso, value: nextValue }].slice(-180),
              operations: [operation, ...current.operations],
            };
          });
          if (hasAdminRole(user)) {
            setAdminTransactionLog((prev) => [{
              id: `virtual-decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              user_id: user?.id ?? 'system',
              user_name: user?.full_name ?? 'Utilisateur',
              portfolio_id: portfolioId,
              asset: inferDecisionAsset(insight),
              side,
              amount: Number(notional.toFixed(2)),
              status: 'simulated',
              created_at: nowIso,
            }, ...prev].slice(0, 100));
          }
        }

        const nextResolvedVirtual: Record<string, true> = { ...resolvedDecisionKeys, [processedKey]: true };
        setResolvedDecisionKeys(nextResolvedVirtual);
        await persistDecisionResolutions(nextResolvedVirtual);
        if (approved) {
          setAppliedDecisions((state) => [
            {
              id: processedKey,
              title: insight.title,
              portfolio_label: linkedPortfolio.label,
              action: side,
              amount: Number(notional.toFixed(2)),
              applied_at: new Date().toISOString(),
            },
            ...state.filter((entry) => entry.id !== processedKey),
          ].slice(0, 12));
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
              ? 'Décision validée. Simulation exécutée sur le portefeuille virtuel (aucune transaction réelle).'
              : 'Décision refusée. Aucune simulation exécutée.'
          );
        }
        return;
      }

      if (settingsForm.realTradeMfaRequired && !user?.mfa_enabled) {
        throw new Error('Transactions réelles tierces bloquées: activez d abord le MFA dans Mon compte.');
      }

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
      const nextResolved: Record<string, true> = { ...resolvedDecisionKeys, [processedKey]: true };
      setResolvedDecisionKeys(nextResolved);
      await persistDecisionResolutions(nextResolved);
      if (approved && finalStatus === 'approved') {
        const localOperation: Portfolio['operations'][number] = {
          id: `local-order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: new Date().toISOString(),
          side,
          asset: inferDecisionAsset(insight),
          amount: Number(notional.toFixed(2)),
          tax_state: null,
          tax_intermediary: null,
          intermediary: options.source === 'autopilot' ? 'Robin IA (autopilot)' : 'Robin IA',
        };
        pushLocalPortfolioOperation(portfolioId, localOperation);
        setAppliedDecisions((state) => [
          {
            id: processedKey,
            title: insight.title,
            portfolio_label: linkedPortfolio?.label ?? insight.portfolio_label ?? 'Portefeuille connecté',
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

  function requestDecisionAction(insight: InsightItem, approved: boolean, options: DecisionActionOptions = {}) {
    if (assistantExecutionMode === 'recommendation' && options.source !== 'autopilot') {
      setPendingDecisionConfirmation({ insight, approved, options });
      return;
    }
    void runDecisionAction(insight, approved, options);
  }

  async function recycleAllVirtualPortfolios() {
    if (!accessToken || !user) {
      return;
    }
    if (!window.confirm('Recycler tous les portefeuilles fictifs ? Cette action remet les simulations à zéro.')) {
      return;
    }
    const nowIso = new Date().toISOString();
    const financeSeedValue = Math.max(
      20,
      Number.parseFloat(String(dashboard?.virtual_portfolio?.budget_initial ?? '100')) || 100,
    );
    const nextFinanceVirtualSimulation: FinanceVirtualSimulation = {
      currentValue: financeSeedValue,
      history: [{ date: nowIso, value: financeSeedValue }],
      operations: [],
    };
    const nextBettingStrategies = bettingStrategies.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      const template = MOCK_STRATEGIES.find((entry) => entry.id === strategy.id) ?? strategy;
      return {
        ...strategy,
        bankroll: template.bankroll,
        roi: 0,
        winRate: 0,
        variance: 0,
        enabled: false,
        betsTotal: 0,
        betsWon: 0,
        ai_enabled: template.ai_enabled,
        mode: template.mode,
        max_stake: template.max_stake,
        max_bets_per_day: template.max_bets_per_day,
        risk_profile: template.risk_profile,
        history: [{ date: nowIso, value: template.bankroll }],
        recentBets: [],
      };
    });
    const nextRacingStrategies = racingStrategies.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      const template = MOCK_RACING_STRATEGIES.find((entry) => entry.id === strategy.id) ?? strategy;
      return {
        ...strategy,
        bankroll: template.bankroll,
        roi: 0,
        winRate: 0,
        variance: 0,
        enabled: false,
        betsTotal: 0,
        betsWon: 0,
        ai_enabled: template.ai_enabled,
        mode: template.mode,
        max_stake: template.max_stake,
        max_bets_per_day: template.max_bets_per_day,
        risk_profile: template.risk_profile,
        history: [{ date: nowIso, value: template.bankroll }],
        recentBets: [],
      };
    });
    const nextLotteryVirtualPortfolio: LotteryVirtualPortfolio = {
      ...lotteryVirtualPortfolio,
      bankroll: Math.max(0, lotteryVirtualPortfolio.initial_balance),
      tickets: [],
    };
    const nextLotteryExecutionRequests: LotteryExecutionRequest[] = [];

    setFinanceVirtualSimulation(nextFinanceVirtualSimulation);
    setBettingStrategies(nextBettingStrategies);
    setRacingStrategies(nextRacingStrategies);
    setLotteryVirtualPortfolio(nextLotteryVirtualPortfolio);
    setLotteryExecutionRequests(nextLotteryExecutionRequests);

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
          personal_settings: {
            ...buildPersonalSettingsPayload({}, portfolioVisibility, resolvedDecisionKeys, virtualAppsEnabled, nextBettingStrategies, nextRacingStrategies),
            finance_virtual_runtime: nextFinanceVirtualSimulation,
            lottery_virtual_portfolio: nextLotteryVirtualPortfolio,
            lottery_execution_requests: nextLotteryExecutionRequests,
          },
        }),
      });
      const payload = await readJsonResponse<UserProfile>(response);
      if (!response.ok || !payload) {
        throw new Error(extractErrorMessage(payload, 'Recyclage des portefeuilles fictifs impossible'));
      }
      setUser(payload);
      setError('Portefeuilles fictifs recyclés: Finance, Paris sportifs, Hippiques et Loto remis à zéro.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recyclage des portefeuilles fictifs impossible');
    } finally {
      setSubmitting(false);
    }
  }

  function openDecisionWizard(insight: InsightItem) {
    setSelectedInsight(insight);
    setAssistantWizardDecisionId(decisionInsightKey(insight));
  }

  useEffect(() => {
    if (!accessToken || decisionActionLoading || autopilotRunning || emergencyStopActive) {
      return;
    }
    const financeVirtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    const autopilotDecisions = decisionInsights.filter((insight) => {
      const portfolioId = inferDecisionPortfolioId(insight);
      if (!portfolioId) {
        return false;
      }
      if (financeVirtualPortfolioId && portfolioId === financeVirtualPortfolioId) {
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
  }, [accessToken, decisionActionLoading, autopilotRunning, emergencyStopActive, decisionInsights, agentConfigs, dashboard?.virtual_portfolio?.portfolio_id]);

  useEffect(() => {
    if (!accessToken || decisionActionLoading || emergencyStopActive) {
      return;
    }
    const virtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    if (!virtualPortfolioId || virtualAppsEnabled.finance === false || portfolioActivation[virtualPortfolioId] === false) {
      return;
    }

    const cfg = getAgentConfig(virtualPortfolioId);
    if (!cfg.enabled || cfg.mode !== 'autopilot') {
      return;
    }

    const queuedVirtualDecisions = decisionInsights.filter((insight) => {
      const pid = inferDecisionPortfolioId(insight);
      if (pid !== virtualPortfolioId) {
        return false;
      }
      const key = decisionInsightKey(insight);
      if (resolvedDecisionKeys[key]) {
        return false;
      }
      return isDecisionAllowedByAgentPolicy(insight, virtualPortfolioId).allowed;
    });

    if (queuedVirtualDecisions.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runDecisionAction(queuedVirtualDecisions[0], true, {
        targetPortfolioId: virtualPortfolioId,
        silent: true,
        source: 'autopilot',
      });
    }, 1100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    accessToken,
    decisionActionLoading,
    emergencyStopActive,
    dashboard?.virtual_portfolio?.portfolio_id,
    decisionInsights,
    resolvedDecisionKeys,
    agentConfigs,
    virtualAppsEnabled.finance,
    portfolioActivation,
  ]);

  function acknowledgeAppliedDecision(decisionId: string) {
    setAppliedDecisions((state) => state.filter((entry) => entry.id !== decisionId));
  }

  function updateBettingStrategy(strategyId: string, patch: Partial<BettingStrategy>) {
    let nextStrategies: BettingStrategy[] = bettingStrategies;
    setBettingStrategies((prev) => {
      nextStrategies = prev.map((strategy) => strategy.id === strategyId ? { ...strategy, ...patch } : strategy);
      return nextStrategies;
    });
    setSelectedStrategy((prev) => prev && prev.id === strategyId ? { ...prev, ...patch } : prev);

    if (!accessToken) {
      return;
    }

    void fetch(apiUrl('/auth/me/settings'), {
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
        personal_settings: buildPersonalSettingsPayload({}, portfolioVisibility, resolvedDecisionKeys, virtualAppsEnabled, nextStrategies),
      }),
    }).catch(() => {
      // Keep local state even if persistence fails.
    });
  }

  function updateRacingStrategy(strategyId: string, patch: Partial<BettingStrategy>) {
    let nextStrategies: BettingStrategy[] = racingStrategies;
    setRacingStrategies((prev) => {
      nextStrategies = prev.map((strategy) => strategy.id === strategyId ? { ...strategy, ...patch } : strategy);
      return nextStrategies;
    });
    setSelectedRacingStrategy((prev) => prev && prev.id === strategyId ? { ...prev, ...patch } : prev);

    if (!accessToken) {
      return;
    }

    void fetch(apiUrl('/auth/me/settings'), {
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
        personal_settings: buildPersonalSettingsPayload({}, portfolioVisibility, resolvedDecisionKeys, virtualAppsEnabled, bettingStrategies, nextStrategies),
      }),
    }).catch(() => {
      // Keep local state even if persistence fails.
    });
  }

  function alignRacingPilotModeWithBetting() {
    const bettingVirtual = bettingStrategies.find((strategy) => strategy.isVirtual);
    const racingVirtual = racingStrategies.find((strategy) => strategy.isVirtual);
    if (!bettingVirtual || !racingVirtual) {
      setBettingAlert('Alignement impossible: portefeuille virtuel manquant.');
      return;
    }
    if (bettingVirtual.mode === 'autonomous' && emergencyStopActive) {
      setBettingAlert('Kill switch actif: alignement en mode autonome indisponible.');
      return;
    }

    const nextMode = bettingVirtual.mode;
    const aiEnabled = virtualAppsEnabled.racing ? true : (nextMode !== 'manual' ? true : bettingVirtual.ai_enabled);
    const enabled = nextMode === 'autonomous' ? true : (virtualAppsEnabled.racing ? true : racingVirtual.enabled);

    setRacingStrategies((prev) => prev.map((strategy) => strategy.id === racingVirtual.id
      ? { ...strategy, mode: nextMode, ai_enabled: aiEnabled, enabled }
      : strategy));
    setSelectedRacingStrategy((prev) => prev && prev.id === racingVirtual.id
      ? { ...prev, mode: nextMode, ai_enabled: aiEnabled, enabled }
      : prev);

    setBettingAlert(`Pilotage hippique aligné sur Paris sportifs (${nextMode === 'autonomous' ? 'Autopilot' : nextMode === 'supervised' ? 'Supervisé' : 'Manuel'}).`);
  }

  function persistLotteryVirtualPortfolio(nextPortfolio: LotteryVirtualPortfolio, nextRequests: LotteryExecutionRequest[] = lotteryExecutionRequests) {
    setLotteryVirtualPortfolio(nextPortfolio);
    setLotteryExecutionRequests(nextRequests);
    if (!accessToken) {
      return;
    }
    void fetch(apiUrl('/auth/me/settings'), {
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
          lottery_virtual_portfolio: nextPortfolio,
          lottery_execution_requests: nextRequests,
        },
      }),
    }).catch(() => {
      // Keep local runtime even if persistence fails.
    });
  }

  function confirmLotteryRecommendation(
    game: LotteryGame,
    grid: LotteryPrediction,
    targetPortfolioId: string,
    weeks = 1,
  ) {
    const target = lotteryAssignablePortfolios.find((portfolio) => portfolio.id === targetPortfolioId);
    if (!target) {
      setBettingAlert('Sélectionnez un portefeuille Loto avant de confirmer la recommandation IA.');
      return;
    }

    const normalizedWeeks = Math.max(1, Math.min(8, Math.round(weeks)));
    const scheduledDraws = buildLotteryUpcomingDrawSeries(game, normalizedWeeks)
      .filter((draw) => Date.parse(draw.drawDate) > Date.now());
    if (scheduledDraws.length === 0) {
      setBettingAlert(`Aucun tirage ${LOTTERY_CONFIG[game].label} disponible pour confirmer cette recommandation.`);
      return;
    }

    const subscriptionLabel = normalizedWeeks > 1
      ? `Abonnement ${LOTTERY_CONFIG[game].label} · ${normalizedWeeks} semaines`
      : null;

    if (target.executionMode === 'simulation') {
      if (!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.enabled) {
        setBettingAlert('Activez le portefeuille fictif Loto pour confirmer cette recommandation en simulation.');
        return;
      }
      const totalStake = Number((scheduledDraws.length * LOTTERY_SIMPLE_GRID_COST[game]).toFixed(2));
      if (lotteryVirtualPortfolio.bankroll < totalStake) {
        setBettingAlert(`Solde insuffisant (${lotteryVirtualPortfolio.bankroll.toFixed(2)} €) pour confirmer cette recommandation.`);
        return;
      }
      const createdAt = new Date().toISOString();
      const nextTickets: LotteryVirtualTicket[] = scheduledDraws.map((draw, index) => ({
        id: `lottery-confirmed-${game}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        game,
        drawDate: draw.drawDate,
        gridLabel: normalizedWeeks > 1 ? `S${index + 1} · Reco IA` : 'Reco IA confirmée',
        subscriptionLabel,
        numbers: grid.numbers,
        stars: grid.stars,
        stake: LOTTERY_SIMPLE_GRID_COST[game],
        status: 'pending',
        payout: 0,
        profit: 0,
        matchedNumbers: 0,
        matchedStars: 0,
        rankLabel: null,
        createdAt,
        settledAt: null,
      }));
      const nextRequests: LotteryExecutionRequest[] = [
        ...scheduledDraws.map<LotteryExecutionRequest>((draw, index) => ({
          id: `lottery-request-sim-${game}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          game,
          drawDate: draw.drawDate,
          gridLabel: normalizedWeeks > 1 ? `S${index + 1} · Reco IA` : 'Reco IA confirmée',
          subscriptionLabel,
          numbers: grid.numbers,
          stars: grid.stars,
          targetPortfolioId: target.id,
          targetPortfolioLabel: target.label,
          executionMode: 'simulation',
          status: 'confirmed',
          createdAt,
        })),
        ...lotteryExecutionRequests,
      ].slice(0, 240);
      persistLotteryVirtualPortfolio({
        ...lotteryVirtualPortfolio,
        bankroll: Number((lotteryVirtualPortfolio.bankroll - totalStake).toFixed(2)),
        tickets: [...nextTickets, ...lotteryVirtualPortfolio.tickets].slice(0, 400),
      }, nextRequests);
      setBettingAlert(`Recommandation IA confirmée sur ${target.label} en mode simulation${subscriptionLabel ? ` · ${subscriptionLabel}` : ''}.`);
      return;
    }

    const createdAt = new Date().toISOString();
    const nextRequests: LotteryExecutionRequest[] = [
      ...scheduledDraws.map<LotteryExecutionRequest>((draw, index) => ({
        id: `lottery-request-real-${game}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        game,
        drawDate: draw.drawDate,
        gridLabel: normalizedWeeks > 1 ? `S${index + 1} · Reco IA` : 'Reco IA confirmée',
        subscriptionLabel,
        numbers: grid.numbers,
        stars: grid.stars,
        targetPortfolioId: target.id,
        targetPortfolioLabel: target.label,
        executionMode: 'real',
        status: 'confirmed',
        createdAt,
      })),
      ...lotteryExecutionRequests,
    ].slice(0, 240);
    persistLotteryVirtualPortfolio(lotteryVirtualPortfolio, nextRequests);
    setBettingAlert(`Recommandation IA confirmée sur ${target.label} en mode réel${subscriptionLabel ? ` · ${subscriptionLabel}` : ''}.`);
  }

  function playLotteryVirtualTickets(game: LotteryGame, options: { source?: 'manual' | 'autonomous'; silent?: boolean } = {}) {
    const source = options.source ?? 'manual';
    if (!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.enabled) {
      if (!options.silent) {
        setBettingAlert('Activez le portefeuille fictif Loto pour jouer des grilles simulées.');
      }
      return;
    }
    if (source === 'autonomous' && (!lotteryVirtualPortfolio.ai_enabled || lotteryVirtualPortfolio.mode !== 'autonomous')) {
      return;
    }
    if (emergencyStopActive) {
      if (!options.silent) {
        setBettingAlert('Kill switch actif — simulation Loto suspendue.');
      }
      return;
    }

    const nextDraw = lotteryUpcoming
      .filter((draw) => draw.game === game && Date.parse(draw.drawDate) > Date.now())
      .sort((a, b) => Date.parse(a.drawDate) - Date.parse(b.drawDate))[0] ?? null;
    if (!nextDraw) {
      if (!options.silent) {
        setBettingAlert(`Aucun tirage ${LOTTERY_CONFIG[game].label} à venir.`);
      }
      return;
    }

    const hasPendingForDraw = lotteryVirtualPortfolio.tickets.some((ticket) =>
      ticket.game === game && ticket.drawDate === nextDraw.drawDate && ticket.status === 'pending');
    if (hasPendingForDraw && source === 'autonomous') {
      return;
    }

    const predictionGrids = lotteryPredictions[game].predictedGrids;
    const ticketsCount = Math.max(1, Math.min(predictionGrids.length, normalizedLotteryGridCount, lotteryVirtualPortfolio.max_grids_per_draw));
    const selectedGrids = predictionGrids.slice(0, ticketsCount);
    if (selectedGrids.length === 0) {
      if (!options.silent) {
        setBettingAlert(`Aucune grille disponible pour ${LOTTERY_CONFIG[game].label}.`);
      }
      return;
    }

    const stake = LOTTERY_SIMPLE_GRID_COST[game];
    const totalStake = Number((stake * selectedGrids.length).toFixed(2));
    if (lotteryVirtualPortfolio.bankroll < totalStake) {
      if (!options.silent) {
        setBettingAlert(`Solde insuffisant (${lotteryVirtualPortfolio.bankroll.toFixed(2)} €) pour jouer ${selectedGrids.length} grille(s).`);
      }
      return;
    }

    const createdAt = new Date().toISOString();
    const nextTickets: LotteryVirtualTicket[] = selectedGrids.map((grid, index) => ({
      id: `lv-${game}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      game,
      drawDate: nextDraw.drawDate,
      gridLabel: `Grille #${index + 1}`,
      subscriptionLabel: null,
      numbers: grid.numbers,
      stars: grid.stars,
      stake,
      status: 'pending',
      payout: 0,
      profit: 0,
      matchedNumbers: 0,
      matchedStars: 0,
      rankLabel: null,
      createdAt,
      settledAt: null,
    }));

    const nextPortfolio: LotteryVirtualPortfolio = {
      ...lotteryVirtualPortfolio,
      bankroll: Number((lotteryVirtualPortfolio.bankroll - totalStake).toFixed(2)),
      tickets: [...nextTickets, ...lotteryVirtualPortfolio.tickets].slice(0, 240),
    };
    persistLotteryVirtualPortfolio(nextPortfolio);
    if (!options.silent) {
      setBettingAlert(`${LOTTERY_CONFIG[game].label}: ${selectedGrids.length} grille(s) fictive(s) jouées pour ${totalStake.toFixed(2)} €.`);
    }
  }

  function subscribeLotteryVirtualTickets(games: LotteryGame[], weeks: number) {
    if (!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.enabled) {
      setBettingAlert('Activez le portefeuille fictif Loto pour programmer un abonnement simulé.');
      return;
    }
    if (emergencyStopActive) {
      setBettingAlert('Kill switch actif — abonnement Loto suspendu.');
      return;
    }

    const normalizedWeeks = Math.max(1, Math.min(8, Math.round(weeks)));
    const uniqueGames = [...new Set(games)];
    const createdAt = new Date().toISOString();
    const scheduledTickets: LotteryVirtualTicket[] = [];

    uniqueGames.forEach((game) => {
      const scheduledDraws = buildLotteryUpcomingDrawSeries(game, normalizedWeeks)
        .filter((draw) => Date.parse(draw.drawDate) > Date.now());
      const predictionGrids = lotteryPredictions[game].predictedGrids;
      const ticketsCount = Math.max(1, Math.min(predictionGrids.length, normalizedLotteryGridCount, lotteryVirtualPortfolio.max_grids_per_draw));
      const selectedGrids = predictionGrids.slice(0, ticketsCount);
      const stake = LOTTERY_SIMPLE_GRID_COST[game];
      const drawsPerWeek = Math.max(1, LOTTERY_UPCOMING_DRAWS.filter((draw) => draw.game === game).length);

      scheduledDraws.forEach((draw, drawIndex) => {
        const weekIndex = Math.floor(drawIndex / drawsPerWeek) + 1;
        const subscriptionLabel = `Abonnement ${LOTTERY_CONFIG[game].label} · ${normalizedWeeks} semaine${normalizedWeeks > 1 ? 's' : ''}`;
        selectedGrids.forEach((grid, gridIndex) => {
          scheduledTickets.push({
            id: `lvs-${game}-${drawIndex}-${gridIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            game,
            drawDate: draw.drawDate,
            gridLabel: `S${weekIndex} · Tirage ${drawIndex + 1} · Grille #${gridIndex + 1}`,
            subscriptionLabel,
            numbers: grid.numbers,
            stars: grid.stars,
            stake,
            status: 'pending',
            payout: 0,
            profit: 0,
            matchedNumbers: 0,
            matchedStars: 0,
            rankLabel: null,
            createdAt,
            settledAt: null,
          });
        });
      });
    });

    if (scheduledTickets.length === 0) {
      setBettingAlert('Aucun tirage futur disponible pour programmer cet abonnement.');
      return;
    }

    const totalStake = Number(scheduledTickets.reduce((sum, ticket) => sum + ticket.stake, 0).toFixed(2));
    if (lotteryVirtualPortfolio.bankroll < totalStake) {
      setBettingAlert(`Solde insuffisant (${lotteryVirtualPortfolio.bankroll.toFixed(2)} €) pour programmer ${normalizedWeeks} semaine(s) d abonnement.`);
      return;
    }

    persistLotteryVirtualPortfolio({
      ...lotteryVirtualPortfolio,
      bankroll: Number((lotteryVirtualPortfolio.bankroll - totalStake).toFixed(2)),
      tickets: [...scheduledTickets, ...lotteryVirtualPortfolio.tickets].slice(0, 400),
    });

    setBettingAlert(`Abonnement simulé activé: ${uniqueGames.map((game) => LOTTERY_CONFIG[game].label).join(' + ')} pendant ${normalizedWeeks} semaine(s) pour ${totalStake.toFixed(2)} €.`);
  }

  function resetLotteryVirtualPortfolio() {
    persistLotteryVirtualPortfolio({
      ...lotteryVirtualPortfolio,
      bankroll: lotteryVirtualPortfolio.initial_balance,
      tickets: [],
      mode: 'manual',
      ai_enabled: false,
    });
    setBettingAlert(`Portefeuille fictif Loto réinitialisé à ${lotteryVirtualPortfolio.initial_balance.toFixed(2)} €.`);
  }

  function simulateFinanceVirtualCycle() {
    if (emergencyStopActive) {
      return;
    }
    if (!virtualAppsEnabled.finance) {
      return;
    }
    const virtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    if (!virtualPortfolioId || portfolioActivation[virtualPortfolioId] === false) {
      return;
    }
    const cfg = getAgentConfig(virtualPortfolioId);
    if (!cfg.enabled || cfg.mode !== 'autopilot') {
      return;
    }

    setFinanceVirtualSimulation((prev) => {
      if (!prev) {
        return prev;
      }
      const now = new Date();
      const todayCount = prev.operations.filter((op) => {
        const d = new Date(op.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      }).length;
      const effectiveLimit = getEffectiveDailyTransactionLimit(virtualPortfolioId);
      if (countTodayOperationsAll() >= Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000))) {
        return prev;
      }
      if (todayCount >= effectiveLimit) {
        return prev;
      }
      const side: 'buy' | 'sell' = Math.random() > 0.45 ? 'buy' : 'sell';
      const baseAmount = Math.max(MIN_MONETARY_LIMIT, Math.min(cfg.max_amount, prev.currentValue * 0.08));
      const amount = Number((baseAmount * (0.7 + Math.random() * 0.7)).toFixed(2));
      const marketMove = (Math.random() * 0.07) - 0.03;
      const directional = side === 'buy' ? 1 : -1;
      const grossPnl = amount * marketMove * directional;
      const intermediaryFee = Number((amount * 0.0015).toFixed(2));
      const delta = Number((grossPnl - intermediaryFee).toFixed(2));
      const nextValue = Math.max(20, Number((prev.currentValue + delta).toFixed(2)));
      const assets = ['CW8', 'SP500', 'BTC', 'ETH', 'AIR'];
      const asset = assets[Math.floor(Math.random() * assets.length)] ?? 'CW8';
      const operation: Portfolio['operations'][number] = {
        id: `finance-virtual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: now.toISOString(),
        side,
        asset,
        amount,
        tax_state: null,
        tax_intermediary: intermediaryFee,
        intermediary: 'Robin IA (virtuel autonome)',
      };

      if (hasAdminRole(user)) {
        setAdminTransactionLog((prev) => [{
          id: operation.id,
          user_id: user?.id ?? 'system',
          user_name: 'Robin IA (virtuel finance)',
          portfolio_id: virtualPortfolioId,
          asset,
          side,
          amount,
          status: 'simulated',
          created_at: now.toISOString(),
        }, ...prev].slice(0, 100));
      }

      return {
        currentValue: nextValue,
        history: [...prev.history, { date: now.toISOString(), value: nextValue }].slice(-180),
        operations: [operation, ...prev.operations],
      };
    });
  }

  function simulateVirtualBetCycle(sourceSignal?: TipsterSignal, options: { silent?: boolean } = {}) {
    const virtual = bettingStrategies.find((s) => s.isVirtual);
    if (!virtual) return;
    if (!virtual.enabled && !sourceSignal) {
      return;
    }
    const activeRiskProfile = (virtual.risk_profile ?? virtualRiskProfile) as VirtualRiskProfile;
    const profile = VIRTUAL_RISK_PRESETS[activeRiskProfile];

    const todayOps = virtual.recentBets.filter((bet) => {
      const date = new Date(bet.date);
      const now = new Date();
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    }).length;
    if (!sourceSignal && todayOps >= virtual.max_bets_per_day) {
      setBettingAlert(`Quota atteint sur le portefeuille tipster virtuel (${virtual.max_bets_per_day}/jour).`);
      return;
    }

    const maxStakeAllowed = Math.max(
      MIN_MONETARY_LIMIT,
      Math.min(Math.max(MIN_MONETARY_LIMIT, virtual.max_stake), Math.max(MIN_MONETARY_LIMIT, virtual.bankroll)),
    );
    const stake = Number((MIN_MONETARY_LIMIT + Math.random() * (maxStakeAllowed - MIN_MONETARY_LIMIT)).toFixed(2));
    if (sourceSignal) {
      const pendingBet: BetRecord = {
        id: `vb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        sport: sourceSignal.sport,
        event: sourceSignal.event,
        market: sourceSignal.market,
        bookmaker: sourceSignal.bookmaker,
        odds: sourceSignal.odds,
        stake,
        result: 'pending',
        profit: 0,
        strategyId: virtual.id,
      };
      const nextBetsTotal = virtual.betsTotal + 1;
      updateBettingStrategy(virtual.id, {
        betsTotal: nextBetsTotal,
        recentBets: [pendingBet, ...virtual.recentBets].slice(0, 120),
        risk_profile: activeRiskProfile,
      });
      if (!options.silent) {
        setBettingAlert(`🤖 IA: transaction simulée en attente de résultat réel (${sourceSignal.event}).`);
      }
      return;
    }
    const win = Math.random() > (activeRiskProfile === 'high' ? 0.54 : activeRiskProfile === 'medium' ? 0.48 : 0.36);
    const pct = win
      ? (profile.minGainPct + Math.random() * (profile.maxGainPct - profile.minGainPct))
      : -(activeRiskProfile === 'low' ? 0 : Math.random() * (profile.maxDrawdownPct / 100));
    const profit = Number((stake * pct).toFixed(2));
    const nextBankrollRaw = virtual.bankroll + profit;
    const floor = activeRiskProfile === 'low' ? 100 : activeRiskProfile === 'medium' ? 70 : 30;
    const nextBankroll = Math.max(floor, Number(nextBankrollRaw.toFixed(2)));
    const nextHistory = [...virtual.history, { date: new Date().toISOString().slice(0, 10), value: nextBankroll }].slice(-80);
    const nextBetsTotal = virtual.betsTotal + 1;
    const nextBetsWon = virtual.betsWon + (win ? 1 : 0);
    const nextRoi = Number((((nextBankroll - 100) / 100) * 100).toFixed(1));
    const nextWinRate = nextBetsTotal > 0 ? Number(((nextBetsWon / nextBetsTotal) * 100).toFixed(0)) : 0;
    const iaAction = 'Simulation IA';
    const bet: BetRecord = {
      id: `vb-${Date.now()}`,
      date: new Date().toISOString(),
      sport: 'other',
      event: 'Simulation Tipster Virtuelle',
      market: `${iaAction} · ${profile.label}`,
      bookmaker: 'Simulateur Robin',
      odds: win ? Number((1.25 + Math.random() * 1.5).toFixed(2)) : 0,
      stake,
      result: win ? 'won' : 'lost',
      profit,
      strategyId: virtual.id,
    };
    updateBettingStrategy(virtual.id, {
      bankroll: nextBankroll,
      roi: nextRoi,
      winRate: nextWinRate,
      betsTotal: nextBetsTotal,
      betsWon: nextBetsWon,
      history: nextHistory,
      recentBets: [bet, ...virtual.recentBets].slice(0, 80),
      risk_profile: activeRiskProfile,
    });
    if (hasAdminRole(user)) {
      setAdminTransactionLog((prev) => [{
        id: bet.id,
        user_id: user?.id ?? 'system',
        user_name: 'Robin IA (virtuel betting)',
        portfolio_id: virtual.id,
        asset: bet.market,
        side: win ? 'buy' : 'sell',
        amount: bet.stake,
        status: 'simulated',
        created_at: bet.date,
      }, ...prev].slice(0, 100));
    }
    if (!options.silent) {
      setBettingAlert(`Simulation virtuelle exécutée (${profile.label}) : ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} €.`);
    }
  }

  function approveTipsterSignal(signal: TipsterSignal, source: 'manual' | 'autonomous' = 'manual', targetStrategyId?: string) {
    const currentSignal = tipsterSignals.find((item) => item.id === signal.id);
    if (!currentSignal || currentSignal.status !== 'pending') {
      return;
    }
    setTipsterSignals((prev) => prev.map((s) => {
      if (s.id !== signal.id) {
        return s;
      }
      if (s.status !== 'pending') {
        return s;
      }
      return { ...s, status: 'approved' };
    }));
    const preferredStrategy = targetStrategyId
      ? bettingStrategies.find((strategy) => strategy.id === targetStrategyId) ?? null
      : (source === 'autonomous'
        ? bettingStrategies.find((strategy) => strategy.isVirtual) ?? null
        : bettingStrategies.find((strategy) => !strategy.isVirtual && strategy.enabled) ?? bettingStrategies.find((strategy) => strategy.isVirtual) ?? null);
    if (!preferredStrategy) {
      setBettingAlert(`✅ Pari validé : ${signal.event} — ${signal.market}`);
      return;
    }
    if (preferredStrategy.isVirtual) {
      if (!preferredStrategy.enabled || !preferredStrategy.ai_enabled) {
        updateBettingStrategy(preferredStrategy.id, {
          enabled: true,
          ai_enabled: true,
        });
      }
      simulateVirtualBetCycle(signal, { silent: source === 'autonomous' });
      if (source === 'autonomous') {
        setBettingAlert(`🤖 Tipster autonome: ${signal.event} traité et simulé sur le portefeuille fictif.`);
      } else {
        setBettingAlert(`✅ Pari approuvé et ajouté à ${preferredStrategy.name} : ${signal.event} — ${signal.market}`);
      }
      return;
    }

    const stake = Number(Math.max(
      MIN_MONETARY_LIMIT,
      Math.min(preferredStrategy.max_stake, signal.potentialGain || preferredStrategy.max_stake || 10),
    ).toFixed(2));
    const bet: BetRecord = {
      id: `rb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      sport: signal.sport,
      event: signal.event,
      market: signal.market,
      bookmaker: signal.bookmaker,
      odds: signal.odds,
      stake,
      result: 'pending',
      profit: 0,
      strategyId: preferredStrategy.id,
    };
    updateBettingStrategy(preferredStrategy.id, {
      enabled: true,
      ai_enabled: true,
      betsTotal: preferredStrategy.betsTotal + 1,
      recentBets: [bet, ...preferredStrategy.recentBets].slice(0, 120),
    });
    setBettingAlert(`✅ Pari approuvé et ajouté à ${preferredStrategy.name} : ${signal.event} — ${signal.market}`);
  }

  function resetVirtualBettingPortfolio() {
    const virtual = bettingStrategies.find((s) => s.isVirtual);
    if (!virtual) return;
    updateBettingStrategy(virtual.id, {
      bankroll: 100,
      roi: 0,
      winRate: 0,
      betsTotal: 0,
      betsWon: 0,
      history: [
        { date: new Date().toISOString().slice(0, 10), value: 100 },
      ],
      recentBets: [],
    });
    setBettingAlert('Portefeuille virtuel Paris en ligne réinitialisé à 100 € (historique simulé supprimé).');
  }

  function resetVirtualRacingPortfolio() {
    const virtual = racingStrategies.find((s) => s.isVirtual);
    if (!virtual) return;
    setRacingStrategies((prev) => prev.map((s) => s.id === virtual.id ? {
      ...s,
      bankroll: 100,
      roi: 0,
      winRate: 0,
      betsTotal: 0,
      betsWon: 0,
      history: [{ date: new Date().toISOString().slice(0, 10), value: 100 }],
      recentBets: [],
    } : s));
    setSelectedRacingStrategy((prev) => prev && prev.id === virtual.id ? {
      ...prev,
      bankroll: 100,
      roi: 0,
      winRate: 0,
      betsTotal: 0,
      betsWon: 0,
      history: [{ date: new Date().toISOString().slice(0, 10), value: 100 }],
      recentBets: [],
    } : prev);
    setBettingAlert('Portefeuille virtuel hippique réinitialisé à 100 € (historique simulé supprimé).');
  }

  function simulateVirtualRacingCycle(sourceSignal: TipsterSignal, options: { silent?: boolean } = {}) {
    const virtual = racingStrategies.find((strategy) => strategy.isVirtual);
    if (!virtual || !virtual.enabled || !virtual.ai_enabled) {
      return;
    }
    const maxStakeAllowed = Math.max(
      MIN_MONETARY_LIMIT,
      Math.min(Math.max(MIN_MONETARY_LIMIT, virtual.max_stake), Math.max(MIN_MONETARY_LIMIT, virtual.bankroll)),
    );
    const stake = Number((MIN_MONETARY_LIMIT + Math.random() * (maxStakeAllowed - MIN_MONETARY_LIMIT)).toFixed(2));
    const bet: BetRecord = {
      id: `vr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      sport: 'other',
      event: sourceSignal.event,
      market: sourceSignal.market,
      bookmaker: sourceSignal.bookmaker,
      odds: sourceSignal.odds,
      stake,
      result: 'pending',
      profit: 0,
      strategyId: virtual.id,
    };
    setRacingStrategies((prev) => prev.map((strategy) => {
      if (strategy.id !== virtual.id) {
        return strategy;
      }
      const nextBetsTotal = strategy.betsTotal + 1;
      return {
        ...strategy,
        betsTotal: nextBetsTotal,
        recentBets: [bet, ...strategy.recentBets].slice(0, 120),
      };
    }));
    if (!options.silent) {
      setBettingAlert(`🤖 IA Hippiques: transaction simulée en attente de résultat réel (${sourceSignal.event}).`);
    }
  }

  function confirmRacingRecommendation(signal: TipsterSignal, targetStrategyId: string) {
    const targetStrategy = racingStrategies.find((strategy) => strategy.id === targetStrategyId);
    if (!targetStrategy) {
      setBettingAlert('Sélectionnez un portefeuille hippique avant de confirmer cette recommandation.');
      return;
    }

    const currentSignal = racingSignals.find((entry) => entry.id === signal.id);
    if (!currentSignal || currentSignal.status !== 'pending') {
      return;
    }

    setRacingSignals((prev) => prev.map((entry) => entry.id === signal.id ? { ...entry, status: 'approved' } : entry));

    if (targetStrategy.isVirtual) {
      if (!virtualAppsEnabled.racing) {
        setBettingAlert('Activez le portefeuille fictif hippique pour confirmer cette recommandation en simulation.');
        return;
      }
      if (!targetStrategy.enabled || !targetStrategy.ai_enabled) {
        setRacingStrategies((prev) => prev.map((strategy) => strategy.id === targetStrategy.id
          ? { ...strategy, enabled: true, ai_enabled: true }
          : strategy));
      }
      simulateVirtualRacingCycle(signal);
      setBettingAlert(`✅ Recommandation hippique confirmée sur ${targetStrategy.name} en mode simulation.`);
      return;
    }

    const stake = Number(Math.max(MIN_MONETARY_LIMIT, Math.min(targetStrategy.max_stake, signal.potentialGain || targetStrategy.max_stake || 10)).toFixed(2));
    const bet: BetRecord = {
      id: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      sport: 'other',
      event: signal.event,
      market: signal.market,
      bookmaker: signal.bookmaker,
      odds: signal.odds,
      stake,
      result: 'pending',
      profit: 0,
      strategyId: targetStrategy.id,
    };
    setRacingStrategies((prev) => prev.map((strategy) => {
      if (strategy.id !== targetStrategy.id) {
        return strategy;
      }
      return {
        ...strategy,
        enabled: true,
        betsTotal: strategy.betsTotal + 1,
        recentBets: [bet, ...strategy.recentBets].slice(0, 120),
      };
    }));
    setSelectedRacingStrategy((prev) => prev && prev.id === targetStrategy.id
      ? {
        ...prev,
        enabled: true,
        betsTotal: prev.betsTotal + 1,
        recentBets: [bet, ...prev.recentBets].slice(0, 120),
      }
      : prev);
    setBettingAlert(`✅ Recommandation hippique confirmée et associée à ${targetStrategy.name} en mode réel.`);
  }

  useEffect(() => {
    const virtual = bettingStrategies.find((s) => s.isVirtual);
    if (!virtual) {
      return;
    }
    if (virtual.mode === 'autonomous' && (!virtual.enabled || !virtual.ai_enabled)) {
      updateBettingStrategy(virtual.id, { enabled: true, ai_enabled: true });
    }
  }, [bettingStrategies]);

  useEffect(() => {
    // Robin AI — en mode autonome seulement, appliquer la file de recommandations
    // dans le portefeuille virtuel. En mode supervise, elles restent visibles
    // jusqu à validation utilisateur.
    if (emergencyStopActive) {
      return;
    }
    const virtual = bettingStrategies.find((s) => s.isVirtual);
    if (!virtual || !virtual.enabled || !virtual.ai_enabled || virtual.mode !== 'autonomous') {
      return;
    }
    const pendingSignals = tipsterSignals.filter((s) => s.status === 'pending');
    if (pendingSignals.length === 0) {
      // All signals processed — reset them after a short delay so the cycle restarts
      const timer = window.setTimeout(() => {
        setTipsterSignals((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
      }, randomDelayMs(12 * 60 * 1000, 28 * 60 * 1000));
      return () => window.clearTimeout(timer);
    }
    const nextSignal = [...pendingSignals].sort((a, b) => scoreTipsterSignal(b) - scoreTipsterSignal(a))[0];
    if (!nextSignal) {
      return;
    }
    const timer = window.setTimeout(() => {
      approveTipsterSignal(nextSignal, 'autonomous');
    }, randomDelayMs(90_000, 6 * 60 * 1000));
    return () => {
      window.clearTimeout(timer);
    };
  }, [bettingStrategies, tipsterSignals, emergencyStopActive]);

  // In autonomous mode, Robin IA now waits for real tipster signals only.
  useEffect(() => {
    if (emergencyStopActive) return;
    const virtual = bettingStrategies.find((s) => s.isVirtual);
    if (!virtual?.enabled || !virtual?.ai_enabled || virtual?.mode !== 'autonomous') return;
    const hasPendingSignals = tipsterSignals.some((signal) => signal.status === 'pending');
    if (!hasPendingSignals) {
      return;
    }
    return;
  }, [bettingStrategies, emergencyStopActive, tipsterSignals, liveClockTs]);

  useEffect(() => {
    if (emergencyStopActive) {
      return;
    }
    const virtual = bettingStrategies.find((strategy) => strategy.isVirtual);
    if (!virtual || !virtual.enabled || !virtual.ai_enabled) {
      return;
    }
    const nowTs = Date.now();
    const pendingBets = virtual.recentBets.filter((bet) => bet.result === 'pending');
    const dueBets = pendingBets.filter((bet) => {
      const signal = tipsterSignals.find((entry) => entry.event === bet.event && entry.market === bet.market);
      if (!signal) {
        return false;
      }
      return isWindowElapsed(signal.deadline, RACING_EVENT_LIVE_WINDOW_MS, nowTs);
    });
    if (dueBets.length === 0) {
      return;
    }
    const updates = new Map<string, { result: BetRecord['result']; profit: number }>();
    for (const bet of dueBets) {
      const signal = tipsterSignals.find((entry) => entry.event === bet.event && entry.market === bet.market);
      if (!signal) {
        continue;
      }
      const winProb = Math.max(0.2, Math.min(0.82, 0.22 + signal.confidence * 0.1 + signal.value_pct / 120));
      const roll = stablePseudoRandom(`${signal.id}|${signal.deadline}|${bet.id}`);
      const won = roll < winProb;
      const profit = Number((won ? (bet.stake * Math.max(0, bet.odds - 1)) : -bet.stake).toFixed(2));
      updates.set(bet.id, { result: won ? 'won' : 'lost', profit });
    }
    if (updates.size === 0) {
      return;
    }
    updateBettingStrategy(virtual.id, (() => {
      const nextRecentBets = virtual.recentBets.map((bet) => {
        const patch = updates.get(bet.id);
        return patch ? { ...bet, result: patch.result, profit: patch.profit } : bet;
      });
      const totalProfit = nextRecentBets.reduce((sum, bet) => sum + bet.profit, 0);
      const nextBankroll = Math.max(0, Number((100 + totalProfit).toFixed(2)));
      const nextBetsWon = nextRecentBets.filter((bet) => bet.result === 'won').length;
      const nextBetsTotal = nextRecentBets.length;
      return {
        bankroll: nextBankroll,
        roi: Number((((nextBankroll - 100) / 100) * 100).toFixed(1)),
        winRate: nextBetsTotal > 0 ? Number(((nextBetsWon / nextBetsTotal) * 100).toFixed(0)) : 0,
        betsWon: nextBetsWon,
        betsTotal: nextBetsTotal,
        recentBets: nextRecentBets,
        history: [...virtual.history, { date: new Date().toISOString().slice(0, 10), value: nextBankroll }].slice(-180),
      };
    })());
  }, [bettingStrategies, tipsterSignals, emergencyStopActive]);

  useEffect(() => {
    // Robin IA — finance virtuel : en autopilot, exécute une simulation périodique
    // afin d alimenter réellement le portefeuille virtuel.
    const virtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    if (!virtualPortfolioId) {
      return;
    }
    const cfg = getAgentConfig(virtualPortfolioId);
    if (!cfg.enabled || portfolioActivation[virtualPortfolioId] === false || emergencyStopActive) {
      return;
    }
    if (virtualAppsEnabled.finance === false) {
      return;
    }
    const hasOps = (financeVirtualSimulation?.operations.length ?? 0) > 0;
    const timer = window.setTimeout(() => {
      simulateFinanceVirtualCycle();
    }, hasOps
      ? randomDelayMs(10 * 60 * 1000, 45 * 60 * 1000)
      : randomDelayMs(35 * 1000, 110 * 1000));
    return () => window.clearTimeout(timer);
  }, [
    agentConfigs,
    portfolioActivation,
    emergencyStopActive,
    dashboard?.virtual_portfolio?.portfolio_id,
    financeVirtualSimulation?.operations.length,
    virtualAppsEnabled.finance,
  ]);

  useEffect(() => {
    const virtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    if (!virtualPortfolioId) {
      return;
    }
    setPortfolioActivation((prev) => {
      const currentlyActive = prev[virtualPortfolioId] !== false;
      if (currentlyActive === virtualAppsEnabled.finance) {
        return prev;
      }
      return { ...prev, [virtualPortfolioId]: virtualAppsEnabled.finance };
    });
    setPortfolioVisibility((prev) => {
      const currentlyVisible = prev[virtualPortfolioId] !== false;
      if (currentlyVisible === virtualAppsEnabled.finance) {
        return prev;
      }
      return { ...prev, [virtualPortfolioId]: virtualAppsEnabled.finance };
    });
  }, [dashboard?.virtual_portfolio?.portfolio_id, virtualAppsEnabled.finance]);

  useEffect(() => {
    const virtualPortfolioId = dashboard?.virtual_portfolio?.portfolio_id;
    if (!virtualPortfolioId || virtualAppsEnabled.finance === false || emergencyStopActive) {
      return;
    }
    const cfg = getAgentConfig(virtualPortfolioId);
    if (!cfg.enabled) {
      void updateAgentConfig(virtualPortfolioId, {
        enabled: true,
        mode: cfg.mode === 'manual' ? 'autopilot' : cfg.mode,
      });
    }
  }, [dashboard?.virtual_portfolio?.portfolio_id, virtualAppsEnabled.finance, emergencyStopActive, agentConfigs]);

  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(apiUrl('/auth/me/settings'), {
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
      }).catch(() => {
        // Keep local runtime if persistence fails.
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [
    racingStrategies,
    accessToken,
    user,
    settingsForm.fullName,
    settingsForm.phoneNumber,
    virtualAppsEnabled,
    lotteryVirtualPortfolio,
    portfolioActivation,
  ]);

  useEffect(() => {
    setBettingStrategies((prev) => prev.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      if (strategy.enabled === virtualAppsEnabled.betting) {
        return strategy;
      }
      return {
        ...strategy,
        enabled: virtualAppsEnabled.betting,
      };
    }));
  }, [virtualAppsEnabled.betting]);

  useEffect(() => {
    setRacingStrategies((prev) => prev.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      if (strategy.enabled === virtualAppsEnabled.racing) {
        return strategy;
      }
      return {
        ...strategy,
        enabled: virtualAppsEnabled.racing,
      };
    }));
  }, [virtualAppsEnabled.racing]);

  useEffect(() => {
    if (lotteryVirtualPortfolio.enabled === virtualAppsEnabled.loto) {
      return;
    }
    setLotteryVirtualPortfolio((prev) => ({
      ...prev,
      enabled: virtualAppsEnabled.loto,
      ai_enabled: virtualAppsEnabled.loto ? prev.ai_enabled : false,
      mode: virtualAppsEnabled.loto ? prev.mode : 'manual',
    }));
  }, [virtualAppsEnabled.loto, lotteryVirtualPortfolio.enabled]);

  useEffect(() => {
    if (!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.enabled) {
      return;
    }
    const nowTs = Date.now();
    const dueTickets = lotteryVirtualPortfolio.tickets.filter((ticket) => ticket.status === 'pending' && isWindowElapsed(ticket.drawDate, LOTTERY_DRAW_LIVE_WINDOW_MS, nowTs));
    if (dueTickets.length === 0) {
      return;
    }

    let nextBankroll = lotteryVirtualPortfolio.bankroll;
    const nextTickets: LotteryVirtualTicket[] = lotteryVirtualPortfolio.tickets.map<LotteryVirtualTicket>((ticket) => {
      if (ticket.status !== 'pending' || !isWindowElapsed(ticket.drawDate, LOTTERY_DRAW_LIVE_WINDOW_MS, nowTs)) {
        return ticket;
      }
      const draw = buildDeterministicLotteryDraw(ticket.game, ticket.drawDate);
      const hit = evaluateLotteryGridHit(ticket.game, {
        id: `virtual-${ticket.id}`,
        game: ticket.game,
        numbers: ticket.numbers,
        stars: ticket.stars,
        confidenceIndex: 0,
        rationale: 'Simulation portefeuille fictif',
      }, draw);
      const payout = Number((hit?.estimatedPrize ?? 0).toFixed(2));
      if (payout > 0) {
        nextBankroll += payout;
      }
      return {
        ...ticket,
        status: payout > 0 ? 'won' : 'lost',
        payout,
        profit: Number((payout - ticket.stake).toFixed(2)),
        matchedNumbers: hit?.matchedNumbers ?? 0,
        matchedStars: hit?.matchedStars ?? 0,
        rankLabel: hit?.rankLabel ?? null,
        settledAt: new Date().toISOString(),
      };
    });

    persistLotteryVirtualPortfolio({
      ...lotteryVirtualPortfolio,
      bankroll: Number(nextBankroll.toFixed(2)),
      tickets: nextTickets,
    });
  }, [lotteryVirtualPortfolio, virtualAppsEnabled.loto, liveClockTs]);

  useEffect(() => {
    if (emergencyStopActive || !virtualAppsEnabled.loto || !lotteryVirtualPortfolio.enabled || !lotteryVirtualPortfolio.ai_enabled || lotteryVirtualPortfolio.mode !== 'autonomous') {
      return;
    }
    const timer = window.setTimeout(() => {
      playLotteryVirtualTickets('loto', { source: 'autonomous', silent: true });
      playLotteryVirtualTickets('euromillions', { source: 'autonomous', silent: true });
    }, randomDelayMs(70_000, 6 * 60 * 1000));
    return () => window.clearTimeout(timer);
  }, [emergencyStopActive, virtualAppsEnabled.loto, lotteryVirtualPortfolio, lotteryPredictions, normalizedLotteryGridCount]);

  useEffect(() => {
    if (emergencyStopActive) {
      return;
    }
    const virtual = racingStrategies.find((strategy) => strategy.isVirtual);
    if (!virtual || !virtual.enabled || !virtual.ai_enabled || virtual.mode !== 'autonomous') {
      return;
    }
    const pendingSignals = racingSignals.filter((signal) => signal.status === 'pending');
    if (pendingSignals.length === 0) {
      return;
    }
    const bestSignal = [...pendingSignals].sort((a, b) => scoreTipsterSignal(b) - scoreTipsterSignal(a))[0];
    if (!bestSignal) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRacingSignals((prev) => prev.map((signal) => signal.id === bestSignal.id ? { ...signal, status: 'approved' } : signal));
      simulateVirtualRacingCycle(bestSignal, { silent: true });
    }, randomDelayMs(2 * 60 * 1000, 9 * 60 * 1000));
    return () => window.clearTimeout(timer);
  }, [racingStrategies, racingSignals, emergencyStopActive]);

  useEffect(() => {
    const virtual = racingStrategies.find((strategy) => strategy.isVirtual);
    if (!virtual || !virtual.enabled || !virtual.ai_enabled) {
      return;
    }
    const nowTs = Date.now();
    const dueBets = virtual.recentBets.filter((bet) => {
      if (bet.result !== 'pending') {
        return false;
      }
      const signal = racingSignals.find((entry) => entry.event === bet.event && entry.market === bet.market);
      if (!signal) {
        return false;
      }
      return isWindowElapsed(signal.deadline, RACING_EVENT_LIVE_WINDOW_MS, nowTs);
    });
    if (dueBets.length === 0) {
      return;
    }
    const updates = new Map<string, { result: BetRecord['result']; profit: number }>();
    for (const bet of dueBets) {
      const signal = racingSignals.find((entry) => entry.event === bet.event && entry.market === bet.market);
      if (!signal) {
        continue;
      }
      const winProb = Math.max(0.18, Math.min(0.78, 0.2 + signal.confidence * 0.095 + signal.value_pct / 130));
      const roll = stablePseudoRandom(`${signal.id}|${signal.deadline}|${bet.id}`);
      const won = roll < winProb;
      const profit = Number((won ? (bet.stake * Math.max(0, bet.odds - 1)) : -bet.stake).toFixed(2));
      updates.set(bet.id, { result: won ? 'won' : 'lost', profit });
    }
    if (updates.size === 0) {
      return;
    }
    setRacingStrategies((prev) => prev.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      const nextRecentBets = strategy.recentBets.map((bet) => {
        const patch = updates.get(bet.id);
        return patch ? { ...bet, result: patch.result, profit: patch.profit } : bet;
      });
      const totalProfit = nextRecentBets.reduce((sum, bet) => sum + bet.profit, 0);
      const nextBankroll = Math.max(0, Number((100 + totalProfit).toFixed(2)));
      const nextBetsWon = nextRecentBets.filter((bet) => bet.result === 'won').length;
      const nextBetsTotal = nextRecentBets.length;
      return {
        ...strategy,
        bankroll: nextBankroll,
        roi: Number((((nextBankroll - 100) / 100) * 100).toFixed(1)),
        winRate: nextBetsTotal > 0 ? Number(((nextBetsWon / nextBetsTotal) * 100).toFixed(0)) : 0,
        betsWon: nextBetsWon,
        betsTotal: nextBetsTotal,
        recentBets: nextRecentBets,
        history: [...strategy.history, { date: new Date().toISOString().slice(0, 10), value: nextBankroll }].slice(-180),
      };
    }));
  }, [racingStrategies, racingSignals, liveClockTs]);

  useEffect(() => {
    const virtual = racingStrategies.find((strategy) => strategy.isVirtual);
    if (!virtual || !virtualAppsEnabled.racing) {
      return;
    }
    if (virtual.ai_enabled && virtual.enabled) {
      return;
    }
    setRacingStrategies((prev) => prev.map((strategy) => {
      if (!strategy.isVirtual) {
        return strategy;
      }
      return {
        ...strategy,
        ai_enabled: true,
        enabled: true,
        mode: strategy.mode === 'manual' ? 'supervised' : strategy.mode,
      };
    }));
  }, [racingStrategies, virtualAppsEnabled.racing]);

  useEffect(() => {
    if (!bettingAlert) {
      return;
    }
    const timer = window.setTimeout(() => setBettingAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [bettingAlert]);

  useEffect(() => {
    if (!allowedApps.includes(activeApp)) {
      const fallback = allowedApps[0] ?? 'finance';
      setActiveApp(fallback);
      setAppView('overview');
      setPortfolioDetailOpen(false);
      setSelectedPortfolio(null);
      setStrategyDetailOpen(false);
      setSelectedStrategy(null);
    }
    if (overviewAppFilter !== 'all' && !allowedApps.includes(overviewAppFilter)) {
      setOverviewAppFilter('all');
      setOverviewTargetFilter('all');
    }
  }, [allowedApps, activeApp, overviewAppFilter]);

  useEffect(() => {
    if (!selectedInsight || selectedInsight.section !== 'decisions') {
      return;
    }
    const defaultPortfolioId = resolveDecisionPortfolioId(
      selectedInsight.portfolio_id
        ?? allPortfolios.find((portfolio) => portfolio.type === 'virtual')?.id
        ?? allPortfolios[0]?.id
        ?? null
    ) ?? '';
    setSelectedDecisionPortfolioId(defaultPortfolioId);
    setSelectedDecisionSide(inferDecisionSide(selectedInsight));
    const linkedPortfolio = allPortfolios.find((portfolio) => portfolio.id === defaultPortfolioId);
    const suggestedAmount = linkedPortfolio && linkedPortfolio.current_value > 0
      ? Math.max(10, Math.min(250, linkedPortfolio.current_value * 0.03))
      : 25;
    setSelectedDecisionAmount(Number(suggestedAmount.toFixed(2)));
  }, [selectedInsight, allPortfolios]);

  function openHomePortfolio(row: HomePortfolioRow) {
    if (row.appKey === 'finance') {
      const target = allPortfolios.find((portfolio) => portfolio.id === row.targetId);
      setActiveApp('finance');
      if (target) {
        setSelectedPortfolio(target);
        setPortfolioDetailOpen(true);
      }
      setAppView('portfolios');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (row.appKey === 'betting') {
      const target = bettingStrategies.find((strategy) => strategy.id === row.targetId) ?? null;
      setActiveApp('betting');
      setSelectedStrategy(target);
      setStrategyDetailOpen(Boolean(target));
      setAppView('strategies');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (row.appKey === 'racing') {
      const target = racingStrategies.find((strategy) => strategy.id === row.targetId) ?? null;
      setActiveApp('racing');
      setSelectedRacingStrategy(target);
      setRacingStrategyDetailOpen(Boolean(target));
      setAppView('strategies');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveApp('loto');
    setLotoPortfolioMenuSelection(row.targetId);
    setAppView('portfolios');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openHomeTransaction(row: HomeTransactionRow) {
    if (row.appKey === 'finance') {
      const target = allPortfolios.find((portfolio) => portfolio.id === row.targetId);
      setActiveApp('finance');
      if (target) {
        setSelectedPortfolio(target);
        setPortfolioDetailOpen(true);
        setAppView('portfolios');
      } else {
        setAppView('dashboard');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (row.appKey === 'betting') {
      const target = bettingStrategies.find((strategy) => strategy.id === row.targetId) ?? null;
      setActiveApp('betting');
      setSelectedStrategy(target);
      setStrategyDetailOpen(Boolean(target));
      setAppView(target ? 'strategies' : 'dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (row.appKey === 'racing') {
      const target = racingStrategies.find((strategy) => strategy.id === row.targetId) ?? null;
      setActiveApp('racing');
      setSelectedRacingStrategy(target);
      setRacingStrategyDetailOpen(Boolean(target));
      setAppView(target ? 'strategies' : 'dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveApp('loto');
    setLotoPortfolioMenuSelection(row.targetId);
    setAppView('portfolios');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openHomeRecommendation(item: HomeRecommendationRow) {
    if (item.appKey === 'finance' && item.insight) {
      setActiveApp('finance');
      setAppView('dashboard');
      openDecisionWizard(item.insight);
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }
    if (item.appKey === 'betting') {
      setActiveApp('betting');
      setAppView('dashboard');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }
    if (item.appKey === 'racing') {
      setActiveApp('racing');
      setAppView('dashboard');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }
    setActiveApp('loto');
    if (item.game) {
      setLotteryGameFocus(item.game);
    }
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearViewSelections() {
    setPortfolioDetailOpen(false);
    setSelectedPortfolio(null);
    setStrategyDetailOpen(false);
    setSelectedStrategy(null);
    setRacingStrategyDetailOpen(false);
    setSelectedRacingStrategy(null);
  }

  function openFinanceTopbarBranch(subApp: 'crypto' | 'actions') {
    setActiveApp('finance');
    setFinanceSubApp(subApp);
    clearViewSelections();
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openFinanceTopbarView(view: 'dashboard' | 'portfolios' | 'settings') {
    setActiveApp('finance');
    clearViewSelections();
    setAppView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openParisTopbarBranch(app: ParisApp) {
    setActiveApp(app);
    clearViewSelections();
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openParisTopbarView(view: 'dashboard' | 'portfolios' | 'strategies' | 'settings') {
    setActiveApp(topbarParisActiveApp);
    clearViewSelections();
    setAppView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className={`investShell appTheme-${activeApp}`}>
      <div className="appWatermarkLayer" aria-hidden="true">
        <span>💹 FINANCE</span>
        <span>🐎 HIPPIQUES</span>
        <span>⚽ PARIS EN LIGNE</span>
        <span>🎟️ LOTO</span>
      </div>
      <header className="heroTopbar">
        <div className="brandCluster">
          <div className="brandBadge" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="92" height="92" rx="30" fill="#fff5e9" stroke="#7a3412" strokeWidth="4"/>
              <path d="M18 45 L36 18 L42 46 Z" fill="#f97316" stroke="#9a3412" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M82 45 L64 18 L58 46 Z" fill="#f97316" stroke="#9a3412" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M20 52 C20 34 34 24 50 24 C66 24 80 34 80 52 C80 72 66 84 50 84 C34 84 20 72 20 52 Z" fill="#fb923c"/>
              <ellipse cx="50" cy="67" rx="22" ry="13" fill="#fff7ed"/>
              <circle cx="40" cy="52" r="8" fill="#fff"/>
              <circle cx="60" cy="52" r="8" fill="#fff"/>
              <circle cx="41" cy="53" r="3.5" fill="#111827"/>
              <circle cx="59" cy="53" r="3.5" fill="#111827"/>
              <path d="M34 43 Q39 39 44 43" stroke="#7a3412" strokeWidth="3" strokeLinecap="round"/>
              <path d="M56 43 Q61 39 66 43" stroke="#7a3412" strokeWidth="3" strokeLinecap="round"/>
              <path d="M50 58 L56 65 L50 68 L44 65 Z" fill="#7a3412"/>
              <path d="M44 71 Q50 76 56 71" stroke="#7a3412" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="71" cy="30" r="7" fill="#86efac" stroke="#166534" strokeWidth="2"/>
              <path d="M68.5 30 L70.5 32.5 L74 27.5" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brandInfo">
            <strong>
              <span className="robinWord">ROBIN</span>
              {user ? ` • ${APP_LABELS[activeApp]}` : ''}
            </strong>
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
            <button className={appView === 'account' ? 'appSwitchBtn account active' : 'appSwitchBtn account'} onClick={() => openAccountWorkspace('account-overview')} type="button">👤 Mon compte</button>
            <button className="appSwitchBtn" onClick={handleLogout} type="button">↪ Se deconnecter</button>
          </div>
        ) : null}
        <div className="topbarUniverseProgressRow">
          <div className="topbarMenuDock">
            <div className="topbarKpis topbarKpisLeft">
              <button
                className={`smallPill selectedPortfolioPill topbarTrendPill topbarTrendPillReal ${evolution24h.tone}`}
                onClick={() => {
                  setSelectedInsight({
                    id: 'topbar-real-24h',
                    title: 'Valeur réelle active',
                    value: `${topbarRealValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
                    trend: `${evolution24h.tone === 'up' ? '↑' : evolution24h.tone === 'down' ? '↓' : '→'} Variation 24h ${evolution24h.value}`,
                    detail: 'Somme des portefeuilles réels actifs avec indicateur de variation consolidée sur 24h.',
                    section: 'indicator',
                  });
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                type="button"
              >
                <span className="topbarTrendTitle"><span className="topbarObjectiveDot" aria-hidden="true" />Réels {topbarRealValue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</span>
                <span className={`topbarTrendValue ${evolution24h.tone}`}>{topbarRealTrendLabel}</span>
              </button>
              <button
                className={`smallPill selectedPortfolioPill topbarTrendPill topbarTrendPillVirtual ${topbarVirtualTrendTone}`}
                onClick={() => {
                  setSelectedInsight({
                    id: 'topbar-virtual-live',
                    title: 'Valeur portefeuilles fictifs actifs',
                    value: `${topbarVirtualValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
                    trend: `${topbarVirtualTrendTone === 'up' ? '↑' : topbarVirtualTrendTone === 'down' ? '↓' : '→'} ${topbarVirtualTrendLabel}`,
                    detail: 'Somme des portefeuilles fictifs actifs: Finance, Paris en ligne, Hippiques et Loto.',
                    section: 'indicator',
                  });
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                type="button"
              >
                <span className="topbarTrendTitle"><span className="topbarObjectiveDot" aria-hidden="true" />Fictifs {topbarVirtualValue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</span>
                <span className={`topbarTrendValue ${topbarVirtualTrendTone}`}>{topbarVirtualTrendLabel}</span>
              </button>
            </div>
            <TopbarNavigation
              activeApp={activeApp}
              adminSection={adminSection}
              allowedApps={allowedApps}
              animationKey={topbarNavAnimationKey}
              appView={appView}
              canAccessAdmin={canAccessAdmin}
              currentHeaderSection={currentHeaderSection}
              financeSubApp={financeSubApp}
              hasParisApps={hasParisApps}
              onLogout={handleLogout}
              onAdminSectionChange={setAdminSection}
              openAccountWorkspace={openAccountWorkspace}
              openAdminWorkspace={openAdminWorkspace}
              openFinanceParentMenu={openFinanceParentMenu}
              openFinanceTopbarBranch={openFinanceTopbarBranch}
              openFinanceTopbarView={openFinanceTopbarView}
              openHomeParentMenu={openHomeParentMenu}
              openOverviewSection={openOverviewSection}
              openParisParentMenu={openParisParentMenu}
              openParisTopbarBranch={openParisTopbarBranch}
              openParisTopbarView={openParisTopbarView}
              topbarParisActiveApp={topbarParisActiveApp}
            />
          </div>
          {appView !== 'account' ? (
          <div className="topbarProgressDock">
              <div
                className={`trendArrowTrack ${batteryTone} ${topbarProgressRatio >= 0.99 ? 'achieved' : ''}`}
                aria-hidden="true"
                style={{
                  ['--trend-speed' as string]: `${trendArrowSpeed}s`,
                  ['--trend-scale' as string]: `${trendArrowScale}`,
                  ['--goal-progress-pct' as string]: `${topbarProgressPct}%`,
                  ['--goal-elapsed-pct' as string]: `${topbarDelayConsumedPct}%`,
                } as Record<string, string>}
              >
                <div className="batteryHeader">
                  <span className="batteryEyebrow">Progression nette</span>
                  <strong>{topbarProgressLabel}</strong>
                  <span className={`metaPill ${goalMoodTone}`}>{goalMoodLabel}</span>
                </div>
                <div className="batteryShell">
                  <div className="batteryChargingFlow" />
                  <div className="batteryLevel" />
                  <div className="batteryNeedle" />
                  <div className="batteryPercent">{uiNavigationProgressPct}% navigation</div>
                </div>
                <div className="batteryTimeline">
                  <div className="batteryTimelineRail">
                    <div className="batteryTimelineProgress" />
                    <div className="batteryTimelineMascot" aria-hidden="true">🏃</div>
                    <div className="batteryTimelineFinishDate">Arrivee: {objectiveDeadlineLabel}</div>
                  </div>
                  <div
                    className={`batteryDelayInfo ${loading ? 'loading' : topbarDelayConsumedPct >= 100 ? 'done' : topbarDelayConsumedPct >= 75 ? 'warn' : 'ok'}`}
                  >
                    Fenêtre active en direct
                  </div>
                </div>
              </div>
          </div>
          ) : null}
        </div>
      </header>

      {user ? <AppBreadcrumbs items={breadcrumbItems} /> : null}

      {error ? <p className="formMessage">{error}</p> : null}
      {pendingDecisionConfirmation ? (
        <article className="featureCard" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-soft)' }}>
          <div className="cardHeader">
            <h2>Confirmation recommandation IA</h2>
            <span>Validation utilisateur requise avant exécution</span>
          </div>
          <p style={{ margin: 0, fontSize: '.86rem' }}>
            {pendingDecisionConfirmation.insight.title} · {pendingDecisionConfirmation.options.side === 'sell' ? 'Cas Vente' : 'Cas Achat'} · {Number(pendingDecisionConfirmation.options.amount ?? selectedDecisionAmount).toFixed(2)} €
          </p>
          <p className="helperText" style={{ marginTop: 6 }}>Cible: {pendingDecisionConfirmation.options.targetPortfolioId ?? pendingDecisionConfirmation.insight.portfolio_label ?? 'portefeuille actif'}</p>
          <div className="providerActions fullWidth" style={{ marginTop: 10 }}>
            <button
              className="secondaryButton"
              disabled={decisionActionLoading}
              onClick={() => {
                const queued = pendingDecisionConfirmation;
                setPendingDecisionConfirmation(null);
                void runDecisionAction(queued.insight, queued.approved, queued.options);
              }}
              type="button"
            >
              {decisionActionLoading ? 'Traitement...' : (pendingDecisionConfirmation.approved ? 'Confirmer et appliquer' : 'Confirmer le refus')}
            </button>
            <button className="ghostButton" onClick={() => setPendingDecisionConfirmation(null)} type="button">Annuler</button>
          </div>
        </article>
      ) : null}
      {selectedInsight ? (
        <article className="featureCard indicatorFocusCard">
          <div className="cardHeader">
            <h2>{selectedInsight.title}</h2>
            <button className="ghostButton" onClick={() => { setSelectedInsight(null); setAssistantWizardDecisionId(null); }} type="button">Fermer</button>
          </div>
          <div className="compactList">
            <div className="compactRow">
              <span>Valeur</span>
              <strong>{selectedInsight.value}</strong>
            </div>
            <div className="compactRow">
              <span>Tendance</span>
              <strong>{selectedInsight.trend}</strong>
            </div>
            <div className="compactRow" style={{ alignItems: 'flex-start' }}>
              <span>Détail</span>
              <p style={{ margin: 0, maxWidth: 560, textAlign: 'right' }}>{selectedInsight.detail}</p>
            </div>
            <div className="compactRow">
              <span>Section</span>
              <span className="metaPill">{selectedInsight.section}</span>
            </div>
          </div>
        </article>
      ) : null}

      {appView === 'overview' ? (
        <HomeOverview
          appLabels={APP_LABELS}
          formatDateTimeFr={formatDateTimeFr}
          formatSignedEuro={formatSignedEuro}
          homeClosedTransactions={homeClosedTransactions}
          homeMood={homeMood}
          homePortfolioActivity={homePortfolioActivity}
          homeRealPortfolioRows={homeRealPortfolioRows}
          homeUpcomingTransactions48h={homeUpcomingTransactions48h}
          homeVirtualPortfolioRows={homeVirtualPortfolioRows}
          numericChangeTone={numericChangeTone}
          onOpenPortfolio={openHomePortfolio}
          onOpenTransaction={openHomeTransaction}
          onTogglePortfolioAi={toggleHomePortfolioAi}
          renderSparkline={(history, tone) => <Sparkline data={history} color={tone === 'down' ? 'var(--danger)' : tone === 'up' ? 'var(--ok)' : 'var(--brand)'} />}
        />
      ) : null}

          {showAssistantDock ? (
            assistantDockOpen ? (
              <aside className="featureCard assistantDock">
                <div className="cardHeader">
                  <h2>Assistant IA — Conseils & optimisations</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{activeApp === 'finance' ? 'Optimisations portefeuilles Finance' : activeApp === 'betting' ? 'Optimisations portefeuilles Paris en ligne' : 'Optimisations probabilistes Loto'}</span>
                    <button className="ghostButton" onClick={() => setAssistantDockOpen(false)} type="button">Réduire</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {assistantOptimizationTips.map((tip) => {
                    const tipConfidenceLevel = extractDiscreteConfidenceLevel(`${tip.value ?? ''} ${tip.detail}`);
                    return (
                    <button
                      className="compactRow compactRowButton"
                      key={tip.id}
                      onClick={() => {
                        if (tip.insight) {
                          openDecisionWizard(tip.insight);
                          return;
                        }
                        setSelectedInsight({
                          id: `assistant-info-${tip.id}`,
                          title: tip.title,
                          value: tip.value ?? 'Information',
                          trend: tip.trend ?? '→ Conseil IA',
                          detail: tip.detail,
                          section: 'coach',
                        });
                      }}
                      type="button"
                      style={{ textAlign: 'left' }}
                    >
                      <div style={{ display: 'grid', gap: 2 }}>
                        <strong style={{ fontSize: '.88rem' }}>{tip.title}</strong>
                        <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)' }}>{tip.detail}</p>
                      </div>
                      <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                        {tipConfidenceLevel ? <ConfidenceDots level={tipConfidenceLevel} /> : null}
                        <span className="metaPill">Voir détail</span>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </aside>
            ) : (
              <button className="assistantDockToggle" onClick={() => setAssistantDockOpen(true)} type="button">
                Assistant IA ({assistantOptimizationTips.length})
              </button>
            )
          ) : null}

          {appView === 'account' ? (
            <AccountWorkspace
              aiManagedAmount={getGlobalAiManagedOperations(getAgentConfig(GLOBAL_AGENT_CONFIG_KEY).period_days).reduce((sum, operation) => sum + operation.amount, 0)}
              aiManagedCount={getGlobalAiManagedOperations(getAgentConfig(GLOBAL_AGENT_CONFIG_KEY).period_days).length}
              allowedApps={allowedApps}
              appLabels={APP_LABELS}
              globalAgentConfig={getAgentConfig(GLOBAL_AGENT_CONFIG_KEY)}
              goalPeriodLabel={goalPeriodLabel}
              goalTargetNet={goalTargetNet}
              loadingMyActivity={loadingMyActivity}
              myActivityTrail={myActivityTrail}
              objectiveEstimatedLoss={objectiveEstimatedLoss}
              onApplyRiskProfilePreset={applyRiskProfileAgentPreset}
              onDeleteAccountRequest={() => setError('Suppression libre-service non disponible pour le moment. Faites-en la demande à un administrateur depuis le support.')}
              onSave={() => void submitSettingsUpdate()}
              onSettingsFieldChange={updateSettingsFormField}
              onUpdateAgentConfig={(patch) => void updateAgentConfig(GLOBAL_AGENT_CONFIG_KEY, patch)}
              riskLossProfilePct={riskLossProfilePct}
              settingsForm={settingsForm}
              submitting={submitting}
              totalLossAmount={getGlobalPortfolioLossOnPeriod(getAgentConfig(GLOBAL_AGENT_CONFIG_KEY).period_days)}
              user={user}
            />
          ) : null}

          {isFinanceCryptoActive && !portfolioDetailOpen && appView === 'dashboard' ? (
            <section className="selectedPortfolioStrip">
              <span>Portefeuilles affichés:</span>
              <div className="selectedPortfolioList">
                {allPortfolios.filter((portfolio) => portfolio.status === 'active').map((portfolio) => {
                  const cfg = getAgentConfig(portfolio.id);
                  const modeClass = !cfg.enabled ? '' : cfg.mode === 'autopilot' ? 'modeAutopilot' : 'modeSupervised';
                  return (
                    <button className={`${portfolioVisibility[portfolio.id] !== false ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'} ${modeClass}`} key={portfolio.id} onClick={() => void updatePortfolioVisibilityPreference(portfolio.id, portfolioVisibility[portfolio.id] === false)} type="button">
                      <span className={portfolio.type === 'virtual' ? 'portfolioTypeBadge virtual' : 'portfolioTypeBadge real'} style={{ marginRight: 6 }}>
                        {portfolio.type === 'virtual' ? 'Virtuel' : 'Réel'}
                      </span>
                      {portfolio.label}
                    </button>
                  );
                })}
              </div>
              {allPortfolios.filter((p) => p.status === 'active').length === 0 ? (
                <span className="helperText" style={{ fontSize: '.76rem' }}>Le portefeuille virtuel ⚗️ est disponible. Connectez une intégration pour suivre vos actifs réels.</span>
              ) : null}
            </section>
          ) : null}

          {activeApp === 'finance' && portfolioDetailOpen && selectedPortfolio ? (
            <div style={{ display: 'grid', gap: 22 }}>
              <nav className="breadcrumbNav">
                <button className="breadcrumbBack" onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                  ← Retour
                </button>
                <button className="breadcrumbBack" onClick={() => { setPortfolioDetailOpen(false); setSelectedPortfolio(null); setStrategyDetailOpen(false); setSelectedStrategy(null); setAppView('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                  Vue d ensemble
                </button>
                <span className="breadcrumbSep">/</span>
                <span className="breadcrumbCurrent">{selectedPortfolio.label}</span>
              </nav>
              {selectedPortfolio.type === 'virtual' ? (
                <div className="infoPanel" style={{ background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚗️</span>
                  <div>
                    <strong>Bac à sable virtuel — 100 € simulés</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '.82rem' }}>Ce portefeuille est un espace d entraînement sans argent réel. Robin IA teste ici ses allocations de portefeuille avant de vous les proposer sur vos vrais portefeuilles. Utilisez-le pour évaluer ses performances et vous familiariser avec l application.</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className="metaPill">Budget initial : {selectedPortfolio.budget.toFixed(0)} €</span>
                      <span className="metaPill">Valeur actuelle : {selectedPortfolio.current_value.toFixed(2)} €</span>
                      {selectedPortfolio.pnl !== 0 ? (
                        <span className={`metaPill ${selectedPortfolio.pnl >= 0 ? '' : ''}`} style={{ color: selectedPortfolio.pnl >= 0 ? 'var(--ok)' : 'var(--danger)', borderColor: selectedPortfolio.pnl >= 0 ? 'var(--ok-border)' : 'var(--danger-border)' }}>
                          Perf. Robin : {selectedPortfolio.pnl >= 0 ? '+' : ''}{selectedPortfolio.pnl.toFixed(2)} €
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
                    <span className={selectedPortfolio.type === 'virtual' ? 'portfolioTypeBadge virtual' : 'portfolioTypeBadge real'}>
                      {selectedPortfolio.type === 'virtual' ? 'Virtuel' : 'Réel'}
                    </span>
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
                      <p className="helperText">Le portefeuille virtuel sert de bac à sable pour Robin IA. Vous pouvez l activer ou le désactiver, puis choisir de l afficher ou non sur le cockpit.</p>
                      <label className="checkRow">
                        <input type="checkbox" checked={selectedPortfolio.status === 'active'} onChange={(e) => void togglePortfolioActivation(selectedPortfolio, e.target.checked)} />
                        <span>Activer le portefeuille virtuel</span>
                      </label>
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

          {isFinanceCryptoActive && !portfolioDetailOpen && appView === 'dashboard' ? (
            <>
              {supervisedFinanceMessages.length > 0 ? (
                <article className="featureCard" style={{ borderColor: 'var(--gold-border)', background: 'linear-gradient(120deg,var(--gold-soft),#fff)' }}>
                  <div className="cardHeader">
                    <h2>Messages supervisés · Finance</h2>
                    <span>Validation utilisateur requise</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {supervisedFinanceMessages.map((message) => (
                      <div key={`finance-dash-${message.id}`} className="compactRow" style={{ alignItems: 'center' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <strong style={{ fontSize: '.86rem' }}>{message.title}</strong>
                          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>{message.detail}</p>
                        </div>
                        <button className="secondaryButton" onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Traiter</button>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              <div className="heroKpiStrip">
                <div className="heroKpiItem">
                  <span>Patrimoine total</span>
                  <strong>{visiblePortfolios.reduce((s, p) => s + (p.current_value || 0), 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                  <small className={evolution24h.tone}>24h: {evolution24h.value}</small>
                </div>
                <div className="heroKpiItem">
                  <span>Actifs réels</span>
                  <strong>{realVisiblePortfolios.length}</strong>
                  <small>portefeuilles actifs</small>
                </div>
                <div className="heroKpiItem">
                  <span>ROI 7j</span>
                  <strong className={evolution7d.tone}>{evolution7d.value}</strong>
                  <small className={evolution1m.tone}>1m: {evolution1m.value}</small>
                </div>
                {visibleDecisionInsights.length > 0 ? (
                  <div className="heroKpiItem">
                    <span>Décisions IA</span>
                    <strong style={{ color: 'var(--brand)' }}>{visibleDecisionInsights.length}</strong>
                    <small>en attente de validation</small>
                  </div>
                ) : (
                  <div className="heroKpiItem">
                    <span>Agent IA</span>
                    <strong style={{ color: 'var(--ok)' }}>{autopilotRunning ? '⚡ Auto' : '✔ OK'}</strong>
                    <small>{autopilotRunning ? 'Pilote automatique actif' : 'Aucune action en attente'}</small>
                  </div>
                )}
                {emergencyStopActive ? (
                  <div className="heroKpiItem">
                    <span style={{ color: 'var(--danger)' }}>KILL SWITCH</span>
                    <strong style={{ color: 'var(--danger)' }}>🛑 ACTIF</strong>
                    <small style={{ color: 'var(--danger)' }}>Toutes transactions bloquées</small>
                  </div>
                ) : null}
              </div>
              {financeVirtualLastOperation ? (
                <p className="helperText" style={{ margin: '2px 4px 0', fontSize: '.72rem' }}>
                  Virtuel Finance: {financeVirtualLastOperation.side === 'buy' ? 'achat' : 'vente'} {financeVirtualLastOperation.asset} {financeVirtualLastOperation.amount.toFixed(2)} € · {formatDateTimeFr(financeVirtualLastOperation.date)}
                </p>
              ) : null}
              {financeCryptoEvaluation ? (
                <p className="helperText" style={{ margin: '2px 4px 0', fontSize: '.72rem' }}>
                  Évaluation IA Crypto (marché observé): {financeCryptoEvaluation.estimatedNet >= 0 ? '+' : ''}{financeCryptoEvaluation.estimatedNet.toFixed(2)} € sur {financeCryptoEvaluation.operationsCount} transaction(s).
                </p>
              ) : null}
              {!virtualAppsEnabled.finance ? (() => {
                const virtualPortfolio = allPortfolios.find((portfolio) => portfolio.type === 'virtual');
                if (!virtualPortfolio) {
                  return null;
                }
                const cfg = getAgentConfig(virtualPortfolio.id);
                return (
                  <article className="featureCard" style={{ marginTop: 8 }}>
                    <div className="cardHeader">
                      <h2>Pilotage Cockpit · Finance fictif</h2>
                      <span>Activation portefeuille, agent IA et configuration</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <label className="checkRow" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={virtualAppsEnabled.finance}
                          onChange={(event) => void updateVirtualAppPreference('finance', event.target.checked)}
                        />
                        <span>Activer le portefeuille fictif Finance</span>
                      </label>
                      <label className="checkRow" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          disabled={!virtualAppsEnabled.finance}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { enabled: event.target.checked, mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual' })}
                        />
                        <span>Activer l agent IA Finance</span>
                      </label>
                      <label>
                        Mode IA
                        <div className="aiModeSelector">
                          <button
                            className={`aiModeOption ${cfg.mode === 'manual' ? 'active manual' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'manual' })}
                            type="button"
                          >
                            <span>🖐</span>
                            <strong>Manuel</strong>
                            <small>Décisions humaines</small>
                          </button>
                          <button
                            className={`aiModeOption ${cfg.mode === 'supervised' ? 'active supervised' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'supervised' })}
                            type="button"
                          >
                            <span>👁</span>
                            <strong>Validation humaine</strong>
                            <small>L IA propose</small>
                          </button>
                          <button
                            className={`aiModeOption ${cfg.mode === 'autopilot' ? 'active autopilot' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'autopilot' })}
                            type="button"
                          >
                            <span>🤖</span>
                            <strong>Autopilot</strong>
                            <small>Exécution automatique</small>
                          </button>
                        </div>
                      </label>
                      <label>
                        Montant maximum transaction ({cfg.max_amount.toFixed(1)} €)
                        <input
                          type="range"
                          min={MIN_MONETARY_LIMIT}
                          max={MAX_AGENT_TRANSACTION_AMOUNT}
                          step={0.1}
                          disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                          value={Math.min(MAX_AGENT_TRANSACTION_AMOUNT, Math.max(MIN_MONETARY_LIMIT, cfg.max_amount))}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                        />
                      </label>
                      <label>
                        Nombre de transactions / jour ({cfg.max_transactions_per_day})
                        <input
                          type="range"
                          min={1}
                          max={MAX_AGENT_TRANSACTIONS_PER_DAY}
                          step={1}
                          disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                          value={Math.min(MAX_AGENT_TRANSACTIONS_PER_DAY, Math.max(1, cfg.max_transactions_per_day))}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { max_transactions_per_day: Math.max(1, Number(event.target.value) || 1) })}
                        />
                      </label>
                    </div>
                  </article>
                );
              })() : null}

              <section className="cockpitStreamGrid">
                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Transactions à venir</h2>
                    <span>{financeUpcomingCockpitRows.length} élément(s)</span>
                  </div>
                  {financeUpcomingCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction ou recommandation planifiée pour le moment.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {financeUpcomingCockpitRows.map((row) => (
                        <article className="cockpitTransactionRow" key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong>{row.amountLabel}</strong>
                          </div>
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Dernières transactions</h2>
                    <span>{financeRecentCockpitRows.length} élément(s)</span>
                  </div>
                  {financeRecentCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction historisée sur vos portefeuilles Finance.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {financeRecentCockpitRows.map((row) => (
                        <article className="cockpitTransactionRow" key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong className={row.pnlAmount >= 0 ? 'up' : 'down'}>{formatSignedEuro(row.pnlAmount, '0.00 €')}</strong>
                          </div>
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                          <div className="cockpitTransactionMetrics">
                            <span className={row.pnlAmount >= 0 ? 'up' : 'down'}>
                              {row.pnlPct === null ? 'n/d' : `${row.pnlPct >= 0 ? '+' : ''}${row.pnlPct.toFixed(1)}%`}
                            </span>
                            <span>Frais {row.fees.toFixed(2)} €</span>
                            <span>Impôts FR {row.taxesFr.toFixed(2)} €</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </section>

              <section className="cockpitPortfolioColumns">
                <article className="featureCard cockpitPortfolioSection real">
                  <div className="cardHeader">
                    <h2>Portefeuilles réels</h2>
                    <span>{financeRealPortfoliosForCockpit.length} portefeuille(s)</span>
                  </div>
                  {financeRealPortfoliosForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille réel actif pour le moment.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {financeRealPortfoliosForCockpit.map((portfolio) => {
                        const evolution = formatPortfolioEvolution(portfolio.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard real" key={`finance-real-cockpit-${portfolio.id}`} onClick={() => openFinancePortfolioDetail(portfolio)} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge real">Réel</span>
                              <span className="metaPill">{portfolio.agent_name}</span>
                            </div>
                            <strong>₿ {portfolio.label}</strong>
                            <p>{portfolio.last_sync_at ? `Synchronisé le ${formatDateTimeFr(portfolio.last_sync_at)}` : 'Synchronisation requise'}</p>
                            <div className="cockpitPortfolioMiniValue">{portfolio.current_value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={portfolio.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--teal)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitPortfolioSection virtual">
                  <div className="cardHeader">
                    <h2>Portefeuilles fictifs</h2>
                    <span>{financeVirtualPortfoliosForCockpit.length} portefeuille(s)</span>
                  </div>
                  {financeVirtualPortfoliosForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille fictif configuré.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {financeVirtualPortfoliosForCockpit.map((portfolio) => {
                        const evolution = formatPortfolioEvolution(portfolio.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard virtual" key={`finance-virtual-cockpit-${portfolio.id}`} onClick={() => openFinancePortfolioDetail(portfolio)} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge virtual">Fictif</span>
                              <span className="metaPill">{portfolio.agent_name}</span>
                            </div>
                            <strong>₿ {portfolio.label}</strong>
                            <p>Simulation locale · {portfolio.status === 'active' ? 'active' : 'inactive'}</p>
                            <div className="cockpitPortfolioMiniValue">{portfolio.current_value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={portfolio.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--brand)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              </section>

              {visibleDecisionInsights.length > 0 ? (
                <article className="featureCard">
                  <div className="cardHeader">
                    <h2>Recommandations IA applicables</h2>
                    <span>{visibleDecisionInsights.length} recommandation(s) visible(s)</span>
                  </div>
                  <div className="cockpitRecommendationGrid">
                    {visibleDecisionInsights.slice(0, 6).map((decision) => {
                      const targetPortfolioId = resolveDecisionPortfolioId(decision.portfolio_id ?? null);
                      const linkedPortfolio = targetPortfolioId ? allPortfolios.find((portfolio) => portfolio.id === targetPortfolioId) ?? null : null;
                      const suggestedAmount = linkedPortfolio && linkedPortfolio.current_value > 0
                        ? Math.max(10, Math.min(250, linkedPortfolio.current_value * 0.03))
                        : 25;
                      return (
                        <article className={`decisionCard ${inferDecisionSide(decision)}`} key={`finance-direct-decision-${decision.id}`}>
                          <div className="decisionCardTop">
                            <span className="decisionSide">{inferDecisionSide(decision) === 'buy' ? 'ACHAT' : 'VENTE'}</span>
                            <span className="decisionAsset">{inferDecisionAsset(decision)}</span>
                            {linkedPortfolio ? <span className="metaPill">{linkedPortfolio.label}</span> : null}
                            <span className="decisionAmount">{suggestedAmount.toFixed(2)} €</span>
                          </div>
                          <strong>{decision.title}</strong>
                          <p className="decisionRationale">{decision.detail}</p>
                          <div className="decisionActions">
                            <button className="approveButton" disabled={decisionActionLoading || !targetPortfolioId} onClick={() => requestDecisionAction(decision, true, { targetPortfolioId: targetPortfolioId ?? undefined, side: inferDecisionSide(decision), amount: suggestedAmount })} type="button">Appliquer maintenant</button>
                            <button className="secondaryButton" onClick={() => openDecisionWizard(decision)} type="button">Ouvrir l assistant</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </article>
              ) : null}

              <section className="portfolioHero">
                <div className="portfolioIntro">
                  <p className="sectionTag">Cockpit investisseur</p>
                  <h1>Vue d ensemble de votre patrimoine.</h1>
                  <p className="bodyText">Tous vos portefeuilles consolidés, les alertes prioritaires et les actions recommandées par votre agent IA. Cliquez sur les portefeuilles ci-dessus pour filtrer l affichage.</p>
                  <div className="profileMeta">
                    <span className="metaPill">Profil: {user?.role ?? 'utilisateur'}</span>
                    <span className="metaPill">Theme: {String(user?.personal_settings?.theme ?? 'family')}</span>
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

              <section className="dashboardChartsGrid" style={{ marginTop: 4 }}>
                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Répartition du patrimoine réel</h2>
                    <span>{financeValueDistribution.length} portefeuille(s)</span>
                  </div>
                  {financeValueDistribution.length === 0 ? (
                    <p className="helperText">Ajoutez un portefeuille réel pour visualiser la répartition.</p>
                  ) : (
                    <>
                      <div className="stackedBarTrack">
                        {financeValueDistribution.map((row) => (
                          <span key={`finance-share-${row.id}`} className="stackedBarSegment" style={{ width: `${Math.max(4, row.weight)}%` }} title={`${row.label}: ${row.weight.toFixed(1)}%`} />
                        ))}
                      </div>
                      <div className="miniLegendGrid">
                        {financeValueDistribution.map((row) => (
                          <div key={`finance-share-legend-${row.id}`} className="miniLegendItem">
                            <span className="miniLegendDot" />
                            <strong>{row.label}</strong>
                            <span>{row.weight.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </article>

                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Momentum 7 jours</h2>
                    <span>Hausse / baisse par portefeuille</span>
                  </div>
                  <div className="barRowsGrid">
                    {financeMomentumBars.map((row) => (
                      <div key={`finance-momentum-${row.id}`} className="barRowItem">
                        <span>{row.label}</span>
                        <div className="barTrack">
                          <div className={`barFill ${(row.change7d ?? 0) >= 0 ? 'up' : 'down'}`} style={{ width: `${row.normalized}%` }} />
                        </div>
                        <strong className={(row.change7d ?? 0) >= 0 ? 'up' : 'down'}>{row.change7d === null ? 'n/d' : `${row.change7d >= 0 ? '+' : ''}${row.change7d.toFixed(1)}%`}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Activité transactions 7 jours</h2>
                    <span>Achats + ventes</span>
                  </div>
                  <div className="activityColumns">
                    {financeOps7d.map((row) => (
                      <div key={`finance-ops-day-${row.key}`} className="activityColumnItem" title={`${row.full}: ${row.count} transaction(s)`}>
                        <span className="activityColumnValue">{row.count}</span>
                        <div className="activityColumnTrack">
                          <div className="activityColumnBar" style={{ height: `${Math.max(8, row.normalized)}%` }} />
                        </div>
                        <span className="activityColumnLabel">{row.label}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              {/* Vigilance section — priority alert strip */}
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
                if (visibleDecisionInsights.length > 5) {
                  vigilanceItems.push({ level: 'warn', message: `${visibleDecisionInsights.length} décisions IA en attente de validation. Traitez-les dans Portefeuilles.`, action: 'Portefeuilles', actionView: 'portfolios' });
                }
                const autopilotPortfolios = allPortfolios.filter((p) => getAgentConfig(p.id).enabled && getAgentConfig(p.id).mode === 'autopilot');
                if (autopilotPortfolios.length > 0) {
                  vigilanceItems.push({ level: 'info', message: `Pilote automatique actif sur ${autopilotPortfolios.map((p) => p.label).join(', ')}. Transactions exécutées dans les limites de vos quotas.` });
                }
                if (vigilanceItems.length === 0) {
                  return null;
                }
                const dominantLevel = vigilanceItems.some((i) => i.level === 'danger') ? 'danger' : vigilanceItems.some((i) => i.level === 'warn') ? 'warn' : 'info';
                return (
                  <div className={`alertStrip ${dominantLevel === 'danger' ? '' : dominantLevel}`} role="alert">
                    <div className="alertStripHeader">
                      <span>{dominantLevel === 'danger' ? '🔴' : dominantLevel === 'warn' ? '🟡' : '🔵'}</span>
                      Points de vigilance — {vigilanceItems.length} point(s)
                    </div>
                    {vigilanceItems.map((item, idx) => (
                      <div key={idx} className="alertItem">
                        <span className="alertItemText">{item.message}</span>
                        <span className={`alertItemLevel ${item.level === 'danger' ? 'danger' : item.level === 'warn' ? 'warn' : 'info'}`}>
                          {item.level === 'danger' ? 'Critique' : item.level === 'warn' ? 'Attention' : 'Info'}
                        </span>
                        {item.action && item.actionView ? (
                          <button className="ghostButton" style={{ whiteSpace: 'nowrap', fontSize: '.75rem', padding: '6px 11px' }} onClick={() => { setAppView(item.actionView!); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">{item.action} →</button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {loading ? <article className="featureCard">Chargement de votre espace...</article> : null}
              {dashboard ? (
                <>
                  {visibleDecisionInsights.length > 0 ? (
                    <section style={{ marginBottom: 18 }}>
                      <article className="featureCard" style={{ borderColor: 'var(--brand-border)', background: 'linear-gradient(135deg,var(--brand-soft) 0%,#fff 60%)' }}>
                        <div className="decisionQueueHeader">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2>🤖 Décisions IA en attente</h2>
                            <span className="decisionQueueBadge">{visibleDecisionInsights.length}</span>
                          </div>
                          <button className="ghostButton" style={{ fontSize: '.78rem' }} onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Tout voir →</button>
                        </div>
                        <div className="decisionQueue">
                          {visibleDecisionInsights.slice(0, 3).map((decision) => {
                            const side = inferDecisionSide(decision);
                            const decisionKey = decisionInsightKey(decision);
                            const isWizardOpen = assistantWizardDecisionId === decisionKey;
                            const confidenceLevel = extractDiscreteConfidenceLevel(decision.value);
                            return (
                              <div className={`decisionCard ${side}`} key={decision.id}>
                                <div className="decisionCardTop">
                                  <span className="decisionSide">{side === 'buy' ? 'ACHAT' : side === 'sell' ? 'VENTE' : 'HOLD'}</span>
                                  <span className="decisionAsset">{inferDecisionAsset(decision)}</span>
                                  {decision.portfolio_label ? <span className="metaPill" style={{ fontSize: '.68rem' }}>{decision.portfolio_label}</span> : null}
                                  <span className="decisionAmount">{decision.value}</span>
                                  {confidenceLevel ? <ConfidenceDots level={confidenceLevel} /> : null}
                                </div>
                                <p className="decisionRationale">{decision.detail}</p>
                                <div className="decisionActions">
                                  <button className="secondaryButton" onClick={() => openDecisionWizard(decision)} type="button">Assistant IA</button>
                                  <span className="helperText" style={{ fontSize: '.72rem', margin: 0 }}>Mode recommandation: confirmation requise</span>
                                </div>
                                {isWizardOpen ? (
                                  <div className="infoPanel" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      <button className={selectedDecisionSide === 'buy' ? 'tagButton active' : 'tagButton'} onClick={() => setSelectedDecisionSide('buy')} type="button">Cas Achat</button>
                                      <button className={selectedDecisionSide === 'sell' ? 'tagButton active' : 'tagButton'} onClick={() => setSelectedDecisionSide('sell')} type="button">Cas Vente</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      <label>
                                        Portefeuille
                                        <select value={selectedDecisionPortfolioId} onChange={(event) => setSelectedDecisionPortfolioId(event.target.value)}>
                                          {allPortfolios.map((portfolio) => (
                                            <option key={`decision-cell-target-${portfolio.id}`} value={portfolio.id}>{portfolio.type === 'virtual' ? '⚗️ Virtuel' : 'Réel'} · {portfolio.label}{portfolio.status !== 'active' ? ' (inactif)' : ''}</option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        Montant (€)
                                        <input type="number" min={MIN_MONETARY_LIMIT} step="0.1" value={selectedDecisionAmount} onChange={(event) => setSelectedDecisionAmount(Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT))} />
                                      </label>
                                    </div>
                                    <div className="providerActions fullWidth" style={{ marginTop: 2 }}>
                                      <button className="approveButton" disabled={decisionActionLoading || !selectedDecisionPortfolioId} onClick={() => requestDecisionAction(decision, true, { targetPortfolioId: selectedDecisionPortfolioId, side: selectedDecisionSide, amount: selectedDecisionAmount })} type="button">Confirmer sur le portefeuille</button>
                                      <button className="ghostButton" disabled={decisionActionLoading || !selectedDecisionPortfolioId} onClick={() => requestDecisionAction(decision, false, { targetPortfolioId: selectedDecisionPortfolioId, side: selectedDecisionSide, amount: selectedDecisionAmount })} type="button">Refuser recommandation</button>
                                      <button className="ghostButton" onClick={() => setAssistantWizardDecisionId(null)} type="button">Fermer wizard</button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {visibleDecisionInsights.length > 3 ? (
                            <p className="helperText" style={{ textAlign: 'center', padding: '8px 0' }}>+{visibleDecisionInsights.length - 3} autre(s) dans <button className="textLinkButton" onClick={() => { setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Portefeuilles</button></p>
                          ) : null}
                        </div>
                      </article>
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
                      {visiblePortfolios.map((p) => {
                        const cfg = getAgentConfig(p.id);
                        const aiMode = p.type === 'virtual' ? 'supervised' : !cfg.enabled ? 'manual' : cfg.mode === 'autopilot' ? 'autopilot' : 'supervised';
                        const aiModeLabel = aiMode === 'autopilot' ? '🤖 Auto' : aiMode === 'supervised' ? '👁 Supervisé' : '🖐 Manuel';
                        return (
                          <button key={p.id} className={`portfolioCard${p.type === 'virtual' ? ' virtualCard' : ''} mode${aiMode.charAt(0).toUpperCase() + aiMode.slice(1)}`} onClick={() => { setSelectedPortfolio(p); setPortfolioDetailOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                            <div className="pCardHeader">
                              <span className="agentBadge">{p.agent_name}</span>
                              <span className="metaPill">{p.type === 'virtual' ? '⚗️ Virtuel' : 'Intégration'}</span>
                            </div>
                            <strong className="pCardLabel">₿ {p.label}</strong>
                            <div className="pCardValue">{p.current_value > 0 ? `${p.current_value.toFixed(2)} €` : '–'}</div>
                            <div className={`pCardPnl${p.pnl >= 0 ? ' up' : ' down'}`}>{p.pnl !== 0 ? `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} € · ROI ${p.roi >= 0 ? '+' : ''}${p.roi.toFixed(1)}%` : 'Synchronisez pour le ROI'}</div>
                            <div className="pCardSparkline"><Sparkline data={p.history.slice(-30)} color={p.pnl >= 0 ? 'var(--ok)' : 'var(--danger)'} /></div>
                            {p.ai_advice[0] ? <p className="pCardAdvice">{p.ai_advice[0].text}</p> : null}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                              <span className={`aiModeBadge ${aiMode}`}>{aiModeLabel}</span>
                              <span className="pCardFooter">Voir le détail →</span>
                            </div>
                          </button>
                        );
                      })}
                      {visiblePortfolios.length === 0 ? (
                        <div className="emptyState" style={{ gridColumn: '1/-1' }}>
                          <span className="emptyStateIcon">📂</span>
                          <p className="emptyStateTitle">Aucun portefeuille actif</p>
                          <p className="emptyStateText">Activez un connecteur dans Configuration → Intégrations ou utilisez le portefeuille virtuel ⚗️.</p>
                        </div>
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
                          <div className="subscribePanel" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <p className="subscribePanelTitle">Ordre guide Robin IA</p>
                                <strong style={{ fontSize: '1rem' }}>Souscrire a {subscribeTarget.name} ({subscribeTarget.symbol})</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>{subscribeTarget.rationale}</p>
                              </div>
                              <button className="subscribeCancelBtn" onClick={() => setSubscribeSignalId(null)} type="button">Fermer</button>
                            </div>
                            <div className="subscribeFields">
                              <div className="subscribeField">
                                <label>Portefeuille cible</label>
                                <select
                                  value={subscribePortfolioId}
                                  onChange={(e) => setSubscribePortfolioId(e.target.value)}
                                >
                                  <option value="">— Choisir —</option>
                                  {activePorts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.type === 'virtual' ? '⚗️ ' : ''}{p.label}{p.type === 'virtual' ? ' (virtuel)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="subscribeField">
                                <label>Montant (€)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={subscribeAmountInput}
                                  onChange={(e) => {
                                    setSubscribeAmountInput(e.target.value);
                                    const normalized = normalizeAmountInput(e.target.value, subscribeTarget.min_investment);
                                    setSubscribeAmount(normalized);
                                  }}
                                  onBlur={() => {
                                    const normalized = normalizeAmountInput(subscribeAmountInput, subscribeTarget.min_investment);
                                    setSubscribeAmount(normalized);
                                    setSubscribeAmountInput(String(normalized));
                                  }}
                                  placeholder={`Min ${subscribeTarget.min_investment}`}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {[subscribeTarget.min_investment, Math.max(25, subscribeTarget.min_investment), 50, 100, 250].filter((v, i, arr) => arr.indexOf(v) === i).map((preset) => (
                                <button
                                  key={`preset-${preset}`}
                                  className={subscribeAmount === preset ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'}
                                  onClick={() => {
                                    setSubscribeAmount(preset);
                                    setSubscribeAmountInput(String(preset));
                                  }}
                                  type="button"
                                >
                                  {preset} €
                                </button>
                              ))}
                            </div>
                            <div className="subscribeActions">
                              <button
                                className="subscribeConfirmBtn"
                                disabled={subscribeLoading || !subscribePortfolioId}
                                onClick={() => {
                                  const normalized = normalizeAmountInput(subscribeAmountInput, subscribeTarget.min_investment);
                                  setSubscribeAmount(normalized);
                                  setSubscribeAmountInput(String(normalized));
                                  void subscribeToMarketSignal(subscribeTarget, subscribePortfolioId, normalized);
                                }}
                                type="button"
                              >
                                {subscribeLoading ? 'Envoi...' : `Confirmer l achat (${subscribeAmount.toFixed(2)} €)`}
                              </button>
                              <button className="subscribeCancelBtn" onClick={() => setSubscribeSignalId(null)} type="button">Annuler</button>
                            </div>
                            {subscribePortfolioId && allPortfolios.find((p) => p.id === subscribePortfolioId)?.type === 'virtual' ? (
                              <p style={{ margin: '8px 0 0', fontSize: '.75rem', color: 'var(--indigo)' }}>⚗️ Ordre simulé sur le portefeuille virtuel — aucun argent réel engagé.</p>
                            ) : null}
                            <p style={{ margin: '6px 0 0', fontSize: '.72rem', color: 'var(--muted)' }}>Montant minimum : {subscribeTarget.min_investment} €. Vous pouvez saisir un montant libre (ex: 37.5). L ordre sera soumis à validation avant exécution.</p>
                          </div>
                        ) : null}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                          {filtered.map((signal) => (
                            <div key={signal.id} className="marketSignalCard">
                              <div className="marketSignalTop">
                                <div>
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                    <span className="marketSignalCategory">
                                      {signal.category === 'crypto' ? 'Crypto' : signal.category === 'actions' ? 'Action' : signal.category === 'etf' ? 'ETF' : 'Obligation'}
                                    </span>
                                    <span className={`statusBadge ${signal.risk === 'faible' ? 'ok' : signal.risk === 'modere' ? 'idle' : 'warn'}`} style={{ fontSize: '.68rem' }}>
                                      <span className={`statusDot ${signal.risk === 'faible' ? 'ok' : signal.risk === 'modere' ? 'idle' : 'warn'}`} />
                                      Risque {signal.risk}
                                    </span>
                                  </div>
                                  <strong className="marketSignalName">{signal.name}</strong>
                                  <p style={{ margin: 0, fontSize: '.74rem', color: 'var(--muted)' }}>{signal.symbol}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <strong className={`marketSignalPerf ${signal.performance_30d >= 0 ? 'up' : 'down'}`}>
                                    {signal.performance_30d >= 0 ? '+' : ''}{signal.performance_30d.toFixed(1)}%
                                  </strong>
                                  <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>30 jours</span>
                                </div>
                              </div>
                              <div className="marketSignalMeta">
                                <span>Confiance Robin IA</span>
                                <div className="confidenceDots">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={`conf-${signal.id}-${i}`} className={i < signal.confidence ? 'confidenceDot filled' : 'confidenceDot'} />
                                  ))}
                                </div>
                              </div>
                              <p className="marketSignalRationale">{signal.rationale}</p>
                              <button
                                className="secondaryButton"
                                onClick={() => {
                                  setSubscribeSignalId(signal.id);
                                  setSubscribeAmount(signal.min_investment);
                                  setSubscribeAmountInput(String(signal.min_investment));
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

          {isFinanceCryptoActive && appView === 'portfolios' ? (
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
                    const cfg = getAgentConfig(p.id);
                    const portfolioDecisions = visibleDecisionInsights.filter((d) => d.portfolio_id === p.id);
                    const maxAmountCap = Math.max(250, Math.min(5000, Math.round((p.current_value > 0 ? p.current_value : 1000) * 1.2)));
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
                            {p.type === 'virtual'
                              ? <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--indigo)' }}>Simulation IA locale continue</p>
                              : p.last_sync_at
                                ? <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--muted)' }}>Dernière sync: {new Date(p.last_sync_at).toLocaleString('fr-FR')}</p>
                                : <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--warn)' }}>Jamais synchronisé</p>}
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
                                  <div className="compactRow">
                                    <strong>{decision.title}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span className="metaPill">{decision.value}</span>
                                      {extractDiscreteConfidenceLevel(decision.value) ? <ConfidenceDots level={extractDiscreteConfidenceLevel(decision.value)!} /> : null}
                                    </div>
                                  </div>
                                  <p style={{ fontSize: '.82rem', margin: '6px 0 4px' }}>{decision.detail}</p>
                                  <small className={trendTone(decision.trend)}>{decision.trend}</small>
                                  {cfg.enabled && cfg.mode === 'autopilot' ? (
                                    <p className="helperText" style={{ color: 'var(--warn)', marginTop: 6 }}>⚡ Pilote auto — exécution automatique selon vos quotas</p>
                                  ) : (
                                    (() => {
                                      const decisionKey = decisionInsightKey(decision);
                                      const isWizardOpen = assistantWizardDecisionId === decisionKey;
                                      return (
                                        <>
                                          <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                                            <button className="secondaryButton" onClick={() => openDecisionWizard(decision)} type="button">Assistant IA</button>
                                            <span className="helperText" style={{ margin: 0, fontSize: '.72rem' }}>Wizard contextuel</span>
                                          </div>
                                          {isWizardOpen ? (
                                            <div className="infoPanel" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button className={selectedDecisionSide === 'buy' ? 'tagButton active' : 'tagButton'} onClick={() => setSelectedDecisionSide('buy')} type="button">Cas Achat</button>
                                                <button className={selectedDecisionSide === 'sell' ? 'tagButton active' : 'tagButton'} onClick={() => setSelectedDecisionSide('sell')} type="button">Cas Vente</button>
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                <label>
                                                  Portefeuille
                                                  <select value={selectedDecisionPortfolioId} onChange={(event) => setSelectedDecisionPortfolioId(event.target.value)}>
                                                    {allPortfolios.map((portfolio) => (
                                                      <option key={`decision-wizard-target-${portfolio.id}`} value={portfolio.id}>{portfolio.type === 'virtual' ? '⚗️ Virtuel' : 'Réel'} · {portfolio.label}{portfolio.status !== 'active' ? ' (inactif)' : ''}</option>
                                                    ))}
                                                  </select>
                                                </label>
                                                <label>
                                                  Montant (€)
                                                  <input type="number" min={MIN_MONETARY_LIMIT} step="0.1" value={selectedDecisionAmount} onChange={(event) => setSelectedDecisionAmount(Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT))} />
                                                </label>
                                              </div>
                                              <div className="providerActions fullWidth" style={{ marginTop: 2 }}>
                                                <button className="secondaryButton" disabled={decisionActionLoading || !selectedDecisionPortfolioId} onClick={() => requestDecisionAction(decision, true, { targetPortfolioId: selectedDecisionPortfolioId, side: selectedDecisionSide, amount: selectedDecisionAmount })} type="button">
                                                  {decisionActionLoading ? 'Traitement...' : 'Confirmer sur le portefeuille'}
                                                </button>
                                                <button className="ghostButton" disabled={decisionActionLoading || !selectedDecisionPortfolioId} onClick={() => requestDecisionAction(decision, false, { targetPortfolioId: selectedDecisionPortfolioId, side: selectedDecisionSide, amount: selectedDecisionAmount })} type="button">Refuser recommandation</button>
                                                <button className="ghostButton" onClick={() => setAssistantWizardDecisionId(null)} type="button">Fermer wizard</button>
                                              </div>
                                            </div>
                                          ) : null}
                                        </>
                                      );
                                    })()
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="helperText" style={{ fontSize: '.82rem' }}>Aucune proposition IA en attente pour ce portefeuille.</p>
                        )}

                        {/* Agent IA configuration — redesigned with aiModeSelector */}
                        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--card-radius-sm)', border: 'var(--card-border)', padding: '14px 16px', display: 'grid', gap: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: '.95rem' }}>Pilotage Agent IA</h3>
                              {cfg.enabled ? (
                                <span className={`aiModeBadge ${cfg.mode === 'autopilot' ? 'autopilot' : cfg.mode === 'supervised' ? 'supervised' : 'manual'}`}>
                                  {cfg.mode === 'autopilot' ? '🤖 Autopilote' : cfg.mode === 'supervised' ? '👁 Supervisé' : '🖐 Manuel'}
                                </span>
                              ) : (
                                <span className="aiModeBadge manual">🖐 Manuel</span>
                              )}
                            </div>
                            <label className="checkRow" style={{ margin: 0, padding: '5px 10px', fontSize: '.78rem' }}>
                              <input type="checkbox" checked={cfg.enabled} onChange={(e) => void updateAgentConfig(p.id, { enabled: e.target.checked })} />
                              <span>Agent activé</span>
                            </label>
                          </div>

                          {cfg.enabled ? (
                            <div style={{ display: 'grid', gap: 13 }}>
                              {/* Mode selector — 3-option visual */}
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: '.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Mode de pilotage</p>
                                <div className="aiModeSelector">
                                  <button
                                    className={`aiModeOption${cfg.mode === 'manual' ? ' active manual' : ''}`}
                                    onClick={() => void updateAgentConfig(p.id, { mode: 'manual' })}
                                    type="button"
                                  >
                                    <span>🖐</span>
                                    <strong>Manuel</strong>
                                    <small>Vous validez chaque ordre</small>
                                  </button>
                                  <button
                                    className={`aiModeOption${cfg.mode === 'supervised' ? ' active supervised' : ''}`}
                                    onClick={() => void updateAgentConfig(p.id, { mode: 'supervised' })}
                                    type="button"
                                  >
                                    <span>👁</span>
                                    <strong>Validation humaine</strong>
                                    <small>IA propose, vous approuvez</small>
                                  </button>
                                  <button
                                    className={`aiModeOption${cfg.mode === 'autopilot' ? ' active autopilot' : ''}`}
                                    onClick={() => void updateAgentConfig(p.id, { mode: 'autopilot' })}
                                    type="button"
                                  >
                                    <span>🤖</span>
                                    <strong>Autopilote</strong>
                                    <small>IA exécute dans vos limites</small>
                                  </button>
                                </div>
                                {cfg.mode === 'autopilot' ? (
                                  <div className="infoPanel" style={{ marginTop: 8, padding: '9px 12px', background: 'var(--warn-soft)', border: '1px solid var(--warn-border)' }}>
                                    <p style={{ margin: 0, fontSize: '.78rem', color: '#92400e' }}>⚠️ En autopilote, l agent IA exécute les transactions sans validation. Vos quotas ci-dessous constituent le seul garde-fou.</p>
                                  </div>
                                ) : null}
                              </div>

                              {/* Quotas */}
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: '.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Limites & quotas</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <label style={{ fontSize: '.82rem', display: 'grid', gap: 5 }}>
                                    <span style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>Montant max / ordre</span>
                                    <div className="compactRow" style={{ margin: 0 }}>
                                      <strong>{cfg.max_amount.toFixed(1)} €</strong>
                                      <span className="metaPill">Plage 0.1 - {maxAmountCap} €</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={MIN_MONETARY_LIMIT}
                                      max={maxAmountCap}
                                      step={0.1}
                                      value={Math.min(maxAmountCap, Math.max(MIN_MONETARY_LIMIT, Number(cfg.max_amount.toFixed(1))))}
                                      onChange={(e) => void updateAgentConfig(p.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(e.target.value) || MIN_MONETARY_LIMIT) })}
                                    />
                                  </label>
                                  <label style={{ fontSize: '.82rem', display: 'grid', gap: 5 }}>
                                    <span style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>Max ordres / jour</span>
                                    <div className="compactRow" style={{ margin: 0 }}>
                                      <strong>{cfg.max_transactions_per_day} ordre(s)</strong>
                                      <span className="metaPill">Plage 1 - 20</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={1}
                                      max={20}
                                      step={1}
                                      value={Math.min(20, Math.max(1, Math.round(cfg.max_transactions_per_day)))}
                                      onChange={(e) => void updateAgentConfig(p.id, { max_transactions_per_day: Math.max(1, Number(e.target.value) || 1) })}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Domain policies */}
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: '.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Politique par classe d'actif</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 8 }}>
                                  {(['crypto', 'actions', 'etf', 'obligations'] as AgentDomain[]).map((domain) => (
                                    <label key={`${p.id}-${domain}`} style={{ fontSize: '.78rem', display: 'grid', gap: 4 }}>
                                      <span style={{ color: 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>{domain}</span>
                                      <select
                                        value={cfg.domain_policy[domain]}
                                        onChange={(e) => void updateAgentConfig(p.id, { domain_policy: { ...cfg.domain_policy, [domain]: e.target.value as AgentDomainPolicy } })}
                                        style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-md)', background: 'var(--surface)', fontSize: '.82rem' }}
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

          {isFinanceCryptoActive && appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsIntroCard">
                <div className="cardHeader">
                  <h2>Options Finance</h2>
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
                    <input type="email" value={user?.email ?? ''} disabled />
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
                  <label>
                    Objectif net (après taxes) en €
                    <input
                      value={settingsForm.objectiveNetGain}
                      onChange={(event) => setSettingsForm((state) => ({ ...state, objectiveNetGain: event.target.value }))}
                      type="number"
                      min={0}
                      step="10"
                    />
                  </label>
                  <label>
                    Période de l objectif
                    <select value={settingsForm.objectivePeriod} onChange={(event) => setSettingsForm((state) => ({ ...state, objectivePeriod: normalizeGoalPeriod(event.target.value) }))}>
                      <option value="7d">7 jours</option>
                      <option value="1m">1 mois</option>
                      <option value="3m">3 mois</option>
                      <option value="1y">1 an</option>
                    </select>
                  </label>
                  <p className="helperText">La batterie du bandeau se charge selon votre progression de navigation dans les menus. L objectif net reste affiché dans les KPI.</p>
                  <p className="helperText">Prefill navigateur: {clientContext.country || clientContext.locale} · {clientContext.time_zone}</p>
                  <button className="primaryButton" disabled={submitting} type="submit">
                    {submitting ? 'Enregistrement...' : 'Sauvegarder ma configuration'}
                  </button>
                </form>
                ) : null}
              </article>

                <article className="featureCard settingsCard">
                  <div className="cardHeader">
                    <h2>Pilotage IA — Finance virtuel</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Mode manuel, validation humaine ou autopilot + seuils</span>
                    </div>
                  </div>
                  {(() => {
                    const vp = allPortfolios.find((portfolio) => portfolio.type === 'virtual');
                    if (!vp) {
                      return <p className="helperText">Portefeuille virtuel Finance indisponible pour le moment.</p>;
                    }
                    const cfg = getAgentConfig(vp.id);
                    return (
                      <div style={{ display: 'grid', gap: 12 }}>
                        <label className="checkRow" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={virtualAppsEnabled.finance}
                            onChange={(event) => void updateVirtualAppPreference('finance', event.target.checked)}
                          />
                          <span>Activer le portefeuille fictif Finance</span>
                        </label>
                        <label className="checkRow" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            disabled={!virtualAppsEnabled.finance}
                            onChange={(event) => void updateAgentConfig(vp.id, { enabled: event.target.checked, mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual' })}
                          />
                          <span>Activer l agent IA sur le portefeuille fictif</span>
                        </label>
                        <label>
                          Mode IA
                          <div className="aiModeSelector">
                            <button
                              className={`aiModeOption ${cfg.mode === 'manual' ? 'active manual' : ''}`}
                              disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                              onClick={() => void updateAgentConfig(vp.id, { mode: 'manual' })}
                              type="button"
                            >
                              <span>🖐</span>
                              <strong>Manuel</strong>
                              <small>Décisions humaines</small>
                            </button>
                            <button
                              className={`aiModeOption ${cfg.mode === 'supervised' ? 'active supervised' : ''}`}
                              disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                              onClick={() => void updateAgentConfig(vp.id, { mode: 'supervised' })}
                              type="button"
                            >
                              <span>👁</span>
                              <strong>Validation humaine</strong>
                              <small>L IA propose</small>
                            </button>
                            <button
                              className={`aiModeOption ${cfg.mode === 'autopilot' ? 'active autopilot' : ''}`}
                              disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                              onClick={() => void updateAgentConfig(vp.id, { mode: 'autopilot' })}
                              type="button"
                            >
                              <span>🤖</span>
                              <strong>Autopilot</strong>
                              <small>Exécution automatique</small>
                            </button>
                          </div>
                        </label>
                        <label>
                          Montant maximum transaction ({cfg.max_amount.toFixed(1)} €)
                          <input
                            type="range"
                            min={MIN_MONETARY_LIMIT}
                            max={MAX_AGENT_TRANSACTION_AMOUNT}
                            step={0.1}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            value={Math.min(MAX_AGENT_TRANSACTION_AMOUNT, Math.max(MIN_MONETARY_LIMIT, cfg.max_amount))}
                            onChange={(event) => void updateAgentConfig(vp.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                          />
                        </label>
                        <label>
                          Nombre de transactions / jour ({cfg.max_transactions_per_day})
                          <input
                            type="range"
                            min={1}
                            max={MAX_AGENT_TRANSACTIONS_PER_DAY}
                            step={1}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            value={Math.min(MAX_AGENT_TRANSACTIONS_PER_DAY, Math.max(1, cfg.max_transactions_per_day))}
                            onChange={(event) => void updateAgentConfig(vp.id, { max_transactions_per_day: Math.max(1, Number(event.target.value) || 1) })}
                          />
                        </label>
                        <p className="helperText" style={{ margin: 0 }}>
                          En mode autopilot, Robin IA crée des transactions simulées pour faire évoluer le portefeuille fictif selon vos seuils.
                        </p>
                      </div>
                    );
                  })()}
                </article>

              {/* Virtual Portfolio settings tile */}
              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>⚗️ Portefeuille fictif Cryptos</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Bac à sable &bull; 100 €</span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('virtual')} type="button">{settingsTileCollapsed.virtual ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.virtual ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="infoPanel" style={{ background: 'rgba(250,200,40,.08)', border: '1px solid rgba(250,200,40,.3)', borderRadius: 8, padding: '10px 14px' }}>
                      <strong>Actif par défaut — aucune intégration requise</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '.8rem' }}>Robin IA dispose d'un portefeuille bac à sable de <strong>100 €</strong> pour tester ses allocations de portefeuille sans risque. Il est toujours disponible, même sans connecteur bancaire.</p>
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
                              checked={virtualAppsEnabled.finance}
                              onChange={(e) => void updateVirtualAppPreference('finance', e.target.checked)}
                            />
                            <span><strong>Application Finance</strong> — {virtualAppsEnabled.finance ? 'portefeuille virtuel activé (100 € simulés)' : 'portefeuille virtuel désactivé'}</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={virtualAppsEnabled.betting}
                              onChange={(e) => void updateVirtualAppPreference('betting', e.target.checked)}
                            />
                            <span><strong>Application Paris en ligne</strong> — {virtualAppsEnabled.betting ? 'portefeuille virtuel activé (100 € simulés)' : 'portefeuille virtuel désactivé'}</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={virtualAppsEnabled.racing}
                              onChange={(e) => void updateVirtualAppPreference('racing', e.target.checked)}
                            />
                            <span><strong>Application Paris hippiques</strong> — {virtualAppsEnabled.racing ? 'portefeuille virtuel activé (100 € simulés)' : 'portefeuille virtuel désactivé'}</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={virtualAppsEnabled.loto}
                              onChange={(e) => void updateVirtualAppPreference('loto', e.target.checked)}
                            />
                            <span><strong>Application Loto / Euromillions</strong> — {virtualAppsEnabled.loto ? 'portefeuille virtuel activé (50 € simulés)' : 'portefeuille virtuel désactivé'}</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isVisible && virtualAppsEnabled.finance}
                              disabled={!virtualAppsEnabled.finance}
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
                    <span className={user?.mfa_enabled ? 'statusBadge ok' : 'statusBadge warn'}>
                      <span className={user?.mfa_enabled ? 'statusDot ok' : 'statusDot warn'} />
                      {user?.mfa_enabled ? 'Protege' : 'Non active'}
                    </span>
                    <button className="ghostButton" onClick={() => toggleSettingsTile('security')} type="button">{settingsTileCollapsed.security ? 'Expand' : 'Réduire'}</button>
                  </div>
                </div>
                {!settingsTileCollapsed.security ? (
                  <>
                    {user?.mfa_enabled && !mfaSecret ? (
                      <div className="infoPanel">
                        <strong>MFA active ✓</strong>
                        <p>Votre compte est protege par une authentification a deux facteurs. Mode actif: {String(user?.personal_settings?.preferred_mfa_method ?? 'email')}.</p>
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
                                    <a className="textLinkButton" href={mfaQrDataUrl} target="_blank" rel="noopener noreferrer">Ouvrir le QR code en plein ecran</a>
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
                                {submitting ? 'Verification...' : (user?.mfa_enabled ? 'Valider le nouveau QR MFA' : 'Activer MFA maintenant')}
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

          {isFinanceActionsActive && appView === 'dashboard' ? (
            <section style={{ display: 'grid', gap: 18 }}>
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Cockpit Actions PEA</h2>
                  <span>{peaMarketSignals.length} opportunité(s) Actions/ETF</span>
                </div>
                <p className="helperText" style={{ margin: 0 }}>
                  Exécution guidée inspirée du flux Coinbase: sélection du support, montant et portefeuille cible (réel ou virtuel).
                </p>
              </article>

              {!virtualAppsEnabled.finance ? (() => {
                const virtualPortfolio = allPortfolios.find((portfolio) => portfolio.type === 'virtual');
                if (!virtualPortfolio) {
                  return null;
                }
                const cfg = getAgentConfig(virtualPortfolio.id);
                return (
                  <article className="featureCard">
                    <div className="cardHeader">
                      <h2>Pilotage Cockpit · Actions fictif</h2>
                      <span>Activation portefeuille, agent IA et configuration</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <label className="checkRow" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={virtualAppsEnabled.finance}
                          onChange={(event) => void updateVirtualAppPreference('finance', event.target.checked)}
                        />
                        <span>Activer le portefeuille fictif Actions/PEA</span>
                      </label>
                      <label className="checkRow" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          disabled={!virtualAppsEnabled.finance}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { enabled: event.target.checked, mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual' })}
                        />
                        <span>Activer l agent IA Finance</span>
                      </label>
                      <label>
                        Mode IA
                        <div className="aiModeSelector">
                          <button
                            className={`aiModeOption ${cfg.mode === 'manual' ? 'active manual' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'manual' })}
                            type="button"
                          >
                            <span>🖐</span>
                            <strong>Manuel</strong>
                            <small>Décisions humaines</small>
                          </button>
                          <button
                            className={`aiModeOption ${cfg.mode === 'supervised' ? 'active supervised' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'supervised' })}
                            type="button"
                          >
                            <span>👁</span>
                            <strong>Validation humaine</strong>
                            <small>L IA propose</small>
                          </button>
                          <button
                            className={`aiModeOption ${cfg.mode === 'autopilot' ? 'active autopilot' : ''}`}
                            disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                            onClick={() => void updateAgentConfig(virtualPortfolio.id, { mode: 'autopilot' })}
                            type="button"
                          >
                            <span>🤖</span>
                            <strong>Autopilot</strong>
                            <small>Exécution automatique</small>
                          </button>
                        </div>
                      </label>
                      <label>
                        Montant maximum transaction ({cfg.max_amount.toFixed(1)} €)
                        <input
                          type="range"
                          min={MIN_MONETARY_LIMIT}
                          max={MAX_AGENT_TRANSACTION_AMOUNT}
                          step={0.1}
                          disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                          value={Math.min(MAX_AGENT_TRANSACTION_AMOUNT, Math.max(MIN_MONETARY_LIMIT, cfg.max_amount))}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                        />
                      </label>
                      <label>
                        Nombre de transactions / jour ({cfg.max_transactions_per_day})
                        <input
                          type="range"
                          min={1}
                          max={MAX_AGENT_TRANSACTIONS_PER_DAY}
                          step={1}
                          disabled={!virtualAppsEnabled.finance || !cfg.enabled}
                          value={Math.min(MAX_AGENT_TRANSACTIONS_PER_DAY, Math.max(1, cfg.max_transactions_per_day))}
                          onChange={(event) => void updateAgentConfig(virtualPortfolio.id, { max_transactions_per_day: Math.max(1, Number(event.target.value) || 1) })}
                        />
                      </label>
                    </div>
                  </article>
                );
              })() : null}

              {subscribeSignalId && peaMarketSignals.some((signal) => signal.id === subscribeSignalId) ? (
                <article className="featureCard" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-soft)' }}>
                  <div className="cardHeader">
                    <h2>Ordre guidé PEA</h2>
                    <span>{peaMarketSignals.find((signal) => signal.id === subscribeSignalId)?.name}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label>
                      Portefeuille cible
                      <select value={subscribePortfolioId} onChange={(event) => setSubscribePortfolioId(event.target.value)}>
                        <option value="">— Choisir —</option>
                        {allPortfolios.map((portfolio) => (
                          <option key={`pea-target-${portfolio.id}`} value={portfolio.id}>
                            {portfolio.type === 'virtual' ? '⚗️ ' : ''}{portfolio.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Montant (€)
                      <input type="number" min={1} step="1" value={subscribeAmount} onChange={(event) => setSubscribeAmount(Math.max(1, Number(event.target.value) || 1))} />
                    </label>
                  </div>
                  <div className="providerActions fullWidth" style={{ marginTop: 10 }}>
                    <button
                      className="secondaryButton"
                      disabled={!subscribePortfolioId || subscribeLoading}
                      onClick={() => {
                        const signal = peaMarketSignals.find((entry) => entry.id === subscribeSignalId);
                        if (!signal || !subscribePortfolioId) {
                          return;
                        }
                        void subscribeToMarketSignal(signal, subscribePortfolioId, subscribeAmount);
                      }}
                      type="button"
                    >
                      {subscribeLoading ? 'Envoi...' : 'Confirmer la souscription'}
                    </button>
                    <button className="ghostButton" onClick={() => setSubscribeSignalId(null)} type="button">Annuler</button>
                  </div>
                </article>
              ) : null}

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Univers Actions éligible PEA</h2>
                  <span>France et Europe</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 12 }}>
                  {peaMarketSignals.map((signal) => (
                    <div key={`pea-signal-${signal.id}`} className="marketSignalCard">
                      <div className="marketSignalTop">
                        <div>
                          <strong className="marketSignalName">{signal.name}</strong>
                          <p style={{ margin: 0, fontSize: '.74rem', color: 'var(--muted)' }}>{signal.symbol}</p>
                        </div>
                        <strong className={`marketSignalPerf ${signal.performance_30d >= 0 ? 'up' : 'down'}`}>
                          {signal.performance_30d >= 0 ? '+' : ''}{signal.performance_30d.toFixed(1)}%
                        </strong>
                      </div>
                      <p className="marketSignalRationale">{signal.rationale}</p>
                      <button
                        className="secondaryButton"
                        onClick={() => {
                          setSubscribeSignalId(signal.id);
                          setSubscribeAmount(Math.max(1, signal.min_investment));
                          setSubscribePortfolioId(allPortfolios[0]?.id ?? '');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        type="button"
                      >
                        Préparer ordre PEA
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {isFinanceActionsActive && appView === 'portfolios' ? (
            <section style={{ display: 'grid', gap: 18 }}>
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Portefeuilles Actions</h2>
                  <span>Support PEA et portefeuille virtuel</span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {allPortfolios.map((portfolio) => {
                    const cfg = getAgentConfig(portfolio.id);
                    const canToggleAi = portfolio.type !== 'virtual' || virtualAppsEnabled.finance;
                    return (
                      <button key={`pea-portfolio-${portfolio.id}`} className={`compactRow compactRowButton portfolioDetailRow ${portfolio.type === 'virtual' ? 'portfolioRowVirtual' : 'portfolioRowReal'}`} onClick={() => openFinancePortfolioDetail(portfolio)} style={{ alignItems: 'center' }} type="button">
                        <div>
                          <strong style={{ fontSize: '.9rem' }}>📈 {portfolio.label}</strong>
                          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>
                            {portfolio.type === 'virtual' ? 'Simulation PEA' : 'Compte titre/PEA connecté'} · {portfolio.agent_name}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <label className="checkRow quickAiToggle" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              disabled={!canToggleAi}
                              onChange={(event) => {
                                event.stopPropagation();
                                void updateAgentConfig(portfolio.id, {
                                  enabled: event.target.checked,
                                  mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual',
                                });
                              }}
                            />
                            <span>IA rapide</span>
                          </label>
                          <span className="metaPill">{cfg.enabled ? (cfg.mode === 'autopilot' ? 'Autopilot' : cfg.mode === 'supervised' ? 'Supervisé' : 'Manuel') : 'IA off'}</span>
                          <span className="metaPill">{portfolio.current_value.toFixed(2)} €</span>
                          <span className="metaPill">Voir détail</span>
                          <span className="rowChevron" aria-hidden="true">›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>
            </section>
          ) : null}

          {isFinanceActionsActive && appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsIntroCard">
                <div className="cardHeader">
                  <h2>Options Actions (PEA)</h2>
                  <span>Banques françaises et paramètres d exécution</span>
                </div>
                <p className="helperText" style={{ margin: 0 }}>
                  Configurez vos banques PEA comme vous le faites pour Coinbase afin de centraliser l exécution Actions.
                </p>
              </article>

              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Banques PEA</h2>
                  <span>Connexion et identifiants</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {PEA_BANKS.map((bank) => {
                    const keyState = providerKeys[bank.code] ?? { apiKey: '', apiSecret: '', portfolioId: '' };
                    return (
                      <div key={bank.code} className="providerCard stacked">
                        <div className="providerCardBody">
                          <strong>{bank.name}</strong>
                          <p>Configuration PEA en cours de déploiement. Vous pouvez préparer vos identifiants dès maintenant.</p>
                        </div>
                        <div className="providerActions fullWidth">
                          <input
                            placeholder="Identifiant / API Key"
                            value={keyState.apiKey}
                            onChange={(event) => setProviderKeys((prev) => ({ ...prev, [bank.code]: { ...keyState, apiKey: event.target.value } }))}
                          />
                          <input
                            placeholder="Secret"
                            type="password"
                            value={keyState.apiSecret}
                            onChange={(event) => setProviderKeys((prev) => ({ ...prev, [bank.code]: { ...keyState, apiSecret: event.target.value } }))}
                          />
                          <button className="secondaryButton" onClick={() => setError(`Configuration enregistrée localement pour ${bank.name}. Activation API PEA côté serveur en cours.`)} type="button">
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'betting' && !strategyDetailOpen && appView === 'dashboard' ? (
            <>
              {supervisedBettingMessages.length > 0 ? (
                <article className="featureCard" style={{ borderColor: 'var(--gold-border)', background: 'linear-gradient(120deg,var(--gold-soft),#fff)' }}>
                  <div className="cardHeader">
                    <h2>Messages supervisés · Paris</h2>
                    <span>Validation utilisateur requise</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {supervisedBettingMessages.map((message) => (
                      <div key={`betting-dash-${message.id}`} className="compactRow" style={{ alignItems: 'center' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <strong style={{ fontSize: '.86rem' }}>{message.title}</strong>
                          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>{message.detail}</p>
                        </div>
                        <button className="secondaryButton" onClick={() => { setAppView('dashboard'); window.scrollTo({ top: 140, behavior: 'smooth' }); }} type="button">Voir signaux</button>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {/* === BETTING COCKPIT — Hero KPI strip === */}
              <div className="heroKpiStrip">
                {(() => {
                  const totalBankroll = bettingStrategies.reduce((s, st) => s + st.bankroll, 0);
                  const avgRoi = bettingStrategies.length > 0 ? bettingStrategies.reduce((s, st) => s + st.roi, 0) / bettingStrategies.length : 0;
                  const totalBets = bettingStrategies.reduce((s, st) => s + st.betsTotal, 0);
                  const totalWon = bettingStrategies.reduce((s, st) => s + st.betsWon, 0);
                  const globalWinRate = totalBets > 0 ? (totalWon / totalBets) * 100 : 0;
                  const roiToShow = bettingAnalytics?.roi_pct ?? avgRoi;
                  const winRateToShow = bettingAnalytics?.win_rate_pct ?? globalWinRate;
                  const betsToShow = bettingAnalytics?.bets ?? totalBets;
                  const activeStrategies = bettingStrategies.filter((strategy) => strategy.enabled).length;
                  return (
                    <>
                      <div className="heroKpiItem">
                        <span>Bankroll totale</span>
                        <strong>{totalBankroll.toLocaleString('fr-FR')} €</strong>
                        <small style={{ color: 'var(--ok)' }}>{activeStrategies} portefeuille(s) actif(s)</small>
                      </div>
                      <div className="heroKpiItem">
                        <span>ROI moyen</span>
                        <strong className={roiToShow >= 0 ? 'up' : ''}>{roiToShow >= 0 ? '+' : ''}{roiToShow.toFixed(1)} %</strong>
                        <small>{bettingAnalytics ? 'backend analytics' : 'sur tous les portefeuilles'}</small>
                      </div>
                      <div className="heroKpiItem">
                        <span>Win Rate global</span>
                        <strong>{winRateToShow.toFixed(0)} %</strong>
                        <small>{bettingAnalytics ? `${betsToShow} paris` : `${totalWon} / ${totalBets} paris`}</small>
                      </div>
                      <div className="heroKpiItem">
                        <span>P/L clôturé</span>
                        <strong className={settledBettingProfit >= 0 ? 'up' : ''}>{settledBettingProfit >= 0 ? '+' : ''}{settledBettingProfit.toFixed(1)} €</strong>
                        <small className={settledBettingProfit >= 0 ? 'up' : 'down'}>{settledBettingBets.length} pari(s) clôturé(s)</small>
                      </div>
                      {bettingAnalytics ? (
                        <div className="heroKpiItem">
                          <span>Drawdown max</span>
                          <strong style={{ color: 'var(--danger)' }}>-{bettingAnalytics.max_drawdown_pct.toFixed(1)} %</strong>
                          <small>Yield {bettingAnalytics.yield_pct.toFixed(1)} %</small>
                        </div>
                      ) : null}
                      <div className="heroKpiItem">
                        <span>Tipster IA</span>
                        <strong style={{ color: 'var(--brand)' }}>{pendingTipsterSignals.length}</strong>
                        <small>signaux en attente</small>
                      </div>
                      {emergencyStopActive ? (
                        <div className="heroKpiItem" style={{ borderColor: 'var(--danger-border)' }}>
                          <span>Kill Switch</span>
                          <strong style={{ color: 'var(--danger)' }}>⚠️ ACTIF</strong>
                          <small style={{ color: 'var(--danger)' }}>Paris bloqués</small>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              <section className="cockpitStreamGrid">
                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Transactions à venir</h2>
                    <span>{bettingUpcomingCockpitRows.length} élément(s)</span>
                  </div>
                  {bettingUpcomingCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun pari actif en attente de dénouement.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {bettingUpcomingCockpitRows.map((row) => (
                        <article className={`cockpitTransactionRow${row.isLive ? ` isLive live-${row.liveKind}` : ''}`} key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong>{row.amountLabel}</strong>
                          </div>
                          {row.isLive ? (
                            <div className={`cockpitLiveBadge ${row.liveKind}`}>
                              <span className="cockpitLiveGlyph" aria-hidden="true">LIVE</span>
                              <span>{row.liveLabel}</span>
                            </div>
                          ) : null}
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Dernières transactions</h2>
                    <span>{bettingRecentCockpitRows.length} élément(s)</span>
                  </div>
                  {bettingRecentCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction clôturée sur Paris sportifs.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {bettingRecentCockpitRows.map((row) => (
                        <article className="cockpitTransactionRow" key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong className={row.pnlAmount >= 0 ? 'up' : 'down'}>{formatSignedEuro(row.pnlAmount, '0.00 €')}</strong>
                          </div>
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                          <div className="cockpitTransactionMetrics">
                            <span className={row.pnlAmount >= 0 ? 'up' : 'down'}>
                              {row.pnlPct === null ? 'n/d' : `${row.pnlPct >= 0 ? '+' : ''}${row.pnlPct.toFixed(1)}%`}
                            </span>
                            <span>Frais {row.fees.toFixed(2)} €</span>
                            <span>Impôts FR {row.taxesFr.toFixed(2)} €</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </section>

              <section className="cockpitPortfolioColumns">
                <article className="featureCard cockpitPortfolioSection real">
                  <div className="cardHeader">
                    <h2>Portefeuilles réels</h2>
                    <span>{bettingRealStrategiesForCockpit.length} portefeuille(s)</span>
                  </div>
                  {bettingRealStrategiesForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille réel de paris n est actif.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {bettingRealStrategiesForCockpit.map((strategy) => {
                        const evolution = formatPortfolioEvolution(strategy.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard real" key={`betting-real-cockpit-${strategy.id}`} onClick={() => { setSelectedStrategy(strategy); setStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge real">Réel</span>
                              <span className="metaPill">{strategy.mode === 'autonomous' ? 'Autopilot' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel'}</span>
                            </div>
                            <strong>⚽ {strategy.name}</strong>
                            <p>{strategy.description}</p>
                            <div className="cockpitPortfolioMiniValue">{strategy.bankroll.toFixed(2)} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={strategy.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--teal)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitPortfolioSection virtual">
                  <div className="cardHeader">
                    <h2>Portefeuilles fictifs</h2>
                    <span>{bettingVirtualStrategiesForCockpit.length} portefeuille(s)</span>
                  </div>
                  {bettingVirtualStrategiesForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille fictif de paris n est disponible.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {bettingVirtualStrategiesForCockpit.map((strategy) => {
                        const evolution = formatPortfolioEvolution(strategy.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard virtual" key={`betting-virtual-cockpit-${strategy.id}`} onClick={() => { setSelectedStrategy(strategy); setStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge virtual">Fictif</span>
                              <span className="metaPill">{strategy.mode === 'autonomous' ? 'Autopilot' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel'}</span>
                            </div>
                            <strong>⚽ {strategy.name}</strong>
                            <p>{strategy.description}</p>
                            <div className="cockpitPortfolioMiniValue">{strategy.bankroll.toFixed(2)} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={strategy.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--brand)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              </section>

              {filteredTopTipsterRecommendations.length > 0 ? (
                <article className="featureCard">
                  <div className="cardHeader">
                    <h2>Recommandations IA applicables</h2>
                    <span>{filteredTopTipsterRecommendations.length} recommandation(s) prête(s)</span>
                  </div>
                  <div className="providerActions fullWidth" style={{ marginBottom: 12 }}>
                    <label style={{ minWidth: 260 }}>
                      Portefeuille cible
                      <select value={selectedBettingRecommendationStrategyId} onChange={(event) => setSelectedBettingRecommendationStrategyId(event.target.value)}>
                        {bettingRecommendationTargets.map((strategy) => (
                          <option key={`betting-reco-target-${strategy.id}`} value={strategy.id}>{strategy.isVirtual ? 'Fictif' : 'Réel'} · {strategy.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="cockpitRecommendationGrid">
                    {filteredTopTipsterRecommendations.slice(0, 6).map((signal) => {
                      const confidenceLevel = confidenceLevelFromScale(signal.profileConfidenceIndex, 100);
                      return (
                        <div className="decisionCard" key={`betting-direct-reco-${signal.id}`}>
                          <div className="decisionCardMeta">
                            <span className="decisionCardBadge">{sportEmoji(signal.sport)} {signal.bookmaker}</span>
                            <span className="decisionCardBadge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Value +{signal.value_pct.toFixed(1)}%</span>
                            <span className="decisionCardBadge">📅 {formatDateTimeFr(signal.deadline)}</span>
                          </div>
                          <strong style={{ fontSize: '.95rem' }}>{signal.event}</strong>
                          <p style={{ margin: '4px 0 2px', fontSize: '.82rem', color: 'var(--muted)' }}>{signal.market} · cote {signal.odds}</p>
                          <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--text-2)' }}>{signal.rationale}</p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <ConfidenceDots level={confidenceLevel} />
                            <span className="metaPill">Gain potentiel +{signal.potentialGain.toFixed(1)} €</span>
                          </div>
                          <div className="decisionActions">
                            <button className="approveButton" disabled={emergencyStopActive || !selectedBettingRecommendationStrategyId} onClick={() => approveTipsterSignal(signal, 'manual', selectedBettingRecommendationStrategyId)} type="button">Appliquer maintenant</button>
                            <button className="rejectButton" onClick={() => setTipsterSignals((prev) => prev.map((entry) => entry.id === signal.id ? { ...entry, status: 'rejected' } : entry))} type="button">Ignorer</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ) : null}

              <section className="bettingDetailHighlights">
                <button className={`bettingDetailTile ${bettingDetailFocus === 'active' ? 'active' : ''}`} onClick={() => focusBettingDetailPanel('active')} type="button">
                  <span>Paris actifs</span>
                  <strong>{activeBettingBets.length}</strong>
                  <small>Exposition en cours: {activeBettingExposure.toFixed(2)} €</small>
                </button>
                <button className={`bettingDetailTile ${bettingDetailFocus === 'recent' ? 'active' : ''}`} onClick={() => focusBettingDetailPanel('recent')} type="button">
                  <span>Paris récents</span>
                  <strong>{recentBettingBets.length}</strong>
                  <small>Cliquez pour ouvrir le détail complet</small>
                </button>
              </section>

              <section className="bettingPortfolioGrid">
                {activeBettingStrategies.length === 0 ? (
                  <article className="featureCard" style={{ gridColumn: '1 / -1' }}>
                    <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                      <strong>Aucun portefeuille de paris actif</strong>
                      <p>Activez un portefeuille ou le portefeuille fictif pour alimenter ce cockpit.</p>
                    </div>
                  </article>
                ) : (
                  activeBettingStrategies.map((strategy) => {
                    const strategyActiveBets = strategy.recentBets.filter((bet) => bet.result === 'pending');
                    const strategyClosedBets = strategy.recentBets.filter((bet) => bet.result !== 'pending');
                    const strategyProfit = strategyClosedBets.reduce((sum, bet) => sum + bet.profit, 0);
                    return (
                      <button
                        key={`betting-cockpit-strategy-${strategy.id}`}
                        className="bettingPortfolioCard"
                        onClick={() => { setSelectedStrategy(strategy); if (strategy.isVirtual) setVirtualRiskProfile((strategy.risk_profile ?? 'medium') as VirtualRiskProfile); setStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        type="button"
                      >
                        <div className="bettingPortfolioCardHeader">
                          <div>
                            <strong>⚽ {strategy.name}</strong>
                            <p>{strategy.isVirtual ? 'Portefeuille fictif' : 'Portefeuille actif'} · {strategy.mode === 'autonomous' ? 'Autopilot' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel'}</p>
                          </div>
                          <span className="metaPill">{strategy.bankroll.toFixed(0)} €</span>
                        </div>
                        <div className="bettingPortfolioCardMetrics">
                          <span>En cours <strong>{strategyActiveBets.length}</strong></span>
                          <span>Clos <strong>{strategyClosedBets.length}</strong></span>
                          <span>P/L <strong className={strategyProfit >= 0 ? 'up' : 'down'}>{strategyProfit >= 0 ? '+' : ''}{strategyProfit.toFixed(1)} €</strong></span>
                          <span>ROI <strong className={strategy.roi >= 0 ? 'up' : 'down'}>{strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(1)}%</strong></span>
                        </div>
                        <div className="bettingPortfolioCardSparkline">
                          <Sparkline data={strategy.history.slice(-20)} color={strategyProfit >= 0 ? 'var(--ok)' : 'var(--danger)'} />
                        </div>
                        <div className="bettingPortfolioCardFooter">
                          <span>{strategy.betsWon} gagné(s) sur {strategy.betsTotal}</span>
                          <span className="metaPill">Voir détail</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
                <article className="featureCard" id="betting-cockpit-transactions-active">
                  <div className="cardHeader">
                    <h2>Transactions en cours</h2>
                    <span>{activeBettingBets.length} active(s)</span>
                  </div>
                  {activeBettingBets.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction en cours.</p>
                  ) : (
                    <table className="txLogTable">
                      <thead>
                        <tr><th>Heure</th><th>Événement</th><th>Mise</th><th>Statut</th></tr>
                      </thead>
                      <tbody>
                        {activeBettingBets.slice(0, 6).map((bet) => (
                          <tr key={`cockpit-active-${bet.id}`}>
                            <td>{formatDateTimeFr(bet.date)}</td>
                            <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.event}</td>
                            <td>{bet.stake.toFixed(0)} €</td>
                            <td><span className="statusBadge idle">En cours</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                    <button className="ghostButton" onClick={() => focusBettingDetailPanel('active')} type="button">Voir toutes les transactions en cours</button>
                  </div>
                </article>

                <article className="featureCard" id="betting-cockpit-transactions-settled">
                  <div className="cardHeader">
                    <h2>Transactions effectuées</h2>
                    <span>{recentBettingBets.filter((bet) => bet.result !== 'pending').length} clôturée(s)</span>
                  </div>
                  {recentBettingBets.filter((bet) => bet.result !== 'pending').length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction effectuée pour le moment.</p>
                  ) : (
                    <table className="txLogTable">
                      <thead>
                        <tr><th>Heure</th><th>Événement</th><th>Résultat</th><th>Profit</th></tr>
                      </thead>
                      <tbody>
                        {recentBettingBets.filter((bet) => bet.result !== 'pending').slice(0, 6).map((bet) => (
                          <tr key={`cockpit-done-${bet.id}`}>
                            <td>{formatDateTimeFr(bet.date)}</td>
                            <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.event}</td>
                            <td>
                              <span className={bet.result === 'won' ? 'statusBadge ok' : bet.result === 'lost' ? 'statusBadge warn' : 'statusBadge idle'}>
                                {bet.result === 'won' ? 'Gagné' : bet.result === 'lost' ? 'Perdu' : 'Annulé'}
                              </span>
                            </td>
                            <td style={{ color: bet.profit > 0 ? 'var(--ok)' : bet.profit < 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: 700 }}>
                              {bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="providerActions fullWidth" style={{ marginTop: 8 }}>
                    <button className="ghostButton" onClick={() => focusBettingDetailPanel('recent')} type="button">Voir toutes les transactions effectuées</button>
                  </div>
                </article>
              </section>

              {!virtualAppsEnabled.betting && !(activeBettingVirtualStrategy?.enabled) ? (
              <article className="featureCard">
                <div className="cardHeader"><h2>Pilotage Cockpit · Paris sportifs fictif</h2><span>Activation portefeuille, agent IA et configuration</span></div>
                {activeBettingVirtualStrategy ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={virtualAppsEnabled.betting}
                        onChange={(event) => void updateVirtualAppPreference('betting', event.target.checked)}
                      />
                      <span>Activer le portefeuille fictif Paris Sportifs</span>
                    </label>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={activeBettingVirtualStrategy.ai_enabled}
                        disabled={!virtualAppsEnabled.betting}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { ai_enabled: event.target.checked, enabled: event.target.checked ? true : activeBettingVirtualStrategy.enabled })}
                      />
                      <span>Activer l agent IA sur ce portefeuille</span>
                    </label>
                    <label>
                      Mode IA
                      <select
                        value={activeBettingVirtualStrategy.mode}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { mode: event.target.value as BettingStrategy['mode'] })}
                      >
                        <option value="manual">Manuel</option>
                        <option value="supervised">Validation humaine</option>
                        <option value="autonomous">Autopilot</option>
                      </select>
                    </label>
                    <label>
                      Seuil mise max ({activeBettingVirtualStrategy.max_stake.toFixed(1)} €)
                      <input
                        type="range"
                        min={MIN_MONETARY_LIMIT}
                        max={100}
                        step={0.1}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        value={Math.min(100, Math.max(MIN_MONETARY_LIMIT, activeBettingVirtualStrategy.max_stake))}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { max_stake: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                      />
                    </label>
                    <label>
                      Seuil max paris / jour ({activeBettingVirtualStrategy.max_bets_per_day})
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        value={Math.min(100, Math.max(1, activeBettingVirtualStrategy.max_bets_per_day))}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { max_bets_per_day: Math.max(1, Number(event.target.value) || 1) })}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="helperText">Portefeuille fictif Paris Sportifs indisponible.</p>
                )}
              </article>
              ) : null}

              {/* === Betting alerts === */}
              {emergencyStopActive ? (
                <div className="alertStrip" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)' }}>
                  <div className="alertItem" style={{ color: 'var(--danger)' }}>
                    <strong>🛑 Arrêt d urgence actif</strong> — Tous les paris automatiques sont bloqués.
                  </div>
                </div>
              ) : null}
              {bettingAlert ? (
                <div className="alertStrip">
                  <div className="alertItem">{bettingAlert}</div>
                </div>
              ) : null}

              <section className="dashboardChartsGrid" style={{ marginTop: 4 }}>
                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Répartition bankroll</h2>
                    <span>{bettingBankrollDistribution.length} portefeuille(s)</span>
                  </div>
                  {bettingBankrollDistribution.length === 0 ? (
                    <p className="helperText">Aucun portefeuille actif actuellement.</p>
                  ) : (
                    <>
                      <div className="stackedBarTrack betting">
                        {bettingBankrollDistribution.map((row) => (
                          <span key={`betting-share-${row.id}`} className="stackedBarSegment" style={{ width: `${Math.max(4, row.weight)}%` }} title={`${row.label}: ${row.weight.toFixed(1)}%`} />
                        ))}
                      </div>
                      <div className="miniLegendGrid">
                        {bettingBankrollDistribution.map((row) => (
                          <div key={`betting-share-legend-${row.id}`} className="miniLegendItem">
                            <span className="miniLegendDot" />
                            <strong>{row.label}</strong>
                            <span>{row.weight.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </article>

                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Forme 7 jours</h2>
                    <span>Évolution des portefeuilles</span>
                  </div>
                  <div className="barRowsGrid">
                    {bettingRoiMomentum.map((row) => (
                      <div key={`betting-momentum-${row.id}`} className="barRowItem">
                        <span>{row.label}</span>
                        <div className="barTrack">
                          <div className={`barFill ${(row.change7d ?? 0) >= 0 ? 'up' : 'down'}`} style={{ width: `${row.normalized}%` }} />
                        </div>
                        <strong className={(row.change7d ?? 0) >= 0 ? 'up' : 'down'}>{row.change7d === null ? 'n/d' : `${row.change7d >= 0 ? '+' : ''}${row.change7d.toFixed(1)}%`}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="featureCard dynamicChartCard">
                  <div className="cardHeader">
                    <h2>Cadence des paris 7 jours</h2>
                    <span>Tous portefeuilles confondus</span>
                  </div>
                  <div className="activityColumns">
                    {bettingActivity7d.map((row) => (
                      <div key={`betting-ops-day-${row.key}`} className="activityColumnItem" title={`${row.full}: ${row.count} pari(s)`}>
                        <span className="activityColumnValue">{row.count}</span>
                        <div className="activityColumnTrack">
                          <div className="activityColumnBar" style={{ height: `${Math.max(8, row.normalized)}%` }} />
                        </div>
                        <span className="activityColumnLabel">{row.label}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              {/* === Tipster decision queue === */}
              {filteredTopTipsterRecommendations.length > 0 ? (
                <div className="decisionQueue">
                  <div className="decisionQueueHeader">
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Cockpit Paris en ligne · recommandations IA</h2>
                    <span className="smallPill">{filteredTopTipsterRecommendations.length} / {pendingTipsterSignals.length} affichées</span>
                  </div>
                  {filteredTopTipsterRecommendations.map((signal) => {
                    const confidenceLevel = confidenceLevelFromScale(signal.profileConfidenceIndex, 100);
                    return (
                    <div className="decisionCard" key={signal.id}>
                      <div className="decisionCardMeta">
                        <span className="decisionCardBadge">{sportEmoji(signal.sport)} {signal.sport === 'football' ? 'Football' : signal.sport === 'tennis' ? 'Tennis' : signal.sport === 'basketball' ? 'Basketball' : signal.sport === 'rugby' ? 'Rugby' : 'Sport'}</span>
                        <span className="decisionCardBadge" style={{ background: signal.risk === 'faible' ? 'var(--ok-soft)' : signal.risk === 'modere' ? 'var(--warn-soft)' : 'var(--danger-soft)', color: signal.risk === 'faible' ? 'var(--ok)' : signal.risk === 'modere' ? 'var(--warn)' : 'var(--danger)' }}>Risque {signal.risk}</span>
                        <span className="decisionCardBadge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Value +{signal.value_pct.toFixed(1)}%</span>
                        <span className="decisionCardBadge" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>Gain potentiel +{signal.potentialGain.toFixed(1)} €</span>
                        <span className="decisionCardBadge">📚 {signal.bookmaker}</span>
                        <span className="decisionCardBadge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><ConfidenceDots level={confidenceLevel} /></span>
                        <span className="decisionCardBadge">📅 {formatDateTimeFr(signal.deadline)}</span>
                      </div>
                      <strong style={{ fontSize: '.95rem' }}>{signal.event}</strong>
                      <p style={{ margin: '4px 0 2px', fontSize: '.82rem', color: 'var(--muted)' }}>{signal.market} — Cote <strong style={{ color: 'var(--text)' }}>{signal.odds}</strong></p>
                      <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--text-2)' }}>{signal.rationale}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <ConfidenceDots level={confidenceLevel} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          className="approveButton"
                          disabled={emergencyStopActive}
                          onClick={() => {
                            approveTipsterSignal(signal, 'manual');
                          }}
                          type="button"
                        >
                          ✓ Valider le pari
                        </button>
                        <button
                          className="rejectButton"
                          onClick={() => {
                            setTipsterSignals((prev) => prev.map((s) => s.id === signal.id ? { ...s, status: 'rejected' } : s));
                          }}
                          type="button"
                        >
                          ✕ Ignorer
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : null}

              <article className="featureCard" style={{ gridColumn: '1 / -1' }}>
                <div className="cardHeader">
                  <h2>Archives recommandations IA</h2>
                  <span>{archivedTipsterSignals.length} recommandation(s) consultée(s)/traitée(s)</span>
                </div>
                {archivedTipsterSignals.length === 0 ? (
                  <p className="helperText">Aucune recommandation archivée pour le moment.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {archivedTipsterSignals.map((signal) => (
                      <div className="compactRow" key={`archive-signal-${signal.id}`} style={{ alignItems: 'center' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <strong style={{ fontSize: '.88rem' }}>{signal.event}</strong>
                          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>{signal.market} · {signal.bookmaker}</p>
                        </div>
                        <span className={signal.status === 'approved' ? 'statusBadge ok' : 'statusBadge warn'}>
                          {signal.status === 'approved' ? 'Appliquée' : 'Ignorée'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              {/* === Active bets list === */}
              <article id="betting-active-detail" className={`featureCard ${bettingDetailFocus === 'active' ? 'bettingDetailCardFocused' : ''}`} style={{ gridColumn: '1 / -1' }}>
                <div className="cardHeader">
                  <h2>Paris actifs</h2>
                  <span>{activeBettingBets.length} en cours · Exposition {activeBettingExposure.toFixed(0)} €</span>
                </div>
                {activeBettingBets.length === 0 ? (
                  <div className="infoPanel mutedPanel">
                    <strong>Aucun pari actif</strong>
                    <p>Tous les paris sont clôturés pour le moment. Les nouveaux paris en cours apparaîtront ici automatiquement.</p>
                  </div>
                ) : (
                  <table className="txLogTable">
                    <thead><tr><th>Date & heure</th><th>Portefeuille</th><th>Sport</th><th>Événement</th><th>Marché</th><th>Cote</th><th>Mise</th><th>Statut</th></tr></thead>
                    <tbody>
                      {activeBettingBets.slice(0, 15).map((bet) => (
                        <tr key={bet.id}>
                          <td>{formatDateTimeFr(bet.date)}</td>
                          <td>{bet.strategyName}</td>
                          <td>{sportEmoji(bet.sport)}</td>
                          <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.event}</td>
                          <td>{bet.market}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</td>
                          <td>{bet.stake.toFixed(0)} €</td>
                          <td><span className="statusBadge idle">En cours</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>

              {/* === Recent bets table === */}
              <article id="betting-recent-detail" className={`featureCard ${bettingDetailFocus === 'recent' ? 'bettingDetailCardFocused' : ''}`} style={{ gridColumn: '1 / -1' }}>
                <div className="cardHeader"><h2>Paris récents</h2><span>Historique consolidé de tous les portefeuilles</span></div>
                <table className="txLogTable">
                  <thead><tr><th>Date du pari</th><th>Clôture / résultat</th><th>Sport</th><th>Événement</th><th>Marché</th><th>Cote</th><th>Mise</th><th>Résultat</th><th>Profit</th></tr></thead>
                  <tbody>
                    {recentBettingBets.map((bet) => (
                      <tr key={bet.id}>
                        <td>{formatDateTimeFr(bet.date)}</td>
                        <td>
                          {bet.result === 'pending'
                            ? `Résultat attendu vers ${formatDateTimeFr(bet.date)}`
                            : `Résultat connu depuis ${formatDateTimeFr(bet.date)}`}
                        </td>
                        <td>{sportEmoji(bet.sport)}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.event}</td>
                        <td>{bet.market}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</td>
                        <td>{bet.stake.toFixed(0)} €</td>
                        <td>
                          <span className={bet.result === 'won' ? 'statusBadge ok' : bet.result === 'lost' ? 'statusBadge warn' : 'statusBadge idle'}>
                            {bet.result === 'won' ? 'Gagné' : bet.result === 'lost' ? 'Perdu' : bet.result === 'pending' ? 'En cours' : 'Annulé'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: bet.profit > 0 ? 'var(--ok)' : bet.profit < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                          {bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </>
          ) : null}

          {/* === BETTING STRATEGY DETAIL === */}
          {activeApp === 'betting' && strategyDetailOpen && selectedStrategy ? (
            <div style={{ display: 'grid', gap: 22 }}>
              <nav className="breadcrumbNav">
                <button className="breadcrumbBack" onClick={() => { setStrategyDetailOpen(false); setSelectedStrategy(null); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">← Retour</button>
                <button className="breadcrumbBack" onClick={() => { setStrategyDetailOpen(false); setSelectedStrategy(null); setAppView('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Vue d ensemble</button>
                <span className="breadcrumbSep">/</span><span className="breadcrumbCurrent">{selectedStrategy.name}</span>
              </nav>
              <section className="portfolioHero">
                <div className="portfolioHeroInfo">
                  <p className="sectionTag">{selectedStrategy.type === 'value_betting' ? 'Value Betting' : selectedStrategy.type === 'arbitrage' ? 'Arbitrage' : selectedStrategy.type === 'statistical' ? 'Statistique' : selectedStrategy.type === 'predictive' ? 'Prédictif' : 'Personnelle'}</p>
                  <h1>{selectedStrategy.name}</h1>
                  <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 4 }}>{selectedStrategy.description}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="metaPill">Bankroll : {selectedStrategy.bankroll.toFixed(0)} €</span>
                    <span className="metaPill" style={{ color: 'var(--ok)' }}>ROI : +{selectedStrategy.roi.toFixed(1)} %</span>
                    <span className="metaPill">Win Rate : {selectedStrategy.winRate} %</span>
                    <span className="metaPill">{selectedStrategy.betsTotal} paris ({selectedStrategy.betsWon} gagnés)</span>
                  </div>
                </div>
                <div className="portfolioHeroChart">
                  <Sparkline data={selectedStrategy.history} color="var(--ok)" />
                </div>
              </section>

              {/* Tipster AI mode selector — same pattern as Robin Finance */}
              <article className="featureCard">
                <div className="cardHeader"><h2>Mode de pilotage</h2><span>Comment Tipster IA intervient sur ce portefeuille</span></div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Mode actif</span>
                  <span className={`metaPill ${selectedStrategy.mode === 'autonomous' ? 'up' : selectedStrategy.mode === 'supervised' ? '' : 'neutral'}`}>
                    {selectedStrategy.mode === 'autonomous' ? '🤖 Tipster IA autonome' : selectedStrategy.mode === 'supervised' ? '👁 Tipster IA supervisé' : '🖐 Manuel'}
                  </span>
                </div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Portefeuille actif</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedStrategy.enabled} onChange={(event) => updateBettingStrategy(selectedStrategy.id, { enabled: event.target.checked })} />
                    <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{selectedStrategy.enabled ? 'Actif' : 'Inactif'}</span>
                  </label>
                </div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Assistance IA</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedStrategy.ai_enabled} onChange={(event) => updateBettingStrategy(selectedStrategy.id, { ai_enabled: event.target.checked })} />
                    <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{selectedStrategy.ai_enabled ? 'Activée' : 'Désactivée'}</span>
                  </label>
                </div>
                <div className="aiModeSelector">
                  <button
                    className={`aiModeOption ${selectedStrategy.mode === 'manual' ? 'active' : ''}`}
                    onClick={() => updateBettingStrategy(selectedStrategy.id, { mode: 'manual' })}
                    type="button"
                  >
                    <span className="aiModeIcon">🖐</span>
                    <strong>Manuel</strong>
                    <small>Vous choisissez tous les paris</small>
                  </button>
                  <button
                    className={`aiModeOption ${selectedStrategy.mode === 'supervised' ? 'active' : ''}`}
                    onClick={() => updateBettingStrategy(selectedStrategy.id, { mode: 'supervised' })}
                    type="button"
                  >
                    <span className="aiModeIcon">👁</span>
                    <strong>Tipster IA + validation</strong>
                    <small>L IA propose, vous validez</small>
                  </button>
                  <button
                    className={`aiModeOption ${selectedStrategy.mode === 'autonomous' ? 'active' : ''}`}
                    onClick={() => { if (!emergencyStopActive) { updateBettingStrategy(selectedStrategy.id, { mode: 'autonomous', enabled: true, ai_enabled: true }); } else { setBettingAlert('Kill switch actif — mode autonome indisponible.'); } }}
                    type="button"
                  >
                    <span className="aiModeIcon">🤖</span>
                    <strong>Tipster IA autonome</strong>
                    <small>L IA parie automatiquement</small>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 12 }}>
                  <label style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'grid', gap: 4 }}>
                    Mise max / pari
                    <div className="compactRow" style={{ margin: 0 }}>
                      <strong>{selectedStrategy.max_stake.toFixed(1)} €</strong>
                      <span className="metaPill">Plage 0.1 - {Math.max(50, Math.min(2000, Math.round(selectedStrategy.bankroll * 0.8)))} €</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_MONETARY_LIMIT}
                      max={Math.max(50, Math.min(2000, Math.round(selectedStrategy.bankroll * 0.8)))}
                      step={0.1}
                      value={Math.max(MIN_MONETARY_LIMIT, Number(selectedStrategy.max_stake.toFixed(1)))}
                      onChange={(event) => updateBettingStrategy(selectedStrategy.id, { max_stake: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value || MIN_MONETARY_LIMIT)) })}
                    />
                  </label>
                  <label style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'grid', gap: 4 }}>
                    Paris max / jour
                    <div className="compactRow" style={{ margin: 0 }}>
                      <strong>{selectedStrategy.max_bets_per_day} pari(s)</strong>
                      <span className="metaPill">Plage 1 - 100</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={Math.max(1, Math.round(selectedStrategy.max_bets_per_day))}
                      onChange={(event) => updateBettingStrategy(selectedStrategy.id, { max_bets_per_day: Math.max(1, Number(event.target.value || 1)) })}
                    />
                  </label>
                </div>
                {selectedStrategy.isVirtual ? (
                  <div className="infoPanel" style={{ marginTop: 12, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)' }}>
                    <strong>⚗️ Portefeuille virtuel — simulation uniquement</strong>
                    <p>Aucun trafic réel n est généré. Les paris sont simulés selon votre risque accepté.</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <button className={`smallPill ${virtualRiskProfile === 'low' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { setVirtualRiskProfile('low'); updateBettingStrategy(selectedStrategy.id, { risk_profile: 'low' }); }} type="button">Risque faible · capital garanti</button>
                      <button className={`smallPill ${virtualRiskProfile === 'medium' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { setVirtualRiskProfile('medium'); updateBettingStrategy(selectedStrategy.id, { risk_profile: 'medium' }); }} type="button">Risque moyen · perte max 30%</button>
                      <button className={`smallPill ${virtualRiskProfile === 'high' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { setVirtualRiskProfile('high'); updateBettingStrategy(selectedStrategy.id, { risk_profile: 'high' }); }} type="button">Risque fort · perte max 70%</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {selectedStrategy.mode !== 'autonomous' ? (
                        <button
                          className="secondaryButton"
                          disabled={emergencyStopActive}
                          onClick={() => {
                            if (emergencyStopActive) { setBettingAlert('Kill switch actif — pilote automatique indisponible.'); return; }
                            updateBettingStrategy(selectedStrategy.id, { mode: 'autonomous', enabled: true });
                            setBettingAlert('⚡ Pilote automatique activé — Robin IA va traiter les opportunités correspondant à votre profil.');
                          }}
                          type="button"
                        >
                          ⚡ Activer le pilote automatique
                        </button>
                      ) : (
                        <button
                          className="ghostButton"
                          onClick={() => {
                            updateBettingStrategy(selectedStrategy.id, { mode: 'supervised' });
                            setBettingAlert('⏸ Pilote automatique désactivé — Robin IA repasse en mode supervisé.');
                          }}
                          type="button"
                        >
                          ⏸ Désactiver le pilote automatique
                        </button>
                      )}
                      <button className="ghostButton" onClick={resetVirtualBettingPortfolio} type="button">Reset virtuel à 100 €</button>
                    </div>
                  </div>
                ) : null}
              </article>

              {/* Paris récents de la stratégie */}
              <article className="featureCard">
                <div className="cardHeader"><h2>Paris du portefeuille</h2><span>Historique {selectedStrategy.name}</span></div>
                {selectedStrategy.recentBets.length === 0 ? (
                  <div className="emptyState"><span className="emptyStateIcon">📋</span><p className="emptyStateTitle">Aucun pari enregistré</p><p className="emptyStateText">Les paris validés via Tipster IA ou placés manuellement apparaîtront ici.</p></div>
                ) : (
                  <table className="txLogTable">
                    <thead><tr><th>Date & heure</th><th>Sport</th><th>Événement</th><th>Marché</th><th>Livre</th><th>Cote</th><th>Mise</th><th>Statut</th><th>Profit</th></tr></thead>
                    <tbody>
                      {selectedStrategy.recentBets.map((bet) => (
                        <tr key={bet.id}>
                          <td>{formatDateTimeFr(bet.date)}</td>
                          <td>{sportEmoji(bet.sport)}</td>
                          <td>{bet.event}</td><td>{bet.market}</td><td>{bet.bookmaker}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</td>
                          <td>{bet.stake.toFixed(0)} €</td>
                          <td><span className={bet.result === 'won' ? 'statusBadge ok' : bet.result === 'lost' ? 'statusBadge warn' : 'statusBadge idle'}>{bet.result === 'won' ? 'Gagné' : bet.result === 'lost' ? 'Perdu' : bet.result === 'pending' ? 'En cours' : 'Annulé'}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: bet.profit > 0 ? 'var(--ok)' : bet.profit < 0 ? 'var(--danger)' : 'var(--muted)' }}>{bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            </div>
          ) : null}

          {/* === BETTING STRATEGIES LIST === */}
          {activeApp === 'betting' && !strategyDetailOpen && appView === 'strategies' ? (
            <section style={{ display: 'grid', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p className="sectionTag" style={{ marginBottom: 4 }}>Paris en ligne</p>
                  <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Portefeuilles</h1>
                </div>
                <button className="primaryButton" onClick={() => setBettingAlert('Création de portefeuille — fonctionnalité bientôt disponible.')} type="button">+ Nouveau portefeuille</button>
              </div>

              {bettingStrategies.map((strategy) => {
                const modeBadge = strategy.mode === 'autonomous' ? { label: '🤖 Autonome', cls: 'modeAutopilot' } : strategy.mode === 'supervised' ? { label: '👁 Supervisé', cls: 'modeSupervised' } : { label: '🖐 Manuel', cls: '' };
                const typeLabels: Record<BettingStrategy['type'], string> = { value_betting: 'Value Betting', arbitrage: 'Arbitrage', statistical: 'Statistique', predictive: 'Prédictif', personal: 'Personnelle' };
                return (
                  <article className="featureCard portfolioCard" key={strategy.id} style={{ '--card-top-color': strategy.type === 'arbitrage' ? 'var(--ok)' : strategy.type === 'value_betting' ? 'var(--brand)' : 'var(--teal)' } as Record<string, string>}>
                    <div className="portfolioCardHeader">
                      <div>
                        <p className="sectionTag" style={{ marginBottom: 2 }}>{strategy.isVirtual ? 'Portefeuille virtuel' : typeLabels[strategy.type]}</p>
                        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>⚽ {strategy.name}</h2>
                        <p style={{ margin: '3px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{strategy.description}</p>
                      </div>
                      <span className={`aiModeBadge ${modeBadge.cls}`}>{strategy.enabled ? modeBadge.label : '⏸ Inactif'}</span>
                    </div>
                    {strategy.isVirtual ? (
                      <div className="infoPanel" style={{ marginBottom: 10, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)' }}>
                        <strong>Simulation locale uniquement</strong>
                        <p style={{ margin: '4px 0 0' }}>Niveau actuel: {strategy.risk_profile === 'low' ? 'faible' : strategy.risk_profile === 'high' ? 'fort' : 'moyen'} · Aucun ordre réel n est envoyé.</p>
                        <p style={{ margin: '4px 0 0' }}>État portefeuille: {strategy.enabled ? 'actif' : 'inactif'} · IA: {strategy.ai_enabled ? 'activée' : 'désactivée'}</p>
                      </div>
                    ) : null}
                    <div className="heroKpiStrip" style={{ margin: '12px 0', padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', gap: 0 }}>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}>
                        <span>Bankroll</span><strong>{strategy.bankroll.toLocaleString('fr-FR')} €</strong>
                      </div>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}>
                        <span>ROI</span><strong className="up">+{strategy.roi.toFixed(1)} %</strong>
                      </div>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}>
                        <span>Win Rate</span><strong>{strategy.winRate} %</strong>
                      </div>
                      <div className="heroKpiItem">
                        <span>Variance</span><strong>{strategy.variance.toFixed(1)}</strong>
                      </div>
                    </div>
                    <Sparkline data={strategy.history} color={strategy.type === 'arbitrage' ? 'var(--ok)' : strategy.type === 'value_betting' ? 'var(--brand)' : 'var(--teal)'} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <label className="checkRow quickAiToggle">
                        <input
                          type="checkbox"
                          checked={strategy.ai_enabled}
                          onChange={(event) => updateBettingStrategy(strategy.id, {
                            ai_enabled: event.target.checked,
                            enabled: event.target.checked ? true : strategy.enabled,
                            mode: event.target.checked && strategy.mode === 'manual' ? 'supervised' : strategy.mode,
                          })}
                        />
                        <span>IA rapide</span>
                      </label>
                      <button className="primaryButton" onClick={() => { setSelectedStrategy(strategy); if (strategy.isVirtual) setVirtualRiskProfile((strategy.risk_profile ?? 'medium') as VirtualRiskProfile); setStrategyDetailOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir le détail</button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}

          {/* === BETTING SETTINGS === */}
          {activeApp === 'betting' && appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsIntroCard">
                <div className="cardHeader">
                  <h2>Options Paris en ligne</h2>
                  <span>Compte, bookmakers et alertes</span>
                </div>
                <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>Gérez votre profil, vos connexions aux bookmakers, vos limites de jeu responsable et vos préférences de notification.</p>
              </article>

              <article className="featureCard">
                <div className="cardHeader"><h2>Portefeuille fictif &amp; Agent IA</h2><span>Activation et seuils Paris sportifs</span></div>
                {activeBettingVirtualStrategy ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={virtualAppsEnabled.betting}
                        onChange={(event) => void updateVirtualAppPreference('betting', event.target.checked)}
                      />
                      <span>Activer le portefeuille fictif Paris Sportifs</span>
                    </label>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={activeBettingVirtualStrategy.ai_enabled}
                        disabled={!virtualAppsEnabled.betting}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { ai_enabled: event.target.checked, enabled: event.target.checked ? true : activeBettingVirtualStrategy.enabled })}
                      />
                      <span>Activer l agent IA sur ce portefeuille</span>
                    </label>
                    <label>
                      Mode IA
                      <select
                        value={activeBettingVirtualStrategy.mode}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { mode: event.target.value as BettingStrategy['mode'] })}
                      >
                        <option value="manual">Manuel</option>
                        <option value="supervised">Validation humaine</option>
                        <option value="autonomous">Autopilot</option>
                      </select>
                    </label>
                    <label>
                      Seuil mise max ({activeBettingVirtualStrategy.max_stake.toFixed(1)} €)
                      <input
                        type="range"
                        min={MIN_MONETARY_LIMIT}
                        max={100}
                        step={0.1}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        value={Math.min(100, Math.max(MIN_MONETARY_LIMIT, activeBettingVirtualStrategy.max_stake))}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { max_stake: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                      />
                    </label>
                    <label>
                      Seuil max paris / jour ({activeBettingVirtualStrategy.max_bets_per_day})
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        disabled={!virtualAppsEnabled.betting || !activeBettingVirtualStrategy.ai_enabled}
                        value={Math.min(100, Math.max(1, activeBettingVirtualStrategy.max_bets_per_day))}
                        onChange={(event) => updateBettingStrategy(activeBettingVirtualStrategy.id, { max_bets_per_day: Math.max(1, Number(event.target.value) || 1) })}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="helperText">Portefeuille fictif Paris Sportifs indisponible.</p>
                )}
              </article>

              {/* Profil & jeu responsable */}
              <article className="featureCard">
                <div className="cardHeader"><h2>Profil &amp; Jeu responsable</h2><span>Limites et paramètres de sécurité</span></div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={{ fontSize: '.85rem', fontWeight: 600 }}>
                    Mise maximale par pari (€)
                    <input defaultValue="100" type="number" min="0.1" step="0.1" style={{ marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: '.85rem', fontWeight: 600 }}>
                    Budget hebdomadaire maximum (€)
                    <input defaultValue="500" type="number" min="0.1" step="0.1" style={{ marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: '.85rem', fontWeight: 600 }}>
                    Perte journalière maximale (€)
                    <input defaultValue="200" type="number" min="0.1" step="0.1" style={{ marginTop: 4 }} />
                  </label>
                  <div className="infoPanel" style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn-border)' }}>
                    <strong>⚠️ Jeu responsable</strong>
                    <p>Ces limites sont appliquées par Robin en amont de tout pari automatique. Jouer comporte des risques. Fixez des limites adaptées à votre situation.</p>
                  </div>
                  <button className="primaryButton" onClick={() => setBettingAlert('Limites de jeu responsable sauvegardées.')} type="button">Enregistrer les limites</button>
                </div>
              </article>

              {/* Bookmakers */}
              <article className="featureCard">
                <div className="cardHeader"><h2>Bookmakers connectés</h2><span>Intégrations API pour pari automatique</span></div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { name: 'Winamax', status: 'available' },
                    { name: 'Betclic', status: 'available' },
                    { name: 'Unibet', status: 'available' },
                    { name: 'Betway', status: 'available' },
                  ].map((bk) => (
                    <div key={bk.name} className="compactRow">
                      <div>
                        <strong style={{ fontSize: '.9rem' }}>{bk.name}</strong>
                        <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>Connexion API pour automatisation ({bk.name.toLowerCase()}.fr)</p>
                      </div>
                      <span className="statusBadge idle">Non connecté</span>
                    </div>
                  ))}
                  <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 6 }}>Les connexions API bookmakers seront disponibles dans une prochaine version. En mode supervisé ou manuel, les paris sont placés manuellement sur le site du bookmaker.</p>
                </div>
              </article>

              {/* Notifications */}
              <article className="featureCard">
                <div className="cardHeader"><h2>Notifications</h2><span>Alertes Tipster IA et bankroll</span></div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { label: 'Nouvelles recommandations Tipster IA', key: 'tipster_signals' },
                    { label: 'Alertes risque bankroll', key: 'bankroll_risk' },
                    { label: 'Opportunités de paris détectées', key: 'opportunities' },
                    { label: 'Résultats des paris', key: 'results' },
                  ].map((notif) => (
                    <div key={notif.key} className="compactRow">
                      <span style={{ fontSize: '.85rem' }}>{notif.label}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked />
                        <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Activé</span>
                      </label>
                    </div>
                  ))}
                  <button className="primaryButton" onClick={() => setBettingAlert('Préférences de notification sauvegardées.')} type="button">Enregistrer</button>
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'racing' && !racingStrategyDetailOpen && appView === 'dashboard' ? (
            <section style={{ display: 'grid', gap: 18 }}>
              <div className="heroKpiStrip">
                {(() => {
                  const totalBankroll = racingStrategies.reduce((sum, strategy) => sum + strategy.bankroll, 0);
                  const avgRoi = racingStrategies.length > 0 ? racingStrategies.reduce((sum, strategy) => sum + strategy.roi, 0) / racingStrategies.length : 0;
                  const totalBets = racingStrategies.reduce((sum, strategy) => sum + strategy.betsTotal, 0);
                  const totalWon = racingStrategies.reduce((sum, strategy) => sum + strategy.betsWon, 0);
                  const globalWinRate = totalBets > 0 ? (totalWon / totalBets) * 100 : 0;
                  const activeStrategies = racingStrategies.filter((strategy) => strategy.enabled).length;
                  return (
                    <>
                      <div className="heroKpiItem"><span>Bankroll totale</span><strong>{totalBankroll.toLocaleString('fr-FR')} €</strong><small style={{ color: 'var(--ok)' }}>{activeStrategies} portefeuille(s) actif(s)</small></div>
                      <div className="heroKpiItem"><span>ROI moyen</span><strong className={avgRoi >= 0 ? 'up' : ''}>{avgRoi >= 0 ? '+' : ''}{avgRoi.toFixed(1)} %</strong><small>sur tous les portefeuilles</small></div>
                      <div className="heroKpiItem"><span>Win Rate global</span><strong>{globalWinRate.toFixed(0)} %</strong><small>{totalWon} / {totalBets} paris</small></div>
                      <div className="heroKpiItem"><span>Signaux IA</span><strong>{racingPendingSignalsDisplay.length}</strong><small>en attente</small></div>
                    </>
                  );
                })()}
              </div>

              <section className="cockpitStreamGrid">
                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Transactions à venir</h2>
                    <span>{racingUpcomingCockpitRows.length} élément(s)</span>
                  </div>
                  {racingUpcomingCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun pari hippique en attente de dénouement.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {racingUpcomingCockpitRows.map((row) => (
                        <article className={`cockpitTransactionRow${row.isLive ? ` isLive live-${row.liveKind}` : ''}`} key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong>{row.amountLabel}</strong>
                          </div>
                          {row.isLive ? (
                            <div className={`cockpitLiveBadge ${row.liveKind}`}>
                              <span className="cockpitLiveGlyph" aria-hidden="true">🐎</span>
                              <span>{row.liveLabel}</span>
                            </div>
                          ) : null}
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitColumnPanel">
                  <div className="cardHeader">
                    <h2>Dernières transactions</h2>
                    <span>{racingRecentCockpitRows.length} élément(s)</span>
                  </div>
                  {racingRecentCockpitRows.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucune transaction clôturée sur les portefeuilles hippiques.</p>
                  ) : (
                    <div className="cockpitTransactionList">
                      {racingRecentCockpitRows.map((row) => (
                        <article className="cockpitTransactionRow" key={row.id}>
                          <div className="cockpitTransactionMeta">
                            <span>{formatDateTimeFr(row.date)}</span>
                            <strong className={row.pnlAmount >= 0 ? 'up' : 'down'}>{formatSignedEuro(row.pnlAmount, '0.00 €')}</strong>
                          </div>
                          <div className="cockpitTransactionTitle">{row.title}</div>
                          <div className="cockpitTransactionDetail">{row.portfolioLabel} · {row.detail}</div>
                          <div className="cockpitTransactionMetrics">
                            <span className={row.pnlAmount >= 0 ? 'up' : 'down'}>
                              {row.pnlPct === null ? 'n/d' : `${row.pnlPct >= 0 ? '+' : ''}${row.pnlPct.toFixed(1)}%`}
                            </span>
                            <span>Frais {row.fees.toFixed(2)} €</span>
                            <span>Impôts FR {row.taxesFr.toFixed(2)} €</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </section>

              <section className="cockpitPortfolioColumns">
                <article className="featureCard cockpitPortfolioSection real">
                  <div className="cardHeader">
                    <h2>Portefeuilles réels</h2>
                    <span>{racingRealStrategiesForCockpit.length} portefeuille(s)</span>
                  </div>
                  {racingRealStrategiesForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille réel hippique actif.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {racingRealStrategiesForCockpit.map((strategy) => {
                        const evolution = formatPortfolioEvolution(strategy.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard real" key={`racing-real-cockpit-${strategy.id}`} onClick={() => { setSelectedRacingStrategy(strategy); setRacingStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge real">Réel</span>
                              <span className="metaPill">{strategy.mode === 'autonomous' ? 'Autopilot' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel'}</span>
                            </div>
                            <strong>🏇 {strategy.name}</strong>
                            <p>{strategy.description}</p>
                            <div className="cockpitPortfolioMiniValue">{strategy.bankroll.toFixed(2)} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={strategy.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--teal)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>

                <article className="featureCard cockpitPortfolioSection virtual">
                  <div className="cardHeader">
                    <h2>Portefeuilles fictifs</h2>
                    <span>{racingVirtualStrategiesForCockpit.length} portefeuille(s)</span>
                  </div>
                  {racingVirtualStrategiesForCockpit.length === 0 ? (
                    <p className="helperText" style={{ margin: 0 }}>Aucun portefeuille fictif hippique disponible.</p>
                  ) : (
                    <div className="cockpitPortfolioStack">
                      {racingVirtualStrategiesForCockpit.map((strategy) => {
                        const evolution = formatPortfolioEvolution(strategy.history, 7);
                        return (
                          <button className="cockpitPortfolioMiniCard virtual" key={`racing-virtual-cockpit-${strategy.id}`} onClick={() => { setSelectedRacingStrategy(strategy); setRacingStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                            <div className="cockpitPortfolioMiniMeta">
                              <span className="portfolioTypeBadge virtual">Fictif</span>
                              <span className="metaPill">{strategy.mode === 'autonomous' ? 'Autopilot' : strategy.mode === 'supervised' ? 'Supervisé' : 'Manuel'}</span>
                            </div>
                            <strong>🏇 {strategy.name}</strong>
                            <p>{strategy.description}</p>
                            <div className="cockpitPortfolioMiniValue">{strategy.bankroll.toFixed(2)} €</div>
                            <div className={`cockpitPortfolioMiniTrend ${evolution.tone}`}>Tendance 7j · {evolution.value}</div>
                            <div className="cockpitPortfolioMiniSparkline"><Sparkline data={strategy.history.slice(-30)} color={evolution.tone === 'down' ? 'var(--danger)' : 'var(--brand)'} /></div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              </section>

              {!virtualAppsEnabled.racing ? (
              <article className="featureCard">
                <div className="cardHeader"><h2>Pilotage Cockpit · Hippiques fictif</h2><span>Activation portefeuille, agent IA et configuration</span></div>
                {activeRacingVirtualStrategy ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={virtualAppsEnabled.racing}
                        onChange={(event) => {
                          void updateVirtualAppPreference('racing', event.target.checked);
                        }}
                      />
                      <span>Activer le portefeuille fictif Hippiques</span>
                    </label>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={activeRacingVirtualStrategy.ai_enabled}
                        onChange={(event) => {
                          if (!event.target.checked && virtualAppsEnabled.racing) {
                            setBettingAlert('Impossible de désactiver l agent IA tant que le portefeuille fictif hippique est actif.');
                            return;
                          }
                          setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                            ? { ...strategy, ai_enabled: event.target.checked, enabled: event.target.checked ? true : strategy.enabled }
                            : strategy));
                        }}
                      />
                      <span>Activer l agent IA sur ce portefeuille</span>
                    </label>
                    <label>
                      Mode IA
                      <select
                        value={activeRacingVirtualStrategy.mode}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id ? { ...strategy, mode: event.target.value as BettingStrategy['mode'] } : strategy))}
                      >
                        <option value="manual">Manuel</option>
                        <option value="supervised">Validation humaine</option>
                        <option value="autonomous">Autopilot</option>
                      </select>
                    </label>
                    <div className="providerActions fullWidth" style={{ marginTop: -2 }}>
                      <button className="ghostButton" onClick={alignRacingPilotModeWithBetting} type="button">
                        Aligner le pilotage sur Paris sportifs
                      </button>
                    </div>
                    <label>
                      Seuil mise max ({activeRacingVirtualStrategy.max_stake.toFixed(1)} €)
                      <input
                        type="range"
                        min={MIN_MONETARY_LIMIT}
                        max={80}
                        step={0.1}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        value={Math.min(80, Math.max(MIN_MONETARY_LIMIT, activeRacingVirtualStrategy.max_stake))}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                          ? { ...strategy, max_stake: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) }
                          : strategy))}
                      />
                    </label>
                    <label>
                      Seuil max paris / jour ({activeRacingVirtualStrategy.max_bets_per_day})
                      <input
                        type="range"
                        min={1}
                        max={40}
                        step={1}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        value={Math.min(40, Math.max(1, activeRacingVirtualStrategy.max_bets_per_day))}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                          ? { ...strategy, max_bets_per_day: Math.max(1, Number(event.target.value) || 1) }
                          : strategy))}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="helperText">Portefeuille fictif hippique indisponible.</p>
                )}
              </article>
              ) : null}

              <article className="featureCard">
                <div className="cardHeader"><h2>🏇 Recommandations hippiques IA</h2><span>{racingPendingSignalsDisplay.length} course(s) analysée(s)</span></div>
                {racingPendingSignalsDisplay.length === 0 ? (
                  <div className="emptyState"><span className="emptyStateIcon">🏇</span><p className="emptyStateTitle">Aucune recommandation disponible</p><p className="emptyStateText">Robin IA analyse les prochaines courses. Revenez avant chaque réunion PMU.</p></div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="infoPanel" style={{ margin: 0, display: 'grid', gap: 8 }}>
                      <strong>Confirmation rapide des recommandations IA</strong>
                      <label>
                        Portefeuille cible
                        <select value={selectedRacingRecommendationStrategyId} onChange={(event) => setSelectedRacingRecommendationStrategyId(event.target.value)}>
                          {racingStrategies.map((strategy) => (
                            <option key={`racing-target-${strategy.id}`} value={strategy.id}>
                              {strategy.isVirtual ? 'Simulation' : 'Réel'} · {strategy.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                        La confirmation utilisateur exécute une simulation sur le portefeuille fictif, ou associe la recommandation au portefeuille réel choisi.
                      </p>
                      {(() => {
                        const selectedStrategy = racingStrategies.find((strategy) => strategy.id === selectedRacingRecommendationStrategyId);
                        return selectedStrategy?.isVirtual && !virtualAppsEnabled.racing ? (
                          <div className="providerActions fullWidth">
                            <button className="secondaryButton" onClick={() => void updateVirtualAppPreference('racing', true)} type="button">
                              Activer le portefeuille fictif
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {racingPendingSignalsDisplay.map((signal) => {
                      const confidenceLevel = confidenceLevelFromScale(signal.confidence, 5);
                      return (
                      <div key={signal.id} className="compactRow" style={{ alignItems: 'flex-start' }}>
                        <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                          <strong style={{ fontSize: '.9rem' }}>{signal.event}</strong>
                          <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--text-2)' }}>{signal.market}</p>
                          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>{signal.rationale}</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                            <span className="metaPill">Cote: {signal.odds.toFixed(2)}</span>
                            <span className="metaPill">Value: +{signal.value_pct.toFixed(1)}%</span>
                            <span className="metaPill">Gain potentiel: {signal.potentialGain.toFixed(2)} €</span>
                            <span className={`metaPill ${signal.risk === 'faible' ? 'ok' : signal.risk === 'eleve' ? 'warn' : ''}`}>Risque: {signal.risk}</span>
                            <span className="metaPill" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><ConfidenceDots level={confidenceLevel} /></span>
                            <span className="metaPill">📅 {formatDateTimeFr(signal.deadline)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <span className="statusBadge ok">{signal.bookmaker}</span>
                          <button className="secondaryButton" onClick={() => confirmRacingRecommendation(signal, selectedRacingRecommendationStrategyId)} type="button">Confirmer sur le portefeuille</button>
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </article>

              <article className="featureCard">
                <div className="cardHeader"><h2>Synthèse portefeuilles hippiques</h2><span>{racingStrategies.length} portefeuille(s)</span></div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {racingStrategies.map((strategy) => (
                    <div key={strategy.id} className="compactRow" style={{ alignItems: 'center' }}>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <strong style={{ fontSize: '.9rem' }}>{strategy.name}</strong>
                        <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>{strategy.description}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <span className="metaPill">Bankroll: {strategy.bankroll.toFixed(0)} €</span>
                          <span className="metaPill">ROI: {strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(1)}%</span>
                          <span className="metaPill">Win: {strategy.winRate}%</span>
                        </div>
                      </div>
                      <button className="ghostButton" onClick={() => { setSelectedRacingStrategy(strategy); setRacingStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir</button>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'racing' && racingStrategyDetailOpen && selectedRacingStrategy ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div><button className="ghostButton" onClick={() => { setRacingStrategyDetailOpen(false); setSelectedRacingStrategy(null); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">← Retour</button></div>
              <article className="featureCard">
                <div className="cardHeader"><h2>{selectedRacingStrategy.name}</h2><span>{selectedRacingStrategy.description}</span></div>
                <div className="heroKpiStrip" style={{ margin: '12px 0', padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', gap: 0 }}>
                  <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>Bankroll</span><strong>{selectedRacingStrategy.bankroll.toLocaleString('fr-FR')} €</strong></div>
                  <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>ROI</span><strong className="up">+{selectedRacingStrategy.roi.toFixed(1)} %</strong></div>
                  <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>Win Rate</span><strong>{selectedRacingStrategy.winRate} %</strong></div>
                  <div className="heroKpiItem"><span>Paris total</span><strong>{selectedRacingStrategy.betsTotal}</strong></div>
                </div>
                <Sparkline data={selectedRacingStrategy.history} color="var(--teal)" />
              </article>

              <article className="featureCard">
                <div className="cardHeader"><h2>Mode de pilotage</h2><span>Même logique que Paris sportifs</span></div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Mode actif</span>
                  <span className={`metaPill ${selectedRacingStrategy.mode === 'autonomous' ? 'up' : selectedRacingStrategy.mode === 'supervised' ? '' : 'neutral'}`}>
                    {selectedRacingStrategy.mode === 'autonomous' ? '🤖 IA autonome' : selectedRacingStrategy.mode === 'supervised' ? '👁 IA supervisé' : '🖐 Manuel'}
                  </span>
                </div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Portefeuille actif</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedRacingStrategy.enabled}
                      onChange={(event) => {
                        const nextEnabled = event.target.checked;
                        setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, enabled: nextEnabled } : strategy));
                        setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, enabled: nextEnabled } : prev);
                      }}
                    />
                    <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{selectedRacingStrategy.enabled ? 'Actif' : 'Inactif'}</span>
                  </label>
                </div>
                <div className="compactRow" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: '.82rem' }}>Assistance IA</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedRacingStrategy.ai_enabled}
                      onChange={(event) => {
                        if (!event.target.checked && selectedRacingStrategy.isVirtual && virtualAppsEnabled.racing) {
                          setBettingAlert('Impossible de désactiver l agent IA tant que le portefeuille fictif hippique est actif.');
                          return;
                        }
                        const nextEnabled = event.target.checked;
                        setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, ai_enabled: nextEnabled, enabled: nextEnabled ? true : strategy.enabled } : strategy));
                        setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, ai_enabled: nextEnabled, enabled: nextEnabled ? true : prev.enabled } : prev);
                      }}
                    />
                    <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{selectedRacingStrategy.ai_enabled ? 'Activée' : 'Désactivée'}</span>
                  </label>
                </div>
                <div className="aiModeSelector">
                  <button
                    className={`aiModeOption ${selectedRacingStrategy.mode === 'manual' ? 'active' : ''}`}
                    onClick={() => {
                      setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, mode: 'manual' } : strategy));
                      setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, mode: 'manual' } : prev);
                    }}
                    type="button"
                  >
                    <span className="aiModeIcon">🖐</span>
                    <strong>Manuel</strong>
                    <small>Vous validez les opérations</small>
                  </button>
                  <button
                    className={`aiModeOption ${selectedRacingStrategy.mode === 'supervised' ? 'active' : ''}`}
                    onClick={() => {
                      setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, mode: 'supervised', enabled: true, ai_enabled: true } : strategy));
                      setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, mode: 'supervised', enabled: true, ai_enabled: true } : prev);
                    }}
                    type="button"
                  >
                    <span className="aiModeIcon">👁</span>
                    <strong>Validation humaine</strong>
                    <small>L IA propose, vous validez</small>
                  </button>
                  <button
                    className={`aiModeOption ${selectedRacingStrategy.mode === 'autonomous' ? 'active' : ''}`}
                    onClick={() => {
                      if (emergencyStopActive) {
                        setBettingAlert('Kill switch actif — mode autonome indisponible.');
                        return;
                      }
                      setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, mode: 'autonomous', enabled: true, ai_enabled: true } : strategy));
                      setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, mode: 'autonomous', enabled: true, ai_enabled: true } : prev);
                    }}
                    type="button"
                  >
                    <span className="aiModeIcon">🤖</span>
                    <strong>IA autonome</strong>
                    <small>L IA exécute automatiquement</small>
                  </button>
                </div>
                <div className="providerActions fullWidth" style={{ marginTop: 10 }}>
                  <button className="ghostButton" onClick={alignRacingPilotModeWithBetting} type="button">
                    Aligner sur le mode Paris sportifs
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 12 }}>
                  <label style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'grid', gap: 4 }}>
                    Mise max / pari
                    <div className="compactRow" style={{ margin: 0 }}>
                      <strong>{selectedRacingStrategy.max_stake.toFixed(1)} €</strong>
                      <span className="metaPill">Plage 0.1 - 100 €</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_MONETARY_LIMIT}
                      max={100}
                      step={0.1}
                      value={Math.max(MIN_MONETARY_LIMIT, Number(selectedRacingStrategy.max_stake.toFixed(1)))}
                      onChange={(event) => {
                        const nextStake = Math.max(MIN_MONETARY_LIMIT, Number(event.target.value || MIN_MONETARY_LIMIT));
                        setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, max_stake: nextStake } : strategy));
                        setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, max_stake: nextStake } : prev);
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'grid', gap: 4 }}>
                    Paris max / jour
                    <div className="compactRow" style={{ margin: 0 }}>
                      <strong>{selectedRacingStrategy.max_bets_per_day} pari(s)</strong>
                      <span className="metaPill">Plage 1 - 100</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={Math.max(1, Math.round(selectedRacingStrategy.max_bets_per_day))}
                      onChange={(event) => {
                        const nextMax = Math.max(1, Number(event.target.value || 1));
                        setRacingStrategies((prev) => prev.map((strategy) => strategy.id === selectedRacingStrategy.id ? { ...strategy, max_bets_per_day: nextMax } : strategy));
                        setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, max_bets_per_day: nextMax } : prev);
                      }}
                    />
                  </label>
                </div>
                {selectedRacingStrategy.isVirtual ? (
                  <div className="infoPanel" style={{ marginTop: 12, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)' }}>
                    <strong>⚗️ Portefeuille virtuel — simulation uniquement</strong>
                    <p>Aucun pari réel n est généré. Les courses sont simulées selon votre profil de risque accepté.</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <button
                        className={`smallPill ${(selectedRacingStrategy.risk_profile ?? 'medium') === 'low' ? 'selectedPortfolioPill selected' : ''}`}
                        onClick={() => { setRacingStrategies((prev) => prev.map((s) => s.id === selectedRacingStrategy.id ? { ...s, risk_profile: 'low' } : s)); setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, risk_profile: 'low' } : prev); }}
                        type="button"
                      >Risque faible · capital garanti</button>
                      <button
                        className={`smallPill ${(selectedRacingStrategy.risk_profile ?? 'medium') === 'medium' ? 'selectedPortfolioPill selected' : ''}`}
                        onClick={() => { setRacingStrategies((prev) => prev.map((s) => s.id === selectedRacingStrategy.id ? { ...s, risk_profile: 'medium' } : s)); setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, risk_profile: 'medium' } : prev); }}
                        type="button"
                      >Risque moyen · perte max 30%</button>
                      <button
                        className={`smallPill ${(selectedRacingStrategy.risk_profile ?? 'medium') === 'high' ? 'selectedPortfolioPill selected' : ''}`}
                        onClick={() => { setRacingStrategies((prev) => prev.map((s) => s.id === selectedRacingStrategy.id ? { ...s, risk_profile: 'high' } : s)); setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, risk_profile: 'high' } : prev); }}
                        type="button"
                      >Risque fort · perte max 70%</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {selectedRacingStrategy.mode !== 'autonomous' ? (
                        <button
                          className="secondaryButton"
                          disabled={emergencyStopActive}
                          onClick={() => {
                            if (emergencyStopActive) { setBettingAlert('Kill switch actif — pilote automatique indisponible.'); return; }
                            setRacingStrategies((prev) => prev.map((s) => s.id === selectedRacingStrategy.id ? { ...s, mode: 'autonomous', enabled: true, ai_enabled: true } : s));
                            setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, mode: 'autonomous', enabled: true, ai_enabled: true } : prev);
                            setBettingAlert('⚡ Pilote automatique hippique activé — Robin IA va analyser les prochaines courses.');
                          }}
                          type="button"
                        >⚡ Activer le pilote automatique</button>
                      ) : (
                        <button
                          className="ghostButton"
                          onClick={() => {
                            setRacingStrategies((prev) => prev.map((s) => s.id === selectedRacingStrategy.id ? { ...s, mode: 'supervised' } : s));
                            setSelectedRacingStrategy((prev) => prev && prev.id === selectedRacingStrategy.id ? { ...prev, mode: 'supervised' } : prev);
                            setBettingAlert('⏸ Pilote automatique désactivé — mode supervisé activé.');
                          }}
                          type="button"
                        >⏸ Désactiver le pilote automatique</button>
                      )}
                      <button className="ghostButton" onClick={resetVirtualRacingPortfolio} type="button">Reset virtuel à 100 €</button>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="featureCard">
                <div className="cardHeader"><h2>Paris hippiques récents</h2><span>Historique {selectedRacingStrategy.name}</span></div>
                {selectedRacingStrategy.recentBets.length === 0 ? (
                  <div className="emptyState"><span className="emptyStateIcon">📋</span><p className="emptyStateTitle">Aucun pari enregistré</p><p className="emptyStateText">Les paris validés apparaîtront ici.</p></div>
                ) : (
                  <table className="txLogTable">
                    <thead><tr><th>Date du pari</th><th>Clôture / résultat</th><th>Course</th><th>Marché</th><th>Bookmaker</th><th>Cote</th><th>Mise</th><th>Statut</th><th>Profit</th></tr></thead>
                    <tbody>
                      {selectedRacingStrategy.recentBets.map((bet) => (
                        <tr key={bet.id}>
                          <td>{formatDateTimeFr(bet.date)}</td>
                          <td>
                            {bet.result === 'pending'
                              ? `Résultat attendu vers ${formatDateTimeFr(bet.date)}`
                              : `Résultat connu depuis ${formatDateTimeFr(bet.date)}`}
                          </td>
                          <td>{bet.event}</td><td>{bet.market}</td><td>{bet.bookmaker}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</td>
                          <td>{bet.stake.toFixed(0)} €</td>
                          <td><span className={bet.result === 'won' ? 'statusBadge ok' : bet.result === 'lost' ? 'statusBadge warn' : 'statusBadge idle'}>{bet.result === 'won' ? 'Gagné' : bet.result === 'lost' ? 'Perdu' : 'En cours'}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: bet.profit > 0 ? 'var(--ok)' : bet.profit < 0 ? 'var(--danger)' : 'var(--muted)' }}>{bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            </div>
          ) : null}

          {activeApp === 'racing' && !racingStrategyDetailOpen && appView === 'strategies' ? (
            <section style={{ display: 'grid', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p className="sectionTag" style={{ marginBottom: 4 }}>Paris hippiques</p>
                  <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Portefeuilles</h1>
                </div>
              </div>
              {racingStrategies.map((strategy) => {
                const modeBadge = strategy.mode === 'autonomous' ? { label: '🤖 Autonome', cls: 'modeAutopilot' } : strategy.mode === 'supervised' ? { label: '👁 Supervisé', cls: 'modeSupervised' } : { label: '🖐 Manuel', cls: '' };
                return (
                  <article className="featureCard portfolioCard" key={strategy.id} style={{ '--card-top-color': 'var(--teal)' } as Record<string, string>}>
                    <div className="portfolioCardHeader">
                      <div>
                        <p className="sectionTag" style={{ marginBottom: 2 }}>{strategy.isVirtual ? 'Portefeuille virtuel' : 'Paris hippiques'}</p>
                        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>🏇 {strategy.name}</h2>
                        <p style={{ margin: '3px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{strategy.description}</p>
                      </div>
                      <span className={`aiModeBadge ${modeBadge.cls}`}>{strategy.enabled ? modeBadge.label : '⏸ Inactif'}</span>
                    </div>
                    <div className="heroKpiStrip" style={{ margin: '12px 0', padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', gap: 0 }}>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>Bankroll</span><strong>{strategy.bankroll.toLocaleString('fr-FR')} €</strong></div>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>ROI</span><strong className="up">+{strategy.roi.toFixed(1)} %</strong></div>
                      <div className="heroKpiItem" style={{ borderRight: '1px solid var(--border)' }}><span>Win Rate</span><strong>{strategy.winRate} %</strong></div>
                      <div className="heroKpiItem"><span>Paris</span><strong>{strategy.betsTotal}</strong></div>
                    </div>
                    <Sparkline data={strategy.history} color="var(--teal)" />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <label className="checkRow quickAiToggle">
                        <input
                          type="checkbox"
                          checked={strategy.ai_enabled}
                          onChange={(event) => {
                            if (!event.target.checked && virtualAppsEnabled.racing && strategy.isVirtual) {
                              setBettingAlert('Impossible de désactiver l agent IA tant que le portefeuille fictif hippique est actif.');
                              return;
                            }
                            setRacingStrategies((prev) => prev.map((s) => s.id === strategy.id
                              ? {
                                ...s,
                                ai_enabled: event.target.checked,
                                enabled: event.target.checked ? true : s.enabled,
                                mode: event.target.checked && s.mode === 'manual' ? 'supervised' : s.mode,
                              }
                              : s));
                          }}
                        />
                        <span>IA rapide</span>
                      </label>
                      <button className="primaryButton" onClick={() => { setSelectedRacingStrategy(strategy); setRacingStrategyDetailOpen(true); setAppView('strategies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir le détail</button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}

          {activeApp === 'racing' && appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsIntroCard">
                <div className="cardHeader"><h2>Options Paris hippiques</h2><span>PMU et alertes de courses</span></div>
                <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>Gérez vos préférences hippiques, vos connexions PMU, vos limites de jeu responsable et vos alertes de courses.</p>
              </article>
              <article className="featureCard">
                <div className="cardHeader"><h2>Portefeuille fictif &amp; Agent IA</h2><span>Activation et seuils hippiques</span></div>
                {activeRacingVirtualStrategy ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={virtualAppsEnabled.racing}
                        onChange={(event) => {
                          if (event.target.checked && !activeRacingVirtualStrategy.ai_enabled) {
                            setBettingAlert('Activez d abord l agent IA hippique pour pouvoir activer le portefeuille fictif.');
                            return;
                          }
                          void updateVirtualAppPreference('racing', event.target.checked);
                        }}
                      />
                      <span>Activer le portefeuille fictif Hippiques</span>
                    </label>
                    <label className="checkRow" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={activeRacingVirtualStrategy.ai_enabled}
                        onChange={(event) => {
                          if (!event.target.checked && virtualAppsEnabled.racing) {
                            setBettingAlert('Impossible de désactiver l agent IA tant que le portefeuille fictif hippique est actif.');
                            return;
                          }
                          setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                            ? { ...strategy, ai_enabled: event.target.checked, enabled: event.target.checked ? true : strategy.enabled }
                            : strategy));
                        }}
                      />
                      <span>Activer l agent IA sur ce portefeuille</span>
                    </label>
                    <label>
                      Mode IA
                      <select
                        value={activeRacingVirtualStrategy.mode}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id ? { ...strategy, mode: event.target.value as BettingStrategy['mode'] } : strategy))}
                      >
                        <option value="manual">Manuel</option>
                        <option value="supervised">Validation humaine</option>
                        <option value="autonomous">Autopilot</option>
                      </select>
                    </label>
                    <div className="providerActions fullWidth" style={{ marginTop: -2 }}>
                      <button className="ghostButton" onClick={alignRacingPilotModeWithBetting} type="button">
                        Aligner le pilotage sur Paris sportifs
                      </button>
                    </div>
                    <label>
                      Seuil mise max ({activeRacingVirtualStrategy.max_stake.toFixed(1)} €)
                      <input
                        type="range"
                        min={MIN_MONETARY_LIMIT}
                        max={80}
                        step={0.1}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        value={Math.min(80, Math.max(MIN_MONETARY_LIMIT, activeRacingVirtualStrategy.max_stake))}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                          ? { ...strategy, max_stake: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) }
                          : strategy))}
                      />
                    </label>
                    <label>
                      Seuil max paris / jour ({activeRacingVirtualStrategy.max_bets_per_day})
                      <input
                        type="range"
                        min={1}
                        max={40}
                        step={1}
                        disabled={!virtualAppsEnabled.racing || !activeRacingVirtualStrategy.ai_enabled}
                        value={Math.min(40, Math.max(1, activeRacingVirtualStrategy.max_bets_per_day))}
                        onChange={(event) => setRacingStrategies((prev) => prev.map((strategy) => strategy.id === activeRacingVirtualStrategy.id
                          ? { ...strategy, max_bets_per_day: Math.max(1, Number(event.target.value) || 1) }
                          : strategy))}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="helperText">Portefeuille fictif hippique indisponible.</p>
                )}
              </article>
              <article className="featureCard">
                <div className="cardHeader"><h2>Profil &amp; Jeu responsable</h2><span>Limites et paramètres</span></div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={{ fontSize: '.85rem', fontWeight: 600 }}>Mise maximale par pari (€)<input defaultValue="30" type="number" min="0.1" step="0.1" style={{ marginTop: 4 }} /></label>
                  <label style={{ fontSize: '.85rem', fontWeight: 600 }}>Budget hebdomadaire maximum (€)<input defaultValue="100" type="number" min="0.1" step="0.1" style={{ marginTop: 4 }} /></label>
                  <div className="infoPanel" style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn-border)' }}>
                    <strong>⚠️ Jeu responsable</strong>
                    <p>Les courses hippiques comportent des risques. Fixez des limites adaptées à votre budget.</p>
                  </div>
                  <button className="primaryButton" onClick={() => setBettingAlert('Limites hippiques enregistrées.')} type="button">Enregistrer les limites</button>
                </div>
              </article>
              <article className="featureCard">
                <div className="cardHeader"><h2>Opérateurs de paris</h2><span>PMU et bookmakers hippiques</span></div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[{ name: 'PMU' }, { name: 'Winamax (Hippiques)' }, { name: 'Betclic (Hippiques)' }].map((operator) => (
                    <div key={operator.name} className="compactRow">
                      <div><strong style={{ fontSize: '.9rem' }}>{operator.name}</strong><p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>Connexion API pour automatisation</p></div>
                      <span className="statusBadge idle">Non connecté</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="featureCard">
                <div className="cardHeader"><h2>Alertes</h2><span>Courses et bankroll</span></div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[{ label: 'Nouvelles recommandations de courses', key: 'tips' }, { label: 'Alertes bankroll', key: 'bankroll' }, { label: 'Résultats des paris', key: 'results' }].map((notification) => (
                    <div key={notification.key} className="compactRow">
                      <span style={{ fontSize: '.85rem' }}>{notification.label}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" defaultChecked /><span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Activé</span></label>
                    </div>
                  ))}
                  <button className="primaryButton" onClick={() => setBettingAlert('Préférences hippiques sauvegardées.')} type="button">Enregistrer</button>
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'loto' && appView === 'dashboard' ? (
            <section style={{ display: 'grid', gap: 18 }}>
              {(!virtualAppsEnabled.loto && !lotteryVirtualPortfolio.enabled) ? (
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Pilotage Cockpit · Loto fictif</h2>
                  <span>Activation portefeuille, agent IA et configuration</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="heroKpiStrip" style={{ padding: '10px 14px' }}>
                    <div className="heroKpiItem">
                      <span>Bankroll fictive</span>
                      <strong>{lotteryVirtualPortfolio.bankroll.toFixed(2)} €</strong>
                      <small className={lotteryVirtualPnl >= 0 ? 'up' : 'down'}>PnL: {lotteryVirtualPnl >= 0 ? '+' : ''}{lotteryVirtualPnl.toFixed(2)} €</small>
                    </div>
                    <div className="heroKpiItem">
                      <span>Tickets en cours</span>
                      <strong>{lotteryPendingTickets.length}</strong>
                      <small>Après tirage: règlement auto</small>
                    </div>
                    <div className="heroKpiItem">
                      <span>Tickets réglés</span>
                      <strong>{lotterySettledTickets.length}</strong>
                      <small>{lotterySettledTickets.filter((ticket) => ticket.status === 'won').length} gagnant(s)</small>
                    </div>
                  </div>

                  <label className="checkRow" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={virtualAppsEnabled.loto}
                      onChange={(event) => void updateVirtualAppPreference('loto', event.target.checked)}
                    />
                    <span>Activer le portefeuille fictif Loto/Euromillions (50 € simulés)</span>
                  </label>

                  <label className="checkRow" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={lotteryVirtualPortfolio.ai_enabled}
                      disabled={!virtualAppsEnabled.loto}
                      onChange={(event) => persistLotteryVirtualPortfolio({
                        ...lotteryVirtualPortfolio,
                        ai_enabled: event.target.checked,
                        mode: event.target.checked && lotteryVirtualPortfolio.mode === 'manual' ? 'supervised' : lotteryVirtualPortfolio.mode,
                      })}
                    />
                    <span>Activer l agent IA sur le portefeuille loto fictif</span>
                  </label>

                  <label>
                    Mode IA
                    <select
                      value={lotteryVirtualPortfolio.mode}
                      disabled={!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.ai_enabled}
                      onChange={(event) => persistLotteryVirtualPortfolio({ ...lotteryVirtualPortfolio, mode: event.target.value as BettingStrategy['mode'] })}
                    >
                      <option value="manual">Manuel</option>
                      <option value="supervised">Validation humaine</option>
                      <option value="autonomous">Autopilot</option>
                    </select>
                  </label>

                  <label>
                    Grilles max par tirage ({lotteryVirtualPortfolio.max_grids_per_draw})
                    <input
                      type="range"
                      min={1}
                      max={MAX_LOTTERY_GRID_COUNT}
                      step={1}
                      disabled={!virtualAppsEnabled.loto}
                      value={lotteryVirtualPortfolio.max_grids_per_draw}
                      onChange={(event) => persistLotteryVirtualPortfolio({
                        ...lotteryVirtualPortfolio,
                        max_grids_per_draw: Math.max(1, Math.min(MAX_LOTTERY_GRID_COUNT, Number(event.target.value) || 1)),
                      })}
                    />
                  </label>

                  <div className="infoPanel" style={{ margin: 0, display: 'grid', gap: 8 }}>
                    <strong>Abonnement simulé sur plusieurs semaines</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {LOTTERY_SUBSCRIPTION_WEEK_OPTIONS.map((weekCount) => (
                        <button
                          key={`lottery-subscription-weeks-${weekCount}`}
                          className={lotterySubscriptionWeeks === weekCount ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'}
                          onClick={() => setLotterySubscriptionWeeks(weekCount)}
                          type="button"
                        >
                          {weekCount} semaine{weekCount > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                      Budget estimé {LOTTERY_CONFIG[lotteryGameFocus].label}: {(normalizedLotteryGridCount * LOTTERY_SIMPLE_GRID_COST[lotteryGameFocus] * LOTTERY_UPCOMING_DRAWS.filter((draw) => draw.game === lotteryGameFocus).length * lotterySubscriptionWeeks).toFixed(2)} € pour {lotterySubscriptionWeeks} semaine{lotterySubscriptionWeeks > 1 ? 's' : ''}.
                    </p>
                  </div>

                  <div className="providerActions fullWidth">
                    <button className="secondaryButton" disabled={!virtualAppsEnabled.loto} onClick={() => playLotteryVirtualTickets(lotteryGameFocus)} type="button">
                      Jouer {LOTTERY_CONFIG[lotteryGameFocus].label} (fictif)
                    </button>
                    <button className="secondaryButton" disabled={!virtualAppsEnabled.loto} onClick={() => subscribeLotteryVirtualTickets([lotteryGameFocus], lotterySubscriptionWeeks)} type="button">
                      Abonnement {LOTTERY_CONFIG[lotteryGameFocus].label} · {lotterySubscriptionWeeks} sem.
                    </button>
                    <button className="ghostButton" disabled={!virtualAppsEnabled.loto} onClick={() => { playLotteryVirtualTickets('loto'); playLotteryVirtualTickets('euromillions'); }} type="button">
                      Jouer Loto + EuroMillions
                    </button>
                    <button className="ghostButton" disabled={!virtualAppsEnabled.loto} onClick={() => subscribeLotteryVirtualTickets(['loto', 'euromillions'], lotterySubscriptionWeeks)} type="button">
                      Abonnement Loto + EuroMillions
                    </button>
                    <button className="ghostButton" disabled={!virtualAppsEnabled.loto} onClick={resetLotteryVirtualPortfolio} type="button">
                      Réinitialiser à 50 €
                    </button>
                  </div>
                </div>
              </article>
              ) : null}

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
                {lotoAiRecommendationsEnabled ? (
                  <article className="featureCard" style={{ margin: 0 }}>
                    <div className="cardHeader">
                      <h2>Recommandations de l agent IA</h2>
                      <span>Loto + Euromillions en temps réel</span>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(['loto', 'euromillions'] as const).map((game) => {
                        const predictions = lotteryPredictionsDisplay[game].predictedGrids;
                        const avgConfidence = predictions.length > 0
                          ? Math.round(predictions.reduce((sum, grid) => sum + grid.confidenceIndex, 0) / predictions.length)
                          : 0;
                        const topGrid = predictions[0] ?? null;
                        const nextDraw = lotteryUpcoming.find((draw) => draw.game === game);
                        return (
                          <div key={`cockpit-loto-ia-${game}`} className="infoPanel mutedPanel" style={{ margin: 0, display: 'grid', gap: 6 }}>
                            <div className="compactRow" style={{ margin: 0 }}>
                              <strong>{LOTTERY_CONFIG[game].label}</strong>
                              <span className="metaPill">Confiance moyenne {avgConfidence}/100</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                              {predictions.length} recommandation(s) IA · Prochain tirage {nextDraw ? formatDateTimeFr(nextDraw.drawDate) : 'à venir'}
                            </p>
                            {topGrid ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {topGrid.numbers.map((value) => (
                                  <span key={`cockpit-grid-${game}-n-${value}`} className="lotteryBall" style={{ width: 22, height: 22, fontSize: '.7rem' }}>{value}</span>
                                ))}
                                {topGrid.stars.map((value) => (
                                  <span key={`cockpit-grid-${game}-s-${value}`} className="lotteryBall star" style={{ width: 22, height: 22, fontSize: '.7rem' }}>{value}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      <div className="providerActions fullWidth">
                        <button className="secondaryButton" onClick={() => window.scrollTo({ top: document.body.scrollHeight * 0.46, behavior: 'smooth' })} type="button">
                          Voir toutes les recommandations
                        </button>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article className="featureCard" style={{ margin: 0 }}>
                    <div className="cardHeader">
                      <h2>Recommandations de l agent IA</h2>
                      <span>IA désactivée</span>
                    </div>
                    <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                      <strong>Aucune recommandation affichée</strong>
                      <p>Activez l agent IA sur le portefeuille fictif Loto ou sur une intégration réelle pour afficher les grilles recommandées.</p>
                    </div>
                  </article>
                )}

                <article className="featureCard" style={{ margin: 0 }}>
                  <div className="cardHeader">
                    <h2>État des portefeuilles</h2>
                    <span>Virtuel et intégrations Loto</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div className="infoPanel mutedPanel" style={{ margin: 0, display: 'grid', gap: 6 }}>
                      <div className="compactRow" style={{ margin: 0 }}>
                        <strong>🎟️ Portefeuille fictif Loto</strong>
                        <span className={virtualAppsEnabled.loto ? 'statusBadge ok' : 'statusBadge warn'}>{virtualAppsEnabled.loto ? 'Actif' : 'Inactif'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                        Solde {lotteryVirtualPortfolio.bankroll.toFixed(2)} € · IA {lotteryVirtualPortfolio.ai_enabled ? 'active' : 'inactive'} · Mode {lotteryVirtualPortfolio.mode}
                      </p>
                      <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)' }}>
                        {lotteryPendingTickets.length} ticket(s) en cours · {lotterySettledTickets.length} ticket(s) réglé(s)
                      </p>
                    </div>

                    {lotoIntegrationPortfolios.length === 0 ? (
                      <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                        <strong>Aucune intégration active</strong>
                        <p>Connectez un prestataire tiers pour suivre un portefeuille réel dans ce cockpit.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {lotoIntegrationPortfolios.map((portfolio) => {
                          const cfg = getAgentConfig(portfolio.id);
                          const relatedCount = lotteryExecutionRequests.filter((request) => request.targetPortfolioId === portfolio.id).length;
                          return (
                            <div key={`cockpit-loto-state-${portfolio.id}`} className="infoPanel mutedPanel" style={{ margin: 0, display: 'grid', gap: 6 }}>
                              <div className="compactRow" style={{ margin: 0 }}>
                                <strong>🎟️ {portfolio.label}</strong>
                                <span className={portfolio.status === 'active' ? 'statusBadge ok' : 'statusBadge idle'}>{portfolio.status === 'active' ? 'Connecté' : 'Disponible'}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                                IA {cfg.enabled ? 'active' : 'inactive'} · Mode {cfg.mode} · Recommandations confirmées {relatedCount}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="infoPanel" style={{ margin: 0 }}>
                      <strong>Dernières confirmations IA</strong>
                      {lotteryRecentExecutionRequests.length === 0 ? (
                        <p style={{ margin: '6px 0 0', fontSize: '.8rem' }}>Aucune recommandation confirmée pour le moment.</p>
                      ) : (
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                          {lotteryRecentExecutionRequests.slice(0, 3).map((request) => (
                            <li key={`cockpit-loto-last-${request.id}`} style={{ fontSize: '.8rem' }}>
                              {LOTTERY_CONFIG[request.game].label} · {request.targetPortfolioLabel} · {formatDateTimeFr(request.createdAt)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              </section>

              {lotteryPendingTickets.length > 0 ? (
                <article className="featureCard lotoSecondaryCard">
                  <div className="cardHeader">
                    <h2>🎟️ Grilles en cours de tirage (priorité)</h2>
                    <span>{lotteryPendingTickets.length} ticket(s) simulé(s), sans doublon</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {lotteryPendingTickets.slice(0, 10).map((ticket) => {
                      const isTicketLive = isWithinTimedWindow(ticket.drawDate, LOTTERY_DRAW_LIVE_WINDOW_MS, liveClockTs);
                      return (
                        <div key={ticket.id} className={`compactRow lotteryPendingRow${isTicketLive ? ' isLive' : ''}`} style={{ alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'grid', gap: 3, flex: '1 1 auto' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="sectionTag" style={{ margin: 0 }}>{ticket.game === 'loto' ? '🎯' : '🌟'} {LOTTERY_CONFIG[ticket.game].label}</span>
                              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{formatDateTimeFr(ticket.drawDate)}</span>
                              {ticket.subscriptionLabel ? <span className="metaPill">{ticket.subscriptionLabel}</span> : null}
                              {isTicketLive ? <span className="lotteryLiveBadge">🎱 Boules en rotation</span> : null}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {ticket.numbers.map((n) => <span key={`pt-n-${ticket.id}-${n}`} className={`lotteryBall${isTicketLive ? ' spinning' : ''}`} style={{ fontSize: '.7rem', width: 22, height: 22 }}>{n}</span>)}
                              {ticket.stars.map((s) => <span key={`pt-s-${ticket.id}-${s}`} className={`lotteryBall star${isTicketLive ? ' spinning' : ''}`} style={{ fontSize: '.7rem', width: 22, height: 22 }}>{s}</span>)}
                            </div>
                          </div>
                          <span className={isTicketLive ? 'statusBadge warn lotteryLiveStatus' : 'statusBadge idle'}>
                            {isTicketLive ? 'Tirage en cours' : 'En attente'}
                          </span>
                        </div>
                      );
                    })}
                    {lotteryPendingTickets.length > 10 ? (
                      <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                        + {lotteryPendingTickets.length - 10} ticket(s) supplémentaire(s) — <button className="ghostButton" style={{ display: 'inline', padding: '2px 6px' }} onClick={() => { setLotoPortfolioMenuSelection('loto-virtual'); setAppView('portfolios'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Voir tout</button>
                      </p>
                    ) : null}
                  </div>
                </article>
              ) : null}

              <article className="featureCard lotoSecondaryCard">
                <div className="cardHeader">
                  <h2>📅 Prochains tirages & jackpots</h2>
                  <span>Fermeture des prises de jeu incluse</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
                  {lotteryUpcoming.map((draw) => (
                    <div key={`${draw.game}-${draw.drawDate}`} className="lotteryUpcomingCard">
                      <p className="sectionTag" style={{ marginBottom: 4 }}>{draw.game === 'loto' ? '🎯' : '🌟'} {LOTTERY_CONFIG[draw.game].label}</p>
                      <strong style={{ fontSize: '1rem' }}>{new Date(draw.drawDate).toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>⏳ Cloture des grilles: {draw.closeAt}</p>
                      <div style={{ marginTop: 8 }}>
                        <span className="metaPill" style={{ fontWeight: 800 }}>💵 {draw.jackpotLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="featureCard lotoPrimaryCard">
                <div className="cardHeader">
                  <h2>Loto — Grilles probables</h2>
                  <span>{normalizedLotteryGridCount} grille(s) IA differentes par tirage selon profil {userBettingRiskProfile}</span>
                </div>
                <div className="infoPanel" style={{ marginBottom: 10, display: 'grid', gap: 6 }}>
                  <strong>Comment Robin IA choisit vos grilles</strong>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>L agent recalcule apres chaque tirage en s appuyant sur les frequences, la recence, les numeros en retard, les couples historiquement compatibles et l equilibre statistique de la grille.</p>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>Objectif pratique: jouer {normalizedLotteryGridCount} grilles complementaires et toutes differentes a chaque tirage, avec des {LOTTERY_CONFIG[lotteryGameFocus].starLabel.toLowerCase()} distincts entre elles pour etendre la couverture du tirage.</p>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>Retroprojection: chaque grille est testee sur les {LOTTERY_DISPLAY_BACKTEST_DRAW_COUNT} derniers tirages officiels avec un bareme estimatif interne, faute de rapports FDJ detailles stockes dans l application.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className={lotteryGameFocus === 'loto' ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'}
                    onClick={() => setLotteryGameFocus('loto')}
                    type="button"
                  >
                    🎯 Loto
                  </button>
                  <button
                    className={lotteryGameFocus === 'euromillions' ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'}
                    onClick={() => setLotteryGameFocus('euromillions')}
                    type="button"
                  >
                    🌟 Euromillions
                  </button>
                </div>
                <div className="infoPanel" style={{ marginBottom: 10, display: 'grid', gap: 8 }}>
                  <strong>Nombre de grilles a jouer</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: MAX_LOTTERY_GRID_COUNT }, (_, index) => {
                      const count = index + 1;
                      return (
                        <button
                          key={`lottery-grid-count-${count}`}
                          className={normalizedLotteryGridCount === count ? 'smallPill selectedPortfolioPill selected' : 'smallPill selectedPortfolioPill'}
                          onClick={() => setLotteryGridCount(count)}
                          type="button"
                        >
                          {count} grille{count > 1 ? 's' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>Budget simple estime: {formatCurrency(String(normalizedLotteryGridCount * LOTTERY_SIMPLE_GRID_COST[lotteryGameFocus]))} par tirage sur {LOTTERY_CONFIG[lotteryGameFocus].label}.</p>
                </div>
                <div className="infoPanel" style={{ marginBottom: 10, display: 'grid', gap: 8 }}>
                  <strong>Confirmation rapide des recommandations IA</strong>
                  <label>
                    Portefeuille cible
                    <select value={selectedLotteryRecommendationPortfolioId} onChange={(event) => setSelectedLotteryRecommendationPortfolioId(event.target.value)}>
                      {lotteryAssignablePortfolios.map((portfolio) => (
                        <option key={`lottery-target-${portfolio.id}`} value={portfolio.id}>
                          {portfolio.executionMode === 'simulation' ? 'Simulation' : 'Réel'} · {portfolio.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                    La confirmation utilisateur exécute une simulation sur le portefeuille fictif, ou enregistre la recommandation sur le portefeuille réel choisi.
                  </p>
                  {selectedLotteryRecommendationPortfolio?.id === 'loto-virtual' && !virtualAppsEnabled.loto ? (
                    <div className="providerActions fullWidth">
                      <button className="secondaryButton" onClick={() => void updateVirtualAppPreference('loto', true)} type="button">
                        Activer le portefeuille fictif
                      </button>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {lotteryPredictionsDisplay[lotteryGameFocus].predictedGrids.map((grid, index) => {
                    const backtest = lotteryBacktests[lotteryGameFocus][grid.id];
                    const isProjectedWinner = backtest.totalEstimatedWinnings > 0;
                    const netLabel = `${backtest.netResult >= 0 ? '+' : '-'}${formatCurrency(String(Math.abs(backtest.netResult)))}`;
                    const hasJackpotProjection = backtest.hits.some((hit) => hit.estimatedPrize > 1000);
                    const confidenceLevel = confidenceLevelFromScale(grid.confidenceIndex, 100);
                    return (
                      <div key={grid.id} className={isProjectedWinner ? 'compactRow lotteryWinningGrid' : 'compactRow'} style={{ alignItems: 'center' }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <strong style={{ fontSize: '.9rem' }}>Grille #{index + 1} · Indice {grid.confidenceIndex}/100</strong>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {grid.numbers.map((value) => (
                              <span key={`${grid.id}-n-${value}`} className="lotteryBall">{value}</span>
                            ))}
                            {grid.stars.map((value) => (
                              <span key={`${grid.id}-s-${value}`} className="lotteryBall star">{value}</span>
                            ))}
                          </div>
                          <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)' }}>{grid.rationale}</p>
                          <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--text-2)' }}>Projection sur {backtest.analyzedDraws} tirages officiels: gains estimes {formatCurrency(String(backtest.totalEstimatedWinnings))} · cout {formatCurrency(String(backtest.totalCost))} · net {netLabel}.</p>
                          {backtest.hits.length > 0 ? (
                            <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>Tirages gagnants: {backtest.hits.map((hit) => `${new Date(hit.drawDate).toLocaleDateString('fr-FR')} · ${hit.rankLabel} · ${formatCurrency(String(hit.estimatedPrize))}`).join(' | ')}</p>
                          ) : (
                            <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>Aucun rang gagnant estime sur les {backtest.analyzedDraws} derniers tirages officiels.</p>
                          )}
                        </div>
                        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                          <span className="metaPill" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><ConfidenceDots level={confidenceLevel} /></span>
                          {isProjectedWinner ? (
                            <span className={`metaPill lotteryWinnerPill ${backtest.netResult >= 0 ? 'positive' : 'negative'}${hasJackpotProjection ? ' jackpot' : ''}`}>
                              <span className="lotteryWinnerPillIcon" aria-hidden="true">{hasJackpotProjection ? '🏆' : '💸'}</span>
                              <span>{netLabel}</span>
                            </span>
                          ) : null}
                          <button
                            className="secondaryButton"
                            onClick={() => confirmLotteryRecommendation(lotteryGameFocus, grid, selectedLotteryRecommendationPortfolioId, 1)}
                            type="button"
                          >
                            Confirmer sur le portefeuille · 1 tirage
                          </button>
                          <button
                            className="ghostButton"
                            onClick={() => confirmLotteryRecommendation(lotteryGameFocus, grid, selectedLotteryRecommendationPortfolioId, lotterySubscriptionWeeks)}
                            type="button"
                          >
                            Confirmer sur le portefeuille · {lotterySubscriptionWeeks} semaine{lotterySubscriptionWeeks > 1 ? 's' : ''}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="infoPanel" style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <strong>Jouer malin pour maximiser vos chances pratiques</strong>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>1) Multipliez de petites grilles équilibrées au lieu d une seule grosse mise. 2) Évitez les combinaisons ultra populaires (dates, suites évidentes) pour mieux partager un éventuel gain. 3) Mixez 1 grille "fiable" + 1 grille "diversifiée" et gardez un budget fixe par tirage.</p>
                  <p style={{ margin: 0, fontSize: '.82rem' }}>{lotteryGameFocus === 'loto' ? `Options conseillees: conservez ${normalizedLotteryGridCount} grille(s) simple(s) avec ${Math.min(normalizedLotteryGridCount, 10)} numeros Chance differents; si votre budget le permet, ajoutez Second Tirage seulement sur la grille la plus equilibree plutot que de dupliquer une combinaison.` : `Options conseillees: gardez ${normalizedLotteryGridCount} grille(s) simple(s) avec des etoiles reparties au maximum sans repetition; si vous ajoutez une option budget, privilegiez une grille multiple legere seulement sur la grille la plus stable.`}</p>
                  <p className="helperText" style={{ margin: 0 }}>Rappel important: Loto et Euromillions restent 100% des jeux de hasard. Ces conseils optimisent surtout la discipline de jeu et la structure des grilles, jamais une garantie de gain.</p>
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'loto' && appView === 'portfolios' ? (
            <section style={{ display: 'grid', gap: 18 }}>
              {lotoPortfolioMenuSelection === 'loto-virtual' ? (
                <article className="featureCard">
                  <div className="cardHeader">
                    <h2>🎟️ Portefeuille fictif Loto</h2>
                    <span>{virtualAppsEnabled.loto ? 'Actif' : 'Inactif'} · Solde {lotteryVirtualPortfolio.bankroll.toFixed(2)} €</span>
                  </div>
                  {!virtualAppsEnabled.loto ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div className="infoPanel" style={{ margin: 0, background: 'var(--warn-soft)', border: '1px solid var(--warn-border)' }}>
                        <strong>Portefeuille fictif Loto inactif</strong>
                        <p>Activez le portefeuille pour simuler des grilles et suivre vos gains/pertes après tirage.</p>
                      </div>
                      <label className="checkRow" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => void updateVirtualAppPreference('loto', true)}
                        />
                        <span>Activer le portefeuille fictif Loto/Euromillions (50 € simulés)</span>
                      </label>
                      <div className="providerActions fullWidth">
                        <button className="secondaryButton" onClick={() => void updateVirtualAppPreference('loto', true)} type="button">
                          Activer maintenant
                        </button>
                        <button className="ghostButton" onClick={() => { setAppView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                          Aller au cockpit
                        </button>
                      </div>
                    </div>
                  ) : lotteryVirtualPortfolio.tickets.length === 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                        <strong>Aucun ticket fictif</strong>
                        <p>Jouez vos grilles depuis le cockpit ou confirmez une recommandation IA pour commencer.</p>
                      </div>
                      <div className="providerActions fullWidth">
                        <button className="secondaryButton" onClick={() => { playLotteryVirtualTickets(lotteryGameFocus); }} type="button">
                          Jouer une grille {LOTTERY_CONFIG[lotteryGameFocus].label}
                        </button>
                        <button className="ghostButton" onClick={() => { setAppView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">
                          Voir cockpit &amp; grilles probables
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <article className="infoPanel mutedPanel" style={{ margin: 0 }}>
                        <strong>En cours de tirage: {lotteryPendingTickets.length}</strong>
                        <p>Les tickets pending sont automatiquement réglés dès que l heure du tirage est passée. {lotteryVirtualPortfolio.tickets.filter((ticket) => ticket.subscriptionLabel).length} ticket(s) proviennent d un abonnement multi-semaines.</p>
                      </article>
                      <table className="txLogTable">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Jeu</th>
                            <th>Origine</th>
                            <th>Grille</th>
                            <th>Mise</th>
                            <th>Statut</th>
                            <th>Gain</th>
                            <th>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotteryVirtualPortfolio.tickets.slice(0, 40).map((ticket) => (
                            <tr key={ticket.id}>
                              <td>{formatDateTimeFr(ticket.drawDate)}</td>
                              <td>{LOTTERY_CONFIG[ticket.game].label}</td>
                              <td>
                                <span className="metaPill">{ticket.subscriptionLabel ?? 'Ponctuel'}</span>
                              </td>
                              <td>
                                {ticket.gridLabel}
                                <br />
                                <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{ticket.numbers.join('-')} | {ticket.stars.join('-')}</span>
                              </td>
                              <td>{ticket.stake.toFixed(2)} €</td>
                              <td>
                                <span className={ticket.status === 'won' ? 'statusBadge ok' : ticket.status === 'lost' ? 'statusBadge warn' : 'statusBadge idle'}>
                                  {ticket.status === 'pending' ? 'En cours' : ticket.status === 'won' ? 'Gagné' : 'Perdu'}
                                </span>
                              </td>
                              <td>{ticket.payout.toFixed(2)} €</td>
                              <td style={{ color: ticket.profit >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
                                {ticket.profit >= 0 ? '+' : ''}{ticket.profit.toFixed(2)} €
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              ) : selectedLotoIntegrationPortfolio ? (
                <article className="featureCard">
                  <div className="cardHeader">
                    <h2>🎟️ Portefeuille intégration · {selectedLotoIntegrationPortfolio.label}</h2>
                    <span>{selectedLotoIntegrationPortfolio.providerName} · créé automatiquement depuis Options</span>
                  </div>
                  {(() => {
                    const cfg = getAgentConfig(selectedLotoIntegrationPortfolio.id);
                    const relatedRequests = lotteryExecutionRequests.filter((request) => request.targetPortfolioId === selectedLotoIntegrationPortfolio.id);
                    return (
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                          <strong>Portefeuille d intégration tiers</strong>
                          <p>Ce portefeuille est créé au nom de l intégration active. Vous pouvez activer un agent IA dédié avec les mêmes modes: manuel, validation humaine ou autopilot.</p>
                        </div>
                        <label className="checkRow" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={(event) => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { enabled: event.target.checked, mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual' })}
                          />
                          <span>Activer l agent IA pour cette intégration</span>
                        </label>
                        <label>
                          Mode IA
                          <div className="aiModeSelector">
                            <button
                              className={`aiModeOption ${cfg.mode === 'manual' ? 'active manual' : ''}`}
                              disabled={!cfg.enabled}
                              onClick={() => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { mode: 'manual' })}
                              type="button"
                            >
                              <span>🖐</span>
                              <strong>Manuel</strong>
                              <small>Décisions humaines</small>
                            </button>
                            <button
                              className={`aiModeOption ${cfg.mode === 'supervised' ? 'active supervised' : ''}`}
                              disabled={!cfg.enabled}
                              onClick={() => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { mode: 'supervised' })}
                              type="button"
                            >
                              <span>👁</span>
                              <strong>Validation humaine</strong>
                              <small>L IA propose</small>
                            </button>
                            <button
                              className={`aiModeOption ${cfg.mode === 'autopilot' ? 'active autopilot' : ''}`}
                              disabled={!cfg.enabled}
                              onClick={() => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { mode: 'autopilot' })}
                              type="button"
                            >
                              <span>🤖</span>
                              <strong>Autopilot</strong>
                              <small>Exécution automatique</small>
                            </button>
                          </div>
                        </label>
                        <label>
                          Montant maximum transaction ({cfg.max_amount.toFixed(1)} €)
                          <input
                            type="range"
                            min={MIN_MONETARY_LIMIT}
                            max={MAX_AGENT_TRANSACTION_AMOUNT}
                            step={0.1}
                            disabled={!cfg.enabled}
                            value={Math.min(MAX_AGENT_TRANSACTION_AMOUNT, Math.max(MIN_MONETARY_LIMIT, cfg.max_amount))}
                            onChange={(event) => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                          />
                        </label>
                        <label>
                          Nombre de transactions / jour ({cfg.max_transactions_per_day})
                          <input
                            type="range"
                            min={1}
                            max={MAX_AGENT_TRANSACTIONS_PER_DAY}
                            step={1}
                            disabled={!cfg.enabled}
                            value={Math.min(MAX_AGENT_TRANSACTIONS_PER_DAY, Math.max(1, cfg.max_transactions_per_day))}
                            onChange={(event) => void updateAgentConfig(selectedLotoIntegrationPortfolio.id, { max_transactions_per_day: Math.max(1, Number(event.target.value) || 1) })}
                          />
                        </label>
                        <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                          <strong>Recommandations IA confirmées sur cette intégration</strong>
                          {relatedRequests.length === 0 ? (
                            <p style={{ margin: '4px 0 0' }}>Aucune recommandation confirmée en mode réel pour le moment.</p>
                          ) : (
                            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                              {relatedRequests.slice(0, 8).map((request) => (
                                <div key={request.id} className="compactRow" style={{ alignItems: 'center' }}>
                                  <div style={{ display: 'grid', gap: 2 }}>
                                    <strong style={{ fontSize: '.84rem' }}>{LOTTERY_CONFIG[request.game].label} · {request.gridLabel}</strong>
                                    <p style={{ margin: 0, fontSize: '.74rem', color: 'var(--muted)' }}>{formatDateTimeFr(request.drawDate)} · {request.subscriptionLabel ?? 'Ponctuel'}</p>
                                  </div>
                                  <span className="metaPill">Mode réel</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </article>
              ) : null}

              <article className="featureCard lotoSecondaryCard">
                <div className="cardHeader">
                  <h2>Historique & probabilites</h2>
                  <span>Analyse des tirages Loto et Euromillions</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
                  {(['loto', 'euromillions'] as LotteryGame[]).map((game) => {
                    const prediction = lotteryPredictionsDisplay[game];
                    const draws = game === 'loto' ? LOTO_HISTORY : EUROMILLIONS_HISTORY;
                    return (
                      <article key={`history-${game}`} className="lotteryHistoryCard">
                        <div className="cardHeader">
                          <h2>{LOTTERY_CONFIG[game].label}</h2>
                          <span>{prediction.totalDraws} tirages</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)' }}>Numeros les plus frequents:</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {prediction.hotNumbers.slice(0, 8).map((value) => (
                            <span key={`${game}-hot-${value}`} className="lotteryBall">{value}</span>
                          ))}
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{LOTTERY_CONFIG[game].starLabel} recurrent(s):</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {prediction.hotStars.slice(0, 4).map((value) => (
                            <span key={`${game}-star-${value}`} className="lotteryBall star">{value}</span>
                          ))}
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--muted)' }}>Dernier tirage en base:</p>
                          <p style={{ margin: '4px 0 0', fontSize: '.82rem' }}>
                            {formatDateTimeFr(draws[draws.length - 1]?.date ?? '')}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            </section>
          ) : null}

          {activeApp === 'loto' && appView === 'settings' ? (
            <section className="workspaceGrid settingsGrid">
              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>Options Loto · Portefeuille fictif</h2>
                  <span>Activation, agent IA et mode de pilotage</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label className="checkRow" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={virtualAppsEnabled.loto}
                      onChange={(event) => void updateVirtualAppPreference('loto', event.target.checked)}
                    />
                    <span>Activer le portefeuille fictif Loto/Euromillions (50 € simulés)</span>
                  </label>
                  <label className="checkRow" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={lotteryVirtualPortfolio.ai_enabled}
                      disabled={!virtualAppsEnabled.loto}
                      onChange={(event) => persistLotteryVirtualPortfolio({
                        ...lotteryVirtualPortfolio,
                        ai_enabled: event.target.checked,
                        mode: event.target.checked && lotteryVirtualPortfolio.mode === 'manual' ? 'supervised' : lotteryVirtualPortfolio.mode,
                      })}
                    />
                    <span>Activer l agent IA sur le portefeuille fictif Loto</span>
                  </label>
                  <label>
                    Mode IA
                    <select
                      value={lotteryVirtualPortfolio.mode}
                      disabled={!virtualAppsEnabled.loto || !lotteryVirtualPortfolio.ai_enabled}
                      onChange={(event) => persistLotteryVirtualPortfolio({ ...lotteryVirtualPortfolio, mode: event.target.value as BettingStrategy['mode'] })}
                    >
                      <option value="manual">Manuel</option>
                      <option value="supervised">Validation humaine</option>
                      <option value="autonomous">Autopilot</option>
                    </select>
                  </label>
                  <p className="helperText" style={{ margin: 0 }}>
                    Paramétrage standard IA: manuel, validation humaine ou autopilot.
                  </p>
                </div>
              </article>

              <article className="featureCard settingsCard">
                <div className="cardHeader">
                  <h2>Connecteurs tiers & portefeuilles d intégration</h2>
                  <span>Un portefeuille est créé automatiquement au nom de chaque intégration active</span>
                </div>
                {lotoIntegrationPortfolios.length === 0 ? (
                  <div className="infoPanel mutedPanel" style={{ margin: 0 }}>
                    <strong>Aucune intégration active</strong>
                    <p>Activez un connecteur dans les options Finance. Lorsqu il devient actif, un portefeuille d intégration apparaît ici avec son propre agent IA.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {lotoIntegrationPortfolios.map((portfolio) => {
                      const cfg = getAgentConfig(portfolio.id);
                      return (
                        <article key={`loto-settings-integration-${portfolio.id}`} className="infoPanel mutedPanel" style={{ margin: 0, display: 'grid', gap: 10 }}>
                          <div className="compactRow" style={{ margin: 0 }}>
                            <strong>🎟️ {portfolio.label}</strong>
                            <span className="metaPill">{portfolio.providerName}</span>
                          </div>
                          <label className="checkRow" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={(event) => void updateAgentConfig(portfolio.id, { enabled: event.target.checked, mode: event.target.checked ? (cfg.mode === 'manual' ? 'supervised' : cfg.mode) : 'manual' })}
                            />
                            <span>Activer un agent IA sur cette intégration</span>
                          </label>
                          <label>
                            Mode IA
                            <div className="aiModeSelector">
                              <button
                                className={`aiModeOption ${cfg.mode === 'manual' ? 'active manual' : ''}`}
                                disabled={!cfg.enabled}
                                onClick={() => void updateAgentConfig(portfolio.id, { mode: 'manual' })}
                                type="button"
                              >
                                <span>🖐</span>
                                <strong>Manuel</strong>
                                <small>Décisions humaines</small>
                              </button>
                              <button
                                className={`aiModeOption ${cfg.mode === 'supervised' ? 'active supervised' : ''}`}
                                disabled={!cfg.enabled}
                                onClick={() => void updateAgentConfig(portfolio.id, { mode: 'supervised' })}
                                type="button"
                              >
                                <span>👁</span>
                                <strong>Validation humaine</strong>
                                <small>L IA propose</small>
                              </button>
                              <button
                                className={`aiModeOption ${cfg.mode === 'autopilot' ? 'active autopilot' : ''}`}
                                disabled={!cfg.enabled}
                                onClick={() => void updateAgentConfig(portfolio.id, { mode: 'autopilot' })}
                                type="button"
                              >
                                <span>🤖</span>
                                <strong>Autopilot</strong>
                                <small>Exécution automatique</small>
                              </button>
                            </div>
                          </label>
                          <label>
                            Montant maximum transaction ({cfg.max_amount.toFixed(1)} €)
                            <input
                              type="range"
                              min={MIN_MONETARY_LIMIT}
                              max={MAX_AGENT_TRANSACTION_AMOUNT}
                              step={0.1}
                              disabled={!cfg.enabled}
                              value={Math.min(MAX_AGENT_TRANSACTION_AMOUNT, Math.max(MIN_MONETARY_LIMIT, cfg.max_amount))}
                              onChange={(event) => void updateAgentConfig(portfolio.id, { max_amount: Math.max(MIN_MONETARY_LIMIT, Number(event.target.value) || MIN_MONETARY_LIMIT) })}
                            />
                          </label>
                          <label>
                            Nombre de transactions / jour ({cfg.max_transactions_per_day})
                            <input
                              type="range"
                              min={1}
                              max={MAX_AGENT_TRANSACTIONS_PER_DAY}
                              step={1}
                              disabled={!cfg.enabled}
                              value={Math.min(MAX_AGENT_TRANSACTIONS_PER_DAY, Math.max(1, cfg.max_transactions_per_day))}
                              onChange={(event) => void updateAgentConfig(portfolio.id, { max_transactions_per_day: Math.max(1, Number(event.target.value) || 1) })}
                            />
                          </label>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          ) : null}

          {appView === 'admin' ? (
            <section className="workspaceGrid adminGrid rightDockLayout adminLayoutGrid">
              <AdminConsoleHeader
                activeConnectionsCount={integrationConnections.filter((item) => item.status === 'active').length}
                adminActiveUsersCount={adminActiveUsersCount}
                adminConnectedUsersCount={adminConnectedUsersCount}
                adminMfaEnabledCount={adminMfaEnabledCount}
                adminSection={adminSection}
                adminUsersLength={adminUsers.length}
                auditTotal={siteAuditSummary.total}
                auditWarnings={siteAuditSummary.warnings}
                emergencyStopActive={emergencyStopActive}
                integrationConnectionsLength={integrationConnections.length}
                onSelectSection={setAdminSection}
                pendingAdminUsersLength={pendingAdminUsers.length}
              />

              {adminSection === 'home' ? (
              <>
                <article className="featureCard adminSystemHealthCard">
                  <div className="cardHeader">
                    <h2>Santé du système</h2>
                    <span>Admin sans portefeuille, orienté supervision</span>
                  </div>
                  <div className="adminHealthGrid">
                    <div className="adminHealthItem">
                      <span>Utilisateurs actifs</span>
                      <strong>{adminActiveUsersCount}</strong>
                      <small>{pendingAdminUsers.length} validation(s) à traiter</small>
                    </div>
                    <div className="adminHealthItem">
                      <span>Audit warning</span>
                      <strong>{siteAuditSummary.warnings}</strong>
                      <small>{siteAuditSummary.total} événements tracés</small>
                    </div>
                    <div className="adminHealthItem">
                      <span>Connecteurs actifs</span>
                      <strong>{integrationConnections.filter((item) => item.status === 'active').length}</strong>
                      <small>{integrationConnections.length} intégration(s) connues</small>
                    </div>
                    <div className="adminHealthItem">
                      <span>Kill switch</span>
                      <strong>{emergencyStopActive ? 'Actif' : 'Inactif'}</strong>
                      <small>{emergencyStopActive ? 'Transactions bloquées' : 'Plateforme opérationnelle'}</small>
                    </div>
                  </div>
                  <div className="adminQuickActions">
                    <button className="secondaryButton" onClick={() => setAdminSection('approvals')} type="button">Traiter les validations</button>
                    <button className="ghostButton" onClick={() => setAdminSection('users')} type="button">Ouvrir l’annuaire</button>
                    <button className="ghostButton" onClick={() => setAdminSection('security')} type="button">Sécurité plateforme</button>
                  </div>
                  <div className="adminActionDeck">
                    <button className="adminActionCard" onClick={() => { setAdminSection('approvals'); requestAnimationFrame(() => scrollToSection('admin-approvals-users')); }} type="button">
                      <strong>Validation comptes</strong>
                      <span>{pendingAdminUsers.length} en attente</span>
                    </button>
                    <button className="adminActionCard" onClick={() => { setAdminSection('users'); requestAnimationFrame(() => scrollToSection('admin-approvals-users')); }} type="button">
                      <strong>Annuaire</strong>
                      <span>{adminUsers.length} comptes pilotables</span>
                    </button>
                    <button className="adminActionCard" onClick={() => { setAdminSection('audit'); requestAnimationFrame(() => scrollToSection('admin-audit-log')); }} type="button">
                      <strong>Journal d audit</strong>
                      <span>{siteAuditSummary.total} événements</span>
                    </button>
                    <button className="adminActionCard" onClick={() => { setAdminSection('security'); requestAnimationFrame(() => scrollToSection('admin-security')); }} type="button">
                      <strong>Sécurité</strong>
                      <span>{emergencyStopActive ? 'Kill switch actif' : 'Plateforme ouverte'}</span>
                    </button>
                  </div>
                </article>

                <article className="featureCard">
                  <div className="cardHeader">
                    <h2>Activité récente</h2>
                    <span>8 derniers événements significatifs</span>
                  </div>
                  {recentSiteAudit.length === 0 ? (
                    <div className="infoPanel mutedPanel">
                      <strong>Aucun événement récent</strong>
                      <p>Le journal d audit se remplira au fil des connexions et actions d administration.</p>
                    </div>
                  ) : (
                    <div className="compactAuditTimeline">
                      {recentSiteAudit.map((entry) => (
                        <div className="auditEntry" key={`admin-home-audit-${entry.id}`}>
                          <div className="auditDot" />
                          <div>
                            <div className="compactRow noBorder">
                              <strong>{entry.event_type}</strong>
                              <span>{new Date(entry.created_at).toLocaleString('fr-FR')}</span>
                            </div>
                            <p>Acteur: {entry.actor_id}</p>
                            <p>Sévérité: {entry.severity}{entry.ip_address ? ` · IP ${entry.ip_address}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </>
              ) : null}

              {/* === KILL SWITCH — redesigned prominent ===  */}
              {(adminSection === 'security') ? (
              <div className={`featureCard killSwitchPanel ${emergencyStopActive ? 'active' : 'inactive'}`} style={{ gridColumn: '1 / -1' }}>
                <div className="killSwitchHeader">
                  <div className="killSwitchTitle">
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🛑</span>
                    <div>
                      <strong>Kill Switch — Arrêt d'urgence</strong>
                      <p>Stoppe immédiatement toutes les transactions en cours et à venir, y compris le pilote automatique.</p>
                    </div>
                  </div>
                  <span className={`killStatusPill ${emergencyStopActive ? 'active' : 'inactive'}`}>
                    {emergencyStopActive ? '⚠️ ACTIF — Transactions bloquées' : '✓ Inactif — Opérationnel'}
                  </span>
                </div>
                <div className="killSwitchBody">
                  <p className="killSwitchDescription">
                    {emergencyStopActive ? (
                      <><strong>Le kill switch est actif.</strong> Toutes les transactions automatiques (pilote auto) sont suspendues. Les propositions manuelles sont bloquées. Le système reprendra normalement à la désactivation.</>
                    ) : (
                      <><strong>Action irréversible sans confirmation.</strong> Ce bouton stoppe toutes les décisions de l'agent IA — achats, ventes, propositions. À n'utiliser qu'en cas de comportement anormal de l'IA ou d'urgence de marché.</>
                    )}
                  </p>
                  <div className="killButtonWrap">
                    <button
                      className={`killButton ${emergencyStopActive ? 'release' : 'activate'}`}
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
                      {emergencyStopActive ? '✅ Reprendre les transactions' : '🛑 Activer l\'arrêt d\'urgence'}
                    </button>
                    <p className="killSafetyNote">🔒 Action auditée · MFA recommandée</p>
                  </div>
                  <div className="infoPanel mutedPanel" style={{ marginTop: 12 }}>
                    <strong>Limite globale de transactions / jour</strong>
                    <p>Plafond administrateur appliqué à chaque utilisateur (maximum 1000).</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={adminDailyTransactionLimit}
                        onChange={(event) => setAdminDailyTransactionLimit(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))}
                        style={{ width: 120 }}
                      />
                      <button className="secondaryButton" disabled={submitting} onClick={() => void saveAdminDailyTransactionLimit()} type="button">
                        {submitting ? 'Sauvegarde...' : 'Appliquer la limite'}
                      </button>
                      <span className="metaPill">Plafond actuel: {Math.max(1, Math.min(1000, Number(adminDailyTransactionLimit) || 1000))}/jour</span>
                    </div>
                  </div>
                  {emergencyStopActive ? (
                    <div className="infoPanel" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', padding: '10px 14px' }}>
                      <strong style={{ color: 'var(--danger)' }}>Système en arrêt d'urgence</strong>
                      <p style={{ color: '#7f1d1d' }}>Désactivez le kill switch pour reprendre les opérations. Vérifiez les logs avant de reprendre.</p>
                    </div>
                  ) : null}
                </div>
              </div>
              ) : null}

              {(adminSection === 'users' || adminSection === 'approvals') ? (
              <article className="featureCard" id="admin-approvals-users">
                <div className="cardHeader">
                  <h2>{adminSection === 'approvals' ? 'Comptes en attente de validation' : 'Gestion des comptes'}</h2>
                  <span>{adminSection === 'approvals' ? 'Validation admin avant première connexion' : 'Roles, applications autorisées et activation des comptes'}</span>
                </div>
                {adminFeedback ? <p className="helperText">{adminFeedback}</p> : null}
                {!user?.mfa_enabled ? (
                  <div className="infoPanel">
                    <strong>MFA recommandée</strong>
                    <p>Activez MFA dans Configuration pour renforcer la sécurité de l’administration. Les actions admin restent disponibles, mais une session MFA reste recommandée pour les comptes sensibles.</p>
                  </div>
                ) : null}
                <>
                    {adminSection === 'users' ? (
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
                      <select className="toolbarSelect" onChange={(event) => setAdminStatusFilter(event.target.value as 'all' | 'active' | 'inactive' | 'pending')} value={adminStatusFilter}>
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Inactifs</option>
                        <option value="pending">En attente validation</option>
                      </select>
                    </div>
                    ) : null}
                    {adminSection === 'approvals' ? (
                    <div className="adminToolbar">
                      <input
                        aria-label="Rechercher un compte en attente"
                        className="toolbarInput"
                        onChange={(event) => setApprovalsSearch(event.target.value)}
                        placeholder="Rechercher par nom ou email"
                        type="search"
                        value={approvalsSearch}
                      />
                      <select className="toolbarSelect" onChange={(event) => setApprovalsSort(event.target.value as 'newest' | 'oldest' | 'name')} value={approvalsSort}>
                        <option value="newest">Plus récents</option>
                        <option value="oldest">Plus anciens</option>
                        <option value="name">Nom A-Z</option>
                      </select>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          className="ghostButton"
                          disabled={submitting || approvalQueueRows.length === 0}
                          onClick={() => applyApprovalAppPreset('finance')}
                          type="button"
                        >
                          Pack Finance seulement
                        </button>
                        <button
                          className="ghostButton"
                          disabled={submitting || approvalQueueRows.length === 0}
                          onClick={() => applyApprovalAppPreset('paris')}
                          type="button"
                        >
                          Pack Paris
                        </button>
                        <button
                          className="ghostButton"
                          disabled={submitting || approvalQueueRows.length === 0}
                          onClick={() => applyApprovalAppPreset('all')}
                          type="button"
                        >
                          Tout activer
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          className="ghostButton"
                          disabled={approvalQueueRows.length === 0}
                          onClick={() => {
                            const next: Record<string, true> = {};
                            approvalQueueRows.forEach((entry) => { next[entry.id] = true; });
                            setSelectedApprovalIds(next);
                          }}
                          type="button"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          className="ghostButton"
                          disabled={selectedApprovalCount === 0}
                          onClick={() => setSelectedApprovalIds({})}
                          type="button"
                        >
                          Effacer sélection
                        </button>
                        <button
                          className="primaryButton"
                          disabled={submitting || selectedApprovalCount === 0}
                          onClick={() => void approvePendingUsersBatch(Object.keys(selectedApprovalIds), approvalAppSelections)}
                          type="button"
                        >
                          {submitting ? 'Validation...' : `Valider la sélection (${selectedApprovalCount})`}
                        </button>
                      </div>
                    </div>
                    ) : null}
                    <div className="adminSummaryRow">
                      <span>{adminSection === 'approvals' ? approvalQueueRows.length : filteredAdminUsers.length} utilisateur(s) affiches</span>
                      <span>{adminUsers.filter((entry) => entry.assigned_roles.includes('admin')).length} admin(s)</span>
                      <span>{adminConnectedUsersCount} connecte(s) recemment</span>
                      <span>{pendingAdminUsers.length} en attente</span>
                    </div>
                    <div className="adminList">
                    {adminSection === 'approvals' ? (
                      approvalQueueRows.length === 0 ? (
                        <div className="infoPanel mutedPanel">
                          <strong>Aucun compte en attente</strong>
                          <p>Tous les nouveaux utilisateurs ont été traités. Vous pouvez passer à la section Utilisateurs pour les mises à jour détaillées.</p>
                        </div>
                      ) : (
                        <div className="operationLedgerWrap">
                          <table className="operationLedger adminApprovalTable">
                            <thead>
                              <tr>
                                <th></th>
                                <th>Utilisateur</th>
                                <th>Email</th>
                                <th>Applications autorisées</th>
                                <th>Dernière connexion</th>
                                <th>MFA</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvalQueueRows.map((entry) => {
                                const appAccess = normalizeSelectedAppAccess(approvalAppSelections[entry.id] ?? entry.app_access);
                                const roles = new Set(entry.assigned_roles);
                                const selected = Boolean(selectedApprovalIds[entry.id]);
                                const adminActionsDisabled = submitting;
                                return (
                                  <tr key={`approval-row-${entry.id}`}>
                                    <td>
                                      <input
                                        aria-label={`Sélectionner ${entry.full_name}`}
                                        checked={selected}
                                        onChange={(event) => setSelectedApprovalIds((state) => {
                                          if (event.target.checked) {
                                            return { ...state, [entry.id]: true };
                                          }
                                          const next = { ...state };
                                          delete next[entry.id];
                                          return next;
                                        })}
                                        type="checkbox"
                                      />
                                    </td>
                                    <td>
                                      <strong>{entry.full_name}</strong>
                                    </td>
                                    <td>{entry.email}</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {ALL_APP_KEYS.map((appKey) => {
                                          const active = appAccess.includes(appKey);
                                          return (
                                            <button
                                              className={active ? 'tagButton active' : 'tagButton'}
                                              disabled={adminActionsDisabled}
                                              key={`approval-app-${entry.id}-${appKey}`}
                                              onClick={() => {
                                                setApprovalAppSelections((state) => {
                                                  const current = normalizeSelectedAppAccess(state[entry.id] ?? entry.app_access);
                                                  const next = current.includes(appKey)
                                                    ? current.filter((item) => item !== appKey)
                                                    : [...current, appKey];
                                                  return {
                                                    ...state,
                                                    [entry.id]: normalizeSelectedAppAccess(next),
                                                  };
                                                });
                                              }}
                                              type="button"
                                            >
                                              {APP_LABELS[appKey]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td>{entry.last_login_at ? new Date(entry.last_login_at).toLocaleString('fr-FR') : 'Jamais connecté'}</td>
                                    <td>
                                      <span className={entry.mfa_enabled ? 'statusBadge ok' : 'statusBadge warn'}>
                                        {entry.mfa_enabled ? 'Activée' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        className="primaryButton"
                                        disabled={adminActionsDisabled}
                                        onClick={() => updateAdminUser(entry, roles.has('banned') ? ['user'] : entry.assigned_roles, true, appAccess, { access_profile: 'write' })}
                                        type="button"
                                      >
                                        Valider
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                    filteredAdminUsers.map((entry) => {
                      const roles = new Set(entry.assigned_roles);
                      const appAccess = normalizeFrontendAppAccess(entry.app_access);
                      const userConns = adminConnections[entry.id] ?? [];
                      const adminActionsDisabled = submitting;
                      const lastConnection = entry.last_login_at ? new Date(entry.last_login_at).toLocaleString('fr-FR') : 'Aucune connexion';
                      const pendingApproval = isUserPendingApproval(entry);
                      const avatarUrl = String(entry.personal_settings.avatar_url ?? '').trim();
                      const riskProfile = normalizeUserRiskProfile(entry.personal_settings.risk_profile);
                      return (
                        <div className="adminUserCard" key={entry.id}>
                          <div className="adminUserCardHeader">
                            <div>
                              <strong>{entry.full_name}</strong>
                              <p>{entry.email}</p>
                              <p style={{ marginTop: 4, fontSize: '.76rem', color: 'var(--muted)' }}>Derniere connexion: {lastConnection}</p>
                              <p style={{ marginTop: 4, fontSize: '.76rem', color: 'var(--muted)' }}>
                                MFA: {entry.mfa_enabled ? 'activee' : 'inactive'} · Risque: {riskProfile === 'low' ? 'faible' : riskProfile === 'high' ? 'eleve' : 'moyen'}
                              </p>
                              <p style={{ marginTop: 4, fontSize: '.76rem', color: 'var(--muted)' }}>
                                Avatar: {avatarUrl ? avatarUrl : 'non defini'}
                              </p>
                              {pendingApproval ? (
                                <p style={{ marginTop: 4, fontSize: '.76rem', color: '#9a3412', fontWeight: 700 }}>Validation admin requise avant connexion</p>
                              ) : null}
                            </div>
                            <div className="adminActions">
                              {pendingApproval ? (
                                <button
                                  className="primaryButton"
                                  disabled={adminActionsDisabled}
                                  onClick={() => updateAdminUser(entry, roles.has('banned') ? ['user'] : entry.assigned_roles, true, appAccess, { access_profile: 'write' })}
                                  type="button"
                                >
                                  Valider compte
                                </button>
                              ) : null}
                              <button className={roles.has('user') ? 'tagButton active' : 'tagButton'} disabled={adminActionsDisabled} onClick={() => updateAdminUser(entry, roles.has('admin') ? ['admin', 'user'] : ['user'], entry.is_active, appAccess)} type="button">
                                Utilisateur
                              </button>
                              <button className={roles.has('admin') ? 'tagButton active' : 'tagButton'} disabled={adminActionsDisabled} onClick={() => updateAdminUser(entry, ['admin', 'user'], entry.is_active, appAccess)} type="button">
                                Admin
                              </button>
                              <button className={roles.has('banned') ? 'tagButton danger active' : 'tagButton'} disabled={adminActionsDisabled} onClick={() => updateAdminUser(entry, ['banned'], false, appAccess)} type="button">
                                Banni
                              </button>
                              <button className="ghostButton" disabled={adminActionsDisabled} onClick={() => updateAdminUser(entry, entry.assigned_roles, !entry.is_active, appAccess)} type="button">
                                {entry.is_active ? 'Desactiver' : 'Reactiver'}
                              </button>
                              <button
                                className="ghostButton"
                                disabled={adminActionsDisabled}
                                onClick={() => {
                                  const nextName = window.prompt('Nom complet', entry.full_name);
                                  if (nextName === null) {
                                    return;
                                  }
                                  const nextAvatar = window.prompt('Avatar URL (laisser vide pour supprimer)', String(entry.personal_settings.avatar_url ?? ''));
                                  if (nextAvatar === null) {
                                    return;
                                  }
                                  const nextRiskRaw = window.prompt('Profil de risque (low|medium|high)', normalizeUserRiskProfile(entry.personal_settings.risk_profile));
                                  if (nextRiskRaw === null) {
                                    return;
                                  }
                                  const normalizedRisk = nextRiskRaw.trim().toLowerCase();
                                  const nextRisk = normalizedRisk === 'low' || normalizedRisk === 'high' ? normalizedRisk : 'medium';
                                  updateAdminUser(entry, entry.assigned_roles, entry.is_active, appAccess, {
                                    full_name: nextName.trim() || entry.full_name,
                                    avatar_url: nextAvatar.trim(),
                                    risk_profile: nextRisk,
                                  });
                                }}
                                type="button"
                              >
                                Modifier profil
                              </button>
                              <button
                                className="ghostButton"
                                disabled={adminActionsDisabled}
                                onClick={() => {
                                  const newPassword = window.prompt('Nouveau mot de passe (14+ chars, maj/min/chiffre/symbole)');
                                  if (!newPassword) {
                                    return;
                                  }
                                  updateAdminUser(entry, entry.assigned_roles, entry.is_active, appAccess, { new_password: newPassword });
                                }}
                                type="button"
                              >
                                Reinitialiser MDP
                              </button>
                              <button
                                className="ghostButton"
                                disabled={adminActionsDisabled}
                                onClick={() => updateAdminUser(entry, entry.assigned_roles, entry.is_active, appAccess, { mfa_enabled: !entry.mfa_enabled })}
                                type="button"
                              >
                                {entry.mfa_enabled ? 'Desactiver MFA' : 'Activer MFA'}
                              </button>
                              <button
                                className="tagButton danger"
                                disabled={adminActionsDisabled}
                                onClick={() => deleteAdminUser(entry)}
                                type="button"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                          <div className="adminUserConnections" style={{ marginTop: 8 }}>
                            <span className="adminUserConnLabel">Applications autorisées :</span>
                            {ALL_APP_KEYS.map((appKey) => {
                              const active = appAccess.includes(appKey);
                              const nextApps = active
                                ? appAccess.filter((entryApp) => entryApp !== appKey)
                                : [...appAccess, appKey];
                              const safeNextApps: Array<'finance' | 'betting' | 'racing' | 'loto'> = nextApps.length > 0 ? nextApps : ['finance'];
                              return (
                                <button
                                  className={active ? 'tagButton active' : 'tagButton'}
                                  disabled={adminActionsDisabled}
                                  key={`user-app-${entry.id}-${appKey}`}
                                  onClick={() => updateAdminUser(entry, entry.assigned_roles, entry.is_active, safeNextApps)}
                                  type="button"
                                >
                                  {APP_LABELS[appKey]}
                                </button>
                              );
                            })}
                          </div>
                          {userConns.length > 0 ? (
                            <div className="adminUserConnections">
                              <span className="adminUserConnLabel">Connexions :</span>
                              {userConns.map((c) => {
                                const s = c.status === 'active' || c.status === 'available' ? 'ok'
                                        : c.status === 'pending_user_consent' ? 'warn' : 'error';
                                const statusText = c.status === 'active' || c.status === 'available'
                                  ? 'Connecte'
                                  : c.status === 'pending_user_consent'
                                    ? 'En attente'
                                    : 'Non connecte';
                                return (
                                  <span className={`statusBadge ${s}`} key={`${c.provider_code}-${c.account_label ?? 'x'}`}>
                                    <span className={`statusDot ${s}`} />
                                    {c.provider_name}{c.account_label ? ` · ${c.account_label}` : ''} · {statusText}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="adminUserConnections">
                              <span className="adminUserConnLabel">Connexions :</span>
                              <span className="statusBadge idle"><span className="statusDot idle" />Connexion: aucune</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                    )}
                      </div>
                </>
              </article>
              ) : null}

              {adminSection === 'approvals' ? (
              <article className="featureCard" id="admin-transactions-log">
                <div className="cardHeader">
                  <h2>Dernières connexions (audit trail)</h2>
                  <span>Journal des dernières authentifications</span>
                </div>
                {lastLoginAuditRows.length === 0 ? (
                  <div className="infoPanel mutedPanel">
                    <strong>Aucune connexion recensée</strong>
                    <p>Les dates de dernière connexion apparaîtront ici après la première authentification des comptes.</p>
                  </div>
                ) : (
                  <div className="auditTimeline">
                    {lastLoginAuditRows.map((entry) => (
                      <div className="auditEntry" key={`last-login-${entry.id}`}>
                        <div className="auditDot" />
                        <div>
                          <div className="compactRow noBorder">
                            <strong>{entry.full_name}</strong>
                            <span>{entry.last_login_at ? new Date(entry.last_login_at).toLocaleString('fr-FR') : 'Jamais connecté'}</span>
                          </div>
                          <p>{entry.email}</p>
                          <p>Statut: {isUserPendingApproval(entry) ? 'En attente validation' : entry.is_active ? 'Actif' : 'Inactif'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
              ) : null}

              {adminSection === 'transactions' ? (
              <article className="featureCard" id="admin-audit-log">
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
              ) : null}

              {adminSection === 'audit' ? (
              <article className="featureCard" id="admin-security">
                <div className="cardHeader">
                  <h2>Journal d audit</h2>
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
              ) : null}

              {adminSection === 'security' ? (
              <article className="featureCard">
                <div className="cardHeader">
                  <h2>Sécurité et intégrations</h2>
                  <span>Activation des services tiers</span>
                </div>
                <div className="infoPanel mutedPanel">
                  <strong>Activation administrateur des connecteurs</strong>
                  <p>Les administrateurs définissent ici les intégrations disponibles (Coinbase, bookmakers, banques). Chaque utilisateur renseigne ensuite ses identifiants personnels dans Mon compte / Options.</p>
                </div>
              </article>
              ) : null}
            </section>
          ) : null}
    </main>
  );
}
