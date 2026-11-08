import { siteUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: \"og:url\", content: siteUrl("/about") },
      { title: "About Bago Market" },
      { name: "description", content: "Learn about Bago Market, the local marketplace for Bago Region." },
      { property: "og:title", content: "About Bago Market" },
      { property: "og:description", content: "Learn about Bago Market, the local marketplace for Bago Region." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/about") }],
  }),
  component: () => (
    <InfoPage my={{"title": "ပဲခူးဈေးအကြောင်း", "body": ["ပဲခူးဈေးသည် ပဲခူးတိုင်းဒေသကြီးရှိ ဒေသခံဆိုင်များနှင့် ဝယ်သူများကို ချိတ်ဆက်ပေးသော အွန်လိုင်းဈေးကွက်ဖြစ်ပါသည်။", "ဆိုင်တိုင်းကို စီမံခန့်ခွဲသူက စစ်ဆေးအတည်ပြုပြီးမှသာ ပြသပါသည်။"]}} en={{"title": "About Bago Market", "body": ["Bago Market is an online marketplace connecting local shops and shoppers across Bago Region.", "Every shop is reviewed and approved by our team before it appears publicly."]}} />
  ),
});
