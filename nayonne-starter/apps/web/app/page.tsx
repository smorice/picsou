import { HomeHero } from "./components/home-hero";
import { TopNav } from "./components/top-nav";
import { CommunitySections, FeedSection, MapSection } from "./components/sections";

export default function HomePage() {
  return (
    <main className="page-shell">
      <TopNav />
      <HomeHero />
      <FeedSection />
      <MapSection />
      <CommunitySections />
    </main>
  );
}
