import type { SegmentKey } from "@/lib/game/segments";

export function segmentFarbe(key: SegmentKey): string {
  const map: Record<SegmentKey, string> = {
    beine: "bg-yellow-500",
    panzer: "bg-stone-600",
    kettenhemd: "bg-zinc-400",
    heilung: "bg-pink-400",
    schallpistole: "bg-purple-500",
    laser: "bg-cyan-400",
    kastanie: "bg-amber-700",
    raketenwerfer: "bg-orange-600",
  };
  return map[key];
}