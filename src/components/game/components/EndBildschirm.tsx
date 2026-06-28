import { Trophy } from "lucide-react";

interface EndBildschirmProps {
  titel: string;
  beschreibung: string;
  farbe: string;
  aktion: () => void;
  aktionLabel: string;
}

export function EndBildschirm({
  titel,
  beschreibung,
  farbe,
  aktion,
  aktionLabel,
}: EndBildschirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`max-w-md rounded-2xl bg-gradient-to-br ${farbe} p-8 text-center shadow-2xl`}>
        <Trophy className="mx-auto mb-3 h-16 w-16 text-emerald-950" />
        <h2 className="text-3xl font-extrabold text-emerald-950">{titel}</h2>
        <p className="mt-2 text-emerald-950">{beschreibung}</p>
        <button
          type="button"
          onClick={aktion}
          className="mt-6 rounded-xl bg-emerald-950 px-6 py-3 text-base font-bold text-white hover:bg-emerald-800"
        >
          {aktionLabel}
        </button>
      </div>
    </div>
  );
}