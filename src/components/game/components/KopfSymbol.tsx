import { Smile } from "lucide-react";

interface KopfSymbolProps {
  farbe: string;
}

export function KopfSymbol({ farbe }: KopfSymbolProps) {
  return (
    <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 ring-2 ring-emerald-900 shadow-md">
      <div className={`absolute -top-2 left-0.5 h-3 w-9 rounded-md ${farbe} shadow`} />
      <Smile className="absolute inset-0 m-auto h-6 w-6 text-emerald-950" />
    </div>
  );
}