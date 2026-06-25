import { useState } from "react";
import { Apple, Sword, Trees, Info, Play, FlaskConical, BookOpen, ArrowLeft, Lock, Swords } from "lucide-react";
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
  onStart: (level: number) => void;
}

type Screen = "haupt" | "forschung" | "anleitung" | "level";

export function Hauptmenue({ fortschritt, onAenderung, onStart }: Props) {
  const [name, setName] = useState(fortschritt.spielerName);
  const [screen, setScreen] = useState<Screen>("haupt");

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

  const wrapper = "min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-700 to-emerald-500 text-white";
  const inner = "mx-auto max-w-5xl px-4 py-8";

  if (screen === "forschung") {
    return (
      <div className={wrapper}>
        <div className={inner}>
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} aepfel={fortschritt.aepfel} />
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-extrabold">
            <FlaskConical className="h-8 w-8 text-cyan-200" /> Forschung
          </h1>
          <p className="mt-1 text-sm text-emerald-100">
            Verbessere Segmente dauerhaft mit Roten Äpfeln. Diese Verbesserungen gelten in allen Levels.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <p className="mt-1 text-xs text-emerald-200">Baukosten: {def.kosten} Blätter · HP {def.hp[stufe - 1]}</p>
                  <button
                    type="button"
                    onClick={() => upgrade(key)}
                    disabled={!kannUpgraden}
                    className="mt-2 w-full rounded-md bg-red-600 px-2 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-400"
                  >
                    {stufe >= 3
                      ? "Maximale Stufe"
                      : `Auf Stufe ${stufe + 1} erforschen (${naechsteKosten} Äpfel)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "anleitung") {
    return (
      <div className={wrapper}>
        <div className={inner}>
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} aepfel={fortschritt.aepfel} />
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-extrabold">
            <BookOpen className="h-8 w-8 text-yellow-200" /> Anleitung
          </h1>
          <div className="mt-4 space-y-4 rounded-xl bg-emerald-950/60 p-5 text-sm leading-relaxed text-emerald-50 ring-1 ring-emerald-300/20">
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Ziel</h2>
              <p>Zerstöre den gegnerischen Baum am rechten Kartenrand, bevor dein Baum links fällt. Beide Bäume blockieren das Spielfeld &mdash; Wuermer können nicht durch sie hindurch.</p>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Ressourcen</h2>
              <ul className="list-disc pl-5">
                <li><strong>Blätter</strong> werden vom eigenen Baum laufend produziert. Sie sind die Währung im Match.</li>
                <li>Fallende <strong>Blätter</strong> bringen +30 Blätter, fallende <strong>Rote Äpfel</strong> +1 (max. 2 pro Match).</li>
                <li>Rote Äpfel werden nach Siegen ausgezahlt und in der <strong>Forschung</strong> ausgegeben.</li>
              </ul>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Wuermer bauen</h2>
              <p>Jeder Wurm besteht aus <strong>Kopf + 1 bis 6 Segmenten + Schwanz</strong>. Der Kopf trägt eine farbige Mütze deiner Seite und beißt im Nahkampf. Reine Beine-Wuermer sind billig, aber gegen Panzer, Laser und Basis-Kanonen kaum wirksam.</p>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Bewegung &amp; Kampf</h2>
              <ul className="list-disc pl-5">
                <li>Wuermer laufen auf <strong>5 leicht überlappenden Pfaden</strong>. Die Spurwahl ist rein optisch &mdash; getroffen wird der Wurm unabhängig vom Pfad.</li>
                <li>Wuermer <strong>blockieren sich nicht</strong> gegenseitig und laufen aneinander vorbei. Schaden wird verteilt, solange sich Köpfe in Reichweite befinden.</li>
                <li>Stirbt der Kopf eines Wurms, wird die <strong>komplette Einheit</strong> sofort entfernt.</li>
              </ul>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Basis</h2>
              <p>Verbessere im Match <strong>Produktion</strong> (mehr Blätter/Sek.) und <strong>Verteidigung</strong> (mehr Basis-HP und stärkere Abwehr-Kanone). Die Kanone feuert automatisch auf den nächsten Gegner in Reichweite.</p>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Level</h2>
              <p>Es gibt <strong>50 Level</strong> mit steigender Schwierigkeit. Höhere Level haben einen schlauen Gegner, der bessere Segmente in höherer Stufe kombiniert und schneller spawnt. Belohnung skaliert ebenfalls mit dem Level.</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "level") {
    return (
      <div className={wrapper}>
        <div className={inner}>
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} aepfel={fortschritt.aepfel} />
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-extrabold">
            <Swords className="h-8 w-8 text-rose-200" /> Levelauswahl
          </h1>
          <p className="mt-1 text-sm text-emerald-100">
            Höchstes erreichtes Level: <strong>{fortschritt.maxLevel}</strong> / 50. Belohnung pro Sieg: <strong>ceil(Level / 3)</strong> Rote Äpfel.
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 50 }, (_, i) => i + 1).map((lvl) => {
              const gesperrt = lvl > fortschritt.maxLevel;
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={gesperrt}
                  onClick={() => { speichereName(); onStart(lvl); }}
                  className={`flex aspect-square items-center justify-center rounded-lg text-base font-bold ring-2 transition ${
                    gesperrt
                      ? "bg-emerald-950/40 text-emerald-700 ring-emerald-900"
                      : "bg-emerald-700 text-white ring-emerald-300 hover:bg-yellow-400 hover:text-emerald-950"
                  }`}
                >
                  {gesperrt ? <Lock className="h-4 w-4" /> : lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // HAUPTMENÜ
  return (
    <div className={wrapper}>
      <div className={inner}>
        <header className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <Trees className="h-12 w-12 text-emerald-200" />
            <h1 className="text-5xl font-extrabold tracking-tight">Krieg der Wuermer</h1>
            <Sword className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="text-emerald-100">Baue deinen Wurm, sammle Blätter, zerstöre den feindlichen Baum.</p>
        </header>

        <div className="mx-auto grid max-w-md gap-4">
          <section className="rounded-xl bg-emerald-950/60 p-4 ring-1 ring-emerald-300/20">
            <label className="mb-2 block text-sm font-semibold">Spielername</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={speichereName}
              maxLength={16}
              className="w-full rounded-md bg-emerald-100 px-3 py-2 text-emerald-950 outline-none"
              placeholder="Spieler"
            />
            <div className="mt-3 flex items-center gap-2 rounded-md bg-red-950/40 px-3 py-2">
              <Apple className="h-6 w-6 text-red-600" fill="#DC2626" />
              <span className="text-sm">Rote Äpfel</span>
              <span className="ml-auto text-xl font-bold text-red-600">{fortschritt.aepfel}</span>
            </div>
            <div className="mt-2 text-center text-xs text-emerald-200">
              Höchstes Level: <strong>{fortschritt.maxLevel}</strong> / 50
            </div>
          </section>

          <button
            type="button"
            onClick={() => { speichereName(); setScreen("level"); }}
            className="flex items-center justify-center gap-3 rounded-xl bg-yellow-400 px-8 py-5 text-xl font-extrabold text-emerald-950 shadow-lg transition hover:bg-yellow-300"
          >
            <Play className="h-6 w-6" /> Schlacht beginnen
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScreen("forschung")}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-4 text-base font-bold shadow transition hover:bg-cyan-600"
            >
              <FlaskConical className="h-5 w-5" /> Forschung
            </button>
            <button
              type="button"
              onClick={() => setScreen("anleitung")}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-4 text-base font-bold shadow transition hover:bg-emerald-700"
            >
              <Info className="h-5 w-5" /> Anleitung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZurueckLeiste({ onZurueck, aepfel }: { onZurueck: () => void; aepfel: number }) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onZurueck}
        className="flex items-center gap-1 rounded bg-emerald-800 px-3 py-2 text-sm font-bold hover:bg-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" /> Hauptmenü
      </button>
      <div className="flex items-center gap-1 rounded bg-red-950/40 px-3 py-2">
        <Apple className="h-5 w-5 text-red-600" fill="#DC2626" />
        <span className="font-bold text-red-600">{aepfel}</span>
      </div>
    </div>
  );
}