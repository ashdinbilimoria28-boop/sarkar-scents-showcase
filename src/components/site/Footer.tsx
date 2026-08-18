import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-border bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl tracking-[0.28em]">SARKAR</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Performance fragrances engineered for movement. Bold, clean, long-lasting.
          </p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
              <span
                key={i}
                className="flex size-9 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                aria-label="Social media link placeholder"
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] text-foreground">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary">
                Home
              </Link>
            </li>
            <li>
              <Link to="/product" className="hover:text-primary">
                Product Details
              </Link>
            </li>
            <li>
              <Link to="/" hash="reviews" className="hover:text-primary">
                Reviews
              </Link>
            </li>
            <li>
              <Link to="/" hash="contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] text-foreground">Support</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Shipping &amp; Returns</li>
            <li>Authenticity Promise</li>
            <li>Fragrance Guide</li>
            <li>FAQ</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] text-foreground">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> care@sarkarfragrances.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-primary" /> +91 98200 00000
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-primary" /> 14 Marine Drive, Mumbai 400020
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SARKAR Fragrances. All rights reserved.
      </div>
    </footer>
  );
}
