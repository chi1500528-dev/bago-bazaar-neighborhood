import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy \u00b7 Bago Market" },
      { name: "description", content: "How Bago Market handles your personal information." },
      { property: "og:title", content: "Privacy \u00b7 Bago Market" },
      { property: "og:description", content: "How Bago Market handles your personal information." },
    ],
  }),
  component: () => (
    <InfoPage my={{"title": "ကိုယ်ရေးအချက်အလက်မူဝါဒ", "body": ["သင့်လိပ်စာနှင့် ဖုန်းနံပါတ်ကို သင်မှာယူသောဆိုင်နှင့်သာ မျှဝေပါသည်။", "အပြည့်အစုံ မူဝါဒကို မကြာမီ ထုတ်ပြန်ပါမည်။"]}} en={{"title": "Privacy", "body": ["Your address and phone number are shared only with the shop you order from.", "A full privacy policy will be published soon."]}} />
  ),
});
