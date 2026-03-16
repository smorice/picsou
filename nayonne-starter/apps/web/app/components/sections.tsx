type Post = {
  id: string;
  title: string;
  body: string;
  memoryDate?: string;
};

const mockFeed: Post[] = [
  {
    id: "p1",
    title: "Pique-nique au lac",
    body: "Photos et mini-video disponibles dans l'album semaine 11.",
    memoryDate: "2026-03-02",
  },
  {
    id: "p2",
    title: "Nayonnion du mois",
    body: "Bravo pour la chorale et le gateau maison.",
  },
];

const members = [
  { name: "Lucie", city: "Nantes", children: 2 },
  { name: "Mehdi", city: "Lyon", children: 1 },
  { name: "Sarah", city: "Bordeaux", children: 3 },
];

export function FeedSection() {
  return (
    <section id="fil" className="card reveal">
      <h2>Fil personnel</h2>
      <p>Les posts lus disparaissent ici mais restent dans Articles / News.</p>
      <div className="feed-list">
        {mockFeed.map((post) => (
          <article key={post.id} className="feed-item">
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            {post.memoryDate && <small>Souvenir date: {post.memoryDate}</small>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function MapSection() {
  return (
    <section id="carte" className="card reveal">
      <h2>Carte des membres</h2>
      <div className="map-box" role="img" aria-label="Carte simplifiee des membres">
        {members.map((member) => (
          <div key={member.name} className="map-chip">
            <strong>{member.name}</strong>
            <span>{member.city}</span>
            <span>{member.children} enfant(s)</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AlbumsSection() {
  return (
    <section id="albums" className="card reveal">
      <h2>Albums photos & videos</h2>
      <p>Creation d'albums, drag-and-drop, commentaires, notes et diaporama.</p>
    </section>
  );
}

export function ForumSection() {
  return (
    <section id="forum" className="card reveal">
      <h2>Forum</h2>
      <p>Categories: sorties, discussions, souvenirs, idees week-end.</p>
    </section>
  );
}

export function RecettesSection() {
  return (
    <section id="recettes" className="card reveal">
      <h2>Recettes style Marmiton</h2>
      <p>Ingredients, etapes, photos, notes et favoris de la tribu.</p>
    </section>
  );
}

export function CalendrierSection() {
  return (
    <section id="calendrier" className="card reveal">
      <h2>Calendrier</h2>
      <p>Anniversaires et evenements avec animation festive.</p>
    </section>
  );
}

export function ChatSection() {
  return (
    <section id="chat" className="card reveal">
      <h2>Chat interne</h2>
      <p>Actif seulement avec au moins 2 utilisateurs connectes, historique conserve.</p>
    </section>
  );
}

export function CommunitySections() {
  return (
    <>
      <AlbumsSection />
      <ForumSection />
      <RecettesSection />
      <CalendrierSection />
      <ChatSection />
    </>
  );
}
