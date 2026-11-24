import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ArtistPicker } from '../features/catalog/ArtistPicker';
import { useMyBackstage, useSubmitBackstage } from '../features/creator/backstage-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export function BackstagePage() {
  const submit = useSubmitBackstage();
  const mine = useMyBackstage();
  const [type, setType] = useState<'new' | 'claim'>('new');
  const [artistName, setArtistName] = useState('');
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    const name = type === 'claim' ? artist?.name ?? '' : artistName.trim();
    if (!name) return setError('Indicá el nombre del artista.');
    if (type === 'claim' && !artist) return setError('Elegí el artista que querés reclamar.');
    submit.mutate(
      { type, artistName: name, artistId: type === 'claim' ? artist?.id : undefined, message: message.trim() || undefined, attachments },
      {
        onSuccess: () => {
          setOk(true);
          setArtistName('');
          setArtist(null);
          setMessage('');
          setAttachments([]);
        },
        onError: (err: unknown) => setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo enviar la solicitud.'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-2">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><BadgeCheck className="text-brand-accent" /> Convertite en artista</h1>
        <p className="mt-1 text-muted">Pedí crear tu perfil de artista o reclamá uno existente. Un administrador revisa la solicitud; al aprobarla vas a poder gestionar ese artista y publicar álbumes.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-panel bg-chip p-5">
        <div className="flex gap-2">
          <button type="button" onClick={() => setType('new')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${type === 'new' ? 'border-brand-secondary bg-brand-primary/10' : 'border-divider text-muted'}`}>
            Crear artista nuevo
          </button>
          <button type="button" onClick={() => setType('claim')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${type === 'claim' ? 'border-brand-secondary bg-brand-primary/10' : 'border-divider text-muted'}`}>
            Reclamar existente
          </button>
        </div>

        {type === 'new' ? (
          <label className="block text-sm">
            <span className="mb-1 block">Nombre del artista</span>
            <input value={artistName} onChange={(e) => setArtistName(e.target.value)} className={field} placeholder="Tu nombre artístico" />
          </label>
        ) : (
          <div className="text-sm">
            <span className="mb-1 block">Artista a reclamar</span>
            <ArtistPicker value={artist} onChange={setArtist} />
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block">Mensaje (opcional)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={field} placeholder="Contanos por qué, enlaces, etc." />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block">Adjuntos (opcional)</span>
          <input type="file" multiple onChange={(e) => setAttachments(Array.from(e.target.files ?? []))} className="text-sm text-muted" />
          {attachments.length > 0 && <p className="mt-1 text-xs text-muted">{attachments.length} archivo(s) seleccionado(s)</p>}
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {ok && <p className="text-sm text-brand-secondary">Solicitud enviada. Te avisamos cuando la revisen.</p>}
        <button type="submit" disabled={submit.isPending} className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60">
          Enviar solicitud
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Mis solicitudes</h2>
        {mine.data && mine.data.data.length === 0 ? (
          <p className="text-muted">Todavía no enviaste solicitudes.</p>
        ) : (
          <ul className="space-y-2">
            {mine.data?.data.map((r) => (
              <li key={r._id} className="flex items-center gap-3 rounded-lg border border-divider px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.artistName}</p>
                  <p className="text-xs text-muted">{r.type === 'new' ? 'Artista nuevo' : 'Reclamo'} · {new Date(r.createdAt).toLocaleDateString()}{r.reviewNote ? ` · ${r.reviewNote}` : ''}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'approved' ? 'bg-brand-secondary/15 text-brand-secondary' : r.status === 'rejected' ? 'bg-red-500/15 text-red-500' : 'bg-chip text-muted'}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
