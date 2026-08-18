import { Link } from "@tanstack/react-router";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Product Details", to: "/product" as const },
  { label: "Reviews", to: "/" as const, hash: "reviews" },
  { label: "Contact", to: "/" as const, hash: "contact" },
];


export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-[0.28em] text-foreground">SARKAR</span>
          <span className="eyebrow hidden sm:inline">Fragrances</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              {...(l.hash ? { hash: l.hash } : {})}
              className="text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}

        </nav>

        <Link
          to="/product"
          className="rounded-sm border border-primary/60 bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          Shop Now
        </Link>
      </div>
    </header>
  );
}
