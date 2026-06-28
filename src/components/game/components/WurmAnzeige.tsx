import type { Wurm } from "../types";
import { kopfX } from "../wurmUtils";
import { segmentFarbe } from "../utils";
import { SegmentIcon } from "./SegmentIcon";
import { Smile, Leaf } from "lucide-react";

interface WurmAnzeigeProps {
  wurm: Wurm;
}

export function WurmAnzeige({ wurm }: WurmAnzeigeProps) {
  const jetzt = performance.now();
  const flash = jetzt < wurm.flashBis;
  const baretFarbe = wurm.seite === "spieler" ? "bg-blue-600" : "bg-red-600";

  type Teil = { id: number; typ: "kopf" } | { id: number; typ: "segment"; key: string; stufe: number } | { id: number; typ: "schwanz" };
  const teile: Teil[] = [
    { id: -1, typ: "kopf" },
    ...wurm.segmente.map((s, i) => ({ id: i, typ: "segment" as const, key: s.key, stufe: s.stufe })),
    { id: wurm.segmente.length, typ: "schwanz" as const },
  ];

  const kopfRechts = wurm.seite === "spieler";
  const laneOffset = 20 + wurm.pfad * 14;

  return (
    <div
      className="absolute"
      style={{
        left: `${wurm.x}%`,
        bottom: `${laneOffset}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-end gap-0.5">
        {(kopfRechts ? [...teile].reverse() : teile).map((t, i) => {
          const pulse = flash ? "ring-4 ring-red-500" : "";
          const baseScale = "transition-all duration-300";
          const platzAnim = wurm.sterbend ? "scale-125 opacity-0 -translate-y-4" : "";

          if (t.typ === "kopf") {
            return (
              <div key={i} className={`relative ${baseScale} ${platzAnim}`}>
                <div className={`relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 ring-2 ring-emerald-900 shadow ${pulse}`}>
                  <div className={`absolute -top-2 left-1 h-3 w-8 rounded-md ${baretFarbe} shadow`} />
                  <Smile className="absolute inset-0 m-auto h-6 w-6 text-emerald-950" />
                </div>
              </div>
            );
          }

          if (t.typ === "schwanz") {
            return (
              <div key={i} className={`${baseScale} ${platzAnim}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 ring-2 ring-emerald-900 shadow ${pulse}`}>
                  <Leaf className="h-4 w-4 -rotate-45 text-emerald-100" fill="currentColor" />
                </div>
              </div>
            );
          }

          return (
            <div key={i} className={`${baseScale} ${platzAnim}`}>
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${segmentFarbe(t.key as any)} ring-2 ring-emerald-900 shadow ${pulse}`}>
                <SegmentIcon keyName={t.key as any} />
                {t.stufe > 1 && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-yellow-300 px-1 text-[8px] font-bold text-emerald-950 ring-1 ring-emerald-900">
                    {t.stufe}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}