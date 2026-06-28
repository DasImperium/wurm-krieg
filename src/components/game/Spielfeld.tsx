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
import type { Wurm, FallObjekt, Mine, WaffenEffekt, SpielfeldProps, Segment } from "./types";
import {
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
import {
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
import { segmentFarbe } from "./utils";
import { Baum } from "./components/Baum";
import { KopfSymbol } from "./components/KopfSymbol";
import { SchwanzSymbol } from "./components/SchwanzSymbol";
import { SegmentIcon } from "./components/SegmentIcon";
import { SegmentSymbolMitIcon } from "./components/SegmentSymbolMitIcon";
import { WurmAnzeige } from "./components/WurmAnzeige";
import { EndBildschirm } from "./components/EndBildschirm";

export function Spielfeld({ fortschritt, level, onZurueck, onSieg, onNiederlage }: SpielfeldProps) {
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
    apfelSpawnsThroughDamage: 0, // Zähler für durch Treffer gespawnte Äpfel
    spielerKanone: 0,
    gegnerKanone: 0,
    kanonenBlitz: [] as Array<{ id: number; seite: "spieler" | "gegner"; zielX: number; bis: number }>,
  });
  const [kanonenBlitze, setKanonenBlitze] = useState<typeof refs.current.kanonenBlitz>([]);

  // Basis HP Anpassung an Verteidigungsstufe
  useEffect(() => {
    setSpielerBasisHp(BASIS_HP_GRUND + VERTEIDIGUNG_BONUS[verteidigungsStufe]);
  }, [verteidigungsStufe]);

  // Baukosten Berechnung
  const bauKosten = useMemo(() => {
    return bauSegmente.reduce((acc, s) => acc + segmentKosten(s.key, s.stufe), 0);
  }, [bauSegmente]);

  // Segment Hinzufügen
  const handleSegmentHinzufuegen = useCallback((key: SegmentKey) => {
    const stufe = Math.min(5, (fortschritt.upgrades[key] ?? 1));
    const kosten = segmentKosten(key, stufe);
    if (blaetter >= kosten) {
      setBlaetter(blaetter - kosten);
      setBauSegmente([...bauSegmente, baueSegment(key, stufe)]);
    }
  }, [bauSegmente, blaetter, fortschritt.upgrades]);

  // Segment Entfernen
  const handleSegmentEntfernen = useCallback((index: number) => {
    const neueSegmente = [...bauSegmente];
    neueSegmente.splice(index, 1);
    setBauSegmente(neueSegmente);
  }, [bauSegmente]);

  // Wurm Starten
  const starteWurm = useCallback(() => {
    if (bauSegmente.length < 1 || blaetter < bauKosten) return;
    setBlaetter(blaetter - bauKosten);
    const wurm = baueWurm("spieler", bauSegmente, fortschritt.upgrades);
    refs.current.wuermer.push(wurm);
    setWuermerState([...refs.current.wuermer]);
    setBauSegmente([]);
  }, [bauSegmente, bauKosten, blaetter, fortschritt.upgrades]);

  // Upgrade Funktion
  const handleUpgrade = useCallback((typ: "produktion" | "verteidigung") => {
    const kosten = typ === "produktion" ? PRODUKTION_KOSTEN[produktionsStufe] : VERTEIDIGUNG_KOSTEN[verteidigungsStufe];
    if (blaetter >= kosten) {
      setBlaetter(blaetter - kosten);
      if (typ === "produktion") {
        setProduktionsStufe(produktionsStufe + 1);
      } else {
        setVerteidigungsStufe(verteidigungsStufe + 1);
      }
    }
  }, [produktionsStufe, verteidigungsStufe, blaetter]);

  // Sieg/Rückkehr Handling
  const handleSiegRueckkehr = useCallback(() => {
    const bonusAepfel = 5 + matchAepfel;
    const bonusSternanis = matchSternanis;
    onSieg(bonusAepfel, bonusSternanis);
  }, [matchAepfel, matchSternanis, onSieg]);

  // Funktion zum Spawnen eines Apfels durch Schaden am feindlichen Baum
  const trySpawnApfelFromDamage = useCallback(() => {
    const r = refs.current;
    // Nur wenn feindlicher Baum unter 80% Leben hat
    if (gegnerBasisHp < 0.8 * gegnerBasisMax) {
      // 12% Chance und maximal 12 Äpfel
      if (Math.random() < 0.12 && r.apfelSpawnsThroughDamage < 12) {
        r.apfelSpawnsThroughDamage++;
        r.fall.push({
          id: fallIdZaehler++,
          art: "apfel",
          x: 70 + Math.random() * 20, // Spawn näher am feindlichen Baum (70-90%)
          y: 0,
          geschwindigkeit: 0.6,
        });
        // Aktualisiere die Fall-Objekte im State
        setFallObjekte([...r.fall]);
      }
    }
  }, [gegnerBasisHp, gegnerBasisMax, fallObjekte]);

  // Fall-Objekte aufheben
  useEffect(() => {
    const handleFallObjekte = () => {
      const neueFallObjekte: FallObjekt[] = [];
      let neueAepfel = matchAepfel;
      let neueSternanis = matchSternanis;
      
      for (const obj of fallObjekte) {
        const aufgehoben = refs.current.wuermer.some(w => !w.sterbend && Math.abs(kopfX(w) - obj.x) <= 3);
        if (aufgehoben) {
          if (obj.art === "apfel") neueAepfel++;
          else if (obj.art === "blatt") neueSternanis += 10;
        } else {
          neueFallObjekte.push(obj);
        }
      }
      
      if (neueAepfel !== matchAepfel) setMatchAepfel(neueAepfel);
      if (neueSternanis !== matchSternanis) setMatchSternanis(neueSternanis);
      if (neueFallObjekte.length !== fallObjekte.length) setFallObjekte(neueFallObjekte);
    };

    const interval = window.setInterval(handleFallObjekte, 100);
    return () => window.clearInterval(interval);
  }, [fallObjekte, matchAepfel, matchSternanis, wuermerState]);

  // Basis Zerstörung Check
  useEffect(() => {
    if (spielerBasisHp <= 0 && !refs.current.niederlageGemeldet) {
      refs.current.niederlageGemeldet = true;
      setNiederlage(true);
    }
  }, [spielerBasisHp]);

  // Sieg Check
  useEffect(() => {
    if (gegnerBasisHp <= 0 && !sieg) {
      setSieg(true);
    }
  }, [gegnerBasisHp, sieg]);

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
          if (w.seite === "spieler") {
            setGegnerBasisHp((h) => {
              const newHp = Math.max(0, h - dmg);
              // Apfel-Spawn bei Treffer auf feindlichen Baum (wenn unter 80% Leben)
              if (h > newHp) {
                trySpawnApfelFromDamage();
              }
              return newHp;
            });
          } else {
            setSpielerBasisHp((h) => Math.max(0, h - dmg));
          }
        }
        void hatGebissen;

        // Fernkampf
        w.segmente.forEach((s, i) => {
          const def = SEGMENTE[s.key];
          if (!def.fernkampf) return;
          const fk = def.fernkampf;
          const key = String(i);
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
              if (w.seite === "spieler") {
                setGegnerBasisHp((h) => {
                  const newHp = Math.max(0, h - schadenWert);
                  // Apfel-Spawn bei Treffer auf feindlichen Baum (wenn unter 80% Leben)
                  if (h > newHp) {
                    trySpawnApfelFromDamage();
                  }
                  return newHp;
                });
              } else {
                setSpielerBasisHp((h) => Math.max(0, h - schadenWert));
              }
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
  }, [produktionsStufe, verteidigungsStufe, fortschritt.upgrades, sieg, niederlage, level, aiSpawnInterval, effLevel, istProzedural, wlr, trySpawnApfelFromDamage]);

  // Rendering
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-amber-900/40 to-amber-950">
      {/* Pfade */}
      <div className="absolute inset-0 z-0 flex justify-center gap-14 px-4 pb-32 pt-20">
        {Array.from({ length: ANZAHL_PFADE }).map((_, i) => (
          <div key={i} className="h-full w-16 rounded-full bg-amber-900/30" />
        ))}
      </div>

      {/* Bäume */}
      <Baum seite="links" name="Dein Baum" farbe="emerald" />
      <Baum seite="rechts" name="Feindlicher Baum" farbe="rose" />

      {/* Basis HP Anzeige */}
      <div className="absolute left-4 top-4 z-30 rounded-lg bg-emerald-950/80 px-3 py-1 text-sm font-bold text-white shadow">
        Dein Baum: {Math.ceil(spielerBasisHp)} HP
      </div>
      <div className="absolute right-4 top-4 z-30 rounded-lg bg-rose-950/80 px-3 py-1 text-sm font-bold text-white shadow">
        Feindlicher Baum: {Math.ceil(gegnerBasisHp)} HP
      </div>

      {/* Ressourcen Anzeige */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-4 rounded-lg bg-emerald-950/80 px-4 py-2 text-white shadow">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-400" />
          <span>{Math.floor(blaetter)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-red-400" />
          <span>{Math.floor(aiBlaetter)}</span>
        </div>
        <div className="flex items-center gap-2">
          <SternanisIcon className="h-5 w-5 text-yellow-400" />
          <span>{matchSternanis}</span>
        </div>
      </div>

      {/* Wurm Anzeige */}
      {wuermerState.map((wurm) => (
        <WurmAnzeige key={wurm.id} wurm={wurm} />
      ))}

      {/* Effekte */}
      {effekte.map((effekt) => (
        <div
          key={effekt.id}
          className="absolute pointer-events-none"
          style={{
            left: `${effekt.x1}%`,
            bottom: `${effekt.bottom}px`,
            width: `${Math.abs(effekt.x2 - effekt.x1)}%`,
            height: "2px",
            transform: "translateY(-50%)",
          }}
        >
          <div
            className={`h-full w-full ${
              effekt.art === "laser" ? "bg-cyan-400" :
              effekt.art === "rakete" ? "bg-orange-500" : "bg-purple-400"
            }`}
            style={{
              animation: `effektAnim ${250}ms linear forwards`,
              WebkitAnimation: `effektAnim ${250}ms linear forwards`,
            }}
          />
        </div>
      ))}

      {/* Minen */}
      {minen.map((mine) => (
        <div
          key={mine.id}
          className="absolute z-20"
          style={{
            left: `${mine.x}%`,
            bottom: `${20 + mine.pfad * 14}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="h-6 w-6 rounded-full bg-amber-700 ring-2 ring-amber-900 shadow" />
        </div>
      ))}

      {/* Kanonen-Blitze */}
      {kanonenBlitze.map((blitz) => (
        <div
          key={blitz.id}
          className="absolute pointer-events-none"
          style={{
            left: `${blitz.zielX}%`,
            bottom: blitz.seite === "spieler" ? "20px" : "100%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="h-4 w-4 rounded-full bg-yellow-400 shadow" />
        </div>
      ))}

      {/* Fall-Objekte */}
      {fallObjekte.map((obj) => (
        <div
          key={obj.id}
          className="absolute cursor-pointer"
          style={{
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() => {
            // Apfel durch Antippen sammeln
            if (obj.art === "apfel") {
              setMatchAepfel(matchAepfel + 1);
              setFallObjekte(fallObjekte.filter(f => f.id !== obj.id));
            }
          }}
        >
          {obj.art === "blatt" ? (
            <Leaf className="h-6 w-6 text-green-400" />
          ) : (
            <Apple className="h-6 w-6 text-red-400" />
          )}
        </div>
      ))}

      {/* UI Controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* Segment Auswahl */}
        <div className="flex gap-1 rounded-lg bg-emerald-950/80 p-2 shadow">
          {SEGMENT_REIHENFOLGE.map((key) => {
            const kannBauen = (fortschritt.upgrades[key] ?? 0) >= 1;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSegmentHinzufuegen(key)}
                disabled={!kannBauen}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-white transition-colors ${
                  kannBauen 
                    ? "bg-emerald-600 hover:bg-emerald-500" 
                    : "bg-gray-600 cursor-not-allowed"
                }`}
                title={kannBauen ? SEGMENTE[key].name : "Noch nicht freigeschaltet"}
              >
                <SegmentIcon keyName={key} className="h-4 w-4" />
                <span>{SEGMENTE[key].name}</span>
              </button>
            );
          })}
        </div>

        {/* Gebaute Segmente */}
        <div className="flex gap-1 rounded-lg bg-emerald-950/80 p-2 shadow">
          {bauSegmente.map((segment, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSegmentEntfernen(index)}
              className="relative flex items-center justify-center rounded bg-emerald-700 p-1 text-white hover:bg-emerald-600"
            >
              <SegmentSymbolMitIcon keyName={segment.key} />
              {segment.stufe > 1 && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-yellow-300 px-1 text-[8px] font-bold text-emerald-950 ring-1 ring-emerald-900">
                  {segment.stufe}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSegmentEntfernen(index);
                }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white text-[8px] font-bold hover:bg-red-500"
              >
                ×
              </button>
            </button>
          ))}
        </div>

        {/* Upgrade Buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleUpgrade("produktion")}
            disabled={produktionsStufe >= 3 || blaetter < PRODUKTION_KOSTEN[produktionsStufe]}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow hover:bg-blue-500 disabled:bg-blue-800/40"
          >
            Produktion (Stufe {produktionsStufe}/3) - {PRODUKTION_KOSTEN[produktionsStufe]} Blätter
          </button>
          <button
            type="button"
            onClick={() => handleUpgrade("verteidigung")}
            disabled={verteidigungsStufe >= 3 || blaetter < VERTEIDIGUNG_KOSTEN[verteidigungsStufe]}
            className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white shadow hover:bg-purple-500 disabled:bg-purple-800/40"
          >
            Verteidigung (Stufe {verteidigungsStufe}/3) - {VERTEIDIGUNG_KOSTEN[verteidigungsStufe]} Blätter
          </button>
        </div>

        {/* Wurm Start Button */}
        <div className="flex">
          <button
            type="button"
            onClick={starteWurm}
            disabled={bauSegmente.length < 1 || blaetter < bauKosten}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-lg font-extrabold text-white shadow hover:bg-red-500 disabled:bg-emerald-800/40 disabled:text-emerald-100"
          >
            WURM STARTEN ({bauKosten} Blätter)
          </button>
        </div>

        {/* Zurück Button */}
        <button
          type="button"
          onClick={onZurueck}
          className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
      </div>

      {sieg && (
        <EndBildschirm
          titel="Sieg im Krieg der Wuermer!"
          farbe="from-yellow-200 to-yellow-500"
          beschreibung={`Belohnung: +${5 + matchAepfel} Rote Äpfel.`}
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