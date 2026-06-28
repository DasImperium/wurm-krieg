/**
 * Game Components Index
 */

// 1. REINE Typen exportieren (Falls diese in types.ts als "interface" oder "type" definiert sind)
export type {
  SpielfeldProps,
  SpielRefs,
} from "./types";

// 2. Konstanten exportieren
export {
  PRODUKTION_KOSTEN,
  VERTEIDIGUNG_KOSTEN,
  PRODUKTION_RATE,
  VERTEIDIGUNG_BONUS,
  KANONEN_SCHADEN,
  KANONEN_REICHWEITE,
  KANONEN_INTERVALL_MS,
  BASIS_HP_GRUND,
  TICK_MS,
  SPIELER_BASIS_X,
  GEGNER_BASIS_X,
  ANZAHL_PFADE,
} from "./constants";

// 3. Hilfsfunktionen exportieren
export {
  getNextIdZaehler,
  getNextWurmId,
  getNextFallId,
  getNextMineId,
  getNextEffektId,
  halbeWurmLaenge,
  kopfX,
  segmentKosten,
  baueSegment,
  baueWurm,
  wurmGeschwindigkeit,
  kettenhemdReduktion,
  nahkampfSchaden,
  schadenAnWurm,
  zufallsWurmGegner,
  wurmIdZaehler,
  fallIdZaehler,
  mineIdZaehler,
  effektIdZaehler,
} from "./wurmUtils";

// 4. Utilities exportieren
export { segmentFarbe } from "./utils";

// 5. Haupt-Ansichten exportieren
export { default as Hauptmenue } from "./Hauptmenue";
export { default as Spielfeld } from "./Spielfeld";
export { default as Ueberfall } from "./Ueberfall";
export { default as AdminPanel } from "./AdminPanel";
