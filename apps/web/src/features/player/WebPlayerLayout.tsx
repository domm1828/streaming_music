import { useState } from 'react';
import { Outlet } from 'react-router';
import { useRadioAutoExtend } from '../discovery/use-radio-autoextend';
import { PlayerBar } from './PlayerBar';
import { PlayerEngine } from './PlayerEngine';
import { QueuePanel } from './QueuePanel';
import { LyricsPanel } from './LyricsPanel';
import { FullscreenPlayer } from './FullscreenPlayer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Shell principal: sidebar + topbar + contenido + panel de cola/letra + barra de reproductor. */
export function WebPlayerLayout() {
  useRadioAutoExtend();
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-surface text-main">
      <div className="flex min-h-0 flex-1 gap-0 p-2">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel bg-elevated">
          <Topbar />
          <div className="flex-1 overflow-y-auto px-4 pb-10 pt-2 md:px-8">
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </div>
        </main>
        <LyricsPanel open={lyricsOpen} onClose={() => setLyricsOpen(false)} />
        <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      </div>

      <div className="px-2 pb-2">
        <PlayerBar
          onToggleQueue={() => setQueueOpen((o) => !o)}
          queueOpen={queueOpen}
          onToggleLyrics={() => setLyricsOpen((o) => !o)}
          lyricsOpen={lyricsOpen}
          onExpand={() => setFullOpen(true)}
        />
      </div>
      <FullscreenPlayer open={fullOpen} onClose={() => setFullOpen(false)} />
      <PlayerEngine />
    </div>
  );
}
