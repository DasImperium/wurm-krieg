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
  hp: number[]; // hp per Stufe (index 0 = Stufe 1) – Länge 5
  speedBonus?: number[];
  speedMalus?: number[];
  schadensReduktion?: number[]; // %
  heilung?: number[];
  nahkampfBonus?: number[];
  fernkampf?: { reichweite: number; intervallMs: number; schaden: number[]; anzahl?: number; munition?: number };
}

// Forschungs-Upgrades:
//  Stufe 2 + 3: nur Rote Äpfel
//  Stufe 4 + 5: Mix aus Roten Äpfeln UND Sternanis
export const UPGRADE_KOSTEN: Record<number, { aepfel: number; sternanis: number }> = {
  2: { aepfel: 2, sternanis: 0 },
  3: { aepfel: 4, sternanis: 0 },
  4: { aepfel: 8, sternanis: 2 },
  5: { aepfel: 14, sternanis: 5 },
};
export const MAX_STUFE = 5;

// Helper: erweitert eine 3er-Tabelle linear auf 5 Stufen.
function ext(arr3: number[]): number[] {
  const [a, b, c] = arr3;
  const d = Math.round(c + (c - b) * 0.6);
  const e = Math.round(c + (c - b) * 1.2);
  return [a, b, c, d, e];
}

export const SEGMENTE: Record<SegmentKey, SegmentDef> = {
  beine: {
    key: "beine",
    name: "Beine",
    beschreibung: "Erhöht die Geschwindigkeit des Wurms.",
    kosten: 25,
    hp: ext([40, 55, 70]),
    speedBonus: ext([3, 5, 7]),
  },
  panzer: {
    key: "panzer",
    name: "Panzer",
    beschreibung: "Massive Lebenspunkte, verlangsamt aber.",
    kosten: 55,
    hp: ext([300, 500, 800]),
    speedMalus: [2, 1.5, 1, 0.7, 0.4],
  },
  kettenhemd: {
    key: "kettenhemd",
    name: "Kettenhemd",
    beschreibung: "Reduziert eingehenden Schaden (max. 50%).",
    kosten: 50,
    hp: ext([70, 100, 140]),
    schadensReduktion: [8, 14, 22, 32, 42],
  },
  heilung: {
    key: "heilung",
    name: "Heilung",
    beschreibung: "Heilt den gesamten Wurm alle 5 Sekunden.",
    kosten: 65,
    hp: ext([70, 90, 120]),
    heilung: ext([25, 50, 90]),
  },
  schallpistole: {
    key: "schallpistole",
    name: "Schallpistole",
    beschreibung: "Erhöht den Bissschaden des Kopfes.",
    kosten: 75,
    hp: ext([60, 80, 100]),
    nahkampfBonus: ext([20, 35, 55]),
  },
  laser: {
    key: "laser",
    name: "Laser",
    beschreibung: "Fernkampf, Reichweite 15%.",
    kosten: 95,
    hp: ext([60, 80, 100]),
    fernkampf: { reichweite: 18, intervallMs: 1400, schaden: ext([35, 55, 80]) },
  },
  kastanie: {
    key: "kastanie",
    name: "Kastanie",
    beschreibung: "Legt Minen mit Flächenschaden (3 Stk., alle 20s).",
    kosten: 90,
    hp: ext([70, 90, 120]),
    fernkampf: {
      reichweite: 8,
      intervallMs: 20000,
      schaden: ext([60, 95, 140]),
      munition: 3,
    },
  },
  raketenwerfer: {
    key: "raketenwerfer",
    name: "Raketenwerfer",
    beschreibung: "Reichweite 40%, 3 Raketen alle 15s.",
    kosten: 175,
    hp: ext([80, 100, 130]),
    fernkampf: {
      reichweite: 40,
      intervallMs: 15000,
      schaden: ext([110, 160, 230]),
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

export type Upgrades = Record<SegmentKey, number>; // 1..5

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

export interface UeberfallFortschritt {
  schmetterlingeBereit: number;
  maxSchmetterlinge: number;
  letzteSchluepfung: number; // epoch ms
  level: number;
  upgradeStufe: number; // gekaufte Minispiel-Upgrades
  siege: number;
  niederlagen: number;
}

export const STANDARD_UEBERFALL: UeberfallFortschritt = {
  schmetterlingeBereit: 4,
  maxSchmetterlinge: 4,
  letzteSchluepfung: 0,
  level: 1,
  upgradeStufe: 0,
  siege: 0,
  niederlagen: 0,
};

export interface GespeicherterFortschritt {
  spielerName: string;
  aepfel: number;
  sternanis: number;
  upgrades: Upgrades;
  maxLevel: number;
  siege: number;
  niederlagen: number;
  ueberfall: UeberfallFortschritt;
}

export const SPEICHER_SCHLUESSEL = "krieg-der-wuermer-fortschritt";

export function standardFortschritt(): GespeicherterFortschritt {
  return {
    spielerName: "Spieler",
    aepfel: 5,
    sternanis: 0,
    upgrades: { ...STANDARD_UPGRADES },
    maxLevel: 1,
    siege: 0,
    niederlagen: 0,
    ueberfall: { ...STANDARD_UEBERFALL },
  };
}

export function ladeFortschritt(): GespeicherterFortschritt {
  if (typeof window === "undefined") return standardFortschritt();
  try {
    const roh = window.localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (!roh) throw new Error("leer");
    const daten = JSON.parse(roh) as Partial<GespeicherterFortschritt>;
    const std = standardFortschritt();
    return {
      spielerName: daten.spielerName || "Spieler",
      aepfel: typeof daten.aepfel === "number" ? daten.aepfel : 5,
      sternanis: typeof daten.sternanis === "number" ? daten.sternanis : 0,
      upgrades: { ...STANDARD_UPGRADES, ...(daten.upgrades || {}) },
      maxLevel: Math.min(100, Math.max(1, typeof daten.maxLevel === "number" ? daten.maxLevel : 1)),
      siege: typeof daten.siege === "number" ? daten.siege : 0,
      niederlagen: typeof daten.niederlagen === "number" ? daten.niederlagen : 0,
      ueberfall: { ...std.ueberfall, ...(daten.ueberfall || {}) },
    };
  } catch {
    return standardFortschritt();
  }
}

export function speichereFortschritt(f: GespeicherterFortschritt) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(f));
}