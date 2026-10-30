import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { uploadMedia } from "@/lib/media";
import { useApp } from "@/lib/app-state";
import { MediaImg } from "./bits";

export function ImageField({ value, onChange, multiple, label }: { value: string[]; onChange: (v: string[]) => void; multiple?: boolean; label: string }) {
  const { session, t } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const pick = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length || !session || busy) return;
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of list.slice(0, multiple ? 6 : 1)) paths.push(await uploadMedia(session.user.id, f));
      onChange(multiple ? [...value, ...paths].slice(0, 6) : paths);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) { e.preventDefault(); pick(files); }
  };
  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      className={`space-y-1.5 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${over ? "bg-accent" : ""}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <div key={p} className="relative size-20 overflow-hidden rounded-md border">
            <MediaImg path={p} alt="" className="size-full" />
            <button type="button" onClick={() => onChange(value.filter((x) => x !== p))} className="absolute right-0.5 top-0.5 rounded bg-card/90 p-0.5" aria-label={t("common.delete")}><X className="size-3" /></button>
          </div>
        ))}
        {(multiple || value.length === 0) && (
          <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="grid size-20 place-items-center rounded-md border border-dashed text-muted-foreground hover:border-primary">
            {busy ? <span className="text-xs">…</span> : <Upload className="size-5" />}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("upload.pasteHint")}</p>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
