const dynamicSpotlight = [
  "Souvenir surprise de 2018",
  "Recette de crepes de Mamie Nayonne",
  "Sortie dimanche au parc",
  "Top photos de la semaine",
];

function pickSpotlight() {
  const day = new Date().getDate();
  return dynamicSpotlight[day % dynamicSpotlight.length];
}

export function HomeHero() {
  return (
    <section className="hero card reveal" aria-label="Bandeau principal">
      <div>
        <p className="eyebrow">Bienvenue chez les Nayonnes</p>
        <h1>Le cocon prive des souvenirs de famille</h1>
        <p>
          Une maison numerique joyeuse pour partager photos, videos, recettes,
          sorties et petites nouvelles entre Nayonne, Nayonnion et amis proches.
        </p>
        <div className="pill-row">
          <span className="pill">Anniversaires visibles en permanence</span>
          <span className="pill">Fil personnel intelligent</span>
          <span className="pill">Chat en direct des 2 connectes</span>
        </div>
      </div>
      <aside className="mascot-box">
        <div className="mascot-head" aria-hidden="true">
          <span className="ear left" />
          <span className="ear right" />
          <span className="eye left" />
          <span className="eye right" />
          <span className="nose" />
        </div>
        <p className="spotlight-title">Selection dynamique du jour</p>
        <p className="spotlight">{pickSpotlight()}</p>
      </aside>
    </section>
  );
}
