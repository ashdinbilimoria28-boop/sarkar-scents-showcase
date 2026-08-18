import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support: Shipping, Returns & Fragrance Guide | SARKAR" },
      {
        name: "description",
        content:
          "SARKAR Fragrances support: shipping and returns policy, authenticity promise, how to wear SPORTS, and answers to common questions.",
      },
      { property: "og:title", content: "SARKAR Support: Shipping, Returns & FAQ" },
      {
        property: "og:description",
        content: "Everything about delivery, returns, authenticity and wearing SARKAR SPORTS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const sections = [
  {
    id: "shipping",
    title: "Shipping & Returns",
    body: [
      "Orders placed before 4 PM IST are dispatched the same working day; everything else ships within 24 hours.",
      "Metro delivery takes 2–3 working days, rest of India 4–6 working days. Free shipping on orders over ₹2,000.",
      "Unhappy with your scent? Return any bottle within 30 days — even if opened — for a full refund.",
    ],
  },
  {
    id: "authenticity",
    title: "Authenticity Promise",
    body: [
      "Every SARKAR bottle is blended and filled at our own facility and sealed with a tamper-evident batch code.",
      "Verify your batch code on the box against the code etched on the bottle base. If they differ, contact us and we will replace it free.",
    ],
  },
  {
    id: "guide",
    title: "Fragrance Guide",
    body: [
      "Spray SPORTS onto clean, moisturised skin at the pulse points: wrists, neck and inner elbows.",
      "Two sprays for the office, four for the gym or a night out. Never rub your wrists — it crushes the top notes.",
      "Store the bottle upright, away from sunlight and heat, to protect the citrus opening.",
    ],
  },
];

const faqs = [
  {
    q: "How long does SARKAR SPORTS last on skin?",
    a: "Ten to twelve hours on most skin types, thanks to a 20% parfum concentration and an amber-musk base.",
  },
  {
    q: "Is it suitable for hot and humid weather?",
    a: "Yes. The citrus-mint opening and sweat-resistant fixative blend are designed for Indian summers and training sessions.",
  },
  {
    q: "Is SARKAR SPORTS unisex?",
    a: "It is built as a fresh unisex sport scent. The cedar-vetiver dry-down reads slightly masculine but wears well on anyone.",
  },
  {
    q: "Do you ship internationally?",
    a: "We currently ship across India. International orders are opening soon — write to care@sarkarfragrances.com to join the waitlist.",
  },
  {
    q: "Is the fragrance vegan and cruelty-free?",
    a: "Yes. No animal-derived ingredients and no animal testing at any stage of production.",
  },
];

function SupportPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="border-b border-border bg-[var(--surface)]">
          <div className="mx-auto max-w-4xl px-5 py-16">
            <p className="eyebrow">Help Centre</p>
            <h1 className="mt-3 text-4xl md:text-5xl">Support &amp; FAQ</h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Delivery, returns, authenticity and how to get the most out of SARKAR SPORTS.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-14 px-5 py-16">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-3xl">{s.title}</h2>
              <div className="mt-4 space-y-3 text-muted-foreground">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          <section id="faq" className="scroll-mt-24">
            <h2 className="text-3xl">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-4">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <div className="text-center">
            <Link
              to="/product"
              className="inline-block rounded-sm bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Shop SARKAR SPORTS
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
