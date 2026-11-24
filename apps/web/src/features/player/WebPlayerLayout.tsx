import { useState } from 'react';
import { Outlet } from 'react-router';
import { useRadioAutoExtend } from '../discovery/use-radio-autoextend';
import { PlayerBar } from './PlayerBar';
import { PlayerEngine } from './PlayerEngine';
import { QueuePanel } from './QueuePanel';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Shell principal: sidebar + topbar + contenido + panel de cola + barra de reproductor. */
export function WebPlayerLayout() {
  useRadioAutoExtend();
  const [queueOpen, setQueueOpen] = useState(false);

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
        <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      </div>

      <div className="px-2 pb-2">
        <PlayerBar onToggleQueue={() => setQueueOpen((o) => !o)} queueOpen={queueOpen} />
      </div>
      <PlayerEngine />
    </div>
  );
}
