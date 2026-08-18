import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Star, Wind, Timer, Droplets, Leaf, Check } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroBanner from "@/assets/hero-banner.jpg";
import productMain from "@/assets/product-main.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "SARKAR SPORTS Eau de Parfum 100ml | Product Details & Specs" },
      {
        name: "description",
        content:
          "SARKAR SPORTS eau de parfum: bergamot, mint and cedar, 20% concentration, 12-hour wear. See sizes, specs, benefits and buy online.",
      },
      { property: "og:title", content: "SARKAR SPORTS Eau de Parfum 100ml" },
      {
        property: "og:description",
        content: "Citrus-mint-cedar performance fragrance with 12-hour longevity.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

const gallery = [
  { src: heroBanner, alt: "SARKAR SPORTS eau de parfum bottle on display over wet stone" },
  { src: productMain, alt: "SARKAR SPORTS fragrance bottle studio product photography" },
  { src: product2, alt: "SARKAR SPORTS bottle detail macro shot on dark slate" },
  { src: product3, alt: "SARKAR SPORTS fragrance being applied after a workout" },
  { src: product4, alt: "SARKAR SPORTS fragrance notes: bergamot, cedar, mint and sea salt" },
];

const sizes = ["50 ml", "100 ml", "150 ml"];
const editions = ["Sports Classic", "Sports Intense", "Sports Aqua"];

const benefits = [
  { icon: Timer, title: "12-Hour Longevity", copy: "High 20% parfum load keeps projection strong all day." },
  { icon: Wind, title: "Fresh Citrus Open", copy: "Bergamot and mint hit clean, never sharp or synthetic." },
  { icon: Droplets, title: "Sweat-Resistant", copy: "Formulated to stay true through training and humidity." },
  { icon: Leaf, title: "Skin-Kind Blend", copy: "Vegan, cruelty-free, dermatologically tested base." },
];

const specs: [string, string][] = [
  ["Product Name", "SARKAR SPORTS Eau de Parfum"],
  ["Concentration", "Eau de Parfum · 20%"],
  ["Volume", "50 ml / 100 ml / 150 ml"],
  ["Top Notes", "Bergamot, Italian Lemon, Sea Salt"],
  ["Heart Notes", "Cool Mint, Lavender, Geranium"],
  ["Base Notes", "Cedarwood, Vetiver, Amber Musk"],
  ["Longevity", "10–12 hours"],
  ["Sillage", "Moderate to strong"],
  ["Best For", "Daytime, gym, office, travel"],
  ["Origin", "Blended and bottled in India"],
];

function ProductPage() {
  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string>(sizes[1] ?? "100 ml");
  const [edition, setEdition] = useState<string>(editions[0] ?? "Sports Classic");
  const current = gallery[active] ?? gallery[0]!;


  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-2">
          <div>
            <img
              src={gallery[active].src}
              alt={gallery[active].alt}
              width={1200}
              height={900}
              className="aspect-4/3 w-full rounded-md border border-border object-cover"
            />
            <div className="mt-4 grid grid-cols-4 gap-3">
              {gallery.slice(1).map((g, i) => (
                <button
                  key={g.src}
                  onClick={() => setActive(i + 1)}
                  className={`overflow-hidden rounded-sm border transition-colors ${
                    active === i + 1 ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={g.src}
                    alt={g.alt}
                    loading="lazy"
                    width={300}
                    height={300}
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">SARKAR Fragrances</p>
            <h1 className="mt-3 text-4xl md:text-5xl">SARKAR SPORTS Eau de Parfum</h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex gap-0.5 text-[var(--gold)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.8 · 2,412 reviews</span>
            </div>
            <p className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-4xl text-foreground">₹2,499</span>
              <span className="text-lg text-muted-foreground line-through">₹3,299</span>
              <span className="rounded-sm bg-primary/15 px-2 py-1 text-xs uppercase tracking-widest text-primary">
                Save 24%
              </span>
            </p>
            <p className="mt-5 text-muted-foreground">
              A crisp citrus-mint opening settles into cedar and amber musk — engineered for long
              days in motion.
            </p>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Size</p>
              <div className="mt-3 flex gap-3">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-sm border px-5 py-2 text-sm transition-colors ${
                      size === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Edition</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {editions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEdition(e)}
                    className={`rounded-sm border px-5 py-2 text-sm transition-colors ${
                      edition === e
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-4">
              <button className="rounded-sm bg-primary px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]">
                Add to Cart
              </button>
              <button className="rounded-sm border border-border px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary">
                Buy Now
              </button>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {["Free shipping over ₹2,000", "30-day satisfaction guarantee", "100% authentic"].map(
                (i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> {i}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section className="border-y border-border bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <p className="eyebrow">Why it works</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Key benefits</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-md border border-border bg-background p-6">
                  <b.icon className="size-6 text-primary" />
                  <h3 className="mt-4 text-xl">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20">
          <p className="eyebrow">Details</p>
          <h2 className="mt-3 text-4xl md:text-5xl">Specifications</h2>
          <div className="mt-8 overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <tbody>
                {specs.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? "bg-[var(--surface)]" : ""}>
                    <th scope="row" className="w-2/5 px-5 py-3.5 font-medium text-muted-foreground">
                      {k}
                    </th>
                    <td className="px-5 py-3.5 text-foreground">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-border bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center">
            <h2 className="text-4xl md:text-5xl">Order SARKAR SPORTS today</h2>
            <p className="mt-4 text-muted-foreground">
              {size} · {edition} — dispatched within 24 hours with free returns.
            </p>
            <button className="mt-8 rounded-sm bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]">
              Add to Cart — ₹2,499
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
