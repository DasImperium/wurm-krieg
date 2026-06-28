/**
 * TypeScript Typen für das Spiel
 */

import type { SegmentKey, GespeicherterFortschritt } from "@/lib/game/segments";

// Re-export für Bequemlichkeit
export type { SegmentKey, GespeicherterFortschritt };

/**
 * Ein einzelnes Segment eines Wurms
 */
export interface Segment {
  key: SegmentKey;
  stufe: number;
  hp: number;
  maxHp: number;
}

/**
 * Ein Wurm im Spiel
 */
export interface Wurm {
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

/**
 * Fallende Objekte (Blätter und Äpfel)
 */
export interface FallObjekt {
  id: number;
  art: "blatt" | "apfel";
  x: number;
  y: number;
  geschwindigkeit: number;
}

/**
 * Eine Mine im Spiel
 */
export interface Mine {
  id: number;
  seite: "spieler" | "gegner";
  x: number;
  pfad: number;
  schaden: number;
}

/**
 * Ein Waffen-Effekt (Laser, Rakete, Schall)
 */
export interface WaffenEffekt {
  id: number;
  art: "laser" | "rakete" | "schall";
  x1: number;
  x2: number;
  bottom: number;
  bis: number;
  seite: "spieler" | "gegner";
}

/**
 * Ein Kanonen-Blitz Effekt
 */
export interface KanonenBlitz {
  id: number;
  seite: "spieler" | "gegner";
  zielX: number;
  bis: number;
}

/**
 * Props für die Spielfeld-Komponente
 */
export interface SpielfeldProps {
  fortschritt: GespeicherterFortschritt;
  level: number; // 0 = prozedural
  onZurueck: () => void;
  onSieg: (zusatzAepfel: number, zusatzSternanis: number) => void;
  onNiederlage: () => void;
}

/**
 * Ref-Typ für das Spiel-State
 */
export interface SpielRefs {
  wuermer: Wurm[];
  fall: FallObjekt[];
  minen: Mine[];
  effekte: WaffenEffekt[];
  niederlageGemeldet: boolean;
  letzteBlatt: number;
  letzterApfelCheck: number;
  aiSpawn: number;
  matchAepfelLokal: number;
  apfelSpawnsImMatch: number;
  spielerKanone: number;
  gegnerKanone: number;
  kanonenBlitz: KanonenBlitz[];
}