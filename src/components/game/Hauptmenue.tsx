import { useState } from "react";
import {
  Apple, Sword, Trees, Info, Play, FlaskConical, BookOpen, ArrowLeft, Lock,
  Swords, RotateCcw, ShieldAlert, Bird, Infinity as InfinityIcon,
} from "lucide-react";
import {
  SEGMENTE,
  SEGMENT_REIHENFOLGE,
  UPGRADE_KOSTEN,
  MAX_STUFE,
  type GespeicherterFortschritt,
  type SegmentKey,
  type Upgrades,
} from "@/lib/game/segments";
import { SternanisIcon } from "./Sternanis";

interface Props {
  fortschritt: GespeicherterFortschritt;
  onAenderung: (f: GespeicherterFortschritt) => void;
  onStart: (level: number) => void;
  onUeberfall: () => void;
  onAdmin: () => void;
  onReset: () => void;
}

type Screen = "haupt" | "forschung" | "anleitung" | "level";

export function Hauptmenue({ fortschritt, onAenderung, onStart, onUeberfall, onAdmin, onReset }: Props) {
  const [name, setName] = useState(fortschritt.spielerName);
  const [screen, setScreen] = useState<Screen>("haupt");
  const [resetSchritt, setResetSchritt] = useState<0 | 1 | 2>(0);
  const [adminPwOpen, setAdminPwOpen] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminFehler, setAdminFehler] = useState(false);

  const upgrade = (key: SegmentKey) => {
    const aktuell = fortschritt.upgrades[key];
    if (aktuell >= MAX_STUFE) return;
    const ziel = aktuell + 1;
    const kosten = UPGRADE_KOSTEN[ziel];
    if (fortschritt.aepfel < kosten.aepfel || fortschritt.sternanis < kosten.sternanis) return;
    const neueUpgrades: Upgrades = { ...fortschritt.upgrades, [key]: ziel };
    onAenderung({
      ...fortschritt,
      upgrades: neueUpgrades,
      aepfel: fortschritt.aepfel - kosten.aepfel,
      sternanis: fortschritt.sternanis - kosten.sternanis,
    });
  };

  const speichereName = () => {
    onAenderung({ ...fortschritt, spielerName: name.trim() || "Spieler" });
  };

  const pruefeAdminPw = () => {
    if (adminPw === "Imperium") {
      setAdminPwOpen(false);
      setAdminPw("");
      setAdminFehler(false);
      onAdmin();
    } else {
      setAdminFehler(true);
    }
  };

  const wrapper = "min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-700 to-emerald-500 text-white";
  const inner = "mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8";

  if (screen === "forschung") {
    return (
      <div className={wrapper}>
        <div className={inner}>
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} fortschritt={fortschritt} />
          <h1 className="mt-4 flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
            <FlaskConical className="h-7 w-7 text-cyan-200" /> Forschung
          </h1>
          <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
            Stufen 2 & 3 mit Roten Äpfeln. Stufen 4 & 5 erfordern Sternanis.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENT_REIHENFOLGE.map((key) => {
              const def = SEGMENTE[key];
              const stufe = fortschritt.upgrades[key];
              const naechsteKosten = stufe < MAX_STUFE ? UPGRADE_KOSTEN[stufe + 1] : null;
              const kannUpgraden = naechsteKosten !== null
                && fortschritt.aepfel >= naechsteKosten.aepfel
                && fortschritt.sternanis >= naechsteKosten.sternanis;
              return (
                <div key={key} className="rounded-lg bg-emerald-900/70 p-3 ring-1 ring-emerald-300/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{def.name}</h3>
                    <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-200">
                      Stufe {stufe}/{MAX_STUFE}
                    </span>
                  </div>
                  <p className="mt-1 min-h-[2.5rem] text-xs text-emerald-100">{def.beschreibung}</p>
                  <p className="mt-1 text-xs text-emerald-200">{def.kosten} Bl. · HP {def.hp[stufe - 1]}</p>
                  <button
                    type="button"
                    onClick={() => upgrade(key)}
                    disabled={!kannUpgraden}
                    className="mt-2 w-full rounded-md bg-red-600 px-2 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-400"
                  >
                    {stufe >= MAX_STUFE
                      ? "Maximale Stufe"
                      : `→ Stufe ${stufe + 1} (${naechsteKosten!.aepfel}🍎${naechsteKosten!.sternanis ? ` + ${naechsteKosten!.sternanis}★` : ""})`}
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
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} fortschritt={fortschritt} />
          <h1 className="mt-4 flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
            <BookOpen className="h-7 w-7 text-yellow-200" /> Anleitung
          </h1>
          <div className="mt-4 space-y-4 rounded-xl bg-emerald-950/60 p-5 text-sm leading-relaxed text-emerald-50 ring-1 ring-emerald-300/20">
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Ziel</h2>
              <p>Zerstöre den gegnerischen Baum am rechten Kartenrand. Köpfe blockieren sich gegenseitig: wer ankommt, muss kämpfen.</p>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Währungen</h2>
              <ul className="list-disc pl-5">
                <li><strong>Blätter</strong> sind die Match-Währung.</li>
                <li><strong>Rote Äpfel</strong> kaufen Forschung bis Stufe 3.</li>
                <li><strong>Sternanis (★)</strong> ist exklusiv und nötig für Forschung 4 & 5. Hauptquelle: Minispiel "Überfall".</li>
              </ul>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Kampf</h2>
              <ul className="list-disc pl-5">
                <li>Treffer erzeugen Rückstoß. Neue Spawns am eigenen Baum unterbrechen so feindliche Angriffe.</li>
                <li>Köpfe blockieren feindliche Köpfe — kein Vorbeilaufen.</li>
                <li>Kastanien sind farbige Minen am Boden, explodieren beim Kontakt.</li>
                <li>Reichweite aller Waffen (außer Minen) zählt ab dem Kopf.</li>
              </ul>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Level</h2>
              <p>100 Story-Level mit eskalierender KI. Ab Level 51 baut sie Stufe 4, ab 75 auch Stufe 5 ein. Daneben gibt es "Prozedural" für endlose Schlachten, deren Stärke sich an deinem W/L-Verhältnis orientiert.</p>
            </section>
            <section>
              <h2 className="mb-1 text-base font-bold text-yellow-200">Überfall</h2>
              <p>Schmetterlinge fliegen gegen einen riesigen Boss-Baum. Klick auf herabfallende Items, um sie zu sammeln. Lila Giftäpfel verletzen alle Schmetterlinge — nicht anfassen.</p>
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
          <ZurueckLeiste onZurueck={() => setScreen("haupt")} fortschritt={fortschritt} />
          <h1 className="mt-4 flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
            <Swords className="h-7 w-7 text-rose-200" /> Levelauswahl
          </h1>
          <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
            Höchstes erreichtes Level: <strong>{fortschritt.maxLevel}</strong> / 100.
          </p>
          <button
            type="button"
            onClick={() => { speichereName(); onStart(0); }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-3 font-bold shadow hover:bg-fuchsia-500"
          >
            <InfinityIcon className="h-5 w-5" /> Prozedurale Schlacht
          </button>
          <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 100 }, (_, i) => i + 1).map((lvl) => {
              const gesperrt = lvl > fortschritt.maxLevel;
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={gesperrt}
                  onClick={() => { speichereName(); onStart(lvl); }}
                  className={`flex aspect-square items-center justify-center rounded-lg text-sm font-bold ring-2 transition ${
                    gesperrt
                      ? "bg-emerald-950/40 text-emerald-700 ring-emerald-900"
                      : "bg-emerald-700 text-white ring-emerald-300 hover:bg-yellow-400 hover:text-emerald-950"
                  }`}
                >
                  {gesperrt ? <Lock className="h-3 w-3" /> : lvl}
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
        <header className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
          <div className="flex items-center gap-3">
            <Trees className="h-9 w-9 text-emerald-200 sm:h-12 sm:w-12" />
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Krieg der Wuermer</h1>
            <Sword className="h-9 w-9 text-yellow-200 sm:h-12 sm:w-12" />
          </div>
          <p className="text-xs text-emerald-100 sm:text-sm">Baue deinen Wurm, sammle Blätter, zerstöre den feindlichen Baum.</p>
        </header>

        <div className="mx-auto grid max-w-md gap-3 sm:gap-4">
          <section className="rounded-xl bg-emerald-950/60 p-3 ring-1 ring-emerald-300/20 sm:p-4">
            <label className="mb-2 block text-sm font-semibold">Spielername</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={speichereName}
              maxLength={16}
              className="w-full rounded-md bg-emerald-100 px-3 py-2 text-emerald-950 outline-none"
              placeholder="Spieler"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-red-950/40 px-2 py-2">
                <Apple className="h-5 w-5 text-red-500" fill="#DC2626" />
                <span className="ml-auto text-lg font-bold text-red-300">{fortschritt.aepfel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-amber-950/40 px-2 py-2">
                <SternanisIcon className="h-5 w-5 text-amber-300" />
                <span className="ml-auto text-lg font-bold text-amber-200">{fortschritt.sternanis}</span>
              </div>
            </div>
            <div className="mt-2 text-center text-xs text-emerald-200">
              Level: <strong>{fortschritt.maxLevel}</strong>/100 · S/N {fortschritt.siege}/{fortschritt.niederlagen}
            </div>
          </section>

          <button
            type="button"
            onClick={() => { speichereName(); setScreen("level"); }}
            className="flex items-center justify-center gap-3 rounded-xl bg-yellow-400 px-6 py-4 text-lg font-extrabold text-emerald-950 shadow-lg transition hover:bg-yellow-300 sm:py-5 sm:text-xl"
          >
            <Play className="h-6 w-6" /> Schlacht beginnen
          </button>

          <button
            type="button"
            onClick={() => { speichereName(); onUeberfall(); }}
            className="flex items-center justify-center gap-3 rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-extrabold text-white shadow hover:bg-fuchsia-500"
          >
            <Bird className="h-5 w-5" /> Überfall (Minispiel)
          </button>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setScreen("forschung")}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 py-3 text-sm font-bold shadow transition hover:bg-cyan-600"
            >
              <FlaskConical className="h-5 w-5" /> Forschung
            </button>
            <button
              type="button"
              onClick={() => setScreen("anleitung")}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-3 text-sm font-bold shadow transition hover:bg-emerald-700"
            >
              <Info className="h-5 w-5" /> Anleitung
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => { setResetSchritt(1); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-800/70 px-3 py-2 text-xs font-bold shadow hover:bg-red-700"
            >
              <RotateCcw className="h-4 w-4" /> Fortschritt zurücksetzen
            </button>
            <button
              type="button"
              onClick={() => setAdminPwOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold shadow hover:bg-slate-700"
            >
              <ShieldAlert className="h-4 w-4" /> Admin
            </button>
          </div>
        </div>
      </div>

      {resetSchritt > 0 && (
        <BestaetigungsDialog
          frage={resetSchritt === 1 ? "Soll der Fortschritt gelöscht werden?" : "Soll der Fortschritt WIRKLICH gelöscht werden?"}
          onJa={() => {
            if (resetSchritt === 1) setResetSchritt(2);
            else { onReset(); setResetSchritt(0); }
          }}
          onNein={() => setResetSchritt(0)}
        />
      )}

      {adminPwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-emerald-950 p-5 text-white shadow-2xl ring-1 ring-emerald-300/20">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="h-5 w-5 text-amber-300" /> Admin-Zugang
            </h3>
            <input
              type="password"
              value={adminPw}
              onChange={(e) => { setAdminPw(e.target.value); setAdminFehler(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") pruefeAdminPw(); }}
              autoFocus
              placeholder="Passwort"
              className="w-full rounded-md bg-emerald-100 px-3 py-2 text-emerald-950 outline-none"
            />
            {adminFehler && <p className="mt-2 text-xs text-red-300">Falsches Passwort.</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setAdminPwOpen(false); setAdminPw(""); setAdminFehler(false); }} className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Abbrechen</button>
              <button type="button" onClick={pruefeAdminPw} className="flex-1 rounded bg-amber-500 px-3 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-400">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZurueckLeiste({ onZurueck, fortschritt }: { onZurueck: () => void; fortschritt: GespeicherterFortschritt }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={onZurueck}
        className="flex items-center gap-1 rounded bg-emerald-800 px-3 py-2 text-sm font-bold hover:bg-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" /> Hauptmenü
      </button>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded bg-red-950/40 px-2 py-1">
          <Apple className="h-4 w-4 text-red-500" fill="#DC2626" />
          <span className="font-bold text-red-300">{fortschritt.aepfel}</span>
        </div>
        <div className="flex items-center gap-1 rounded bg-amber-950/40 px-2 py-1">
          <SternanisIcon className="h-4 w-4 text-amber-300" />
          <span className="font-bold text-amber-200">{fortschritt.sternanis}</span>
        </div>
      </div>
    </div>
  );
}

function BestaetigungsDialog({ frage, onJa, onNein }: { frage: string; onJa: () => void; onNein: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl bg-emerald-950 p-5 text-white shadow-2xl ring-1 ring-red-400/40">
        <p className="text-base font-semibold">{frage}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onNein} className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-600">Nein</button>
          <button type="button" onClick={onJa} className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-500">Ja</button>
        </div>
      </div>
    </div>
  );
}