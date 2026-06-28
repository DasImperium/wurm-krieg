import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Apple, Trees, Heart, Skull, Bird, Play, Zap, ArrowUpCircle } from "lucide-react";
import { SternanisIcon } from "./Sternanis";
import type { GespeicherterFortschritt } from "@/lib/game/segments";

interface Props {
  fortschritt: GespeicherterFortschritt;
  onAenderung: (f: GespeicherterFortschritt) => void;
  onZurueck: () => void;
}

type ItemArt = "rot" | "gruen" | "stern" | "heal" | "gift";
interface FallItem { id: number; art: ItemArt; x: number; y: number; vy: number; }
interface Schmetterling { id: number; x: number; y: number; hp: number; maxHp: number; seite: "links" | "rechts"; fallend: boolean; vy: number; wackelTimer: number; }

const TICK = 50;

function dropTable(level: number) {
  const nichts = level <= 15 ? Math.max(20, 50 - level * 2) : Math.max(5, 20 - Math.floor((level - 15) * 1.5));
  const stern = Math.min(8, 1 + Math.floor(level / 3));
  const gruen = Math.min(25, 5 + Math.floor(level * 0.8));
  const heal = Math.min(15, 6 + Math.floor(level / 4));
  const gift = Math.max(3, 15 - Math.floor(level / 2));
  const rest = 100 - (stern + gruen + heal + gift + nichts);
  const rot = Math.max(10, rest);
  return { rot, gruen, stern, heal, gift, nichts };
}

function wuerfleItem(level: number): ItemArt | null {
  const t = dropTable(level);
  const r = Math.random() * 100;
  let acc = 0;
  if (r < (acc += t.rot)) return "rot";
  if (r < (acc += t.gruen)) return "gruen";
  if (r < (acc += t.stern)) return "stern";
  if (r < (acc += t.heal)) return "heal";
  if (r < (acc += t.gift)) return "gift";
  return null;
}

function berechneForschungsKosten(aktuellesLevel: number): { aepfel: number; sternanis: number } {
  const zielLevel = aktuellesLevel + 1;
  if (zielLevel <= 10) return { aepfel: zielLevel * 15, sternanis: 0 };
  return { aepfel: 150 + (zielLevel - 10) * 25, sternanis: zielLevel - 10 };
}

function berechneUpgradeKosten(stufe: number): { aepfel: number; sternanis: number } {
  if (stufe === 0) return { aepfel: 20, sternanis: 0 };
  if (stufe === 1) return { aepfel: 40, sternanis: 0 };
  return { aepfel: 60 + stufe * 30, sternanis: 1 + Math.floor(stufe / 2) };
}

export function Ueberfall({ fortschritt, onAenderung, onZurueck }: Props) {
  useEffect(() => {
    const u = fortschritt.ueberfall;
    if (u.maxSchmetterlinge === undefined || u.maxSchmetterlinge > 12) {
      onAenderung({
        ...fortschritt,
        ueberfall: { ...u, maxSchmetterlinge: Math.min(12, u.maxSchmetterlinge || 4) }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [imSpiel, setImSpiel] = useState(false);
  const u = fortschritt.ueberfall;
  const maxSchm = Math.min(12, u.maxSchmetterlinge || 4);
  const upgradeKosten = berechneUpgradeKosten(u.upgradeStufe);
  const forschungsKosten = berechneForschungsKosten(u.level);
  
  const kannUpgraden = fortschritt.aepfel >= upgradeKosten.aepfel && fortschritt.sternanis >= upgradeKosten.sternanis && maxSchm < 12;
  const kannForschen = fortschritt.aepfel >= forschungsKosten.aepfel && fortschritt.sternanis >= forschungsKosten.sternanis;

  const upgrade = () => {
    if (!kannUpgraden) return;
    onAenderung({
      ...fortschritt,
      aepfel: fortschritt.aepfel - upgradeKosten.aepfel,
      sternanis: fortschritt.sternanis - upgradeKosten.sternanis,
      ueberfall: { ...u, upgradeStufe: u.upgradeStufe + 1, maxSchmetterlinge: Math.min(12, maxSchm + 2) },
    });
  };

  const forschen = () => {
    if (!kannForschen) return;
    onAenderung({
      ...fortschritt,
      aepfel: fortschritt.aepfel - forschungsKosten.aepfel,
      sternanis: fortschritt.sternanis - forschungsKosten.sternanis,
      ueberfall: { ...u, level: u.level + 1 },
    });
  };

  const sofortNachzucht = () => {
    if (u.schmetterlingeBereit >= maxSchm) return;
    const fehlend = maxSchm - u.schmetterlingeBereit;
    if (u.level < 16) {
      const kosten = fehlend * 3;
      if (fortschritt.aepfel < kosten) return;
      onAenderung({
        ...fortschritt, aepfel: fortschritt.aepfel - kosten,
        ueberfall: { ...u, schmetterlingeBereit: maxSchm, letzteSchluepfung: Date.now() },
      });
    } else {
      const kosten = fehlend;
      if (fortschritt.sternanis < kosten) return;
      onAenderung({
        ...fortschritt, sternanis: fortschritt.sternanis - kosten,
        ueberfall: { ...u, schmetterlingeBereit: maxSchm, letzteSchluepfung: Date.now() },
      });
    }
  };

  if (imSpiel) {
    return <UeberfallMatch fortschritt={fortschritt} onAenderung={onAenderung} onFertig={() => setImSpiel(false)} />;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-fuchsia-900 via-purple-800 to-indigo-900 text-white">
      <div className="mx-auto max-w-3xl p-3 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onZurueck} className="flex items-center gap-1 rounded bg-purple-800 px-3 py-2 text-sm font-bold hover:bg-purple-700">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
            <Bird className="h-6 w-6 text-pink-200" /> Überfall
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded bg-red-950/40 px-2 py-1"><Apple className="h-4 w-4 text-red-500" fill="#DC2626" /><span className="font-bold text-red-300">{fortschritt.aepfel}</span></div>
            <div className="flex items-center gap-1 rounded bg-amber-950/40 px-2 py-1"><SternanisIcon className="h-4 w-4 text-amber-300" /><span className="font-bold text-amber-200">{fortschritt.sternanis}</span></div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-purple-950/60 p-4 ring-1 ring-pink-300/20">
          <p className="text-sm">Bereite Schmetterlinge:</p>
          <p className="mt-1 text-4xl font-extrabold text-pink-200">{u.schmetterlingeBereit} / {maxSchm}</p>
          <p className="mt-1 text-xs text-purple-200">Nachschub: 1 Schmetterling alle 5 Minuten. Überlebende heilen voll, Gefallene müssen nachzüchten.</p>
          <p className="mt-2 text-xs">Aktuelle Forschungs-Stufe: <strong>{u.level}</strong> · Kapazitäts-Upgrades: <strong>{u.upgradeStufe}</strong></p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={sofortNachzucht} disabled={u.schmetterlingeBereit >= maxSchm}
            className="rounded-xl bg-amber-500 p-3 text-xs font-bold text-purple-950 hover:bg-amber-400 disabled:bg-purple-700 disabled:text-purple-300 shadow-md">
            <Zap className="mr-1 inline h-4 w-4" /> Sofort-Nachzucht
            <div className="text-[10px] font-normal opacity-80 mt-1">
              {u.level < 16 ? `${(maxSchm - u.schmetterlingeBereit) * 3} 🍎` : `${maxSchm - u.schmetterlingeBereit} ★`}
            </div>
          </button>

          <button type="button" onClick={upgrade} disabled={!kannUpgraden}
            className="rounded-xl bg-fuchsia-600 p-3 text-xs font-bold hover:bg-fuchsia-500 disabled:bg-purple-700 disabled:text-purple-300 shadow-md">
            {maxSchm >= 12 ? "Max. Kapazität erreicht" : "Kapazität erhöhen"}
            <div className="text-[10px] font-normal opacity-80 mt-1">
              {maxSchm >= 12 ? "Max (12)" : `${upgradeKosten.aepfel} 🍎${upgradeKosten.sternanis ? ` + ${upgradeKosten.sternanis} ★` : ""}`}
            </div>
          </button>

          <button type="button" onClick={forschen} disabled={!kannForschen}
            className="rounded-xl bg-cyan-600 p-3 text-xs font-bold hover:bg-cyan-500 disabled:bg-purple-700 disabled:text-purple-300 shadow-md ring-1 ring-cyan-400/30">
            <ArrowUpCircle className="mr-1 inline h-4 w-4" /> Verbessern (Forschung)
            <div className="text-[10px] font-normal opacity-80 mt-1">
              Stufe {u.level} → {u.level + 1}: {forschungsKosten.aepfel} 🍎{forschungsKosten.sternanis ? ` + ${forschungsKosten.sternanis} ★` : ""}
            </div>
          </button>
        </div>

        <button type="button" onClick={() => setImSpiel(true)} disabled={u.schmetterlingeBereit < 1}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-6 py-4 text-lg font-extrabold text-white shadow-xl hover:bg-pink-400 disabled:bg-purple-700 disabled:text-purple-300">
          <Play className="h-6 w-6" /> STARTEN
        </button>
      </div>
    </div>
  );
}

function UeberfallMatch({ fortschritt, onAenderung, onFertig }: { fortschritt: GespeicherterFortschritt; onAenderung: (f: GespeicherterFortschritt) => void; onFertig: () => void }) {
  const u = fortschritt.ueberfall;
  const level = u.level;
  const maxSchm = Math.min(12, u.maxSchmetterlinge || 4);
  const initial = Math.min(u.schmetterlingeBereit, maxSchm);
  
  const baumMax = 25000 + level * 8000;
  const [baumHp, setBaumHp] = useState(baumMax);
  const [baumWackel, setBaumWackel] = useState(false);
  const [mussMitzaehlenAngriff, setMussMitzaehlenAngriff] = useState(0);

  const [schm, setSchm] = useState<Schmetterling[]>(() =>
    Array.from({ length: initial }, (_, i) => {
      const seite = i % 2 === 0 ? "links" : "rechts";
      return {
        id: i + 1,
        seite,
        x: seite === "links" ? 5 + Math.random() * 20 : 75 + Math.random() * 15,
        y: 40 + Math.random() * 45,
        hp: 3000,
        maxHp: 3000,
        fallend: false,
        vy: 0,
        wackelTimer: 0
      };
    })
  );
  
  const [items, setItems] = useState<FallItem[]>([]);
  const [beute, setBeute] = useState({ rot: 0, gruen: 0, stern: 0 });
  const [status, setStatus] = useState<"laeuft" | "sieg-warte" | "sieg" | "niederlage">("laeuft");
  const itemIdRef = useRef(1);
  const beuteRef = useRef(beute);
  beuteRef.current = beute;

  const beendeMatch = useCallback((sieg: boolean) => {
    const final = beuteRef.current;
    const faktor = sieg ? 1 : 0.05;
    const aepfel = Math.floor((final.rot + final.gruen * 5) * faktor);
    const sternanis = Math.floor(final.stern * faktor);
    
    const ueberlebt = schm.filter((s) => s.hp > 0 && !s.fallend).length;
    const verbraucht = initial - ueberlebt;
    const bereitNeu = Math.max(0, u.schmetterlingeBereit - verbraucht);
    
    onAenderung({
      ...fortschritt,
      aepfel: fortschritt.aepfel + aepfel,
      sternanis: fortschritt.sternanis + sternanis,
      ueberfall: {
        ...u,
        schmetterlingeBereit: bereitNeu,
        letzteSchluepfung: Date.now(),
        siege: u.siege + (sieg ? 1 : 0),
        niederlagen: u.niederlagen + (sieg ? 0 : 1),
      },
    });
    onFertig();
  }, [schm, initial, u, fortschritt, onAenderung, onFertig]);

  useEffect(() => {
    if (status !== "laeuft") return;
    const handle = window.setInterval(() => {
      if (Math.random() < 0.12) {
        const art = wuerfleItem(level);
        if (art) {
          let vy = 0.5;
          if (art === "stern") vy = 1.6;
          else if (art === "gruen") vy = 1.3;
          else if (art === "rot") vy = 1.0;
          else if (art === "heal") vy = 0.8;
          else if (art === "gift") vy = 0.4;

          setItems((prev) => [...prev, { id: itemIdRef.current++, art, x: 5 + Math.random() * 90, y: 16, vy }]);
        }
      }
      
      setItems((prev) => prev.map((it) => ({ ...it, y: it.y + it.vy })).filter((it) => it.y < 105));

      setSchm((prev) => {
        const lebend = prev.filter((s) => !s.fallend);
        if (lebend.length === 0) {
          setStatus("niederlage");
          return prev;
        }
        
        if (Math.random() < 0.2) {
          setBaumHp((h) => Math.max(0, h - (6 + level * 2) * lebend.length));
          setBaumWackel(true);
          setTimeout(() => setBaumWackel(false), 150);
        }

        const linksLebend = lebend.filter(s => s.seite === "links");
        const rechtsLebend = lebend.filter(s => s.seite === "rechts");

        const zielLinks = linksLebend.length > 0 ? linksLebend[Math.floor(Math.random() * linksLebend.length)].id : null;
        const zielRechts = rechtsLebend.length > 0 ? rechtsLebend[Math.floor(Math.random() * rechtsLebend.length)].id : null;

        setMussMitzaehlenAngriff(p => (p + 1) % 40);

        return prev.map((s) => {
          if (s.fallend) {
            return { ...s, y: s.y + s.vy, vy: s.vy + 0.15 };
          }

          let neueHp = s.hp;
          let amWackeln = s.wackelTimer > 0 ? s.wackelTimer - 1 : 0;

          if (s.id === zielLinks || s.id === zielRechts) {
            neueHp -= 1.35; 
            if (Math.random() < 0.2) amWackeln = 4;
          }

          if (mussMitzaehlenAngriff === 0) {
            neueHp -= 12;
            amWackeln = 5;
          }

          if (neueHp <= 0) {
            return { ...s, hp: 0, fallend: true, vy: 0.8, wackelTimer: 0 };
          }

          let neuX = s.x + (Math.random() - 0.5) * 0.4;
          if (s.seite === "links") {
            neuX = Math.max(2, Math.min(38, neuX));
          } else {
            neuX = Math.max(62, Math.min(98, neuX));
          }
          const neuY = Math.max(25, Math.min(90, s.y + (Math.random() - 0.5) * 0.4));

          return { ...s, hp: neueHp, x: neuX, y: neuY, wackelTimer: amWackeln };
        }).filter((s) => s.y < 110);
      });

    }, TICK);
    return () => window.clearInterval(handle);
  }, [status, level, mussMitzaehlenAngriff]);

  useEffect(() => {
    if (status === "laeuft" && baumHp <= 0) {
      setStatus("sieg-warte");
      setItems([]);
      window.setTimeout(() => setStatus("sieg"), 3000);
    }
  }, [baumHp, status]);

  useEffect(() => {
    if (status === "sieg") beendeMatch(true);
    if (status === "niederlage") {
      window.setTimeout(() => beendeMatch(false), 1200);
    }
  }, [status, beendeMatch]);

  const klickItem = (id: number) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    
    if (it.art === "rot") setBeute((b) => ({ ...b, rot: b.rot + 1 }));
    else if (it.art === "gruen") setBeute((b) => ({ ...b, gruen: b.gruen + 1 }));
    else if (it.art === "stern") setBeute((b) => ({ ...b, stern: b.stern + 1 }));
    else if (it.art === "heal") {
      setSchm((prev) => prev.map((s) => s.fallend ? s : ({ ...s, hp: Math.min(s.maxHp, s.hp + 500) })));
    } else if (it.art === "gift") {
      setSchm((prev) => prev.map((s) => s.fallend ? s : ({ ...s, hp: Math.max(0, s.hp - 350) })));
    }
  };

  const baumProz = useMemo(() => (baumHp / baumMax) * 100, [baumHp, baumMax]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-sky-900 via-emerald-800 to-emerald-950 select-none aspect-video max-h-[100vw] mx-auto">
      
      <div className={`absolute bottom-0 left-[40%] w-[20%] h-[85%] bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 z-0 border-x border-black/30 transition-transform duration-75 ${baumWackel ? "translate-x-1" : ""}`} />

      <div className="absolute top-0 left-0 w-full h-[18%] bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 shadow-2xl z-10 border-b border-emerald-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/30 via-transparent to-transparent opacity-60" />
      </div>

      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-black/60 px-4 py-2 text-white text-xs backdrop-blur-sm">
        <button type="button" onClick={() => beendeMatch(false)} className="rounded bg-purple-800 px-3 py-1 font-semibold hover:bg-purple-700 transition">
          Aufgeben
        </button>
        <div className="flex flex-1 max-w-md mx-6 items-center gap-2">
          <span className="font-bold text-emerald-300 whitespace-nowrap">Baum-Struktur:</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-900 border border-emerald-500/30">
            <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-100 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]" style={{ width: `${baumProz}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded bg-red-950/50 px-2 py-1"><Apple className="h-3 w-3 text-red-500" fill="#DC2626" /><span className="font-bold">{beute.rot + beute.gruen * 5}</span></div>
          <div className="flex items-center gap-1 rounded bg-amber-950/50 px-2 py-1"><SternanisIcon className="h-3 w-3 text-amber-300" /><span className="font-bold">{beute.stern}</span></div>
        </div>
      </div>

      {schm.map((s) => (
        <div key={s.id} className="absolute z-20 transition-all duration-100" 
          style={{ 
            left: `${s.x}%`, 
            top: `${s.y}%`, 
            transform: `translate(-50%, -50%) ${s.wackelTimer > 0 ? "skewX(12deg) scale(1.1)" : ""}` 
          }}>
          <div className="relative">
            
            <div className={`absolute -left-3 top-0 h-6 w-4 rounded-full bg-pink-400 opacity-90 ${s.fallend ? "scale-x-[0.1] origin-right rotate-[70deg]" : "animate-pulse"}`} style={{ transform: !s.fallend ? "rotate(-15deg)" : "" }} />
            <div className={`absolute -right-3 top-0 h-6 w-4 rounded-full bg-pink-400 opacity-90 ${s.fallend ? "scale-x-[0.1] origin-left rotate-[-70deg]" : "animate-pulse"}`} style={{ transform: !s.fallend ? "rotate(15deg)" : "" }} />
            
            <div className={`relative z-10 h-3 w-3 rounded-full ${s.fallend ? "bg-stone-700" : "bg-purple-900 shadow-[0_0_6px_#F472B6]"}`} />
            
            {!s.fallend && Math.random() < 0.15 && (
              <div className="absolute -inset-2 rounded-full border border-cyan-400 animate-ping opacity-60 pointer-events-none" />
            )}

            {!s.fallend && (
              <div className="absolute -top-4 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-gray-900 border border-black/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${(s.hp / s.maxHp) * 100}%` }} />
              </div>
            )}
            {!s.fallend && <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px]">😈</span>}
          </div>
        </div>
      ))}

      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => klickItem(it.id)}
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition active:scale-95 duration-700"
          style={{ left: `${it.x}%`, top: `${it.y}%` }}>
          <ItemIcon art={it.art} />
        </button>
      ))}

      {status === "sieg-warp" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 text-3xl font-black text-yellow-300 drop-shadow animate-pulse">
          Der Riesenbaum bricht zusammen...
        </div>
      )}
      {status === "sieg-warte" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 text-3xl font-black text-yellow-300 drop-shadow animate-pulse">
          Der Riesenbaum bricht zusammen...
        </div>
      )}
      {status === "sieg" && <Endkarte titel="SIEG" beschreibung="100% der Beute erfolgreich gesichert." farbe="from-yellow-400 via-amber-500 to-yellow-600" />}
      {status === "niederlage" && <Endkarte titel="RÜCKZUG" beschreibung="Nur 5% der Beute im Chaos gerettet." farbe="from-red-500 via-rose-700 to-red-950" />}
    </div>
  );
}

function ItemIcon({ art }: { art: ItemArt }) {
  if (art === "rot") return <Apple className="h-7 w-7 text-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="#DC2626" />;
  if (art === "gruen") return <Apple className="h-7 w-7 text-green-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="#16A34A" />;
  if (art === "stern") return <SternanisIcon className="h-7 w-7 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />;
  if (art === "heal") return (
    <div className="relative animate-bounce">
      <Apple className="h-7 w-7 text-yellow-500 drop-shadow" fill="#EAB308" />
      <Heart className="absolute inset-0 m-auto h-3 w-3 text-white" fill="white" />
    </div>
  );
  return (
    <div className="relative opacity-90">
      <Apple className="h-7 w-7 text-purple-800 drop-shadow" fill="#6B21A8" />
      <Skull className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" />
    </div>
  );
}

function Endkarte({ titel, beschreibung, farbe }: { titel: string; beschreibung: string; farbe: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className={`rounded-2xl bg-gradient-to-br ${farbe} p-6 max-w-sm text-center text-white shadow-2xl border border-white/20`}>
        <Trees className="mx-auto mb-2 h-12 w-12 text-white/90 drop-shadow" />
        <h2 className="text-3xl font-black tracking-wide">{titel}</h2>
        <p className="mt-2 text-sm text-white/90 font-medium px-4">{beschreibung}</p>
      </div>
    </div>
  );
}