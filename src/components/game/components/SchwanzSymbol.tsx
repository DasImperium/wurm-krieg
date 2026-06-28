import { Leaf } from "lucide-react";

export function SchwanzSymbol() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 ring-2 ring-emerald-900 shadow">
      <Leaf className="h-4 w-4 -rotate-45 text-emerald-100" fill="currentColor" />
    </div>
  );
}