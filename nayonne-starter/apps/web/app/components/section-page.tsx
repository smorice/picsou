import Link from "next/link";
import { TopNav } from "./top-nav";

export function SectionPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="page-shell">
      <TopNav />
      <section className="card reveal">
        <p className="eyebrow">Les Nayonnes</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <p>
          <Link href="/">Retour a l'accueil</Link>
        </p>
      </section>
      {children}
    </main>
  );
}
