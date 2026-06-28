import React, { useState } from 'react';
import Hauptmenue from './components/game/Hauptmenue';
import Spielfeld from './components/game/Spielfeld';
import Ueberfall from './components/game/Ueberfall';
import AdminPanel from './components/game/AdminPanel';

export default function App() {
  const [view, setView] = useState<'menu' | 'game' | 'minigame' | 'admin'>('menu');
  
  // Startwerte für Äpfel und Sterne aus deinem Spiel-Design
  const [playerData, setPlayerData] = useState({
    name: 'Spieler',
    apples: 5,
    stars: 0,
    level: 1
  });

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      {view === 'menu' && (
        <Hauptmenue playerData={playerData} setView={setView} setPlayerData={setPlayerData} />
      )}
      
      {view === 'game' && (
        <Spielfeld playerData={playerData} setView={setView} />
      )}
      
      {view === 'minigame' && (
        <Ueberfall playerData={playerData} setView={setView} />
      )}
      
      {view === 'admin' && (
        <AdminPanel playerData={playerData} setView={setView} />
      )}
    </div>
  );
}
