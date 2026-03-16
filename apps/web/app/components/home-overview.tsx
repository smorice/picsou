'use client';

import { memo, ReactNode } from 'react';

type HomeAppKey = 'finance' | 'betting' | 'racing' | 'loto';
type Tone = 'up' | 'down' | 'neutral';
type StatusTone = 'ok' | 'idle' | 'warn';

type HomeTransactionRowLike = {
  id: string;
  appKey: HomeAppKey;
  title: string;
  portfolioLabel: string;
  date: string;
  timestamp?: number;
  note: string;
  gainLoss: number | null;
  taxes?: number;
};

type HomePortfolioPlanLike = {
  id: string;
  date: string;
  title: string;
};

type HomePortfolioActivityLike = {
  upcoming: HomePortfolioPlanLike[];
  rollingBalance7d: number;
  rollingBalance1m: number;
  rollingBalance6m: number;
  rollingBalance1y: number;
  rollingTone7d: Tone;
  rollingTone1m: Tone;
  rollingTone6m: Tone;
  rollingTone1y: Tone;
};

type HomePortfolioRowLike = {
  id: string;
  label: string;
  subtitle: string;
  valueLabel: string;
  history: Array<{ value: number }>;
  statusLabel: string;
  statusTone: StatusTone;
  trendLabel: string;
  trendTone: Tone;
  aiEnabled: boolean;
  autonomousActive: boolean;
};

type HomeOverviewProps = {
  appLabels: Record<HomeAppKey, string>;
  homeMood: { title: string; detail: string };
  homeUpcomingTransactions48h: HomeTransactionRowLike[];
  homeClosedTransactions: HomeTransactionRowLike[];
  homeRealPortfolioRows: HomePortfolioRowLike[];
  homeVirtualPortfolioRows: HomePortfolioRowLike[];
  homePortfolioActivity: Record<string, HomePortfolioActivityLike | undefined>;
  formatDateTimeFr: (value: string) => string;
  formatSignedEuro: (value: number | null, fallback?: string) => string;
  numericChangeTone: (value: number | null | undefined) => Tone;
  onOpenTransaction: (row: HomeTransactionRowLike) => void;
  onOpenPortfolio: (row: HomePortfolioRowLike) => void;
  onTogglePortfolioAi: (row: HomePortfolioRowLike, enabled: boolean) => void;
  renderSparkline: (history: Array<{ value: number }>, tone: Tone) => ReactNode;
};

const rollingPeriods = [
  { key: '7j', label: '7 jours', valueKey: 'rollingBalance7d', toneKey: 'rollingTone7d' },
  { key: '1m', label: '1 mois', valueKey: 'rollingBalance1m', toneKey: 'rollingTone1m' },
  { key: '6m', label: '6 mois', valueKey: 'rollingBalance6m', toneKey: 'rollingTone6m' },
  { key: '1y', label: '1 an', valueKey: 'rollingBalance1y', toneKey: 'rollingTone1y' },
] as const;

const LIVE_WINDOWS_MS: Record<HomeAppKey, number> = {
  finance: 20 * 60 * 1000,
  betting: 2 * 60 * 60 * 1000 + 20 * 60 * 1000,
  racing: 35 * 60 * 1000,
  loto: 18 * 60 * 1000,
};

const BOARD_SIGNAL_LABELS: Record<HomeAppKey, string> = {
  finance: 'MKT',
  betting: 'BET',
  racing: 'PMU',
  loto: 'FDJ',
};

function formatBoardTime(value: string) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) {
    return '--:--';
  }
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatBoardDate(value: string) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) {
    return 'date à confirmer';
  }
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getBoardLiveState(row: HomeTransactionRowLike) {
  const ts = Date.parse(row.date);
  if (!Number.isFinite(ts)) {
    return { isLive: false, isSoon: false };
  }
  const nowTs = Date.now();
  return {
    isLive: ts <= nowTs && (ts + LIVE_WINDOWS_MS[row.appKey]) > nowTs,
    isSoon: ts > nowTs && (ts - nowTs) <= (30 * 60 * 1000),
  };
}

const PlannedTransactionRow = memo(function PlannedTransactionRow({ row, appLabels, formatDateTimeFr, onOpenTransaction }: {
  row: HomeTransactionRowLike;
  appLabels: Record<HomeAppKey, string>;
  formatDateTimeFr: (value: string) => string;
  onOpenTransaction: (row: HomeTransactionRowLike) => void;
}) {
  const liveState = getBoardLiveState(row);
  return (
    <button className={`homeBoardRow departures ${row.appKey}${liveState.isLive ? ' live' : liveState.isSoon ? ' soon' : ''}`} onClick={() => onOpenTransaction(row)} type="button">
      <span className={`homeBoardSignal ${row.appKey}`}>{BOARD_SIGNAL_LABELS[row.appKey]}</span>
      <span className="homeBoardSchedule">
        <strong>{formatBoardTime(row.date)}</strong>
        <small>{formatBoardDate(row.date)}</small>
      </span>
      <span className={`homeBoardStatus ${liveState.isLive ? 'live' : liveState.isSoon ? 'soon' : ''}`}>{liveState.isLive ? 'LIVE' : liveState.isSoon ? 'À QUAI' : 'PRÉVU'}</span>
      <span className="homeBoardRoute">
        <strong className="homeBoardTitle">{row.title}</strong>
        <small>{row.portfolioLabel}</small>
      </span>
      <span className="homeBoardMeta">
        <span className="homeBoardLane">{appLabels[row.appKey]}</span>
        <span className="homeBoardForecast">Prévision {formatDateTimeFr(row.date)}</span>
      </span>
      <span className="homeBoardNote">{row.note}</span>
    </button>
  );
});

const SettledTransactionRow = memo(function SettledTransactionRow({ row, formatDateTimeFr, formatSignedEuro, numericChangeTone, onOpenTransaction }: {
  row: HomeTransactionRowLike;
  formatDateTimeFr: (value: string) => string;
  formatSignedEuro: (value: number | null, fallback?: string) => string;
  numericChangeTone: (value: number | null | undefined) => Tone;
  onOpenTransaction: (row: HomeTransactionRowLike) => void;
}) {
  return (
    <button className={`homeBoardRow settled ${row.appKey}`} onClick={() => onOpenTransaction(row)} type="button">
      <span className={`homeBoardSignal ${row.appKey}`}>{BOARD_SIGNAL_LABELS[row.appKey]}</span>
      <span className="homeBoardSchedule">
        <strong>{formatBoardTime(row.date)}</strong>
        <small>{formatBoardDate(row.date)}</small>
      </span>
      <span className="homeBoardStatus done">TERMINÉ</span>
      <span className="homeBoardRoute">
        <strong className="homeBoardTitle">{row.title}</strong>
        <small>{row.portfolioLabel}</small>
      </span>
      <span className="homeBoardMeta">
        <span className="homeBoardLane">{row.note}</span>
        <span className="homeBoardForecast">Clôturé {formatDateTimeFr(row.date)}</span>
      </span>
      <span className="homeBoardResult">
        <span className={`homeBoardPnl ${numericChangeTone(row.gainLoss)}`}>{formatSignedEuro(row.gainLoss, '0.00 €')}</span>
        <span className="homeBoardTax">Frais+Impôts {(row.taxes ?? 0).toFixed(2)} €</span>
      </span>
    </button>
  );
});

const PortfolioCard = memo(function PortfolioCard({
  row,
  activity,
  variant,
  formatDateTimeFr,
  formatSignedEuro,
  onOpenPortfolio,
  onTogglePortfolioAi,
  renderSparkline,
}: {
  row: HomePortfolioRowLike;
  activity: HomePortfolioActivityLike | undefined;
  variant: 'real' | 'virtual';
  formatDateTimeFr: (value: string) => string;
  formatSignedEuro: (value: number | null, fallback?: string) => string;
  onOpenPortfolio: (row: HomePortfolioRowLike) => void;
  onTogglePortfolioAi: (row: HomePortfolioRowLike, enabled: boolean) => void;
  renderSparkline: (history: Array<{ value: number }>, tone: Tone) => ReactNode;
}) {
  return (
    <article className={`homePortfolioCard ${variant}`} onClick={() => onOpenPortfolio(row)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenPortfolio(row); } }}>
      <div className="homePortfolioTop">
        <div>
          <strong>{row.label}</strong>
          <p>{row.subtitle}</p>
        </div>
        <div className="homePortfolioBadges">
          <button className={`homePortfolioBadgeButton portfolioTypeBadge ${variant}`} onClick={(event) => { event.stopPropagation(); onOpenPortfolio(row); }} type="button">{variant === 'real' ? 'Cumulé' : 'Simulation'}</button>
          <button
            aria-checked={row.aiEnabled}
            aria-label={`Basculer l agent IA pour ${row.label}`}
            className={`homeToggle homeAiToggle${row.aiEnabled ? ' isChecked' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePortfolioAi(row, !row.aiEnabled);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            role="switch"
            style={{ margin: 0 }}
            type="button"
          >
            <span className="homeToggleTrack"><span className="homeToggleThumb" /></span>
            <span className="homeToggleLabel">Agent IA</span>
          </button>
        </div>
      </div>
      <div className="homePortfolioMetrics">
        <div>
          <span className="homeMetricLabel">Valorisation</span>
          <div className="homePortfolioValue">{row.valueLabel}</div>
        </div>
        <div className="homeRollingBlock">
          <span className="homeMetricLabel">Balance glissante</span>
          <div className="homeRollingGrid">
            {rollingPeriods.map((period) => (
              <div className="homeRollingItem" key={period.key}>
                <small>{period.label}</small>
                <strong className={`homePortfolioTrend ${activity?.[period.toneKey] ?? 'neutral'}`}>{formatSignedEuro(activity?.[period.valueKey] ?? 0, '0.00 €')}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="homePortfolioGraphWrap">
        {row.history.length > 1 ? renderSparkline(row.history.slice(-30), row.trendTone) : <div className="homeGraphPlaceholder">Aucune évolution graphique exploitable</div>}
      </div>
      <div className="homePortfolioBottom">
        <div className="homePortfolioMetaBlock">
          <span className={`statusBadge ${row.statusTone === 'ok' ? 'ok' : row.statusTone === 'warn' ? 'warn' : 'idle'}`}>{row.statusLabel}</span>
          <span className={`homePortfolioTrend ${row.trendTone}`}>{row.trendLabel}</span>
          {row.autonomousActive ? <span className="homeAutoBadge">IA autonome</span> : null}
        </div>
        <div className="homePortfolioPlanBlock">
          <strong>{activity?.upcoming.length ?? 0} planifiée(s)</strong>
          {(activity?.upcoming.length ?? 0) === 0 ? <small>Aucune action en attente</small> : activity?.upcoming.map((item) => <small key={item.id}>{formatDateTimeFr(item.date)} · {item.title}</small>)}
        </div>
      </div>
    </article>
  );
});

function HomeOverviewComponent({
  appLabels,
  homeMood,
  homeUpcomingTransactions48h,
  homeClosedTransactions,
  homeRealPortfolioRows,
  homeVirtualPortfolioRows,
  homePortfolioActivity,
  formatDateTimeFr,
  formatSignedEuro,
  numericChangeTone,
  onOpenTransaction,
  onOpenPortfolio,
  onTogglePortfolioAi,
  renderSparkline,
}: HomeOverviewProps) {
  return (
    <section className="workspaceGrid" style={{ gap: 16 }}>
      <section className="homeBoardGrid" id="home-overview-stream" style={{ gridColumn: '1 / -1' }}>
        <article className="featureCard homeBoardPanel planned" id="home-overview-planned">
          <div className="cardHeader">
            <h2>Départs prévus</h2>
            <span>{homeUpcomingTransactions48h.length} circulation(s) · horizon 48h</span>
          </div>
          {homeUpcomingTransactions48h.length === 0 ? <p className="helperText" style={{ margin: 0 }}>Aucune transaction planifiée dans les 48 prochaines heures.</p> : <div className="homeBoardList">{homeUpcomingTransactions48h.map((row) => <PlannedTransactionRow appLabels={appLabels} formatDateTimeFr={formatDateTimeFr} key={row.id} onOpenTransaction={onOpenTransaction} row={row} />)}</div>}
        </article>

        <article className="featureCard homeBoardPanel settled" id="home-overview-settled">
          <div className="cardHeader">
            <h2>Arrivées récentes</h2>
            <span>{homeClosedTransactions.length} circulation(s)</span>
          </div>
          {homeClosedTransactions.length === 0 ? <p className="helperText" style={{ margin: 0 }}>Aucune transaction réalisée récente.</p> : <div className="homeBoardList compact">{homeClosedTransactions.map((row) => <SettledTransactionRow formatDateTimeFr={formatDateTimeFr} formatSignedEuro={formatSignedEuro} key={row.id} numericChangeTone={numericChangeTone} onOpenTransaction={onOpenTransaction} row={row} />)}</div>}
        </article>
      </section>

      <article className="featureCard" id="home-overview-portfolios" style={{ gridColumn: '1 / -1' }}>
        <div className="cardHeader">
          <h2>Home · Liste des portefeuilles</h2>
          <span>{homeMood.title} · {homeMood.detail}</span>
        </div>
        <div className="homePortfolioStack">
          <section className="homePortfolioSection real" id="home-overview-real">
            <div className="cardHeader" style={{ marginBottom: 8 }}>
              <h3>Portefeuilles réels</h3>
              <span>{homeRealPortfolioRows.length} élément(s)</span>
            </div>
            <div className="homePortfolioList">
              {homeRealPortfolioRows.map((row) => <PortfolioCard activity={homePortfolioActivity[row.id]} formatDateTimeFr={formatDateTimeFr} formatSignedEuro={formatSignedEuro} key={row.id} onOpenPortfolio={onOpenPortfolio} onTogglePortfolioAi={onTogglePortfolioAi} renderSparkline={renderSparkline} row={row} variant="real" />)}
            </div>
          </section>

          <section className="homePortfolioSection virtual" id="home-overview-virtual">
            <div className="cardHeader" style={{ marginBottom: 8 }}>
              <h3>Portefeuilles fictifs</h3>
              <span>{homeVirtualPortfolioRows.length} élément(s)</span>
            </div>
            <div className="homePortfolioList">
              {homeVirtualPortfolioRows.map((row) => <PortfolioCard activity={homePortfolioActivity[row.id]} formatDateTimeFr={formatDateTimeFr} formatSignedEuro={formatSignedEuro} key={row.id} onOpenPortfolio={onOpenPortfolio} onTogglePortfolioAi={onTogglePortfolioAi} renderSparkline={renderSparkline} row={row} variant="virtual" />)}
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}

export const HomeOverview = memo(HomeOverviewComponent);