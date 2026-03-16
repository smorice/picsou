import { MapSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function CartePage() {
  return (
    <SectionPage
      title="Carte des Membres"
      subtitle="Visualisez ou vivent les Nayonnes et Nayonnions, avec profil et enfants associes."
    >
      <MapSection />
    </SectionPage>
  );
}
