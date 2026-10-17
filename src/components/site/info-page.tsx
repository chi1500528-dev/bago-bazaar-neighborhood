import { useApp } from "@/lib/app-state";

export function InfoPage({ my, en }: { my: { title: string; body: string[] }; en: { title: string; body: string[] } }) {
  const { lang } = useApp();
  const c = lang === "my" ? my : en;
  return (
    <article className="mx-auto max-w-2xl space-y-4 py-8">
      <h1 className="text-2xl font-bold">{c.title}</h1>
      {c.body.map((p, i) => <p key={i} className="text-muted-foreground">{p}</p>)}
    </article>
  );
}
