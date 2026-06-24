import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Apple, Leaf, Trees, ArrowLeft, TrendingUp, Shield, Trophy } from "lucide-react";
import {
  SEGMENTE,
  SEGMENT_REIHENFOLGE,
  type GespeicherterFortschritt,
  type SegmentKey,
} from "@/lib/game/segments";

interface Segment {
  key: SegmentKey;
  stufe: number;
  hp: number;
  maxHp: number;
}

interface Wurm {
  id: number;
  seite: "spieler" | "gegner";
  x: number;
  kopfHp: number;
  kopfMax: number;
  schwanzHp: number;
  schwanzMax: number;
  segmente: Segment[];
  sterbend: boolean;
  todStart: number;
  geplatzt: Set<number>; // -1 = Kopf, n = Schwanz, 0..n-1 = Segmente
  flashBis: number;
  feuerTimer: Record<string, number>;
  feuerStop: number;
  heilTimer: number;
  munition: Record<string, number>;
}

interface FallObjekt {
  id: number;
  art: "blatt" | "apfel";
  x: number;
  y: number;
  geschwindigkeit: number;
}

interface Props {
  fortschritt: GespeicherterFortschritt;
  onZurueck: () => void;
  onSieg: (zusatzAepfel: number) => void;
}

const PRODUKTION_KOSTEN = [100, 500, 1000];
const VERTEIDIGUNG_KOSTEN = [150, 400, 800];
const PRODUKTION_RATE = [5, 10, 20, 40];
const VERTEIDIGUNG_BONUS = [0, 200, 500, 1000];
const BASIS_HP_GRUND = 1000;
const TICK_MS = 50;

let wurmIdZaehler = 1;
let fallIdZaehler = 1;

function baueSegment(key: SegmentKey, stufe: number): Segment {
  const def = SEGMENTE[key];
  const hp = def.hp[stufe - 1];
  return { key, stufe, hp, maxHp: hp };
}

function baueWurm(
  seite: "spieler" | "gegner",
  segmente: Segment[],
  upgrades: GespeicherterFortschritt["upgrades"],
): Wurm {
  // Spec: KOPF Leben 100, SCHWANZ Leben 50
  const munition: Record<string, number> = {};
  segmente.forEach((s, i) => {
    const def = SEGMENTE[s.key];
    if (def.fernkampf?.munition) {
      munition[`${i}`] = def.fernkampf.munition;
    }
  });
  const feuerTimer: Record<string, number> = {};
  segmente.forEach((s, i) => {
    const def = SEGMENTE[s.key];
    if (def.fernkampf) feuerTimer[`${i}`] = def.fernkampf.intervallMs;
  });
  void upgrades;
  return {
    id: wurmIdZaehler++,
    seite,
    x: seite === "spieler" ? 10 : 90,
    kopfHp: 100,
    kopfMax: 100,
    schwanzHp: 50,
    schwanzMax: 50,
    segmente,
    sterbend: false,
    todStart: 0,
    geplatzt: new Set(),
    flashBis: 0,
    feuerTimer,
    feuerStop: 0,
    heilTimer: 5000,
    munition,
  };
}

function wurmGeschwindigkeit(w: Wurm): number {
  let bonus = 0;
  let malus = 0;
  for (const s of w.segmente) {
    const def = SEGMENTE[s.key];
    if (def.speedBonus) bonus = Math.max(bonus, def.speedBonus[s.stufe - 1]);
    if (def.speedMalus) malus += def.speedMalus[s.stufe - 1];
  }
  return Math.max(1, 5 + bonus - malus);
}

function kettenhemdReduktion(w: Wurm): number {
  let r = 0;
  for (const s of w.segmente) {
    const def = SEGMENTE[s.key];
    if (def.schadensReduktion) r += def.schadensReduktion[s.stufe - 1];
  }
  return Math.min(50, r);
}

function nahkampfSchaden(w: Wurm): number {
  let s = 10;
  for (const seg of w.segmente) {
    const def = SEGMENTE[seg.key];
    if (def.nahkampfBonus) s += def.nahkampfBonus[seg.stufe - 1];
  }
  return s;
}

// returns true if worm now fully dead (head HP 0)
function schadenAnWurm(w: Wurm, schaden: number, jetzt: number): boolean {
  if (w.sterbend) return true;
  const reduziert = schaden * (1 - kettenhemdReduktion(w) / 100);
  w.flashBis = jetzt + 150;
  // front->back: head, seg0..segn-1, tail
  if (w.kopfHp > 0) {
    w.kopfHp -= reduziert;
    if (w.kopfHp <= 0) {
      w.sterbend = true;
      w.todStart = jetzt;
      return true;
    }
    return false;
  }
  for (const seg of w.segmente) {
    if (seg.hp > 0) {
      seg.hp -= reduziert;
      return false;
    }
  }
  if (w.schwanzHp > 0) {
    w.schwanzHp -= reduziert;
  }
  return false;
}

function zufallsWurmGegner(upgrades: GespeicherterFortschritt["upgrades"]): Wurm {
  const anzahl = 1 + Math.floor(Math.random() * 6);
  const segmente: Segment[] = [];
  for (let i = 0; i < anzahl; i++) {
    const key = SEGMENT_REIHENFOLGE[Math.floor(Math.random() * SEGMENT_REIHENFOLGE.length)];
    const stufe = 1 + Math.floor(Math.random() * 3);
    segmente.push(baueSegment(key, stufe));
  }
  return baueWurm("gegner", segmente, upgrades);
}

export function Spielfeld({ fortschritt, onZurueck, onSieg }: Props) {
  const [blaetter, setBlaetter] = useState(50);
  const [aiBlaetter, setAiBlaetter] = useState(50);
  const [produktionsStufe, setProduktionsStufe] = useState(0);
  const [verteidigungsStufe, setVerteidigungsStufe] = useState(0);
  const [spielerBasisHp, setSpielerBasisHp] = useState(BASIS_HP_GRUND);
  const [gegnerBasisHp, setGegnerBasisHp] = useState(BASIS_HP_GRUND);
  const [wuermerState, setWuermerState] = useState<Wurm[]>([]);
  const [fallObjekte, setFallObjekte] = useState<FallObjekt[]>([]);
  const [matchAepfel, setMatchAepfel] = useState(0); // gefundene Äpfel im Match
  const [bauSegmente, setBauSegmente] = useState<Segment[]>([]);
  const [sieg, setSieg] = useState(false);
  const [niederlage, setNiederlage] = useState(false);

  const refs = useRef({
    wuermer: [] as Wurm[],
    fall: [] as FallObjekt[],
    letzteBlatt: 0,
    letzterApfelCheck: 0,
    aiSpawn: 0,
    matchAepfelLokal: 0,
    apfelSpawnsImMatch: 0,
  });

  const startbasisHp = useMemo(() => BASIS_HP_GRUND + VERTEIDIGUNG_BONUS[0], []);
  void startbasisHp;

  // Tick game loop
  useEffect(() => {
    if (sieg || niederlage) return;
    const handle = window.setInterval(() => {
      const jetzt = performance.now();
      const r = refs.current;

      // --- Wirtschaft ---
      const rate = PRODUKTION_RATE[produktionsStufe];
      setBlaetter((b) => b + (rate * TICK_MS) / 1000);
      setAiBlaetter((b) => b + (rate * TICK_MS) / 1000);

      // --- Fall-Objekte spawn ---
      r.letzteBlatt += TICK_MS;
      if (r.letzteBlatt >= 10000) {
        r.letzteBlatt = 0;
        r.fall.push({
          id: fallIdZaehler++,
          art: "blatt",
          x: 10 + Math.random() * 80,
          y: 0,
          geschwindigkeit: 0.4,
        });
      }
      r.letzterApfelCheck += TICK_MS;
      if (r.letzterApfelCheck >= 30000) {
        r.letzterApfelCheck = 0;
        if (Math.random() < 0.02 && r.apfelSpawnsImMatch < 2) {
          r.apfelSpawnsImMatch++;
          r.fall.push({
            id: fallIdZaehler++,
            art: "apfel",
            x: 10 + Math.random() * 80,
            y: 0,
            geschwindigkeit: 0.6,
          });
        }
      }

      // Bewege Fall-Objekte
      r.fall = r.fall
        .map((o) => ({ ...o, y: o.y + o.geschwindigkeit }))
        .filter((o) => o.y < 100);

      // --- AI Spawn ---
      r.aiSpawn += TICK_MS;
      if (r.aiSpawn >= 15000) {
        r.aiSpawn = 0;
        const wurm = zufallsWurmGegner(fortschritt.upgrades);
        const kostenBlaetter = wurm.segmente.reduce(
          (acc, s) => acc + SEGMENTE[s.key].kosten,
          0,
        );
        // AI muss sich leisten können
        setAiBlaetter((b) => {
          if (b >= kostenBlaetter) {
            r.wuermer.push(wurm);
            return b - kostenBlaetter;
          }
          return b;
        });
      }

      // --- Wurm Update ---
      const lebendig = r.wuermer.filter((w) => !w.sterbend);
      for (const w of lebendig) {
        // Heilung
        w.heilTimer -= TICK_MS;
        if (w.heilTimer <= 0) {
          w.heilTimer = 5000;
          let heal = 0;
          for (const s of w.segmente) {
            const def = SEGMENTE[s.key];
            if (def.heilung) heal += def.heilung[s.stufe - 1];
          }
          if (heal > 0) {
            w.kopfHp = Math.min(w.kopfMax, w.kopfHp + heal);
            w.schwanzHp = Math.min(w.schwanzMax, w.schwanzHp + heal);
            for (const s of w.segmente) s.hp = Math.min(s.maxHp, s.hp + heal);
          }
        }

        // Ziel finden: nächster Gegner-Wurm oder gegnerische Basis
        const gegner = lebendig.filter((g) => g.seite !== w.seite);
        let zielX = w.seite === "spieler" ? 100 : 0;
        let zielWurm: Wurm | null = null;
        let minDist = Infinity;
        for (const g of gegner) {
          const d = Math.abs(g.x - w.x);
          if (d < minDist) {
            minDist = d;
            zielWurm = g;
            zielX = g.x;
          }
        }
        const basisDist = w.seite === "spieler" ? 100 - w.x : w.x;
        if (!zielWurm) minDist = basisDist;

        // Bewegung
        const speed = wurmGeschwindigkeit(w);
        const kannBewegen = jetzt >= w.feuerStop;
        if (kannBewegen) {
          // Stoppen bei Nahkampf-Reichweite
          if (minDist > 3) {
            const dx = (speed * TICK_MS) / 1000;
            w.x += w.seite === "spieler" ? dx : -dx;
            w.x = Math.max(0, Math.min(100, w.x));
          }
        }

        // Nahkampf
        if (zielWurm && Math.abs(zielWurm.x - w.x) <= 3) {
          const dmg = (nahkampfSchaden(w) * TICK_MS) / 1000;
          schadenAnWurm(zielWurm, dmg, jetzt);
        } else if (!zielWurm && basisDist <= 3) {
          // Schaden an Basis
          const dmg = (nahkampfSchaden(w) * TICK_MS) / 1000;
          if (w.seite === "spieler") setGegnerBasisHp((h) => Math.max(0, h - dmg));
          else setSpielerBasisHp((h) => Math.max(0, h - dmg));
        }

        // Fernkampf
        w.segmente.forEach((s, i) => {
          const def = SEGMENTE[s.key];
          if (!def.fernkampf) return;
          const fk = def.fernkampf;
          const key = `${i}`;
          w.feuerTimer[key] = (w.feuerTimer[key] ?? fk.intervallMs) - TICK_MS;
          if (w.feuerTimer[key] > 0) return;
          // Munition prüfen
          if (fk.munition !== undefined) {
            if ((w.munition[key] ?? 0) <= 0) return;
          }
          // Zielreichweite
          if (!zielWurm) {
            if (basisDist > fk.reichweite) return;
          } else if (Math.abs(zielWurm.x - w.x) > fk.reichweite) return;

          // Feuern
          w.feuerTimer[key] = fk.intervallMs;
          w.feuerStop = jetzt + 500;
          if (fk.munition !== undefined) w.munition[key] = (w.munition[key] ?? 0) - 1;
          const schadenWert = fk.schaden[s.stufe - 1];
          const schuesse = fk.anzahl ?? 1;
          for (let n = 0; n < schuesse; n++) {
            if (zielWurm) {
              schadenAnWurm(zielWurm, schadenWert, jetzt);
            } else {
              if (w.seite === "spieler") setGegnerBasisHp((h) => Math.max(0, h - schadenWert));
              else setSpielerBasisHp((h) => Math.max(0, h - schadenWert));
            }
          }
        });
      }

      // Tod-Animation: pop segments alle 150ms vom Kopf nach hinten
      for (const w of r.wuermer) {
        if (!w.sterbend) continue;
        const verstrichen = jetzt - w.todStart;
        const ziel = Math.floor(verstrichen / 150);
        // -1 = Kopf, 0..n-1 segmente, n = schwanz
        const reihenfolge = [-1, ...w.segmente.map((_, i) => i), w.segmente.length];
        for (let i = 0; i <= ziel && i < reihenfolge.length; i++) {
          w.geplatzt.add(reihenfolge[i]);
        }
      }
      // Entferne komplett geplatzte
      r.wuermer = r.wuermer.filter((w) => {
        if (!w.sterbend) return true;
        const gesamt = w.segmente.length + 2;
        return w.geplatzt.size < gesamt;
      });

      setWuermerState([...r.wuermer]);
      setFallObjekte([...r.fall]);
    }, TICK_MS);
    return () => window.clearInterval(handle);
  }, [produktionsStufe, fortschritt.upgrades, sieg, niederlage]);

  // Basis HP Anpassung an Verteidigungsstufe
  useEffect(() => {
    const max = BASIS_HP_GRUND + VERTEIDIGUNG_BONUS[verteidigungsStufe];
    setSpielerBasisHp((h) => Math.min(max, h + VERTEIDIGUNG_BONUS[verteidigungsStufe] - VERTEIDIGUNG_BONUS[Math.max(0, verteidigungsStufe - 1)]));
    // gegner basis hp bleibt unverändert (Gegner hat fixe Verteidigung)
  }, [verteidigungsStufe]);

  // Sieg / Niederlage Check
  useEffect(() => {
    if (gegnerBasisHp <= 0 && !sieg) {
      setSieg(true);
    }
  }, [gegnerBasisHp, sieg]);
  useEffect(() => {
    if (spielerBasisHp <= 0 && !niederlage) setNiederlage(true);
  }, [spielerBasisHp, niederlage]);

  const sammleFall = (id: number) => {
    const obj = refs.current.fall.find((o) => o.id === id);
    if (!obj) return;
    refs.current.fall = refs.current.fall.filter((o) => o.id !== id);
    if (obj.art === "blatt") {
      setBlaetter((b) => b + 30);
    } else {
      if (refs.current.matchAepfelLokal < 2) {
        refs.current.matchAepfelLokal++;
        setMatchAepfel((a) => a + 1);
      }
    }
    setFallObjekte([...refs.current.fall]);
  };

  // Bau-Werkstatt
  const fuegeSegmentHinzu = (key: SegmentKey) => {
    if (bauSegmente.length >= 6) return;
    const stufe = fortschritt.upgrades[key];
    setBauSegmente((s) => [...s, baueSegment(key, stufe)]);
  };
  const entferneSegment = (index: number) => {
    setBauSegmente((s) => s.filter((_, i) => i !== index));
  };
  const bauKosten = useMemo(
    () => bauSegmente.reduce((acc, s) => acc + SEGMENTE[s.key].kosten, 0),
    [bauSegmente],
  );
  const starteWurm = () => {
    if (bauSegmente.length < 1) return;
    if (blaetter < bauKosten) return;
    setBlaetter((b) => b - bauKosten);
    const w = baueWurm("spieler", bauSegmente.map((s) => ({ ...s })), fortschritt.upgrades);
    refs.current.wuermer.push(w);
    setWuermerState([...refs.current.wuermer]);
    setBauSegmente([]);
  };

  const upgradeProduktion = () => {
    if (produktionsStufe >= 3) return;
    const k = PRODUKTION_KOSTEN[produktionsStufe];
    if (blaetter < k) return;
    setBlaetter((b) => b - k);
    setProduktionsStufe((s) => s + 1);
  };
  const upgradeVerteidigung = () => {
    if (verteidigungsStufe >= 3) return;
    const k = VERTEIDIGUNG_KOSTEN[verteidigungsStufe];
    if (blaetter < k) return;
    setBlaetter((b) => b - k);
    setVerteidigungsStufe((s) => s + 1);
  };

  const handleSiegRueckkehr = useCallback(() => {
    onSieg(5 + matchAepfel);
  }, [onSieg, matchAepfel]);

  const maxSpielerBasis = BASIS_HP_GRUND + VERTEIDIGUNG_BONUS[verteidigungsStufe];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 text-emerald-950">
      {/* Obere Leiste */}
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-700/30 bg-emerald-950 px-4 py-2 text-white">
        <button
          type="button"
          onClick={onZurueck}
          className="flex items-center gap-1 rounded bg-emerald-800 px-2 py-1 text-xs hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Hauptmenü
        </button>
        <div className="flex items-center gap-1 rounded bg-emerald-800/50 px-2 py-1">
          <Leaf className="h-4 w-4 text-green-300" />
          <span className="text-sm font-bold">{Math.floor(blaetter)}</span>
          <span className="text-xs text-emerald-200">Blätter</span>
        </div>
        <div className="flex items-center gap-1 rounded bg-red-950/40 px-2 py-1">
          <Apple className="h-4 w-4 text-red-600" fill="#DC2626" />
          <span className="text-sm font-bold text-red-600">{matchAepfel}</span>
          <span className="text-xs text-red-300">Rote Äpfel</span>
        </div>
        <div className="flex flex-1 items-center gap-3 px-2">
          <div className="flex-1">
            <div className="text-xs">{fortschritt.spielerName} Basis</div>
            <div className="h-3 w-full overflow-hidden rounded bg-emerald-900">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${(spielerBasisHp / maxSpielerBasis) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs">Gegner Basis</div>
            <div className="h-3 w-full overflow-hidden rounded bg-red-950">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(gegnerBasisHp / BASIS_HP_GRUND) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={upgradeProduktion}
          disabled={produktionsStufe >= 3 || blaetter < (PRODUKTION_KOSTEN[produktionsStufe] ?? Infinity)}
          className="flex items-center gap-1 rounded bg-green-700 px-2 py-1 text-xs font-bold hover:bg-green-600 disabled:bg-emerald-800/40 disabled:text-emerald-400"
        >
          <TrendingUp className="h-4 w-4" />
          Produktion verbessern (Stufe {produktionsStufe}/3
          {produktionsStufe < 3 ? ` · ${PRODUKTION_KOSTEN[produktionsStufe]} Bl.` : ""})
        </button>
        <button
          type="button"
          onClick={upgradeVerteidigung}
          disabled={verteidigungsStufe >= 3 || blaetter < (VERTEIDIGUNG_KOSTEN[verteidigungsStufe] ?? Infinity)}
          className="flex items-center gap-1 rounded bg-blue-700 px-2 py-1 text-xs font-bold hover:bg-blue-600 disabled:bg-emerald-800/40 disabled:text-emerald-400"
        >
          <Shield className="h-4 w-4" />
          Verteidigung verbessern (Stufe {verteidigungsStufe}/3
          {verteidigungsStufe < 3 ? ` · ${VERTEIDIGUNG_KOSTEN[verteidigungsStufe]} Bl.` : ""})
        </button>
      </div>

      {/* Kampf-Arena */}
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-b from-sky-200 via-emerald-300 to-emerald-500">
        {/* Wiese */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-emerald-500 to-emerald-700" />

        {/* Spieler Baum links */}
        <Baum seite="links" name={fortschritt.spielerName} farbe="emerald" />
        {/* Gegner Baum rechts */}
        <Baum seite="rechts" name="Gegner" farbe="rose" />

        {/* Fall-Objekte */}
        {fallObjekte.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => sammleFall(o.id)}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-125"
            aria-label={o.art === "blatt" ? "Blatt sammeln" : "Roten Apfel sammeln"}
          >
            {o.art === "blatt" ? (
              <Leaf className="h-7 w-7 animate-pulse text-green-700" fill="#16a34a" />
            ) : (
              <Apple className="h-7 w-7 animate-bounce text-red-600" fill="#DC2626" />
            )}
          </button>
        ))}

        {/* Wuermer */}
        {wuermerState.map((w) => (
          <WurmAnzeige key={w.id} wurm={w} />
        ))}
      </div>

      {/* Werkstatt */}
      <div className="border-t-4 border-emerald-800 bg-emerald-100 p-3">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-900">
          Werkstatt — Vorschau (Kopf + {bauSegmente.length} Segmente + Schwanz)
        </h3>
        <div className="mb-3 flex items-center gap-1 rounded bg-emerald-200 p-2">
          <KopfSymbol farbe="bg-blue-600" />
          {bauSegmente.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => entferneSegment(i)}
              className="group relative"
              title={`${SEGMENTE[s.key].name} entfernen`}
            >
              <SegmentSymbol farbe={segmentFarbe(s.key)} />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-emerald-900 opacity-0 group-hover:opacity-100">
                ✕
              </span>
            </button>
          ))}
          <SchwanzSymbol />
          <span className="ml-auto text-xs font-bold text-emerald-900">
            Kosten: {bauKosten} Blätter
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {SEGMENT_REIHENFOLGE.map((key) => {
            const def = SEGMENTE[key];
            const stufe = fortschritt.upgrades[key];
            const gesperrt = bauSegmente.length >= 6 || blaetter < def.kosten;
            return (
              <button
                key={key}
                type="button"
                onClick={() => fuegeSegmentHinzu(key)}
                disabled={gesperrt}
                className="flex flex-col items-center rounded border-2 border-emerald-700 bg-emerald-50 p-2 text-xs hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SegmentSymbol farbe={segmentFarbe(key)} />
                <span className="mt-1 font-bold">{def.name}</span>
                <span className="text-[10px] text-emerald-700">Stufe {stufe}</span>
                <span className="text-[10px] text-emerald-900">{def.kosten} Bl.</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={starteWurm}
          disabled={bauSegmente.length < 1 || blaetter < bauKosten}
          className="w-full rounded-lg bg-red-600 px-4 py-3 text-lg font-extrabold text-white shadow hover:bg-red-500 disabled:bg-emerald-800/40 disabled:text-emerald-100"
        >
          WURM STARTEN ({bauKosten} Blätter)
        </button>
      </div>

      {sieg && (
        <EndBildschirm
          titel="Sieg im Krieg der Wuermer!"
          farbe="from-yellow-200 to-yellow-500"
          beschreibung={`Belohnung: +${5 + matchAepfel} Rote Äpfel.`}
          aktion={handleSiegRueckkehr}
          aktionLabel="Zurück zum Hauptmenü"
        />
      )}
      {niederlage && (
        <EndBildschirm
          titel="Niederlage..."
          farbe="from-red-300 to-red-700"
          beschreibung="Dein Baum wurde zerstört. Versuch es erneut!"
          aktion={onZurueck}
          aktionLabel="Zurück zum Hauptmenü"
        />
      )}
    </div>
  );
}

function segmentFarbe(key: SegmentKey): string {
  const map: Record<SegmentKey, string> = {
    beine: "bg-yellow-500",
    panzer: "bg-stone-600",
    kettenhemd: "bg-zinc-400",
    heilung: "bg-pink-400",
    schallpistole: "bg-purple-500",
    laser: "bg-cyan-400",
    kastanie: "bg-amber-700",
    raketenwerfer: "bg-orange-600",
  };
  return map[key];
}

function Baum({ seite, name, farbe }: { seite: "links" | "rechts"; name: string; farbe: "emerald" | "rose" }) {
  const pos = seite === "links" ? "left-0" : "right-0";
  const krone = farbe === "emerald" ? "bg-emerald-700" : "bg-rose-700";
  return (
    <div className={`absolute bottom-0 ${pos} flex w-24 flex-col items-center`}>
      <div className={`h-24 w-24 rounded-full ${krone} shadow-lg`} />
      <div className="-mt-4 h-20 w-8 bg-amber-900">
        <div className="mx-auto mt-8 h-10 w-5 rounded-t-full bg-emerald-950" />
      </div>
      <div className="absolute -top-2 rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-white">
        {name}
      </div>
    </div>
  );
}

function KopfSymbol({ farbe }: { farbe: string }) {
  return (
    <div className="relative h-10 w-10 rounded-full bg-emerald-600 ring-2 ring-emerald-900">
      <div className={`absolute -top-2 left-1 h-3 w-8 rounded-md ${farbe} shadow`} />
      <div className="absolute left-2 top-3 h-1.5 w-1.5 rounded-full bg-white" />
      <div className="absolute right-2 top-3 h-1.5 w-1.5 rounded-full bg-white" />
    </div>
  );
}
function SegmentSymbol({ farbe }: { farbe: string }) {
  return <div className={`h-10 w-10 rounded-full ${farbe} ring-2 ring-emerald-900`} />;
}
function SchwanzSymbol() {
  return <div className="h-8 w-8 rounded-full bg-emerald-700 ring-2 ring-emerald-900" />;
}

function WurmAnzeige({ wurm }: { wurm: Wurm }) {
  const jetzt = performance.now();
  const flash = jetzt < wurm.flashBis;
  const baretFarbe = wurm.seite === "spieler" ? "bg-blue-600" : "bg-red-600";

  // Segment-Reihenfolge: Kopf(-1), 0..n-1, Schwanz(n)
  const teile: Array<{ id: number; farbe: string; typ: "kopf" | "segment" | "schwanz" }> = [
    { id: -1, farbe: "bg-emerald-600", typ: "kopf" },
    ...wurm.segmente.map((s, i) => ({ id: i, farbe: segmentFarbe(s.key), typ: "segment" as const })),
    { id: wurm.segmente.length, farbe: "bg-emerald-700", typ: "schwanz" as const },
  ];

  // Positionierung: Kopf vorne, Rest dahinter (entgegen Bewegungsrichtung)
  const richtung = wurm.seite === "spieler" ? -1 : 1; // schwanz richtung
  return (
    <div
      className="absolute bottom-6"
      style={{ left: `${wurm.x}%`, transform: "translateX(-50%)" }}
    >
      <div className="flex items-end gap-0.5">
        {(richtung === -1 ? teile : [...teile].reverse()).map((t, i) => {
          const pulse = flash ? "ring-4 ring-red-500" : "";
          const baseScale = "transition-all duration-300";
          const platzAnim = wurm.sterbend && wurm.geplatzt.has(t.id)
            ? "scale-125 opacity-0 -translate-y-4"
            : "";
          if (t.typ === "kopf") {
            return (
              <div key={i} className={`relative ${baseScale} ${platzAnim}`}>
                <div className={`h-10 w-10 rounded-full bg-emerald-600 ring-2 ring-emerald-900 ${pulse}`}>
                  <div className={`absolute -top-2 left-1 h-3 w-8 rounded-md ${baretFarbe} shadow`} />
                  <div className="absolute left-2 top-3 h-1.5 w-1.5 rounded-full bg-white" />
                  <div className="absolute right-2 top-3 h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              </div>
            );
          }
          if (t.typ === "schwanz") {
            return (
              <div
                key={i}
                className={`h-8 w-8 rounded-full bg-emerald-700 ring-2 ring-emerald-900 ${baseScale} ${platzAnim} ${pulse}`}
              />
            );
          }
          return (
            <div
              key={i}
              className={`h-10 w-10 rounded-full ${t.farbe} ring-2 ring-emerald-900 ${baseScale} ${platzAnim} ${pulse}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function EndBildschirm({
  titel,
  beschreibung,
  farbe,
  aktion,
  aktionLabel,
}: {
  titel: string;
  beschreibung: string;
  farbe: string;
  aktion: () => void;
  aktionLabel: string;
}) {
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

// Kleine Trees-Anwendung um Import zu nutzen
export const _Trees = Trees;