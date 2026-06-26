import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Apple, Trees, Heart, Skull, Bird, Play, Zap } from "lucide-react";
import { SternanisIcon } from "./Sternanis";
import type { GespeicherterFortschritt } from "@/lib/game/segments";

interface Props {
  fortschritt: GespeicherterFortschritt;
  onAenderung: (f: GespeicherterFortschritt) => void;
  onZurueck: () => void;
}

type ItemArt = "rot" | "gruen" | "stern" | "heal" | "gift";
interface FallItem { id: number; art: ItemArt; x: number; y: number; vy: number; }
interface Schmetterling { id: number; x: number; y: number; hp: number; fallend: boolean; vy: number; }
interface Schuss { id: number; x: number; y: number; vy: number; seite: "spieler" | "baum"; }

const SCHLUEPF_MS = 5 * 60 * 1000;
const TICK = 50;

function dropTable(level: number) {
  // skaliert mit level; Summe = 100
  const stern = Math.min(6, 1 + Math.floor(level / 4));
  const gruen = Math.min(25, 5 + level);
  const heal = Math.min(15, 5 + Math.floor(level / 3));
  let gift = Math.max(2, 20 - Math.floor(level / 2));
  let nichts = Math.max(2, 34 - Math.floor(level * 1.2));
  // Ab Level 20 sind nichts/gift die niedrigsten
  if (level >= 20) {
    gift = Math.min(gift, 5);
    nichts = Math.min(nichts, 5);
  }
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

export function Ueberfall({ fortschritt, onAenderung, onZurueck }: Props) {
  // Schlüpf-Mechanik: bei Mount fehlende Schmetterlinge nachfüllen, je 5 Min
  useEffect(() => {
    const u = fortschritt.ueberfall;
    if (u.schmetterlingeBereit >= u.maxSchmetterlinge) return;
    const jetzt = Date.now();
    const seitDem = jetzt - (u.letzteSchluepfung || jetzt);
    const neue = Math.floor(seitDem / SCHLUEPF_MS);
    if (neue > 0) {
      const bereit = Math.min(u.maxSchmetterlinge, u.schmetterlingeBereit + neue);
      onAenderung({ ...fortschritt, ueberfall: { ...u, schmetterlingeBereit: bereit, letzteSchluepfung: jetzt } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [imSpiel, setImSpiel] = useState(false);

  const startMatch = () => {
    if (fortschritt.ueberfall.schmetterlingeBereit < 1) return;
    setImSpiel(true);
  };

  if (imSpiel) {
    return (
      <UeberfallMatch
        fortschritt={fortschritt}
        onAenderung={onAenderung}
        onFertig={() => setImSpiel(false)}
      />
    );
  }

  const u = fortschritt.ueberfall;
  const upgradeKosten = berechneUpgradeKosten(u.upgradeStufe);
  const kannUpgraden = fortschritt.aepfel >= upgradeKosten.aepfel && fortschritt.sternanis >= upgradeKosten.sternanis;

  const upgrade = () => {
    if (!kannUpgraden) return;
    onAenderung({
      ...fortschritt,
      aepfel: fortschritt.aepfel - upgradeKosten.aepfel,
      sternanis: fortschritt.sternanis - upgradeKosten.sternanis,
      ueberfall: { ...u, upgradeStufe: u.upgradeStufe + 1, maxSchmetterlinge: u.maxSchmetterlinge + 2 },
    });
  };

  const sofortNachzucht = () => {
    if (u.schmetterlingeBereit >= u.maxSchmetterlinge) return;
    const fehlend = u.maxSchmetterlinge - u.schmetterlingeBereit;
    if (u.level < 16) {
      const kosten = fehlend * 3;
      if (fortschritt.aepfel < kosten) return;
      onAenderung({
        ...fortschritt, aepfel: fortschritt.aepfel - kosten,
        ueberfall: { ...u, schmetterlingeBereit: u.maxSchmetterlinge, letzteSchluepfung: Date.now() },
      });
    } else {
      const kosten = fehlend;
      if (fortschritt.sternanis < kosten) return;
      onAenderung({
        ...fortschritt, sternanis: fortschritt.sternanis - kosten,
        ueberfall: { ...u, schmetterlingeBereit: u.maxSchmetterlinge, letzteSchluepfung: Date.now() },
      });
    }
  };

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
          <p className="mt-1 text-4xl font-extrabold text-pink-200">{u.schmetterlingeBereit} / {u.maxSchmetterlinge}</p>
          <p className="mt-1 text-xs text-purple-200">Nachschub: 1 Schmetterling alle 5 Minuten. Überlebende heilen voll, Gefallene müssen nachzüchten.</p>
          <p className="mt-2 text-xs">Aktuelle Stufe: <strong>{u.level}</strong> · Upgrades: <strong>{u.upgradeStufe}</strong></p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={sofortNachzucht}
            disabled={u.schmetterlingeBereit >= u.maxSchmetterlinge}
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-purple-950 hover:bg-amber-400 disabled:bg-purple-700 disabled:text-purple-300">
            <Zap className="mr-1 inline h-4 w-4" /> Sofort-Nachzucht
            <div className="text-[10px] font-normal opacity-80">
              {u.level < 16
                ? `${(u.maxSchmetterlinge - u.schmetterlingeBereit) * 3} 🍎`
                : `${u.maxSchmetterlinge - u.schmetterlingeBereit} ★`}
            </div>
          </button>
          <button type="button" onClick={upgrade} disabled={!kannUpgraden}
            className="rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-bold hover:bg-fuchsia-500 disabled:bg-purple-700 disabled:text-purple-300">
            Max-Schmetterlinge erhöhen
            <div className="text-[10px] font-normal opacity-80">
              {upgradeKosten.aepfel} 🍎{upgradeKosten.sternanis ? ` + ${upgradeKosten.sternanis} ★` : ""}
            </div>
          </button>
        </div>

        <button type="button" onClick={startMatch}
          disabled={u.schmetterlingeBereit < 1}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-6 py-4 text-lg font-extrabold text-white shadow-xl hover:bg-pink-400 disabled:bg-purple-700 disabled:text-purple-300">
          <Play className="h-6 w-6" /> STARTEN
        </button>
      </div>
    </div>
  );
}

function berechneUpgradeKosten(stufe: number): { aepfel: number; sternanis: number } {
  if (stufe === 0) return { aepfel: 20, sternanis: 0 };
  if (stufe === 1) return { aepfel: 40, sternanis: 0 };
  return { aepfel: 60 + stufe * 30, sternanis: 1 + Math.floor(stufe / 2) };
}

function UeberfallMatch({
  fortschritt, onAenderung, onFertig,
}: { fortschritt: GespeicherterFortschritt; onAenderung: (f: GespeicherterFortschritt) => void; onFertig: () => void }) {
  const u = fortschritt.ueberfall;
  const level = u.level;
  const initial = Math.min(u.schmetterlingeBereit, 4 + Math.min(8, Math.floor(level / 2)));
  const baumMax = 1000 + level * 250;
  const baumKanonen = Math.min(4, 2 + Math.floor(level / 6));

  const [baumHp, setBaumHp] = useState(baumMax);
  const [schm, setSchm] = useState<Schmetterling[]>(() =>
    Array.from({ length: initial }, (_, i) => ({
      id: i + 1,
      x: 10 + (i * 80) / Math.max(1, initial - 1),
      y: 70 + Math.random() * 10,
      hp: 100,
      fallend: false,
      vy: 0,
    })),
  );
  const [items, setItems] = useState<FallItem[]>([]);
  const [schuesse, setSchuesse] = useState<Schuss[]>([]);
  const [beute, setBeute] = useState({ rot: 0, gruen: 0, stern: 0 });
  const [status, setStatus] = useState<"laeuft" | "sieg-warte" | "sieg" | "niederlage">("laeuft");
  const itemIdRef = useRef(1);
  const schussIdRef = useRef(1);
  const beuteRef = useRef(beute);
  beuteRef.current = beute;

  const beendeMatch = useCallback((sieg: boolean) => {
    const final = beuteRef.current;
    const faktor = sieg ? 1 : 0.05;
    const aepfel = Math.floor((final.rot + final.gruen * 5) * faktor);
    const sternanis = Math.floor(final.stern * faktor);
    // Schmetterlinge: Überlebende heilen voll, Gefallene verbraucht
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
        level: sieg ? u.level + 1 : u.level,
        siege: u.siege + (sieg ? 1 : 0),
        niederlagen: u.niederlagen + (sieg ? 0 : 1),
      },
    });
    onFertig();
  }, [schm, initial, u, fortschritt, onAenderung, onFertig]);

  // game loop
  useEffect(() => {
    if (status !== "laeuft") return;
    const handle = window.setInterval(() => {
      // Items spawnen
      if (Math.random() < 0.15) {
        const art = wuerfleItem(level);
        if (art) {
          setItems((prev) => [...prev, { id: itemIdRef.current++, art, x: 35 + Math.random() * 30, y: 25, vy: 0.6 + Math.random() * 0.4 }]);
        }
      }
      // Items bewegen
      setItems((prev) => prev.map((it) => ({ ...it, y: it.y + it.vy })).filter((it) => it.y < 105));

      // Baum-Kanonen schießen
      if (Math.random() < 0.08 * baumKanonen) {
        setSchuesse((prev) => [...prev, {
          id: schussIdRef.current++, x: 40 + Math.random() * 20, y: 12, vy: 1.5, seite: "baum",
        }]);
      }

      // Schüsse bewegen + Trefferprüfung
      setSchuesse((prev) => prev.map((s) => ({ ...s, y: s.y + s.vy })).filter((s) => s.y > -5 && s.y < 105));

      // Schmetterlinge: schießen + Treffer durch Baum
      setSchm((prev) => {
        const lebend = prev.filter((s) => !s.fallend);
        if (lebend.length === 0) {
          setStatus("niederlage");
          return prev;
        }
        // Schmetterlinge schießen auf Baum
        if (Math.random() < 0.3) {
          const s = lebend[Math.floor(Math.random() * lebend.length)];
          setSchuesse((sc) => [...sc, { id: schussIdRef.current++, x: s.x, y: s.y, vy: -2.0, seite: "spieler" }]);
          setBaumHp((h) => Math.max(0, h - 8));
        }
        return prev.map((s) => {
          if (s.fallend) {
            return { ...s, y: s.y + s.vy, vy: s.vy + 0.05 };
          }
          // Baum-Schuss-Treffer
          let neueHp = s.hp;
          setSchuesse((sc) => {
            const treffer = sc.find((sh) => sh.seite === "baum" && Math.abs(sh.x - s.x) < 4 && Math.abs(sh.y - s.y) < 4);
            if (treffer) {
              neueHp -= 35;
              return sc.filter((sh) => sh.id !== treffer.id);
            }
            return sc;
          });
          if (neueHp <= 0) {
            return { ...s, hp: 0, fallend: true, vy: 0.3 };
          }
          // sanftes Wackeln
          return { ...s, hp: neueHp, x: s.x + (Math.random() - 0.5) * 0.4, y: s.y + (Math.random() - 0.5) * 0.4 };
        }).filter((s) => s.y < 105);
      });
    }, TICK);
    return () => window.clearInterval(handle);
  }, [status, level, baumKanonen]);

  // Baum-HP überwachen
  useEffect(() => {
    if (status === "laeuft" && baumHp <= 0) {
      setStatus("sieg-warte");
      setItems([]);
      window.setTimeout(() => setStatus("sieg"), 5000);
    }
  }, [baumHp, status]);

  // End-Übergabe
  useEffect(() => {
    if (status === "sieg") beendeMatch(true);
    if (status === "niederlage") {
      window.setTimeout(() => beendeMatch(false), 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const klickItem = (id: number) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (it.art === "rot") setBeute((b) => ({ ...b, rot: b.rot + 1 }));
    else if (it.art === "gruen") setBeute((b) => ({ ...b, gruen: b.gruen + 1 }));
    else if (it.art === "stern") setBeute((b) => ({ ...b, stern: b.stern + 1 }));
    else if (it.art === "heal") {
      setSchm((prev) => prev.map((s) => s.fallend ? s : ({ ...s, hp: Math.min(100, s.hp + 3) })));
    } else if (it.art === "gift") {
      setSchm((prev) => prev.map((s) => s.fallend ? s : ({ ...s, hp: Math.max(0, s.hp - 5) })));
    }
  };

  const baumProz = useMemo(() => (baumHp / baumMax) * 100, [baumHp, baumMax]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-sky-300 via-emerald-200 to-emerald-500">
      {/* HUD oben */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-emerald-950/90 px-3 py-2 text-white">
        <button type="button" onClick={() => beendeMatch(false)} className="rounded bg-purple-800 px-2 py-1 text-xs hover:bg-purple-700">
          <ArrowLeft className="inline h-3 w-3" /> Aufgeben
        </button>
        <div className="rounded bg-pink-700/60 px-2 py-1 text-xs font-bold">Stufe {level}</div>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs">Baum:</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-emerald-950">
            <div className="h-full bg-rose-500 transition-all" style={{ width: `${baumProz}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 rounded bg-red-950/40 px-2 py-1 text-xs"><Apple className="h-3 w-3 text-red-500" fill="#DC2626" /><span>{beute.rot}+{beute.gruen}×5</span></div>
        <div className="flex items-center gap-1 rounded bg-amber-950/40 px-2 py-1 text-xs"><SternanisIcon className="h-3 w-3 text-amber-300" /><span>{beute.stern}</span></div>
      </div>

      {/* Riesen-Baum */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-0">
        <div className="relative h-[420px] w-[260px]">
          <div className="absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full bg-emerald-700 shadow-2xl ring-8 ring-emerald-900/40" />
          <div className="absolute left-1/4 top-6 h-24 w-24 rounded-full bg-emerald-600 opacity-80" />
          <div className="absolute right-1/4 top-12 h-20 w-20 rounded-full bg-emerald-500 opacity-70" />
          <div className="absolute left-1/2 top-40 h-64 w-16 -translate-x-1/2 rounded bg-gradient-to-b from-amber-800 to-amber-950" />
          {/* Kanonen */}
          {Array.from({ length: baumKanonen }).map((_, i) => (
            <div key={i} className="absolute h-3 w-8 -translate-x-1/2 rounded bg-slate-900 shadow"
              style={{ left: `${20 + (i * 60) / Math.max(1, baumKanonen - 1)}%`, top: `${60 + (i % 2) * 20}px` }} />
          ))}
        </div>
      </div>

      {/* Schmetterlinge */}
      {schm.map((s) => (
        <div key={s.id} className="absolute z-10 transition-all" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%, -50%)" }}>
          <div className={`relative ${s.fallend ? "opacity-70" : ""}`}>
            <div className="absolute -left-3 top-0 h-6 w-4 rounded-full bg-pink-400 opacity-90" style={{ transform: s.fallend ? "scaleX(0.3)" : "rotate(-15deg)" }} />
            <div className="absolute -right-3 top-0 h-6 w-4 rounded-full bg-pink-400 opacity-90" style={{ transform: s.fallend ? "scaleX(0.3)" : "rotate(15deg)" }} />
            <div className="relative z-10 h-3 w-3 rounded-full bg-purple-900" />
            {!s.fallend && <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[8px] font-extrabold text-yellow-300">😈</span>}
          </div>
        </div>
      ))}

      {/* Schüsse */}
      {schuesse.map((s) => (
        <div key={s.id} className={`absolute z-20 h-2 w-2 rounded-full ${s.seite === "spieler" ? "bg-cyan-300" : "bg-rose-400"} shadow-[0_0_8px_currentColor]`}
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)" }} />
      ))}

      {/* Fall-Items */}
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => klickItem(it.id)}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-125"
          style={{ left: `${it.x}%`, top: `${it.y}%` }}>
          <ItemIcon art={it.art} />
        </button>
      ))}

      {status === "sieg-warte" && (
        <div className="absolute inset-0 z-40 flex items-end justify-center pb-12 text-3xl font-extrabold text-yellow-200 drop-shadow">
          Der Baum fällt...
        </div>
      )}
      {status === "sieg" && <Endkarte titel="SIEG" beschreibung="100% der Beute behalten." farbe="from-yellow-300 to-yellow-600" />}
      {status === "niederlage" && <Endkarte titel="NIEDERLAGE" beschreibung="Nur 5% der Beute." farbe="from-red-400 to-red-700" />}
    </div>
  );
}

function ItemIcon({ art }: { art: ItemArt }) {
  if (art === "rot") return <Apple className="h-7 w-7 text-red-600 drop-shadow" fill="#DC2626" />;
  if (art === "gruen") return <Apple className="h-7 w-7 text-green-600 drop-shadow" fill="#16A34A" />;
  if (art === "stern") return <SternanisIcon className="h-7 w-7 text-amber-400 drop-shadow" />;
  if (art === "heal") return (
    <div className="relative">
      <Apple className="h-7 w-7 text-yellow-500 drop-shadow" fill="#EAB308" />
      <Heart className="absolute inset-0 m-auto h-3 w-3 text-white" fill="white" />
    </div>
  );
  return (
    <div className="relative">
      <Apple className="h-7 w-7 text-purple-700 drop-shadow" fill="#7E22CE" />
      <Skull className="absolute inset-0 m-auto h-3 w-3 text-white" />
    </div>
  );
}

function Endkarte({ titel, beschreibung, farbe }: { titel: string; beschreibung: string; farbe: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`rounded-2xl bg-gradient-to-br ${farbe} px-8 py-6 text-center shadow-2xl`}>
        <Trees className="mx-auto mb-2 h-12 w-12 text-emerald-950" />
        <h2 className="text-3xl font-extrabold text-emerald-950">{titel}</h2>
        <p className="text-emerald-950">{beschreibung}</p>
      </div>
    </div>
  );
}