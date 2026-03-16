import { ChatSection } from "../components/sections";
import { SectionPage } from "../components/section-page";

export default function ChatPage() {
  return (
    <SectionPage
      title="Chat Interne"
      subtitle="Discutez en direct; le chat devient actif des que 2 utilisateurs sont connectes."
    >
      <ChatSection />
    </SectionPage>
  );
}
