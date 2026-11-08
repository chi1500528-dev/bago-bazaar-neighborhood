import { siteUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: \"og:url\", content: siteUrl("/contact") },
      { title: "Contact \u00b7 Bago Market" },
      { name: "description", content: "How to contact the Bago Market team." },
      { property: "og:title", content: "Contact \u00b7 Bago Market" },
      { property: "og:description", content: "How to contact the Bago Market team." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/contact") }],
  }),
  component: () => (
    <InfoPage my={{"title": "ဆက်သွယ်ရန်", "body": ["ဆက်သွယ်ရန် အချက်အလက်များကို မကြာမီ ထည့်သွင်းပါမည်။", "အော်ဒါနှင့်ပတ်သက်၍ ဆိုင်ကို တိုက်ရိုက် ဖုန်းဆက်နိုင်ပါသည်။"]}} en={{"title": "Contact", "body": ["Our contact details will be added soon.", "For questions about an order, please call the shop directly from your order page."]}} />
  ),
});
