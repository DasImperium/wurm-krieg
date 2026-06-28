/**
 * Game Balance Konstanten
 * Diese Datei enthält alle konfigurierbaren Parameter für das Spiel.
 */

// ============================================================================
// Produktions- und Verteidigungs-Upgrades
// ============================================================================

/** Kosten für Produktions-Upgrades (Stufe 1-3) */
export const PRODUKTION_KOSTEN = [100, 350, 800];

/** Kosten für Verteidigungs-Upgrades (Stufe 1-3) */
export const VERTEIDIGUNG_KOSTEN = [150, 400, 800];

/** Produktionsrate pro Stufe (Blätter pro Sekunde) */
export const PRODUKTION_RATE = [5, 10, 20, 40];

/** Verteidigungsbonus für Basis-HP pro Stufe */
export const VERTEIDIGUNG_BONUS = [0, 200, 500, 1000];

// ============================================================================
// Kanonen-Einstellungen
// ============================================================================

/** Schaden der Kanonen pro Stufe */
export const KANONEN_SCHADEN = [0, 25, 55, 100];

/** Reichweite der Kanonen pro Stufe (in %) */
export const KANONEN_REICHWEITE = [0, 12, 22, 30];

/** Feuerintervall der Kanonen (ms) */
export const KANONEN_INTERVALL_MS = 2000;

// ============================================================================
// Basis-Einstellungen
// ============================================================================

/** Basis-HP Grundwert */
export const BASIS_HP_GRUND = 1800;

/** Tick-Intervall für den Game Loop (ms) */
export const TICK_MS = 50;

/** X-Position der Spieler-Basis (in %) */
export const SPIELER_BASIS_X = 3;

/** X-Position der Gegner-Basis (in %) */
export const GEGNER_BASIS_X = 97;

/** Anzahl der Pfade auf dem Spielfeld */
export const ANZAHL_PFADE = 5;