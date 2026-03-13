type DashboardData = {
  portfolio_id: string;
  total_value: string;
  pnl_realized: string;
  pnl_unrealized: string;
  annualized_return: number;
  rolling_volatility: number;
  max_drawdown: number;
  sector_heatmap: Array<{ sector: string; weight: number; pnl: number }>;
  allocation: Array<{ class: string; weight: number }>;
  recent_flows: Array<{ date: string; type: string; amount: number }>;
  suggestions: Array<{ title: string; score: number; justification: string }>;
};

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://api:8000';

async function getDashboard(): Promise<DashboardData | null> {
  try {
    const health = await fetch(`${apiBaseUrl}/health`, { cache: 'no-store' });
    if (!health.ok) {
      return null;
    }

    const portfolioId = process.env.DEMO_PORTFOLIO_ID ?? 'demo';
    const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/${portfolioId}`, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function Page() {
  const dashboard = await getDashboard();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brandLockup">
          <div className="brandMark" aria-hidden="true">
            <div className="brandCoin">P</div>
          </div>
          <div>
            <strong>Picsou IA</strong>
            <p>Allocation long terme, gouvernance stricte, validation humaine.</p>
          </div>
        </div>
        <div className="statusPill">
          <span className="statusDot" />
          Infrastructure active sur VPS
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Picsou IA</p>
          <h1>Assistant d’investissement long terme prêt à être opéré sur VPS.</h1>
          <p className="lede">
            Une base professionnelle pour recommandations auditables, exécution sous validation et gouvernance
            de risque explicite.
          </p>
        </div>
        <div className="heroCard">
          <span>Capital préservé</span>
          <strong>{dashboard ? formatCurrency(dashboard.total_value) : 'API indisponible'}</strong>
          <small>Valeur consolidée du portefeuille surveillé</small>
        </div>
      </section>

      <section className="grid metrics">
        {[
          ['PnL réalisé', dashboard ? formatCurrency(dashboard.pnl_realized) : 'n/a'],
          ['PnL latent', dashboard ? formatCurrency(dashboard.pnl_unrealized) : 'n/a'],
          ['Rendement annualisé', dashboard ? `${(dashboard.annualized_return * 100).toFixed(1)}%` : 'n/a'],
          ['Volatilité glissante', dashboard ? `${(dashboard.rolling_volatility * 100).toFixed(1)}%` : 'n/a'],
        ].map(([label, value]) => (
          <article className="panel" key={label}>
            <p>{label}</p>
            <h2>{value}</h2>
          </article>
        ))}
      </section>

      <section className="grid split">
        <article className="panel tall">
          <div className="sectionHeader">
            <h3>Allocation cible</h3>
            <span>multi-actifs</span>
          </div>
          <div className="allocationList">
            {(dashboard?.allocation ?? []).map((item) => (
              <div key={item.class}>
                <div className="row">
                  <span>{item.class}</span>
                  <strong>{(item.weight * 100).toFixed(0)}%</strong>
                </div>
                <div className="bar">
                  <div style={{ width: `${item.weight * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel tall">
          <div className="sectionHeader">
            <h3>Suggestions IA</h3>
            <span>human-in-the-loop</span>
          </div>
          <div className="suggestionList">
            {(dashboard?.suggestions ?? []).map((item) => (
              <div className="suggestion" key={item.title}>
                <div className="row">
                  <strong>{item.title}</strong>
                  <span>{item.score}/100</span>
                </div>
                <p>{item.justification}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid split">
        <article className="panel">
          <div className="sectionHeader">
            <h3>Heatmap sectorielle</h3>
            <span>risque et rendement</span>
          </div>
          <div className="heatmap">
            {(dashboard?.sector_heatmap ?? []).map((item) => (
              <div key={item.sector} className="heatCell">
                <span>{item.sector}</span>
                <strong>{(item.weight * 100).toFixed(0)}%</strong>
                <small>{(item.pnl * 100).toFixed(1)}%</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="sectionHeader">
            <h3>Flux récents</h3>
            <span>auditables</span>
          </div>
          <div className="flowList">
            {(dashboard?.recent_flows ?? []).map((flow) => (
              <div className="row flow" key={`${flow.date}-${flow.type}-${flow.amount}`}>
                <span>{flow.date}</span>
                <span>{flow.type}</span>
                <strong>{flow.amount > 0 ? '+' : ''}{flow.amount} EUR</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
