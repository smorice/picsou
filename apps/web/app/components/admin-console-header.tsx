'use client';

import { memo } from 'react';

type AdminSection = 'home' | 'approvals' | 'users' | 'audit' | 'transactions' | 'security';

type AdminConsoleHeaderProps = {
  pendingAdminUsersLength: number;
  adminMfaEnabledCount: number;
  adminUsersLength: number;
  adminConnectedUsersCount: number;
  adminActiveUsersCount: number;
  auditWarnings: number;
  auditTotal: number;
  activeConnectionsCount: number;
  integrationConnectionsLength: number;
  emergencyStopActive: boolean;
  adminSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
};

function AdminConsoleHeaderComponent({
  pendingAdminUsersLength,
  adminMfaEnabledCount,
  adminUsersLength,
  adminConnectedUsersCount,
  adminActiveUsersCount,
  auditWarnings,
  auditTotal,
  activeConnectionsCount,
  integrationConnectionsLength,
  emergencyStopActive,
  adminSection,
  onSelectSection,
}: AdminConsoleHeaderProps) {
  return (
    <article className="featureCard adminConsoleHero" style={{ gridColumn: '1 / -1' }}>
      <div className="cardHeader" style={{ marginBottom: 8 }}>
        <h2>Console Admin</h2>
        <span>Vue système globale, santé plateforme, comptes et sécurité</span>
      </div>
      <div className="adminConsoleStats">
        <article className="adminConsoleStatCard">
          <span>Comptes total</span>
          <strong>{adminUsersLength}</strong>
          <small>{adminActiveUsersCount} actif(s)</small>
        </article>
        <article className="adminConsoleStatCard pending">
          <span>En attente</span>
          <strong>{pendingAdminUsersLength}</strong>
          <small>Validation requise</small>
        </article>
        <article className="adminConsoleStatCard">
          <span>MFA activé</span>
          <strong>{adminMfaEnabledCount}</strong>
          <small>sur {adminUsersLength} compte(s)</small>
        </article>
        <article className="adminConsoleStatCard">
          <span>Connectés récents</span>
          <strong>{adminConnectedUsersCount}</strong>
          <small>fenêtre 15 min</small>
        </article>
      </div>
      <div className="adminConsoleHeaderMeta">
        <span className="metaPill">Audit warning: {auditWarnings}</span>
        <span className="metaPill">Audit total: {auditTotal}</span>
        <span className="metaPill">Connecteurs actifs: {activeConnectionsCount}/{integrationConnectionsLength}</span>
        <span className={`metaPill ${emergencyStopActive ? 'warn' : ''}`}>{emergencyStopActive ? 'Kill switch actif' : 'Plateforme opérationnelle'}</span>
      </div>
      <div className="adminChildMenu adminConsoleTabs">
        <button className={adminSection === 'home' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('home')} type="button">Home système</button>
        <button className={adminSection === 'approvals' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('approvals')} type="button">Validation comptes ({pendingAdminUsersLength})</button>
        <button className={adminSection === 'users' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('users')} type="button">Annuaire utilisateurs</button>
        <button className={adminSection === 'audit' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('audit')} type="button">Journal d audit</button>
        <button className={adminSection === 'transactions' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('transactions')} type="button">Journal transactions</button>
        <button className={adminSection === 'security' ? 'tagButton active' : 'tagButton'} onClick={() => onSelectSection('security')} type="button">Sécurité plateforme</button>
      </div>
    </article>
  );
}

export const AdminConsoleHeader = memo(AdminConsoleHeaderComponent);