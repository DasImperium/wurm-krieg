import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hauptmenue } from "@/components/game/Hauptmenue";
import { Spielfeld } from "@/components/game/Spielfeld";
import { Ueberfall } from "@/components/game/Ueberfall";
import { AdminPanel } from "@/components/game/AdminPanel";
import {
  ladeFortschritt,
  speichereFortschritt,
  standardFortschritt,
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

type Bildschirm = "hauptmenue" | "spielfeld" | "ueberfall" | "admin";

function Index() {
  const [bildschirm, setBildschirm] = useState<Bildschirm>("hauptmenue");
  const [level, setLevel] = useState(1);
  const [fortschritt, setFortschritt] = useState<GespeicherterFortschritt>(() => standardFortschritt());

  useEffect(() => {
    setFortschritt(ladeFortschritt());
  }, []);

  const aktualisiere = (f: GespeicherterFortschritt) => {
    setFortschritt(f);
    speichereFortschritt(f);
  };

  if (bildschirm === "spielfeld") {
    const istProzedural = level === 0;
    return (
      <Spielfeld
        fortschritt={fortschritt}
        level={level}
        onZurueck={() => setBildschirm("hauptmenue")}
        onSieg={(zusatzAepfel, zusatzSternanis) => {
          const neu = {
            ...fortschritt,
            aepfel: fortschritt.aepfel + zusatzAepfel,
            sternanis: fortschritt.sternanis + (zusatzSternanis || 0),
            siege: fortschritt.siege + 1,
            maxLevel: istProzedural
              ? fortschritt.maxLevel
              : Math.max(fortschritt.maxLevel, Math.min(100, level + 1)),
          };
          aktualisiere(neu);
          setBildschirm("hauptmenue");
        }}
        onNiederlage={() => {
          aktualisiere({ ...fortschritt, niederlagen: fortschritt.niederlagen + 1 });
        }}
      />
    );
  }
  if (bildschirm === "ueberfall") {
    return (
      <Ueberfall
        fortschritt={fortschritt}
        onAenderung={aktualisiere}
        onZurueck={() => setBildschirm("hauptmenue")}
      />
    );
  }
  if (bildschirm === "admin") {
    return (
      <AdminPanel
        fortschritt={fortschritt}
        onAenderung={aktualisiere}
        onZurueck={() => setBildschirm("hauptmenue")}
      />
    );
  }
  return (
    <Hauptmenue
      fortschritt={fortschritt}
      onAenderung={aktualisiere}
      onStart={(lvl) => {
        setLevel(lvl);
        setBildschirm("spielfeld");
      }}
      onUeberfall={() => setBildschirm("ueberfall")}
      onAdmin={() => setBildschirm("admin")}
      onReset={() => aktualisiere(standardFortschritt())}
    />
  );
}

// (alter Code unten entfernt)
function _unused() {
  const ignore = (zusatz: number) => {
    void zusatz;
  };
  return ignore;
}
