# Import News depuis reseaux sociaux

Objectif: faciliter la creation de contenu News depuis les reseaux sociaux des membres.

## Strategie recommandee

- Option A (simple): webhook no-code (Zapier/Make) vers l'endpoint API `/integrations/social/ingest`
- Option B (avancee): workers Python periodiques avec API officielles des plateformes
- Option C (hybride): import manuel via URL + extraction metadata

## Pipeline cible

1. Reception webhook (authentifie)
2. Normalisation payload (texte, auteur, date, medias)
3. Moderation automatique (anti-spam, taille, blacklist)
4. Creation d'un brouillon News en attente validation admin
5. Publication dans le fil et archive Chronologie

## Securite

- Token par integration
- Rotation trimestrielle token
- Rate-limit dedie endpoint integration
- Journalisation complete dans `audit_logs`

## Compatibilite

- Instagram: via outils tiers/webhooks
- Facebook: pages/groupes avec permissions adaptees
- TikTok/YouTube: extraction metadata video et liens
