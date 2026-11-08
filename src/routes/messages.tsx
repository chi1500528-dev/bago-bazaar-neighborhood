import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RequireAuth } from "@/components/site/shell";
import { ChatInbox } from "@/components/site/chat";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages · Bago Market" },
      { name: "description", content: "Your chats with local shops on Bago Market." },
      { property: "og:title", content: "Messages · Bago Market" },
      { property: "og:description", content: "Ask shops about products directly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth><Messages /></RequireAuth>,
});

function Messages() {
  const { t } = useApp();
  return (
    <div className="space-y-4 py-6">
      <h1 className="text-xl font-bold">{t("chat.title")}</h1>
      <ChatInbox side="customer" />
    </div>
  );
}
