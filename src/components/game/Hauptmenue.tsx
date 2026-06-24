import { useState } from "react";
import { Apple, Sword, Trees, Info, Play } from "lucide-react";
import {
  SEGMENTE,
  SEGMENT_REIHENFOLGE,
  UPGRADE_KOSTEN,
  type GespeicherterFortschritt,
  type SegmentKey,
  type Upgrades,
} from "@/lib/game/segments";

interface Props {
  fortschritt: GespeicherterFortschritt;
  onAenderung: (f: GespeicherterFortschritt) => void;
  onStart: () => void;
}

export function Hauptmenue({ fortschritt, onAenderung, onStart }: Props) {
  const [name, setName] = useState(fortschritt.spielerName);

  const upgrade = (key: SegmentKey) => {
    const aktuell = fortschritt.upgrades[key];
    if (aktuell >= 3) return;
    const ziel = aktuell + 1;
    const kosten = UPGRADE_KOSTEN[ziel];
    if (fortschritt.aepfel < kosten) return;
    const neueUpgrades: Upgrades = { ...fortschritt.upgrades, [key]: ziel };
    onAenderung({ ...fortschritt, upgrades: neueUpgrades, aepfel: fortschritt.aepfel - kosten });
  };

  const speichereName = () => {
    onAenderung({ ...fortschritt, spielerName: name.trim() || "Spieler" });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-700 to-emerald-500 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <Trees className="h-10 w-10 text-emerald-200" />
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Krieg der Wuermer
            </h1>
            <Sword className="h-10 w-10 text-yellow-200" />
          </div>
          <p className="text-emerald-100">
            Baue deinen Wurm, sammle Blätter, zerstöre den feindlichen Baum.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl bg-emerald-950/60 p-4 ring-1 ring-emerald-300/20">
            <h2 className="mb-2 text-lg font-semibold">Spielername</h2>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={speichereName}
                maxLength={16}
                className="w-full rounded-md bg-emerald-100 px-3 py-2 text-emerald-950 outline-none"
                placeholder="Spieler"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-red-950/40 px-3 py-2">
              <Apple className="h-6 w-6 text-red-600" fill="#DC2626" />
              <span className="text-sm">Rote Äpfel</span>
              <span className="ml-auto text-xl font-bold text-red-600">{fortschritt.aepfel}</span>
            </div>
          </section>

          <section className="rounded-xl bg-emerald-950/60 p-4 ring-1 ring-emerald-300/20 md:col-span-2">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Info className="h-5 w-5" /> Anleitung
            </h2>
            <ul className="space-y-1 text-sm text-emerald-100">
              <li>• Dein Baum produziert <strong>Blätter</strong> — die Währung im Match.</li>
              <li>• Baue Wuermer aus <strong>Kopf + 1 bis 6 Segmenten + Schwanz</strong>.</li>
              <li>• Sammle fallende Blätter (+30) und seltene <span className="text-red-600 font-bold">Rote Äpfel</span> (+1).</li>
              <li>• Verbessere Segmente im Shop dauerhaft mit Roten Äpfeln.</li>
              <li>• Ziel: Zerstöre den gegnerischen Basis-Baum.</li>
            </ul>
          </section>
        </div>

        <section className="mt-6 rounded-xl bg-emerald-950/60 p-4 ring-1 ring-emerald-300/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Segment-Shop</h2>
            <div className="flex items-center gap-1 text-sm">
              <Apple className="h-4 w-4 text-red-600" fill="#DC2626" />
              <span className="font-bold text-red-600">{fortschritt.aepfel}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENT_REIHENFOLGE.map((key) => {
              const def = SEGMENTE[key];
              const stufe = fortschritt.upgrades[key];
              const naechsteKosten = stufe < 3 ? UPGRADE_KOSTEN[stufe + 1] : null;
              const kannUpgraden = naechsteKosten !== null && fortschritt.aepfel >= naechsteKosten;
              return (
                <div key={key} className="rounded-lg bg-emerald-900/70 p-3 ring-1 ring-emerald-300/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{def.name}</h3>
                    <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-200">
                      Stufe {stufe}
                    </span>
                  </div>
                  <p className="mt-1 min-h-[2.5rem] text-xs text-emerald-100">{def.beschreibung}</p>
                  <p className="mt-1 text-xs text-emerald-200">Baukosten: {def.kosten} Blätter</p>
                  <button
                    type="button"
                    onClick={() => upgrade(key)}
                    disabled={!kannUpgraden}
                    className="mt-2 w-full rounded-md bg-red-600 px-2 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-400"
                  >
                    {stufe >= 3
                      ? "Maximale Stufe"
                      : `Auf Stufe ${stufe + 1} verbessern (${naechsteKosten} Äpfel)`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => {
              speichereName();
              onStart();
            }}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-xl font-extrabold text-emerald-950 shadow-lg transition hover:bg-yellow-300"
          >
            <Play className="h-6 w-6" /> Schlacht beginnen
          </button>
        </div>
      </div>
    </div>
  );
}