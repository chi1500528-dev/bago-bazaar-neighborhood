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
  const pick = async (files: FileList | null) => {
    if (!files?.length || !session) return;
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files).slice(0, multiple ? 6 : 1)) paths.push(await uploadMedia(session.user.id, f));
      onChange(multiple ? [...value, ...paths].slice(0, 6) : paths);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1.5">
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
            {busy ? <span className="text-[13px]">…</span> : <Upload className="size-5" />}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
