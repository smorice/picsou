import Link from "next/link";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/fil", label: "Fil" },
  { href: "/carte", label: "Carte" },
  { href: "/albums", label: "Albums" },
  { href: "/forum", label: "Forum" },
  { href: "/recettes", label: "Recettes" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/chat", label: "Chat" },
];

export function TopNav() {
  return (
    <nav className="top-nav" aria-label="Navigation principale">
      {links.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
