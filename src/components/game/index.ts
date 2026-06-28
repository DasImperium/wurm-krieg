/**
 * Game Components Index
 * Exportiert alle Komponenten und Utilities für das Spiel
 */

export type {
  Segment,
  Wurm,
  FallObjekt,
  Mine,
  WaffenEffekt,
  KanonenBlitz,
  SpielfeldProps,
  SpielRefs,
} from "./types";

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

export {
  resetIdZaehler,
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

export { segmentFarbe } from "./utils";

export { Spielfeld } from "./Spielfeld";

export { Baum } from "./components/Baum";
export { KopfSymbol } from "./components/KopfSymbol";
export { SchwanzSymbol } from "./components/SchwanzSymbol";
export { SegmentIcon } from "./components/SegmentIcon";
export { SegmentSymbolMitIcon } from "./components/SegmentSymbolMitIcon";
export { WurmAnzeige } from "./components/WurmAnzeige";
export { EndBildschirm } from "./components/EndBildschirm";