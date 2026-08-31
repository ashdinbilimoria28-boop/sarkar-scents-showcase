import { Suspense, lazy, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const CartSheet = lazy(() =>
  import("@/components/site/CartSheet").then((m) => ({ default: m.CartSheet })),
);

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Product Details", to: "/product" as const },
  { label: "Reviews", to: "/" as const, hash: "reviews" },
  { label: "Contact", to: "/" as const, hash: "contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
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

        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="size-10" aria-hidden="true" />}>
            <CartSheet />
          </Suspense>
          <Link
            to="/product"
            className="hidden rounded-sm border border-primary/60 bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.03] sm:inline-block"
          >
            Shop Now
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-sm border border-border text-foreground md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-5 py-4 md:hidden">
          <ul className="space-y-3">
            {navLinks.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  {...(l.hash ? { hash: l.hash } : {})}
                  onClick={() => setOpen(false)}
                  className="block text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/product"
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-sm bg-primary px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground"
              >
                Shop Now
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
