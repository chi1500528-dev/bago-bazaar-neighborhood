import { siteUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { property: \"og:url\", content: siteUrl("/terms") },
      { title: "Terms \u00b7 Bago Market" },
      { name: "description", content: "Terms of use for Bago Market." },
      { property: "og:title", content: "Terms \u00b7 Bago Market" },
      { property: "og:description", content: "Terms of use for Bago Market." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/terms") }],
  }),
  component: () => (
    <InfoPage my={{"title": "စည်းမျဉ်းများ", "body": ["အပြည့်အစုံ စည်းမျဉ်းများကို မကြာမီ ထုတ်ပြန်ပါမည်။"]}} en={{"title": "Terms", "body": ["Full terms of use will be published soon."]}} />
  ),
});
