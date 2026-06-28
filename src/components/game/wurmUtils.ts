import { SEGMENTE, type SegmentKey, type GespeicherterFortschritt } from "@/lib/game/segments";
import type { Wurm, Segment } from "./types";
import { ANZAHL_PFADE } from "./constants";

// Global counters - exported for use in Spielfeld.tsx
export let wurmIdZaehler = 1;
export let fallIdZaehler = 1;
export let mineIdZaehler = 1;
export let effektIdZaehler = 1;

export function resetIdZaehler(): void {
  wurmIdZaehler = 1;
  fallIdZaehler = 1;
  mineIdZaehler = 1;
  effektIdZaehler = 1;
}

export function getNextWurmId(): number { return wurmIdZaehler++; }
export function getNextFallId(): number { return fallIdZaehler++; }
export function getNextMineId(): number { return mineIdZaehler++; }
export function getNextEffektId(): number { return effektIdZaehler++; }

export function halbeWurmLaenge(w: Wurm): number {
  return ((w.segmente.length + 2) * 2.0) / 2;
}

export function kopfX(w: Wurm): number {
  const h = halbeWurmLaenge(w);
  return w.seite === "spieler" ? w.x + h : w.x - h;
}

export function segmentKosten(key: SegmentKey, stufe: number): number {
  return Math.round(SEGMENTE[key].kosten * (1 + (stufe - 1) * 0.2));
}

export function baueSegment(key: SegmentKey, stufe: number): Segment {
  const def = SEGMENTE[key];
  const hp = def.hp[stufe - 1];
  return { key, stufe, hp, maxHp: hp };
}

export function baueWurm(
  seite: "spieler" | "gegner",
  segmente: Segment[],
  upgrades: GespeicherterFortschritt["upgrades"],
): Wurm {
  const munition: Record<string, number> = {};
  segmente.forEach((s, i) => {
    const def = SEGMENTE[s.key];
    if (def.fernkampf?.munition) {
      munition[String(i)] = def.fernkampf.munition;
    }
  });

  const feuerTimer: Record<string, number> = {};
  segmente.forEach((s, i) => {
    const def = SEGMENTE[s.key];
    if (def.fernkampf) feuerTimer[String(i)] = def.fernkampf.intervallMs;
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

export function wurmGeschwindigkeit(w: Wurm): number {
  let bonus = 0;
  let malus = 0;
  for (const s of w.segmente) {
    const def = SEGMENTE[s.key];
    if (def.speedBonus) bonus = Math.max(bonus, def.speedBonus[s.stufe - 1]);
    if (def.speedMalus) malus += def.speedMalus[s.stufe - 1];
  }
  return Math.max(1, 5 + bonus - malus);
}

export function kettenhemdReduktion(w: Wurm): number {
  let r = 0;
  for (const s of w.segmente) {
    const def = SEGMENTE[s.key];
    if (def.schadensReduktion) r += def.schadensReduktion[s.stufe - 1];
  }
  return Math.min(50, r);
}

export function nahkampfSchaden(w: Wurm): number {
  let s = 4;
  for (const seg of w.segmente) {
    const def = SEGMENTE[seg.key];
    if (def.nahkampfBonus) s += def.nahkampfBonus[seg.stufe - 1];
  }
  return s;
}

export function schadenAnWurm(w: Wurm, schaden: number, jetzt: number): boolean {
  if (w.sterbend) return true;
  const reduziert = schaden * (1 - kettenhemdReduktion(w) / 100);
  w.flashBis = jetzt + 150;
  w.knockbackBis = jetzt + 300;
  const kb = 0.8;
  w.x += w.seite === "spieler" ? -kb : kb;
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

export function zufallsWurmGegner(
  upgrades: GespeicherterFortschritt["upgrades"],
  level: number,
  prozeduralWlr?: number,
): Wurm {
  const effLevel = prozeduralWlr !== undefined
    ? Math.max(1, Math.min(100, Math.floor(8 + prozeduralWlr * 50)))
    : level;
  const minAnz = Math.max(1, Math.min(5, Math.floor(effLevel / 18) + 1));
  const maxAnz = Math.max(minAnz, Math.min(6, 2 + Math.floor(effLevel / 14)));
  const anzahl = minAnz + Math.floor(Math.random() * (maxAnz - minAnz + 1));

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
    stufe = Math.min(stufe, upgrades[key] !== undefined ? upgrades[key] : stufe);
    segmente.push(baueSegment(key, stufe));
  }
  return baueWurm("gegner", segmente, upgrades);
}