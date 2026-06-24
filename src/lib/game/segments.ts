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
    kosten: 20,
    hp: [50, 70, 90],
    speedBonus: [4, 6, 8],
  },
  panzer: {
    key: "panzer",
    name: "Panzer",
    beschreibung: "Massive Lebenspunkte, verlangsamt aber.",
    kosten: 45,
    hp: [250, 400, 600],
    speedMalus: [2, 1.5, 1],
  },
  kettenhemd: {
    key: "kettenhemd",
    name: "Kettenhemd",
    beschreibung: "Reduziert eingehenden Schaden (max. 50%).",
    kosten: 40,
    hp: [60, 80, 110],
    schadensReduktion: [5, 8, 12],
  },
  heilung: {
    key: "heilung",
    name: "Heilung",
    beschreibung: "Heilt den gesamten Wurm alle 5 Sekunden.",
    kosten: 50,
    hp: [60, 80, 100],
    heilung: [20, 40, 70],
  },
  schallpistole: {
    key: "schallpistole",
    name: "Schallpistole",
    beschreibung: "Erhöht den Bissschaden des Kopfes.",
    kosten: 60,
    hp: [55, 75, 95],
    nahkampfBonus: [12, 22, 35],
  },
  laser: {
    key: "laser",
    name: "Laser",
    beschreibung: "Fernkampf, Reichweite 15%.",
    kosten: 80,
    hp: [55, 75, 95],
    fernkampf: { reichweite: 15, intervallMs: 1500, schaden: [30, 45, 65] },
  },
  kastanie: {
    key: "kastanie",
    name: "Kastanie",
    beschreibung: "Legt Minen mit Flächenschaden (3 Stk., alle 20s).",
    kosten: 75,
    hp: [60, 80, 100],
    fernkampf: {
      reichweite: 8,
      intervallMs: 20000,
      schaden: [45, 70, 100],
      munition: 3,
    },
  },
  raketenwerfer: {
    key: "raketenwerfer",
    name: "Raketenwerfer",
    beschreibung: "Reichweite 40%, 3 Raketen alle 15s.",
    kosten: 150,
    hp: [70, 90, 120],
    fernkampf: {
      reichweite: 40,
      intervallMs: 15000,
      schaden: [80, 120, 180],
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
}

export const SPEICHER_SCHLUESSEL = "krieg-der-wuermer-fortschritt";

export function ladeFortschritt(): GespeicherterFortschritt {
  if (typeof window === "undefined") {
    return { spielerName: "Spieler", aepfel: 5, upgrades: { ...STANDARD_UPGRADES } };
  }
  try {
    const roh = window.localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (!roh) throw new Error("leer");
    const daten = JSON.parse(roh) as GespeicherterFortschritt;
    return {
      spielerName: daten.spielerName || "Spieler",
      aepfel: typeof daten.aepfel === "number" ? daten.aepfel : 5,
      upgrades: { ...STANDARD_UPGRADES, ...(daten.upgrades || {}) },
    };
  } catch {
    return { spielerName: "Spieler", aepfel: 5, upgrades: { ...STANDARD_UPGRADES } };
  }
}

export function speichereFortschritt(f: GespeicherterFortschritt) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(f));
}