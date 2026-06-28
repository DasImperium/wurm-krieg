import type { ReactNode } from "react";

interface BaumProps {
  seite: "links" | "rechts";
  name: string;
  farbe: "emerald" | "rose";
}

export function Baum({ seite, name, farbe }: BaumProps) {
  const pos = seite === "links" ? "left-0" : "right-0";
  const krone = farbe === "emerald" ? "bg-emerald-700" : "bg-rose-700";
  const kroneHell = farbe === "emerald" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className={`absolute bottom-0 ${pos} z-20 flex w-28 flex-col items-center`}>
      <div className="relative">
        <div className={`h-28 w-28 rounded-full ${krone} shadow-2xl ring-4 ring-emerald-900/40`} />
        <div className={`absolute left-3 top-3 h-8 w-8 rounded-full ${kroneHell} opacity-60`} />
        <div className={`absolute right-4 top-6 h-5 w-5 rounded-full ${kroneHell} opacity-60`} />
      </div>
      <div className="-mt-6 h-24 w-10 rounded bg-gradient-to-b from-amber-800 to-amber-950 shadow-inner">
        <div className="mx-auto mt-10 h-12 w-6 rounded-t-full bg-amber-950" />
      </div>
      <div className="absolute -top-3 rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-white shadow">
        {name}
      </div>
    </div>
  );
}