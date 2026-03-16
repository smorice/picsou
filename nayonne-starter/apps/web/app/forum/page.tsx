import { ForumSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function ForumPage() {
  return (
    <SectionPage
      title="Forum"
      subtitle="Organisez sorties, discussions, souvenirs et idees de week-end dans des categories dediees."
    >
      <ForumSection />
    </SectionPage>
  );
}
