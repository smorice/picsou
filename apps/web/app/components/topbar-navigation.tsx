'use client';

import { memo } from 'react';

type HeaderMenuSection = 'home' | 'finance' | 'paris' | 'account' | 'admin';
type FinanceSubApp = 'crypto' | 'actions';
type ParisApp = 'betting' | 'racing' | 'loto';
type AdminSection = 'home' | 'approvals' | 'users' | 'audit' | 'transactions' | 'security';
type AppView = 'overview' | 'dashboard' | 'portfolios' | 'settings' | 'admin' | 'strategies' | 'account';

type TopbarNavigationProps = {
  animationKey: string;
  currentHeaderSection: HeaderMenuSection;
  currentHeaderPath: string;
  currentHeaderHint: string;
  allowedApps: Array<'finance' | 'betting' | 'racing' | 'loto'>;
  hasParisApps: boolean;
  canAccessAdmin: boolean;
  activeApp: 'finance' | 'betting' | 'racing' | 'loto';
  appView: AppView;
  financeSubApp: FinanceSubApp;
  topbarParisActiveApp: ParisApp;
  adminSection: AdminSection;
  openHomeParentMenu: () => void;
  openFinanceParentMenu: () => void;
  openParisParentMenu: () => void;
  openAdminWorkspace: () => void;
  openAccountWorkspace: (sectionId?: string) => void;
  openOverviewSection: (sectionId?: string) => void;
  openFinanceTopbarBranch: (subApp: FinanceSubApp) => void;
  openFinanceTopbarView: (view: 'dashboard' | 'portfolios' | 'settings') => void;
  openParisTopbarBranch: (app: ParisApp) => void;
  openParisTopbarView: (view: 'dashboard' | 'portfolios' | 'strategies' | 'settings') => void;
  onAdminSectionChange: (section: AdminSection) => void;
};

function TopbarNavigationComponent({
  animationKey,
  currentHeaderSection,
  currentHeaderPath,
  currentHeaderHint,
  allowedApps,
  hasParisApps,
  canAccessAdmin,
  activeApp,
  appView,
  financeSubApp,
  topbarParisActiveApp,
  adminSection,
  openHomeParentMenu,
  openFinanceParentMenu,
  openParisParentMenu,
  openAdminWorkspace,
  openAccountWorkspace,
  openOverviewSection,
  openFinanceTopbarBranch,
  openFinanceTopbarView,
  openParisTopbarBranch,
  openParisTopbarView,
  onAdminSectionChange,
}: TopbarNavigationProps) {
  const isParisSectionActive = activeApp === 'betting' || activeApp === 'racing' || activeApp === 'loto';

  return (
    <div className="topbarNavStack" key={animationKey}>
      <div className="topbarDepthRow level1">
        <span className="topbarDepthLabel">Univers</span>
        <div className="topbarParentNav">
          <button className={appView === 'overview' ? 'appSwitchBtn active' : 'appSwitchBtn'} onClick={openHomeParentMenu} type="button">🏠 Home</button>
          {allowedApps.includes('finance') ? (
            <button className={activeApp === 'finance' && appView !== 'account' && appView !== 'admin' && appView !== 'overview' ? 'appSwitchBtn finance active' : 'appSwitchBtn finance'} onClick={openFinanceParentMenu} type="button">🏦 Finance</button>
          ) : null}
          {hasParisApps ? (
            <button className={isParisSectionActive && appView !== 'account' && appView !== 'admin' && appView !== 'overview' ? 'appSwitchBtn betting active' : 'appSwitchBtn betting'} onClick={openParisParentMenu} type="button">🎲 Paris en ligne</button>
          ) : null}
          {canAccessAdmin ? (
            <button className={appView === 'admin' ? 'appSwitchBtn admin active' : 'appSwitchBtn admin'} onClick={openAdminWorkspace} type="button">🛡️ Admin</button>
          ) : null}
          <button className={appView === 'account' ? 'appSwitchBtn account active' : 'appSwitchBtn account'} onClick={() => openAccountWorkspace()} type="button">👤 Mon compte</button>
        </div>
      </div>

      {currentHeaderSection === 'home' ? (
        <>
          <div className="topbarDepthRow level2">
            <span className="topbarDepthLabel">Blocs</span>
            <button className="topbarDepthBtn home active" onClick={() => openOverviewSection()} type="button">Vue globale</button>
            <button className="topbarDepthBtn home" onClick={() => openOverviewSection('home-overview-portfolios')} type="button">Portefeuilles</button>
            <button className="topbarDepthBtn home" onClick={() => openOverviewSection('home-overview-stream')} type="button">Flux</button>
          </div>
          <div className="topbarDepthRow level3">
            <span className="topbarDepthLabel">Sauts rapides</span>
            <button className="topbarDepthBtn home isView" onClick={() => openOverviewSection('home-overview-planned')} type="button">À venir</button>
            <button className="topbarDepthBtn home isView" onClick={() => openOverviewSection('home-overview-settled')} type="button">Réalisées</button>
            <button className="topbarDepthBtn home isView" onClick={() => openOverviewSection('home-overview-real')} type="button">Réels</button>
            <button className="topbarDepthBtn home isView" onClick={() => openOverviewSection('home-overview-virtual')} type="button">Fictifs</button>
          </div>
        </>
      ) : null}

      {currentHeaderSection === 'finance' && allowedApps.includes('finance') ? (
        <>
          <div className="topbarDepthRow level2">
            <span className="topbarDepthLabel">Marché</span>
            <button className={`topbarDepthBtn finance${financeSubApp === 'crypto' ? ' active' : ''}`} onClick={() => openFinanceTopbarBranch('crypto')} type="button">₿ Cryptos</button>
            <button className={`topbarDepthBtn finance${financeSubApp === 'actions' ? ' active' : ''}`} onClick={() => openFinanceTopbarBranch('actions')} type="button">📈 Actions</button>
          </div>
          <div className="topbarDepthRow level3">
            <span className="topbarDepthLabel">Vue</span>
            <button className={`topbarDepthBtn finance isView${appView === 'dashboard' ? ' active' : ''}`} onClick={() => openFinanceTopbarView('dashboard')} type="button">Cockpit</button>
            <button className={`topbarDepthBtn finance isView${appView === 'portfolios' ? ' active' : ''}`} onClick={() => openFinanceTopbarView('portfolios')} type="button">Portefeuilles</button>
            <button className={`topbarDepthBtn finance isView${appView === 'settings' ? ' active' : ''}`} onClick={() => openFinanceTopbarView('settings')} type="button">Options</button>
          </div>
        </>
      ) : null}

      {currentHeaderSection === 'paris' && hasParisApps ? (
        <>
          <div className="topbarDepthRow level2">
            <span className="topbarDepthLabel">Produit</span>
            {allowedApps.includes('betting') ? <button className={`topbarDepthBtn paris${topbarParisActiveApp === 'betting' ? ' active' : ''}`} onClick={() => openParisTopbarBranch('betting')} type="button">⚽ Paris sportifs</button> : null}
            {allowedApps.includes('racing') ? <button className={`topbarDepthBtn paris${topbarParisActiveApp === 'racing' ? ' active' : ''}`} onClick={() => openParisTopbarBranch('racing')} type="button">🏇 Paris hippiques</button> : null}
            {allowedApps.includes('loto') ? <button className={`topbarDepthBtn paris${topbarParisActiveApp === 'loto' ? ' active' : ''}`} onClick={() => openParisTopbarBranch('loto')} type="button">🎟️ Loto</button> : null}
          </div>
          <div className="topbarDepthRow level3">
            <span className="topbarDepthLabel">Vue</span>
            <button className={`topbarDepthBtn paris isView${appView === 'dashboard' ? ' active' : ''}`} onClick={() => openParisTopbarView('dashboard')} type="button">Cockpit</button>
            <button className={`topbarDepthBtn paris isView${((topbarParisActiveApp === 'loto' && appView === 'portfolios') || (topbarParisActiveApp !== 'loto' && appView === 'strategies')) ? ' active' : ''}`} onClick={() => openParisTopbarView(topbarParisActiveApp === 'loto' ? 'portfolios' : 'strategies')} type="button">{topbarParisActiveApp === 'loto' ? 'Portefeuilles' : 'Stratégies'}</button>
            <button className={`topbarDepthBtn paris isView${appView === 'settings' ? ' active' : ''}`} onClick={() => openParisTopbarView('settings')} type="button">Options</button>
          </div>
        </>
      ) : null}

      {currentHeaderSection === 'account' ? (
        <>
          <div className="topbarDepthRow level2">
            <span className="topbarDepthLabel">Réglages</span>
            <button className="topbarDepthBtn account active" onClick={() => openAccountWorkspace('account-info')} type="button">Mes infos</button>
            <button className="topbarDepthBtn account" onClick={() => openAccountWorkspace('account-overview')} type="button">Mon compte</button>
            <button className="topbarDepthBtn account" onClick={() => openAccountWorkspace('account-objective')} type="button">Objectifs</button>
            <button className="topbarDepthBtn account" onClick={() => openAccountWorkspace('account-risk')} type="button">Agent IA</button>
          </div>
          <div className="topbarDepthRow level3">
            <span className="topbarDepthLabel">Sous-sections</span>
            <button className="topbarDepthBtn account isView" onClick={() => openAccountWorkspace('account-profile')} type="button">En-tête</button>
            <button className="topbarDepthBtn account isView" onClick={() => openAccountWorkspace('account-info')} type="button">Coordonnées</button>
            <button className="topbarDepthBtn account isView" onClick={() => openAccountWorkspace('account-overview')} type="button">Accès</button>
            <button className="topbarDepthBtn account isView" onClick={() => openAccountWorkspace('account-risk')} type="button">Curseurs IA</button>
          </div>
        </>
      ) : null}

      {currentHeaderSection === 'admin' && canAccessAdmin ? (
        <>
          <div className="topbarDepthRow level2">
            <span className="topbarDepthLabel">Modules</span>
            <button className={`topbarDepthBtn admin${adminSection === 'home' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('home'); }} type="button">Console</button>
            <button className={`topbarDepthBtn admin${adminSection === 'approvals' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('approvals'); }} type="button">Validations</button>
            <button className={`topbarDepthBtn admin${adminSection === 'users' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('users'); }} type="button">Utilisateurs</button>
            <button className={`topbarDepthBtn admin${adminSection === 'security' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('security'); }} type="button">Sécurité</button>
          </div>
          <div className="topbarDepthRow level3">
            <span className="topbarDepthLabel">Journaux</span>
            <button className={`topbarDepthBtn admin isView${adminSection === 'audit' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('audit'); }} type="button">Audit</button>
            <button className={`topbarDepthBtn admin isView${adminSection === 'transactions' ? ' active' : ''}`} onClick={() => { openAdminWorkspace(); onAdminSectionChange('transactions'); }} type="button">Transactions</button>
          </div>
        </>
      ) : null}

      <div className="topbarContextSummary">
        <span className="metaPill">Navigation guidée</span>
        <strong>{currentHeaderPath}</strong>
        <small>{currentHeaderHint}</small>
      </div>
    </div>
  );
}

export const TopbarNavigation = memo(TopbarNavigationComponent);