# Schema base de donnees (premiere version)

## Tables principales

- `users`: profil, role, email, password_hash
- `children`: enfants associes a un utilisateur
- `posts`: contenu news/souvenir avec `memory_date`
- `post_media`: photos/videos associees aux posts
- `post_reads`: etat de lecture par utilisateur
- `comments`: commentaires
- `reactions`: reactions (like, coeur, etc.)
- `events`: calendrier, anniversaires, sorties
- `chat_messages`: historique chat
- `forum_topics`: sujets de forum
- `forum_messages`: messages forum
- `recipes`: recettes
- `recipe_steps`: etapes
- `audit_logs`: traces admin + securite

## SQL simplifie (extrait)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nayonne','nayonnion','admin')),
  password_hash TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  body TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('news','memory','recipe','event_summary')),
  memory_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE post_reads (
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
```
