export type SegmentKey =
  | "beine"
  | "panzer"
  | "kettenhemd"
  | "heilung"
  | "schallpistole"
  | "laser"
  | "kastanie"
  | "raketenwerfer";

export interface SegmentDef {
  key: SegmentKey;
  name: string;
  beschreibung: string;
  kosten: number;
  hp: number[]; // hp per Stufe (index 0 = Stufe 1)
  speedBonus?: number[];
  speedMalus?: number[];
  schadensReduktion?: number[]; // %
  heilung?: number[];
  nahkampfBonus?: number[];
  fernkampf?: { reichweite: number; intervallMs: number; schaden: number[]; anzahl?: number; munition?: number };
}

export const UPGRADE_KOSTEN: Record<number, number> = { 2: 2, 3: 4 };

export const SEGMENTE: Record<SegmentKey, SegmentDef> = {
  beine: {
    key: "beine",
    name: "Beine",
    beschreibung: "Erhöht die Geschwindigkeit des Wurms.",
    kosten: 25,
    hp: [40, 55, 70],
    speedBonus: [3, 5, 7],
  },
  panzer: {
    key: "panzer",
    name: "Panzer",
    beschreibung: "Massive Lebenspunkte, verlangsamt aber.",
    kosten: 55,
    hp: [300, 500, 800],
    speedMalus: [2, 1.5, 1],
  },
  kettenhemd: {
    key: "kettenhemd",
    name: "Kettenhemd",
    beschreibung: "Reduziert eingehenden Schaden (max. 50%).",
    kosten: 50,
    hp: [70, 100, 140],
    schadensReduktion: [8, 14, 22],
  },
  heilung: {
    key: "heilung",
    name: "Heilung",
    beschreibung: "Heilt den gesamten Wurm alle 5 Sekunden.",
    kosten: 65,
    hp: [70, 90, 120],
    heilung: [25, 50, 90],
  },
  schallpistole: {
    key: "schallpistole",
    name: "Schallpistole",
    beschreibung: "Erhöht den Bissschaden des Kopfes.",
    kosten: 75,
    hp: [60, 80, 100],
    nahkampfBonus: [20, 35, 55],
  },
  laser: {
    key: "laser",
    name: "Laser",
    beschreibung: "Fernkampf, Reichweite 15%.",
    kosten: 95,
    hp: [60, 80, 100],
    fernkampf: { reichweite: 18, intervallMs: 1400, schaden: [35, 55, 80] },
  },
  kastanie: {
    key: "kastanie",
    name: "Kastanie",
    beschreibung: "Legt Minen mit Flächenschaden (3 Stk., alle 20s).",
    kosten: 90,
    hp: [70, 90, 120],
    fernkampf: {
      reichweite: 8,
      intervallMs: 20000,
      schaden: [60, 95, 140],
      munition: 3,
    },
  },
  raketenwerfer: {
    key: "raketenwerfer",
    name: "Raketenwerfer",
    beschreibung: "Reichweite 40%, 3 Raketen alle 15s.",
    kosten: 175,
    hp: [80, 100, 130],
    fernkampf: {
      reichweite: 40,
      intervallMs: 15000,
      schaden: [110, 160, 230],
      anzahl: 3,
    },
  },
};

export const SEGMENT_REIHENFOLGE: SegmentKey[] = [
  "beine",
  "panzer",
  "kettenhemd",
  "heilung",
  "schallpistole",
  "laser",
  "kastanie",
  "raketenwerfer",
];

export type Upgrades = Record<SegmentKey, number>; // 1..3

export const STANDARD_UPGRADES: Upgrades = {
  beine: 1,
  panzer: 1,
  kettenhemd: 1,
  heilung: 1,
  schallpistole: 1,
  laser: 1,
  kastanie: 1,
  raketenwerfer: 1,
};

export interface GespeicherterFortschritt {
  spielerName: string;
  aepfel: number;
  upgrades: Upgrades;
  maxLevel: number;
}

export const SPEICHER_SCHLUESSEL = "krieg-der-wuermer-fortschritt";

export function ladeFortschritt(): GespeicherterFortschritt {
  if (typeof window === "undefined") {
    return { spielerName: "Spieler", aepfel: 5, upgrades: { ...STANDARD_UPGRADES }, maxLevel: 1 };
  }
  try {
    const roh = window.localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (!roh) throw new Error("leer");
    const daten = JSON.parse(roh) as GespeicherterFortschritt;
    return {
      spielerName: daten.spielerName || "Spieler",
      aepfel: typeof daten.aepfel === "number" ? daten.aepfel : 5,
      upgrades: { ...STANDARD_UPGRADES, ...(daten.upgrades || {}) },
      maxLevel: Math.min(50, Math.max(1, typeof daten.maxLevel === "number" ? daten.maxLevel : 1)),
    };
  } catch {
    return { spielerName: "Spieler", aepfel: 5, upgrades: { ...STANDARD_UPGRADES }, maxLevel: 1 };
  }
}

export function speichereFortschritt(f: GespeicherterFortschritt) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(f));
}