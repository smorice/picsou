'use client';

import { memo } from 'react';

type AppKey = 'finance' | 'betting' | 'racing' | 'loto';
type GoalPeriod = '7d' | '1m' | '3m' | '1y';
type UserRiskProfile = 'low' | 'medium' | 'high';
type AgentMode = 'manual' | 'supervised' | 'autopilot';

type AccountWorkspaceProps = {
  user: {
    email: string;
    mfa_enabled: boolean;
    full_name: string;
  } | null;
  settingsForm: {
    firstName: string;
    lastName: string;
    fullName: string;
    phoneNumber: string;
    address: string;
    country: string;
    homeTransactionsLimit: string;
    objectiveNetGain: string;
    objectivePeriod: GoalPeriod;
    riskProfile: UserRiskProfile;
    realTradeMfaRequired: boolean;
    maxLossType: 'amount' | 'percent';
    maxLossValue: string;
    maxLossDays: string;
  };
  allowedApps: AppKey[];
  appLabels: Record<AppKey, string>;
  globalAgentConfig: {
    enabled: boolean;
    mode: AgentMode;
    max_amount: number;
    max_transactions_per_period: number;
    period_days: number;
    max_investment_amount: number;
    max_loss_amount: number;
  };
  aiManagedCount: number;
  aiManagedAmount: number;
  totalLossAmount: number;
  myActivityTrail: Array<{
    id: string;
    event_type: string;
    severity: string;
    created_at: string;
  }>;
  loadingMyActivity: boolean;
  goalTargetNet: number;
  goalPeriodLabel: string;
  objectiveEstimatedLoss: number;
  riskLossProfilePct: number;
  submitting: boolean;
  onSettingsFieldChange: (
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
  ) => void;
  onUpdateAgentConfig: (patch: Partial<AccountWorkspaceProps['globalAgentConfig']>) => void;
  onApplyRiskProfilePreset: (profile: UserRiskProfile) => void;
  onSave: () => void;
  onDeleteAccountRequest: () => void;
};

const GOAL_PERIOD_OPTIONS: Array<{ value: GoalPeriod; label: string }> = [
  { value: '7d', label: '7 jours' },
  { value: '1m', label: '1 mois' },
  { value: '3m', label: '3 mois' },
  { value: '1y', label: '1 an' },
];

function AccountWorkspaceComponent({
  user,
  settingsForm,
  allowedApps,
  appLabels,
  globalAgentConfig,
  aiManagedCount,
  aiManagedAmount,
  totalLossAmount,
  myActivityTrail,
  loadingMyActivity,
  goalTargetNet,
  goalPeriodLabel,
  objectiveEstimatedLoss,
  riskLossProfilePct,
  submitting,
  onSettingsFieldChange,
  onUpdateAgentConfig,
  onApplyRiskProfilePreset,
  onSave,
  onDeleteAccountRequest,
}: AccountWorkspaceProps) {
  if (!user) {
    return null;
  }

  return (
    <section className="workspaceGrid accountWorkspaceGrid">
      <article className="featureCard accountWorkspaceHero" id="account-profile">
        <div className="accountWorkspaceHeroTop">
          <div>
            <div className="cardHeader" style={{ marginBottom: 6 }}>
              <h2>Mon compte</h2>
              <span>Lecture claire, édition rapide, une seule zone utile</span>
            </div>
            <p className="accountWorkspaceLead">
              {settingsForm.fullName || user.full_name} · {user.email}
            </p>
          </div>
          <button className="primaryButton accountWorkspaceSave" disabled={submitting} onClick={onSave} type="button">
            {submitting ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
        <div className="accountWorkspaceHeroStats">
          <span className="metaPill">MFA {user.mfa_enabled ? 'actif' : 'à activer'}</span>
          <span className="metaPill">Applications {allowedApps.length}</span>
          <span className="metaPill">IA {globalAgentConfig.enabled ? 'active' : 'inactive'}</span>
        </div>
      </article>

      <article className="featureCard accountWorkspaceCard" id="account-info">
        <div className="cardHeader">
          <h2>Mes informations</h2>
          <span>Nom, prénom, contact et adresse</span>
        </div>
        <div className="accountWorkspaceFormGrid twoCols">
          <label>
            Prénom
            <input value={settingsForm.firstName} onChange={(event) => onSettingsFieldChange('firstName', event.target.value)} type="text" placeholder="Prénom" />
          </label>
          <label>
            Nom
            <input value={settingsForm.lastName} onChange={(event) => onSettingsFieldChange('lastName', event.target.value)} type="text" placeholder="Nom" />
          </label>
          <label>
            Email
            <input value={user.email} type="email" disabled />
          </label>
          <label>
            Téléphone
            <input value={settingsForm.phoneNumber} onChange={(event) => onSettingsFieldChange('phoneNumber', event.target.value)} type="tel" placeholder="+33 6 12 34 56 78" />
          </label>
          <label className="fullSpan">
            Adresse
            <input value={settingsForm.address} onChange={(event) => onSettingsFieldChange('address', event.target.value)} type="text" placeholder="Adresse postale" />
          </label>
          <label>
            Pays
            <input value={settingsForm.country} onChange={(event) => onSettingsFieldChange('country', event.target.value)} type="text" placeholder="France" />
          </label>
        </div>
      </article>

      <article className="featureCard accountWorkspaceCard" id="account-overview">
        <div className="cardHeader">
          <h2>Mon compte</h2>
          <span>Statistiques, accès et suppression</span>
        </div>
        <div className="accountOverviewStatsGrid">
          <div className="accountOverviewStatCard">
            <span>Applications</span>
            <strong>{allowedApps.length}</strong>
            <small>{allowedApps.map((app) => appLabels[app]).join(' · ')}</small>
          </div>
          <div className="accountOverviewStatCard">
            <span>Transactions IA</span>
            <strong>{aiManagedCount}</strong>
            <small>{aiManagedAmount.toFixed(2)} € gérés sur la fenêtre active</small>
          </div>
          <div className="accountOverviewStatCard">
            <span>Pertes glissantes</span>
            <strong>{totalLossAmount.toFixed(2)} €</strong>
            <small>Vision globale des pertes supervisées</small>
          </div>
          <div className="accountOverviewStatCard danger">
            <span>Suppression</span>
            <strong>Compte</strong>
            <button className="ghostButton danger" onClick={onDeleteAccountRequest} type="button">Demander la suppression</button>
          </div>
        </div>
      </article>

      <article className="featureCard accountWorkspaceCard" id="account-history">
        <div className="cardHeader">
          <h2>Mon historique</h2>
          <span>Dernières activités du compte</span>
        </div>
        {loadingMyActivity ? (
          <p className="helperText">Chargement de l historique...</p>
        ) : myActivityTrail.length === 0 ? (
          <p className="helperText">Aucun événement disponible pour le moment.</p>
        ) : (
          <div className="auditTimeline">
            {myActivityTrail.slice(0, 12).map((entry) => (
              <div className="auditEntry" key={`account-history-${entry.id}`}>
                <div className="auditDot" />
                <div>
                  <strong>{entry.event_type.replaceAll('_', ' ')}</strong>
                  <span>{new Date(entry.created_at).toLocaleString('fr-FR')} · {entry.severity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="featureCard accountWorkspaceCard" id="account-objective">
        <div className="cardHeader">
          <h2>Mes objectifs</h2>
          <span>Cible nette et garde-fous</span>
        </div>
        <div className="accountWorkspaceFormGrid twoCols">
          <label>
            Objectif net (€)
            <input value={settingsForm.objectiveNetGain} onChange={(event) => onSettingsFieldChange('objectiveNetGain', event.target.value)} type="number" min={0} step="10" />
          </label>
          <label>
            Période
            <select value={settingsForm.objectivePeriod} onChange={(event) => onSettingsFieldChange('objectivePeriod', event.target.value)}>
              {GOAL_PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Lignes Home (attente/réalisées)
            <input value={settingsForm.homeTransactionsLimit} onChange={(event) => onSettingsFieldChange('homeTransactionsLimit', event.target.value)} type="number" min={1} max={20} step={1} />
          </label>
          <label>
            Garde-fou pertes
            <select value={settingsForm.maxLossType} onChange={(event) => onSettingsFieldChange('maxLossType', event.target.value)}>
              <option value="percent">Pourcentage</option>
              <option value="amount">Montant</option>
            </select>
          </label>
          <label>
            Valeur max perte
            <input value={settingsForm.maxLossValue} onChange={(event) => onSettingsFieldChange('maxLossValue', event.target.value)} type="number" min={0} step={settingsForm.maxLossType === 'amount' ? '10' : '1'} />
          </label>
          <label className="fullSpan">
            Horizon de contrôle ({settingsForm.maxLossDays} jours)
            <input value={settingsForm.maxLossDays} onChange={(event) => onSettingsFieldChange('maxLossDays', event.target.value)} type="range" min={1} max={365} step={1} />
          </label>
        </div>
        <div className="accountObjectiveSummary">
          <span className="metaPill">Cible {goalTargetNet.toFixed(0)} €</span>
          <span className="metaPill">Horizon {goalPeriodLabel}</span>
          <span className="metaPill">Risque {riskLossProfilePct}%</span>
          <p>
            Perte potentielle estimée: <strong>{objectiveEstimatedLoss.toFixed(2)} €</strong>
          </p>
        </div>
      </article>

      <article className="featureCard accountWorkspaceCard" id="account-risk">
        <div className="cardHeader">
          <h2>Paramètres de mon agent IA</h2>
          <span>Toggles, curseurs et limites globales</span>
        </div>
        <div className="accountToggleRow">
          <button
            aria-checked={globalAgentConfig.enabled}
            className={`homeToggle accountMasterToggle${globalAgentConfig.enabled ? ' isChecked' : ''}`}
            onClick={() => onUpdateAgentConfig({
              enabled: !globalAgentConfig.enabled,
              mode: !globalAgentConfig.enabled && globalAgentConfig.mode === 'manual' ? 'supervised' : (!globalAgentConfig.enabled ? globalAgentConfig.mode : 'manual'),
            })}
            role="switch"
            type="button"
          >
            <span className="homeToggleTrack"><span className="homeToggleThumb" /></span>
            <span className="homeToggleLabel">Agent IA global</span>
          </button>
          <label className="checkRow" style={{ margin: 0 }}>
            <input checked={settingsForm.realTradeMfaRequired} onChange={(event) => onSettingsFieldChange('realTradeMfaRequired', event.target.checked)} type="checkbox" />
            <span>MFA obligatoire avant transaction réelle</span>
          </label>
        </div>
        <div className="accountRiskPresetRow">
          <button className={`smallPill ${settingsForm.riskProfile === 'low' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { onSettingsFieldChange('riskProfile', 'low'); onApplyRiskProfilePreset('low'); }} type="button">Prudent</button>
          <button className={`smallPill ${settingsForm.riskProfile === 'medium' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { onSettingsFieldChange('riskProfile', 'medium'); onApplyRiskProfilePreset('medium'); }} type="button">Équilibré</button>
          <button className={`smallPill ${settingsForm.riskProfile === 'high' ? 'selectedPortfolioPill selected' : ''}`} onClick={() => { onSettingsFieldChange('riskProfile', 'high'); onApplyRiskProfilePreset('high'); }} type="button">Dynamique</button>
        </div>
        <div className="aiModeSelector">
          <button className={`aiModeOption ${globalAgentConfig.mode === 'manual' ? 'active manual' : ''}`} disabled={!globalAgentConfig.enabled} onClick={() => onUpdateAgentConfig({ mode: 'manual' })} type="button"><span>🖐</span><strong>Manuel</strong><small>Aucune exécution</small></button>
          <button className={`aiModeOption ${globalAgentConfig.mode === 'supervised' ? 'active supervised' : ''}`} disabled={!globalAgentConfig.enabled} onClick={() => onUpdateAgentConfig({ mode: 'supervised' })} type="button"><span>👁</span><strong>Supervisé</strong><small>Validation humaine</small></button>
          <button className={`aiModeOption ${globalAgentConfig.mode === 'autopilot' ? 'active autopilot' : ''}`} disabled={!globalAgentConfig.enabled} onClick={() => onUpdateAgentConfig({ mode: 'autopilot' })} type="button"><span>🤖</span><strong>Autopilot</strong><small>Dans vos plafonds</small></button>
        </div>
        <div className="accountSliderGrid">
          <label>
            Montant max / ordre <strong>{globalAgentConfig.max_amount.toFixed(0)} €</strong>
            <input max={2000} min={1} onChange={(event) => onUpdateAgentConfig({ max_amount: Number(event.target.value) })} step={1} type="range" value={Math.round(globalAgentConfig.max_amount)} />
          </label>
          <label>
            Transactions / fenêtre <strong>{globalAgentConfig.max_transactions_per_period}</strong>
            <input max={60} min={1} onChange={(event) => onUpdateAgentConfig({ max_transactions_per_period: Number(event.target.value) })} step={1} type="range" value={globalAgentConfig.max_transactions_per_period} />
          </label>
          <label>
            Fenêtre de contrôle <strong>{globalAgentConfig.period_days} jours</strong>
            <input max={365} min={1} onChange={(event) => onUpdateAgentConfig({ period_days: Number(event.target.value) })} step={1} type="range" value={globalAgentConfig.period_days} />
          </label>
          <label>
            Investissement max / fenêtre <strong>{globalAgentConfig.max_investment_amount.toFixed(0)} €</strong>
            <input max={20000} min={10} onChange={(event) => onUpdateAgentConfig({ max_investment_amount: Number(event.target.value) })} step={10} type="range" value={Math.round(globalAgentConfig.max_investment_amount)} />
          </label>
          <label>
            Perte max / fenêtre <strong>{globalAgentConfig.max_loss_amount.toFixed(0)} €</strong>
            <input max={10000} min={10} onChange={(event) => onUpdateAgentConfig({ max_loss_amount: Number(event.target.value) })} step={10} type="range" value={Math.round(globalAgentConfig.max_loss_amount)} />
          </label>
        </div>
      </article>
    </section>
  );
}

export const AccountWorkspace = memo(AccountWorkspaceComponent);