import { AlbumsSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function AlbumsPage() {
  return (
    <SectionPage
      title="Albums Photos & Videos"
      subtitle="Deposez vos souvenirs en glisser-deposer, commentez et lancez les diaporamas familiaux."
    >
      <AlbumsSection />
    </SectionPage>
  );
}
