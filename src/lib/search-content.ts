export const siteOrigin = "https://sarkar-scents-showcase.lovable.app";
export const fragranceImage = `${siteOrigin}/img/sarkar-sports-social.jpg`;

export const productQuestions = [
  { q: "What is SARKAR SPORTS?", a: "SARKAR SPORTS is an eau de parfum in the SARKAR fragrance collection, with citrus, mint and woody scent notes." },
  { q: "Which bottle sizes are listed?", a: "The product page lists 50 ml, 100 ml and 150 ml bottle sizes, with Sports Classic, Sports Intense and Sports Aqua edition selectors." },
  { q: "Where can I find the fragrance notes?", a: "The product specifications list bergamot, Italian lemon and sea salt as top notes; mint, lavender and geranium as heart notes; and cedarwood, vetiver and amber musk as base notes." },
  { q: "Can I complete a paid order on this website?", a: "The shopping bag currently supports demo orders only. No payment is collected and no real order is placed." },
];

export const faqSchema = (url: string) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${url}#faq`,
  mainEntity: productQuestions.map(({ q, a }) => ({
    "@type": "Question", name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});

export function searchMeta(title: string, description: string, path: string, image?: string, type = "website") {
  return [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: type }, { property: "og:url", content: `${siteOrigin}${path}` },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title }, { name: "twitter:description", content: description },
    ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }, { property: "og:image:alt", content: "SARKAR SPORTS eau de parfum bottle on wet stone" }] : []),
  ];
}