import { RecettesSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function RecettesPage() {
  return (
    <SectionPage
      title="Recettes"
      subtitle="Retrouvez les recettes de la famille avec ingredients, etapes, photos et notes."
    >
      <RecettesSection />
    </SectionPage>
  );
}
