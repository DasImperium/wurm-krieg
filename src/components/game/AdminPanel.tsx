import { useState } from "react";
import { ArrowLeft, ShieldAlert, RotateCcw } from "lucide-react";
import {
  SEGMENT_REIHENFOLGE, MAX_STUFE, standardFortschritt,
  type GespeicherterFortschritt, type SegmentKey,
} from "@/lib/game/segments";

interface Props {
  fortschritt: GespeicherterFortschritt;
  onAenderung: (f: GespeicherterFortschritt) => void;
  onZurueck: () => void;
}

export function AdminPanel({ fortschritt, onAenderung, onZurueck }: Props) {
  const [draft, setDraft] = useState<GespeicherterFortschritt>(fortschritt);

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const setUpgrade = (key: SegmentKey, stufe: number) => {
    setDraft({ ...draft, upgrades: { ...draft.upgrades, [key]: Math.max(1, Math.min(MAX_STUFE, stufe)) } });
  };

  const speichern = () => {
    onAenderung(draft);
    onZurueck();
  };

  const resetSpieler = () => {
    if (!window.confirm("Diesen Spieler komplett zurücksetzen?")) return;
    const std = standardFortschritt();
    onAenderung({ ...std, spielerName: draft.spielerName });
    onZurueck();
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onZurueck} className="flex items-center gap-1 rounded bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-amber-300">
            <ShieldAlert className="h-5 w-5" /> Admin-Panel
          </h1>
          <button type="button" onClick={resetSpieler} className="flex items-center gap-1 rounded bg-red-700 px-3 py-2 text-xs font-bold hover:bg-red-600">
            <RotateCcw className="h-4 w-4" /> Reset Spieler
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Feld label="Spielername">
            <input className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.spielerName}
              onChange={(e) => setDraft({ ...draft, spielerName: e.target.value })} />
          </Feld>
          <Feld label="Max. Level (1-100)">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.maxLevel}
              onChange={(e) => setDraft({ ...draft, maxLevel: Math.max(1, Math.min(100, num(e.target.value, 1))) })} />
          </Feld>
          <Feld label="Rote Äpfel">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.aepfel}
              onChange={(e) => setDraft({ ...draft, aepfel: Math.max(0, num(e.target.value, 0)) })} />
          </Feld>
          <Feld label="Sternanis">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.sternanis}
              onChange={(e) => setDraft({ ...draft, sternanis: Math.max(0, num(e.target.value, 0)) })} />
          </Feld>
          <Feld label="Siege">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.siege}
              onChange={(e) => setDraft({ ...draft, siege: Math.max(0, num(e.target.value, 0)) })} />
          </Feld>
          <Feld label="Niederlagen">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.niederlagen}
              onChange={(e) => setDraft({ ...draft, niederlagen: Math.max(0, num(e.target.value, 0)) })} />
          </Feld>
        </div>

        <h2 className="mt-6 text-base font-bold text-amber-200">Forschungsstufen (1–{MAX_STUFE})</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SEGMENT_REIHENFOLGE.map((key) => (
            <Feld key={key} label={key}>
              <input type="number" min={1} max={MAX_STUFE} className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm"
                value={draft.upgrades[key]}
                onChange={(e) => setUpgrade(key, num(e.target.value, 1))} />
            </Feld>
          ))}
        </div>

        <h2 className="mt-6 text-base font-bold text-amber-200">Überfall</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Feld label="Schmetterlinge bereit">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.ueberfall.schmetterlingeBereit}
              onChange={(e) => setDraft({ ...draft, ueberfall: { ...draft.ueberfall, schmetterlingeBereit: Math.max(0, num(e.target.value, 0)) } })} />
          </Feld>
          <Feld label="Max. Schmetterlinge">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.ueberfall.maxSchmetterlinge}
              onChange={(e) => setDraft({ ...draft, ueberfall: { ...draft.ueberfall, maxSchmetterlinge: Math.max(1, num(e.target.value, 1)) } })} />
          </Feld>
          <Feld label="Überfall-Level">
            <input type="number" className="w-full rounded bg-slate-800 px-2 py-1.5 text-sm" value={draft.ueberfall.level}
              onChange={(e) => setDraft({ ...draft, ueberfall: { ...draft.ueberfall, level: Math.max(1, num(e.target.value, 1)) } })} />
          </Feld>
        </div>

        <button type="button" onClick={speichern} className="mt-6 w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950 hover:bg-amber-400">
          Speichern & schließen
        </button>
      </div>
    </div>
  );
}

function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}