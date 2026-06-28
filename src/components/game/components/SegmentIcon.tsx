import {
  Footprints,
  Shield,
  Link as LinkIcon,
  HeartPulse,
  Volume2,
  Zap,
  Bomb,
  Rocket,
} from "lucide-react";
import type { SegmentKey } from "@/lib/game/segments";

interface SegmentIconProps {
  keyName: SegmentKey;
  className?: string;
}

export function SegmentIcon({ keyName, className }: SegmentIconProps) {
  const cls = className ?? "h-5 w-5 text-white drop-shadow";

  switch (keyName) {
    case "beine":
      return <Footprints className={cls} />;
    case "panzer":
      return <Shield className={cls} />;
    case "kettenhemd":
      return <LinkIcon className={cls} />;
    case "heilung":
      return <HeartPulse className={cls} />;
    case "schallpistole":
      return <Volume2 className={cls} />;
    case "laser":
      return <Zap className={cls} />;
    case "kastanie":
      return <Bomb className={cls} />;
    case "raketenwerfer":
      return <Rocket className={cls} />;
    default:
      return null;
  }
}