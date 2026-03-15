const mxRecords = [
  { priority: 1, host: 'mx0.mail.ovh.net.' },
  { priority: 5, host: 'mx1.mail.ovh.net.' },
  { priority: 50, host: 'mx2.mail.ovh.net.' },
  { priority: 100, host: 'mx3.mail.ovh.net.' },
];

export default function RoundcubeToolsPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #eef4ff 0%, #f9fbff 46%, #ffffff 100%)', color: '#0f172a' }}>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gap: 20 }}>
        <header style={{ display: 'grid', gap: 10 }}>
          <span style={{ width: 'fit-content', padding: '6px 12px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Tools / Roundcube
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1.02 }}>Roundcube pour nayonne.ovh</h1>
          <p style={{ margin: 0, maxWidth: 760, fontSize: '1rem', lineHeight: 1.7, color: '#334155' }}>
            Cette interface documente le remplacement de Postfix par Roundcube pour la messagerie du domaine nayonne.ovh. Roundcube est accessible via le proxy Caddy sur <strong>/roundcube</strong>, pendant que l API envoie les emails applicatifs via SMTP OVH authentifie.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <article style={{ border: '1px solid #bfdbfe', borderRadius: 22, background: '#ffffff', padding: 20, boxShadow: '0 10px 30px rgba(30,41,59,.06)' }}>
            <div style={{ fontSize: 28 }}>✉️</div>
            <h2 style={{ margin: '10px 0 4px', fontSize: '1rem' }}>Webmail Roundcube</h2>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>L interface de consultation des boites email est disponible sur /roundcube.</p>
          </article>
          <article style={{ border: '1px solid #bfdbfe', borderRadius: 22, background: '#ffffff', padding: 20, boxShadow: '0 10px 30px rgba(30,41,59,.06)' }}>
            <div style={{ fontSize: 28 }}>🌐</div>
            <h2 style={{ margin: '10px 0 4px', fontSize: '1rem' }}>Connexion OVH</h2>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>Roundcube utilise IMAP OVH (imap.mail.ovh.net:993) et SMTP OVH (ssl0.ovh.net:587).</p>
          </article>
          <article style={{ border: '1px solid #bfdbfe', borderRadius: 22, background: '#ffffff', padding: 20, boxShadow: '0 10px 30px rgba(30,41,59,.06)' }}>
            <div style={{ fontSize: 28 }}>🛡️</div>
            <h2 style={{ margin: '10px 0 4px', fontSize: '1rem' }}>Sortant applicatif</h2>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>L API envoie maintenant directement via SMTP OVH avec authentification (variables SMTP_*).</p>
          </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 18 }}>
          <article style={{ border: '1px solid #cbd5e1', borderRadius: 24, background: '#ffffff', padding: 24, boxShadow: '0 10px 30px rgba(30,41,59,.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Configuration cible</h2>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '.82rem' }}>Roundcube actif dans Docker Compose</span>
            </div>
            <div style={{ display: 'grid', gap: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '.92rem' }}>
              <div>Roundcube URL: /roundcube</div>
              <div>Roundcube IMAP: imap.mail.ovh.net:993 (SSL)</div>
              <div>Roundcube SMTP: ssl0.ovh.net:587 (TLS)</div>
              <div>SMTP host applicatif: ssl0.ovh.net</div>
              <div>SMTP port applicatif: 587</div>
              <div>SMTP from email: no-reply@nayonne.ovh</div>
              <div>SMTP starttls: true</div>
            </div>
          </article>

          <article style={{ border: '1px solid #cbd5e1', borderRadius: 24, background: '#ffffff', padding: 24, boxShadow: '0 10px 30px rgba(30,41,59,.05)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '1.1rem' }}>MX nayonne.ovh</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {mxRecords.map((record) => (
                <div key={`${record.priority}-${record.host}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '.88rem' }}>Priorité {record.priority}</strong>
                  <span style={{ color: '#475569', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '.84rem' }}>{record.host}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <article style={{ border: '1px solid #fde68a', borderRadius: 24, background: '#fffbeb', padding: 24 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.05rem' }}>Point DNS important</h2>
          <p style={{ margin: 0, color: '#713f12', lineHeight: 1.7 }}>
            Les MX fournis pointent vers OVH. Cela signifie que la reception des emails pour nayonne.ovh est assuree par OVH. Roundcube fournit l interface webmail, et l API envoie via SMTP OVH avec authentification.
          </p>
        </article>
      </section>
    </main>
  );
}
