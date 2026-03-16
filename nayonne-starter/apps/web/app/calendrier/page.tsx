import { CalendrierSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function CalendrierPage() {
  return (
    <SectionPage
      title="Calendrier"
      subtitle="Suivez anniversaires et evenements importants de la tribu toute l'annee."
    >
      <CalendrierSection />
    </SectionPage>
  );
}
