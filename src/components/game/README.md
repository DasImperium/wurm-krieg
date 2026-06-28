# Spielkomponenten - Refactored

Diese Verzeichnisstruktur enthält die refaktorisierte Version der Spielfeld-Komponente.

## Aufteilung

Die ursprüngliche große `Spielfeld.tsx` Datei (1037 Zeilen) wurde in kleinere, besser wartbare Dateien aufgeteilt:

### Struktur

```
src/components/game/
├── types.ts              # TypeScript Interfaces und Typen
├── constants.ts          # Spiel-Konstanten und Balance-Werte
├── wurmUtils.ts          # Wurm-spezifische Utility-Funktionen
├── utils.ts              # Allgemeine Utility-Funktionen
├── Spielfeld.tsx         # Hauptspielkomponente (vereinfacht)
├── Sternanis.tsx         # Sternanis-Icon (bestehend)
├── index.ts              # Export-Index
└── components/
    ├── Baum.tsx
    ├── EndBildschirm.tsx
    ├── KopfSymbol.tsx
    ├── SchwanzSymbol.tsx
    ├── SegmentIcon.tsx
    ├── SegmentSymbolMitIcon.tsx
    └── WurmAnzeige.tsx
```

### Änderungen

1. **Typen extrahiert** (`types.ts`):
   - `Segment`, `Wurm`, `FallObjekt`, `Mine`, `WaffenEffekt`, `KanonenBlitz`
   - `SpielfeldProps`, `SpielRefs`

2. **Konstanten extrahiert** (`constants.ts`):
   - Produktions- und Verteidigungs-Kosten
   - Kanonen-Einstellungen
   - Basis-Einstellungen
   - Spiel-Parameter (Tick-MS, Basis-X-Positionen, etc.)

3. **Wurm-Utilities** (`wurmUtils.ts`):
   - ID-Zähler Verwaltung
   - Wurm-Erstellung (`baueSegment`, `baueWurm`)
   - Stat-Berechnungen (`wurmGeschwindigkeit`, `kettenhemdReduktion`, `nahkampfSchaden`)
   - Schadensberechnung (`schadenAnWurm`)
   - Gegner-Generierung (`zufallsWurmGegner`)

4. **UI-Komponenten extrahiert**:
   - Alle visuellen Komponenten in separate Dateien
   - Bessere Wiederverwendbarkeit
   - Klare Trennung von Logik und Darstellung

### Vorteile

✅ **Bessere Lesbarkeit**: Jede Datei hat einen klaren Verantwortungsbereich
✅ **Einfachere Wartung**: Änderungen an Segment-Stats nur in `segments.ts`
✅ **Bessere Performance**: Code-Splitting ermöglicht selektives Laden
✅ **Wiederverwendbarkeit**: Komponenten können in anderen Teilen der Anwendung verwendet werden
✅ **Testbarkeit**: Utility-Funktionen können einfach getestet werden