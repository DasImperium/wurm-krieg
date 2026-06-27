import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Apple, Leaf, ArrowLeft, TrendingUp, Shield, Trophy,
  Footprints, Link as LinkIcon, HeartPulse, Volume2, Zap, Bomb, Rocket, Smile,
} from "lucide-react";
import {
  SEGMENTE,
  SEGMENT_REIHENFOLGE,
  type GespeicherterFortschritt,
  type SegmentKey,
} from "@/lib/game/segments";
import { SternanisIcon } from "./Sternanis";

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
  pfad: number;
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
  knockbackBis: number; // ms timestamp bis wann Bewegung blockiert
}

interface FallObjekt {
  id: number;
  art: "blatt" | "apfel";
  x: number;
  y: number;
  geschwindigkeit: number;
}

interface Mine {
  id: number;
  seite: "spieler" | "gegner";
  x: number;
  pfad: number;
  schaden: number;
}

interface WaffenEffekt {
  id: number;
  art: "laser" | "rakete" | "schall";
  x1: number; x2: number;
  bottom: number;
  bis: number;
  seite: "spieler" | "gegner";
}

interface Props {
  fortschritt: GespeicherterFortschritt;
  level: number; // 0 = prozedural
  onZurueck: () => void;
  onSieg: (zusatzAepfel: number, zusatzSternanis: number) => void;
  onNiederlage: () => void;
}

const PRODUKTION_KOSTEN = [100, 350, 800];
const VERTEIDIGUNG_KOSTEN = [150, 400, 800];
const PRODUKTION_RATE = [5, 10, 20, 40];
const VERTEIDIGUNG_BONUS = [0, 200, 500, 1000];
const KANONEN_SCHADEN = [0, 25, 55, 100];
const KANONEN_REICHWEITE = [0, 12, 22, 30];
const KANONEN_INTERVALL_MS = 2000;
const BASIS_HP_GRUND = 1800;
const TICK_MS = 50;
const SPIELER_BASIS_X = 3;
const GEGNER_BASIS_X = 97;
const ANZAHL_PFADE = 5;

// Geschätzte halbe Wurmlänge in % der Karte.
function halbeWurmLaenge(w: Wurm): number {
  return ((w.segmente.length + 2) * 2.0) / 2;
}
// Vorderste Stelle des Kopfes Richtung feindlicher Basis.
function kopfX(w: Wurm): number {
  const h = halbeWurmLaenge(w);
  return w.seite === "spieler" ? w.x + h : w.x - h;
}
// Kosten steigen leicht mit Forschungsstufe.
function segmentKosten(key: SegmentKey, stufe: number): number {
  return Math.round(SEGMENTE[key].kosten * (1 + (stufe - 1) * 0.2));
}

let wurmIdZaehler = 1;
let fallIdZaehler = 1;
let mineIdZaehler = 1;
let effektIdZaehler = 1;

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
    x: seite === "spieler" ? -2 : 102,
    pfad: Math.floor(Math.random() * ANZAHL_PFADE),
    kopfHp: 80,
    kopfMax: 80,
    schwanzHp: 40,
    schwanzMax: 40,
    segmente,
    sterbend: false,
    todStart: 0,
    geplatzt: new Set(),
    flashBis: 0,
    feuerTimer,
    feuerStop: 0,
    heilTimer: 5000,
    munition,
    knockbackBis: 0,
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
  let s = 4;
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
  // Knockback: 300ms blockierte Bewegung, kleiner Rückstoß
  w.knockbackBis = jetzt + 300;
  const kb = 0.8;
  w.x += w.seite === "spieler" ? -kb : kb;
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

function zufallsWurmGegner(
  upgrades: GespeicherterFortschritt["upgrades"],
  level: number,
  prozeduralWlr?: number,
): Wurm {
  // Prozedural: effektives Level steigt mit WLR
  const effLevel = prozeduralWlr !== undefined
    ? Math.max(1, Math.min(100, Math.floor(8 + prozeduralWlr * 50)))
    : level;
  const minAnz = Math.max(1, Math.min(5, Math.floor(effLevel / 18) + 1));
  const maxAnz = Math.max(minAnz, Math.min(6, 2 + Math.floor(effLevel / 14)));
  const anzahl = minAnz + Math.floor(Math.random() * (maxAnz - minAnz + 1));

  // Mit steigendem Level höhere Wahrscheinlichkeit für hochwertige Segmente
  // (laser, kastanie, raketenwerfer, panzer, kettenhemd) und höhere Stufen.
  const billig: SegmentKey[] = ["beine", "schallpistole"];
  const mittel: SegmentKey[] = ["kettenhemd", "heilung", "schallpistole", "kastanie"];
  const stark: SegmentKey[] = ["panzer", "laser", "raketenwerfer"];
  const segmente: Segment[] = [];
  for (let i = 0; i < anzahl; i++) {
    const r = Math.random();
    const starkChance = Math.min(0.75, 0.05 + effLevel * 0.009);
    const mittelChance = Math.min(0.5, 0.15 + effLevel * 0.006);
    let pool: SegmentKey[];
    if (r < starkChance) pool = stark;
    else if (r < starkChance + mittelChance) pool = mittel;
    else pool = billig;
    const key = pool[Math.floor(Math.random() * pool.length)];
    // Spec-Skalierung:
    //   L1-8: nur Stufe 1
    //   L9-50: vereinzelt Stufe 2 (zunehmend bis L50)
    //   L51-74: Stufe 3, vereinzelt Stufe 4
    //   L75-100: Stufe 4 normal, vereinzelt Stufe 5
    const sr = Math.random();
    let stufe = 1;
    if (effLevel >= 9 && effLevel <= 50) {
      const p2 = (effLevel - 8) / 42 * 0.5;
      if (sr < p2) stufe = 2;
    } else if (effLevel >= 51 && effLevel <= 74) {
      if (sr < 0.15) stufe = 4;
      else if (sr < 0.55) stufe = 3;
      else stufe = 2;
    } else if (effLevel >= 75) {
      if (sr < 0.2) stufe = 5;
      else if (sr < 0.6) stufe = 4;
      else stufe = 3;
    }
    // Forschung deckelt
    stufe = Math.min(stufe, upgrades[key] !== undefined ? 5 : stufe);
    segmente.push(baueSegment(key, stufe));
  }
  return baueWurm("gegner", segmente, upgrades);
}

export function Spielfeld({ fortschritt, level, onZurueck, onSieg, onNiederlage }: Props) {
  const istProzedural = level === 0;
  const wlr = istProzedural
    ? (fortschritt.siege + 1) / (fortschritt.niederlagen + 1)
    : 1;
  const effLevel = istProzedural ? Math.max(1, Math.min(100, Math.floor(8 + Math.min(2, wlr) * 25))) : level;
  const gegnerBasisMax = BASIS_HP_GRUND + effLevel * 70;
  const aiSpawnInterval = Math.max(3500, 14000 - effLevel * 110);
  const [blaetter, setBlaetter] = useState(50);
  const [aiBlaetter, setAiBlaetter] = useState(50);
  const [produktionsStufe, setProduktionsStufe] = useState(0);
  const [verteidigungsStufe, setVerteidigungsStufe] = useState(0);
  const [spielerBasisHp, setSpielerBasisHp] = useState(BASIS_HP_GRUND);
  const [gegnerBasisHp, setGegnerBasisHp] = useState(gegnerBasisMax);
  const [wuermerState, setWuermerState] = useState<Wurm[]>([]);
  const [fallObjekte, setFallObjekte] = useState<FallObjekt[]>([]);
  const [matchAepfel, setMatchAepfel] = useState(0); // gefundene Äpfel im Match
  const [matchSternanis, setMatchSternanis] = useState(0);
  const [minen, setMinen] = useState<Mine[]>([]);
  const [effekte, setEffekte] = useState<WaffenEffekt[]>([]);
  const [bauSegmente, setBauSegmente] = useState<Segment[]>([]);
  const [sieg, setSieg] = useState(false);
  const [niederlage, setNiederlage] = useState(false);

  const refs = useRef({
    wuermer: [] as Wurm[],
    fall: [] as FallObjekt[],
    minen: [] as Mine[],
    effekte: [] as WaffenEffekt[],
    niederlageGemeldet: false,
    letzteBlatt: 0,
    letzterApfelCheck: 0,
    aiSpawn: 0,
    matchAepfelLokal: 0,
    apfelSpawnsImMatch: 0,
    spielerKanone: 0,
    gegnerKanone: 0,
    kanonenBlitz: [] as Array<{ id: number; seite: "spieler" | "gegner"; zielX: number; bis: number }>,
  });
  const [kanonenBlitze, setKanonenBlitze] = useState<typeof refs.current.kanonenBlitz>([]);

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
      if (r.aiSpawn >= aiSpawnInterval) {
        r.aiSpawn = 0;
        const wurm = zufallsWurmGegner(fortschritt.upgrades, effLevel, istProzedural ? wlr : undefined);
        const kostenBlaetter = wurm.segmente.reduce(
          (acc, s) => acc + segmentKosten(s.key, s.stufe),
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

        // Ziel finden — Distanzen ab vorderster Kopfstelle.
        const meinKopf = kopfX(w);
        const gegner = lebendig.filter((g) => g.seite !== w.seite);
        let zielWurm: Wurm | null = null;
        let minDist = Infinity;
        for (const g of gegner) {
          const d = Math.abs(kopfX(g) - meinKopf);
          if (d < minDist) {
            minDist = d;
            zielWurm = g;
          }
        }
        const basisX = w.seite === "spieler" ? GEGNER_BASIS_X : SPIELER_BASIS_X;
        const basisDist = Math.abs(basisX - meinKopf);
        if (!zielWurm) minDist = basisDist;

        // Bewegung: Wuermer blockieren sich NICHT. Sie laufen immer bis zur gegn. Basis
        // (Baum am Kartenende blockiert die Bewegung).
        const speed = wurmGeschwindigkeit(w);
        const kannBewegen = jetzt >= w.feuerStop && jetzt >= w.knockbackBis;
        // Kopf-an-Kopf-Blockade: kein Überlappen mit Gegnerwürmern.
        let blockiert = false;
        for (const g of gegner) {
          const gKopf = kopfX(g);
          const vorne = w.seite === "spieler" ? gKopf - meinKopf : meinKopf - gKopf;
          if (vorne > -0.5 && vorne <= 1.5) { blockiert = true; break; }
        }
        if (kannBewegen) {
          if (basisDist > 1.5 && !blockiert) {
            const dx = (speed * TICK_MS) / 1000;
            w.x += w.seite === "spieler" ? dx : -dx;
            if (w.seite === "spieler") w.x = Math.min(GEGNER_BASIS_X, w.x);
            else w.x = Math.max(SPIELER_BASIS_X, w.x);
          }
        }

        // Nahkampf: nur Gegner unmittelbar vor dem Kopf.
        const dmgProSek = nahkampfSchaden(w);
        const tickDmg = (dmgProSek * TICK_MS) / 1000;
        let hatGebissen = false;
        for (const g of gegner) {
          const gKopf = kopfX(g);
          const vor = w.seite === "spieler" ? gKopf - meinKopf : meinKopf - gKopf;
          if (vor > -1 && vor <= 2) {
            schadenAnWurm(g, tickDmg, jetzt);
            hatGebissen = true;
          }
        }
        if (basisDist <= 2 && jetzt >= w.knockbackBis) {
          const dmg = (nahkampfSchaden(w) * TICK_MS) / 1000;
          if (w.seite === "spieler") setGegnerBasisHp((h) => Math.max(0, h - dmg));
          else setSpielerBasisHp((h) => Math.max(0, h - dmg));
        }
        void hatGebissen;

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
          // Kastanien sind Minen — legen sie direkt am eigenen Kopf ab und brechen ab
          if (s.key === "kastanie") {
            if ((w.munition[key] ?? 0) <= 0) return;
            w.feuerTimer[key] = fk.intervallMs;
            w.munition[key] = (w.munition[key] ?? 0) - 1;
            r.minen.push({
              id: mineIdZaehler++, seite: w.seite, x: w.x, pfad: w.pfad,
              schaden: fk.schaden[Math.min(s.stufe - 1, fk.schaden.length - 1)],
            });
            return;
          }
          // Reichweite ab vorderster Kopfstelle.
          if (!zielWurm) {
            if (basisDist > fk.reichweite) return;
          } else if (Math.abs(kopfX(zielWurm) - meinKopf) > fk.reichweite) return;

          // Feuern
          w.feuerTimer[key] = fk.intervallMs;
          w.feuerStop = jetzt + 500;
          if (fk.munition !== undefined) w.munition[key] = (w.munition[key] ?? 0) - 1;
          const schadenWert = fk.schaden[Math.min(s.stufe - 1, fk.schaden.length - 1)];
          const schuesse = fk.anzahl ?? 1;
          // Optischer Effekt: startet an Kopfvorderkante.
          const zielX = zielWurm ? kopfX(zielWurm) : (w.seite === "spieler" ? GEGNER_BASIS_X : SPIELER_BASIS_X);
          r.effekte.push({
            id: effektIdZaehler++,
            art: s.key === "laser" ? "laser" : s.key === "raketenwerfer" ? "rakete" : "schall",
            x1: meinKopf, x2: zielX,
            bottom: 20 + w.pfad * 14 + 18,
            bis: jetzt + 250,
            seite: w.seite,
          });
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

      // --- Minen-Trigger ---
      r.minen = r.minen.filter((m) => {
        const feind = lebendig.find((w) => w.seite !== m.seite && Math.abs(kopfX(w) - m.x) <= 2);
        if (feind) {
          schadenAnWurm(feind, m.schaden, jetzt);
          r.effekte.push({
            id: effektIdZaehler++, art: "rakete",
            x1: m.x, x2: m.x, bottom: 20 + m.pfad * 14, bis: jetzt + 250, seite: m.seite,
          });
          return false;
        }
        return true;
      });
      r.effekte = r.effekte.filter((e) => e.bis > jetzt);

      // Tod-Animation: pop segments alle 150ms vom Kopf nach hinten
      // Tote Wuermer werden komplett (Kopf + alle Segmente + Schwanz) entfernt.
      r.wuermer = r.wuermer.filter((w) => !w.sterbend);

      // --- Basis-Kanonen ---
      r.spielerKanone += TICK_MS;
      r.gegnerKanone += TICK_MS;
      const feuereKanone = (seite: "spieler" | "gegner", stufe: number) => {
        if (stufe <= 0) return;
        const reichweite = KANONEN_REICHWEITE[stufe];
        const schaden = KANONEN_SCHADEN[stufe];
        const basisX = seite === "spieler" ? 0 : 100;
        const feinde = r.wuermer.filter((w) => !w.sterbend && w.seite !== seite);
        let ziel: Wurm | null = null;
        let minD = Infinity;
        for (const f of feinde) {
          const d = Math.abs(kopfX(f) - basisX);
          if (d <= reichweite && d < minD) {
            minD = d;
            ziel = f;
          }
        }
        if (!ziel) return;
        schadenAnWurm(ziel, schaden, jetzt);
        r.kanonenBlitz.push({ id: fallIdZaehler++, seite, zielX: kopfX(ziel), bis: jetzt + 200 });
      };
      if (r.spielerKanone >= KANONEN_INTERVALL_MS) {
        r.spielerKanone = 0;
        feuereKanone("spieler", verteidigungsStufe);
      }
      if (r.gegnerKanone >= KANONEN_INTERVALL_MS) {
        r.gegnerKanone = 0;
        // Gegner-Verteidigung skaliert mit Level (höhere Level = härtere Abwehr)
        const gegnerStufe = Math.min(3, 1 + Math.floor(level / 17));
        feuereKanone("gegner", gegnerStufe);
      }
      r.kanonenBlitz = r.kanonenBlitz.filter((b) => b.bis > jetzt);

      setWuermerState([...r.wuermer]);
      setFallObjekte([...r.fall]);
      setKanonenBlitze([...r.kanonenBlitz]);
      setMinen([...r.minen]);
      setEffekte([...r.effekte]);
    }, TICK_MS);
    return () => window.clearInterval(handle);
  }, [produktionsStufe, verteidigungsStufe, fortschritt.upgrades, sieg, niederlage, level, aiSpawnInterval, effLevel, istProzedural, wlr]);

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
    if (spielerBasisHp <= 0 && !niederlage) {
      setNiederlage(true);
      if (!refs.current.niederlageGemeldet) {
        refs.current.niederlageGemeldet = true;
        onNiederlage();
      }
    }
  }, [spielerBasisHp, niederlage, onNiederlage]);

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
    () => bauSegmente.reduce((acc, s) => acc + segmentKosten(s.key, s.stufe), 0),
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
    // Spec: 5 garantierte Äpfel + alle im Match gesammelten + Level-Bonus.
    const belohnung = 5 + matchAepfel + Math.floor(effLevel / 5);
    const sternBonus = matchSternanis + (effLevel >= 30 ? (Math.random() < 0.4 ? 1 : 0) : 0);
    onSieg(belohnung, sternBonus);
  }, [onSieg, matchAepfel, matchSternanis, effLevel]);

  const maxSpielerBasis = BASIS_HP_GRUND + VERTEIDIGUNG_BONUS[verteidigungsStufe];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 text-emerald-950">
      {/* Obere Leiste */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-1.5 border-b border-emerald-700/30 bg-emerald-950 px-2 py-1.5 text-white sm:gap-3 sm:px-4 sm:py-2">
        <button
          type="button"
          onClick={onZurueck}
          className="flex items-center gap-1 rounded bg-emerald-800 px-2 py-1 text-xs hover:bg-emerald-700"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Hauptmenü</span>
        </button>
        <div className="rounded bg-yellow-500/20 px-2 py-1 text-[10px] font-bold text-yellow-200 sm:text-xs">
          {istProzedural ? "Prozedural" : `L ${level}`}
        </div>
        <div className="flex items-center gap-1 rounded bg-emerald-800/50 px-1.5 py-1">
          <Leaf className="h-3 w-3 text-green-300 sm:h-4 sm:w-4" />
          <span className="text-xs font-bold sm:text-sm">{Math.floor(blaetter)}</span>
        </div>
        <div className="flex items-center gap-1 rounded bg-red-950/40 px-1.5 py-1">
          <Apple className="h-3 w-3 text-red-500 sm:h-4 sm:w-4" fill="#DC2626" />
          <span className="text-xs font-bold text-red-300 sm:text-sm">{matchAepfel}</span>
        </div>
        <div className="flex items-center gap-1 rounded bg-amber-950/40 px-1.5 py-1">
          <SternanisIcon className="h-3 w-3 text-amber-300 sm:h-4 sm:w-4" />
          <span className="text-xs font-bold text-amber-200 sm:text-sm">{matchSternanis}</span>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:px-2">
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden rounded bg-emerald-900">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${(spielerBasisHp / maxSpielerBasis) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden rounded bg-red-950">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(gegnerBasisHp / gegnerBasisMax) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={upgradeProduktion}
          disabled={produktionsStufe >= 3 || blaetter < (PRODUKTION_KOSTEN[produktionsStufe] ?? Infinity)}
          className="flex items-center gap-1 rounded bg-green-700 px-1.5 py-1 text-[10px] font-bold hover:bg-green-600 disabled:bg-emerald-800/40 disabled:text-emerald-400 sm:text-xs"
        >
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
          Prod {produktionsStufe}/3{produktionsStufe < 3 ? ` (${PRODUKTION_KOSTEN[produktionsStufe]})` : ""}
        </button>
        <button
          type="button"
          onClick={upgradeVerteidigung}
          disabled={verteidigungsStufe >= 3 || blaetter < (VERTEIDIGUNG_KOSTEN[verteidigungsStufe] ?? Infinity)}
          className="flex items-center gap-1 rounded bg-blue-700 px-1.5 py-1 text-[10px] font-bold hover:bg-blue-600 disabled:bg-emerald-800/40 disabled:text-emerald-400 sm:text-xs"
        >
          <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
          Vert {verteidigungsStufe}/3{verteidigungsStufe < 3 ? ` (${VERTEIDIGUNG_KOSTEN[verteidigungsStufe]})` : ""}
        </button>
      </div>

      {/* Kampf-Arena */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <div className="relative h-64 w-[400%] min-w-[1600px] bg-gradient-to-b from-sky-200 via-emerald-300 to-emerald-500 sm:h-72">
        {/* Wiese */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-emerald-500 to-emerald-700" />
        {/* 5 Pfade als sanfte Linien */}
        {Array.from({ length: ANZAHL_PFADE }, (_, i) => (
          <div
            key={i}
            className="absolute inset-x-0 border-t border-emerald-900/15"
            style={{ bottom: `${20 + i * 14}px` }}
          />
        ))}

        {/* Spieler Baum links */}
        <Baum seite="links" name={fortschritt.spielerName} farbe="emerald" />
        {/* Gegner Baum rechts */}
        <Baum seite="rechts" name="Gegner" farbe="rose" />

        {/* Kanonen-Blitze */}
        {kanonenBlitze.map((b) => {
          const startX = b.seite === "spieler" ? 0 : 100;
          const links = Math.min(startX, b.zielX);
          const breite = Math.abs(b.zielX - startX);
          return (
            <div
              key={b.id}
              className={`absolute top-20 h-1 ${b.seite === "spieler" ? "bg-emerald-300" : "bg-rose-300"} shadow-[0_0_8px_currentColor] opacity-80`}
              style={{ left: `${links}%`, width: `${breite}%` }}
            />
          );
        })}

        {/* Waffen-Effekte */}
        {effekte.map((e) => {
          const links = Math.min(e.x1, e.x2);
          const breite = Math.abs(e.x2 - e.x1);
          const farbe = e.art === "laser" ? "bg-cyan-300" : e.art === "rakete" ? "bg-orange-400" : "bg-purple-300";
          return (
            <div key={e.id} className={`absolute h-1 ${farbe} shadow-[0_0_10px_currentColor] opacity-90`}
              style={{ left: `${links}%`, width: `${Math.max(breite, 1)}%`, bottom: `${e.bottom}px` }} />
          );
        })}

        {/* Minen */}
        {minen.map((m) => (
          <div key={m.id} className="absolute z-10 -translate-x-1/2"
            style={{ left: `${m.x}%`, bottom: `${10 + m.pfad * 14}px` }}>
            <div className={`flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-amber-900 shadow ${m.seite === "spieler" ? "bg-red-600" : "bg-blue-600"}`}>
              <Bomb className="h-3 w-3 text-white" />
            </div>
          </div>
        ))}

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
              <SegmentSymbolMitIcon keyName={s.key} />
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
                <SegmentSymbolMitIcon keyName={key} />
                <span className="mt-1 font-bold">{def.name}</span>
                <span className="text-[10px] text-emerald-700">Stufe {stufe}</span>
                <span className="text-[10px] text-emerald-900">{segmentKosten(key, stufe)} Bl.</span>
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
          beschreibung={`Belohnung: +${5 + matchAepfel + Math.floor(effLevel / 5)} Rote Äpfel.`}
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

function SegmentIcon({ keyName, className }: { keyName: SegmentKey; className?: string }) {
  const cls = className ?? "h-5 w-5 text-white drop-shadow";
  switch (keyName) {
    case "beine": return <Footprints className={cls} />;
    case "panzer": return <Shield className={cls} />;
    case "kettenhemd": return <LinkIcon className={cls} />;
    case "heilung": return <HeartPulse className={cls} />;
    case "schallpistole": return <Volume2 className={cls} />;
    case "laser": return <Zap className={cls} />;
    case "kastanie": return <Bomb className={cls} />;
    case "raketenwerfer": return <Rocket className={cls} />;
  }
}

function Baum({ seite, name, farbe }: { seite: "links" | "rechts"; name: string; farbe: "emerald" | "rose" }) {
  const pos = seite === "links" ? "left-0" : "right-0";
  const krone = farbe === "emerald" ? "bg-emerald-700" : "bg-rose-700";
  const kroneHell = farbe === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <div className={`absolute bottom-0 ${pos} z-20 flex w-28 flex-col items-center`}>
      <div className="relative">
        <div className={`h-28 w-28 rounded-full ${krone} shadow-2xl ring-4 ring-emerald-900/40`} />
        <div className={`absolute left-3 top-3 h-8 w-8 rounded-full ${kroneHell} opacity-60`} />
        <div className={`absolute right-4 top-6 h-5 w-5 rounded-full ${kroneHell} opacity-60`} />
      </div>
      <div className="-mt-6 h-24 w-10 rounded bg-gradient-to-b from-amber-800 to-amber-950 shadow-inner">
        <div className="mx-auto mt-10 h-12 w-6 rounded-t-full bg-amber-950" />
      </div>
      <div className="absolute -top-3 rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-white shadow">
        {name}
      </div>
    </div>
  );
}

function KopfSymbol({ farbe }: { farbe: string }) {
  return (
    <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 ring-2 ring-emerald-900 shadow-md">
      <div className={`absolute -top-2 left-0.5 h-3 w-9 rounded-md ${farbe} shadow`} />
      <Smile className="absolute inset-0 m-auto h-6 w-6 text-emerald-950" />
    </div>
  );
}
function SegmentSymbolMitIcon({ keyName }: { keyName: SegmentKey }) {
  return (
    <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${segmentFarbe(keyName)} ring-2 ring-emerald-900 shadow`}>
      <SegmentIcon keyName={keyName} />
    </div>
  );
}
function SchwanzSymbol() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 ring-2 ring-emerald-900 shadow">
      <Leaf className="h-4 w-4 -rotate-45 text-emerald-100" fill="currentColor" />
    </div>
  );
}

function WurmAnzeige({ wurm }: { wurm: Wurm }) {
  const jetzt = performance.now();
  const flash = jetzt < wurm.flashBis;
  const baretFarbe = wurm.seite === "spieler" ? "bg-blue-600" : "bg-red-600";

  type Teil =
    | { id: number; typ: "kopf" }
    | { id: number; typ: "segment"; key: SegmentKey; stufe: number }
    | { id: number; typ: "schwanz" };
  const teile: Teil[] = [
    { id: -1, typ: "kopf" },
    ...wurm.segmente.map((s, i) => ({ id: i, typ: "segment" as const, key: s.key, stufe: s.stufe })),
    { id: wurm.segmente.length, typ: "schwanz" as const },
  ];

  const kopfRechts = wurm.seite === "spieler";
  const laneOffset = 20 + wurm.pfad * 14; // px
  return (
    <div
      className="absolute"
      style={{ left: `${wurm.x}%`, bottom: `${laneOffset}px`, transform: "translateX(-50%)" }}
    >
      <div className="flex items-end gap-0.5">
        {(kopfRechts ? [...teile].reverse() : teile).map((t, i) => {
          const pulse = flash ? "ring-4 ring-red-500" : "";
          const baseScale = "transition-all duration-300";
          const platzAnim = wurm.sterbend ? "scale-125 opacity-0 -translate-y-4" : "";
          if (t.typ === "kopf") {
            return (
              <div key={i} className={`relative ${baseScale} ${platzAnim}`}>
                <div className={`relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 ring-2 ring-emerald-900 shadow ${pulse}`}>
                  <div className={`absolute -top-2 left-1 h-3 w-8 rounded-md ${baretFarbe} shadow`} />
                  <Smile className="absolute inset-0 m-auto h-6 w-6 text-emerald-950" />
                </div>
              </div>
            );
          }
          if (t.typ === "schwanz") {
            return (
              <div key={i} className={`${baseScale} ${platzAnim}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 ring-2 ring-emerald-900 shadow ${pulse}`}>
                  <Leaf className="h-4 w-4 -rotate-45 text-emerald-100" fill="currentColor" />
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={`${baseScale} ${platzAnim}`}>
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${segmentFarbe(t.key)} ring-2 ring-emerald-900 shadow ${pulse}`}>
                <SegmentIcon keyName={t.key} />
                {t.stufe > 1 && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-yellow-300 px-1 text-[8px] font-bold text-emerald-950 ring-1 ring-emerald-900">
                    {t.stufe}
                  </span>
                )}
              </div>
            </div>
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

