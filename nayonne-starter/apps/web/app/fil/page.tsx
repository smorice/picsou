import { FeedSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function FilPage() {
  return (
    <SectionPage
      title="Fil de News"
      subtitle="Votre fil personnel masque les articles lus, tout en conservant l'historique dans News."
    >
      <FeedSection />
    </SectionPage>
  );
}
