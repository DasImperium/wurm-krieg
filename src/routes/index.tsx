import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hauptmenue } from "@/components/game/Hauptmenue";
import { Spielfeld } from "@/components/game/Spielfeld";
import {
  ladeFortschritt,
  speichereFortschritt,
  type GespeicherterFortschritt,
} from "@/lib/game/segments";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Krieg der Wuermer" },
      { name: "description", content: "Strategisches 2D-Side-Scrolling-Spiel: Baue Wuermer und zerstöre den feindlichen Baum." },
      { property: "og:title", content: "Krieg der Wuermer" },
      { property: "og:description", content: "Strategisches 2D-Side-Scrolling-Spiel: Baue Wuermer und zerstöre den feindlichen Baum." },
    ],
  }),
  component: Index,
});

function Index() {
  const [bildschirm, setBildschirm] = useState<"hauptmenue" | "spielfeld">("hauptmenue");
  const [fortschritt, setFortschritt] = useState<GespeicherterFortschritt>(() => ({
    spielerName: "Spieler",
    aepfel: 5,
    upgrades: {
      beine: 1,
      panzer: 1,
      kettenhemd: 1,
      heilung: 1,
      schallpistole: 1,
      laser: 1,
      kastanie: 1,
      raketenwerfer: 1,
    },
  }));

  useEffect(() => {
    setFortschritt(ladeFortschritt());
  }, []);

  const aktualisiere = (f: GespeicherterFortschritt) => {
    setFortschritt(f);
    speichereFortschritt(f);
  };

  if (bildschirm === "spielfeld") {
    return (
      <Spielfeld
        fortschritt={fortschritt}
        onZurueck={() => setBildschirm("hauptmenue")}
        onSieg={(zusatz) => {
          const neu = { ...fortschritt, aepfel: fortschritt.aepfel + zusatz };
          aktualisiere(neu);
          setBildschirm("hauptmenue");
        }}
      />
    );
  }
  return (
    <Hauptmenue
      fortschritt={fortschritt}
      onAenderung={aktualisiere}
      onStart={() => setBildschirm("spielfeld")}
    />
  );
}
