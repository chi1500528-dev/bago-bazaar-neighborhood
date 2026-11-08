import { siteUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/privacy") },
      { title: "Privacy \u00b7 Bago Market" },
      { name: "description", content: "How Bago Market handles your personal information." },
      { property: "og:title", content: "Privacy \u00b7 Bago Market" },
      { property: "og:description", content: "How Bago Market handles your personal information." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/privacy") }],
  }),
  component: () => (
    <InfoPage my={{"title": "ကိုယ်ရေးအချက်အလက်မူဝါဒ", "body": ["သင့်လိပ်စာနှင့် ဖုန်းနံပါတ်ကို သင်မှာယူသောဆိုင်နှင့်သာ မျှဝေပါသည်။", "အကောင့်ဖျက်ခြင်း — အကောင့်စာမျက်နှာရှိ \"အကောင့်ဖျက်မည်\" ခလုတ်ဖြင့် သင့်အကောင့်၊ အမည်၊ ဖုန်းနံပါတ်နှင့် အခန်းကဏ္ဍများကို အချိန်မရွေး အပြီးတိုင် ဖျက်နိုင်ပါသည်။ ဆိုင်ပိုင်ရှင်ဖြစ်ပါက သင့်ဆိုင်ကို ဈေးကွက်မှ ဖယ်ရှားပါမည်။", "ဆိုင်များ၏ စာရင်းကိုင်ရန်အတွက် ယခင်မှာယူမှုမှတ်တမ်းများ (ပစ္စည်း၊ ပမာဏ) ကို ဆက်လက်ထားရှိနိုင်ပါသည်။", "အပြည့်အစုံ မူဝါဒကို မကြာမီ ထုတ်ပြန်ပါမည်။"]}} en={{"title": "Privacy", "body": ["Your address and phone number are shared only with the shop you order from.", "Account deletion — you can permanently delete your account, name, phone number and roles at any time with the \"Delete my account\" button on your Account page. If you own a shop, it is removed from the market.", "Past order records (items, amounts) may be kept so shops can keep their sales records.", "A full privacy policy will be published soon."]}} />
  ),
});
