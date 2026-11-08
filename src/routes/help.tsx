import { siteUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/info-page";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/help") },
      { title: "Help & FAQ \u00b7 Bago Market" },
      { name: "description", content: "Answers to common questions about shopping and selling on Bago Market." },
      { property: "og:title", content: "Help & FAQ \u00b7 Bago Market" },
      { property: "og:description", content: "Answers to common questions about shopping and selling on Bago Market." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/help") }],
  }),
  component: () => (
    <InfoPage my={{"title": "အကူအညီ", "body": ["ခြင်းတစ်ခုတွင် ဆိုင်တစ်ဆိုင်တည်းမှ ပစ္စည်းများသာ ထည့်နိုင်ပါသည်။", "ငွေပေးချေမှုကို ပစ္စည်းရောက်ချိန် (သို့) လာယူချိန်တွင် ပြုလုပ်ရပါသည်။", "ဆိုင်ဖွင့်လိုပါက အကောင့်ဝင်ပြီး 'ဆိုင်ဖွင့်မယ်' ကိုနှိပ်ပါ။"]}} en={{"title": "Help & FAQ", "body": ["A cart can hold items from one shop at a time.", "Payment is made on delivery or at pickup \u2014 there is no online payment yet.", "To sell, sign in and choose 'Open a shop'. Your shop goes live after approval."]}} />
  ),
});
