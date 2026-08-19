import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Truck, ShieldCheck, Sparkles, Wind, Timer, FlaskConical } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroBanner from "@/assets/hero-banner.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SARKAR Fragrances | SPORTS Eau de Parfum for Everyday Performance" },
      {
        name: "description",
        content:
          "SARKAR SPORTS is a long-lasting performance fragrance with citrus, mint and cedar. Shop the hero scent with fast shipping and a satisfaction guarantee.",
      },
      { property: "og:title", content: "SARKAR Fragrances | SPORTS Eau de Parfum" },
      {
        property: "og:description",
        content: "Bold, clean, 12-hour performance fragrance built for movement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const categories = [
  {
    icon: Wind,
    title: "Sport & Active",
    copy: "Fresh aquatic-citrus scents that hold through training and travel.",
    image: product3,
    alt: "SARKAR SPORTS fragrance used by an athlete in a locker room",
  },
  {
    icon: Sparkles,
    title: "Signature Woods",
    copy: "Cedar and vetiver bases for a grounded, confident dry-down.",
    image: product2,
    alt: "SARKAR SPORTS black fragrance bottle resting on wet slate",
  },
  {
    icon: FlaskConical,
    title: "Pure Ingredients",
    copy: "Ethically sourced naturals blended at 20% parfum concentration.",
    image: product4,
    alt: "Bergamot, cedar wood, mint and sea salt notes of SARKAR SPORTS on slate",
  },
];

const testimonials = [
  {
    name: "Rohan M.",
    role: "Verified Buyer",
    quote:
      "SARKAR SPORTS still smells sharp after a 9-hour shift and a gym session. Nothing else lasts like this.",
  },
  {
    name: "Ayesha K.",
    role: "Verified Buyer",
    quote:
      "Bought it as a gift and ended up ordering a second bottle for myself. The citrus opening is addictive.",
  },
  {
    name: "Daniel V.",
    role: "Verified Buyer",
    quote: "Clean, modern and not overpowering. It reads expensive without trying too hard.",
  },
];

function Stars({ className = "size-4" }: { className?: string }) {
  return (
    <div className="flex gap-0.5 text-[var(--gold)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={className} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroBanner}
            alt="SARKAR SPORTS eau de parfum bottle on display over wet stone"
            width={1920}
            height={1088}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative mx-auto max-w-6xl px-5 py-28 md:py-40">
            <p className="eyebrow">Hero Fragrance · Eau de Parfum</p>
            <h1 className="mt-4 max-w-2xl text-5xl leading-[0.95] md:text-7xl">
              Built for motion.
              <br />
              <span className="text-gradient">Scented for impact.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              SARKAR SPORTS delivers 12 hours of crisp citrus, cool mint and cedar — the fragrance
              that keeps pace with you.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/product"
                className="rounded-sm bg-primary px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]"
              >
                Shop SPORTS
              </Link>
              <div className="flex items-center gap-3">
                <Stars />
                <span className="text-sm text-muted-foreground">4.8 · 2,400+ reviews</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust badges */}
        <section className="border-y border-border bg-[var(--surface)]">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:grid-cols-3">
            {[
              { icon: Truck, label: "Fast Shipping", sub: "Dispatched in 24 hours" },
              { icon: ShieldCheck, label: "Satisfaction Guaranteed", sub: "30-day returns" },
              { icon: Timer, label: "12-Hour Longevity", sub: "20% parfum concentration" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <b.icon className="size-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow">The Collection</p>
          <h2 className="mt-3 text-4xl md:text-5xl">Explore the SARKAR range</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {categories.map((c) => (
              <article key={c.title} className="surface-card group overflow-hidden rounded-md">
                <img
                  src={c.image}
                  alt={c.alt}
                  loading="lazy"
                  width={900}
                  height={900}
                  className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-6">
                  <c.icon className="size-5 text-primary" />
                  <h3 className="mt-3 text-2xl">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="scroll-mt-24 border-y border-border bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Social Proof</p>
                <h2 className="mt-3 text-4xl md:text-5xl">Rated 4.8 by 2,400+ wearers</h2>
              </div>
              <div className="flex items-center gap-3">
                <Stars className="size-5" />
                <span className="text-sm text-muted-foreground">96% would buy again</span>
              </div>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <blockquote key={t.name} className="surface-card rounded-md p-6">
                  <Stars />
                  <p className="mt-4 text-sm leading-relaxed text-foreground/90">“{t.quote}”</p>
                  <footer className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">
                    {t.name} · {t.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-4xl md:text-5xl">Ready to wear SPORTS?</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            100ml eau de parfum. Free shipping on orders over ₹2,000.
          </p>
          <Link
            to="/product"
            className="mt-8 inline-block rounded-sm bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]"
          >
            View Product Details
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
