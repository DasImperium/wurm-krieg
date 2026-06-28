import type { SegmentKey } from "@/lib/game/segments";
import { segmentFarbe } from "../utils";
import { SegmentIcon } from "./SegmentIcon";

interface SegmentSymbolMitIconProps {
  keyName: SegmentKey;
  stufe?: number;
}

export function SegmentSymbolMitIcon({ keyName, stufe }: SegmentSymbolMitIconProps) {
  return (
    <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${segmentFarbe(keyName)} ring-2 ring-emerald-900 shadow`}>
      <SegmentIcon keyName={keyName} />
      {stufe && stufe > 1 && (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-yellow-300 px-1 text-[8px] font-bold text-emerald-950 ring-1 ring-emerald-900">
          {stufe}
        </span>
      )}
    </div>
  );
}