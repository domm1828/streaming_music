import { useEffect, useState } from 'react';
import {
  useProvidersSettings,
  useSaveProvidersSettings,
  type ProvidersSettingsInput,
} from '../../features/admin/providers-settings-queries';

const inputClass =
  'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function AdminProvidersPage() {
  const { data, isLoading } = useProvidersSettings();
  const save = useSaveProvidersSettings();

  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [hasSpotifySecret, setHasSpotifySecret] = useState(false);
  const [lastfmKey, setLastfmKey] = useState('');
  const [hasLastfmKey, setHasLastfmKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSpotifyId(data.spotify.id);
    setHasSpotifySecret(data.spotify.hasSecret);
    setHasLastfmKey(data.lastfm.hasKey);
    setSpotifySecret('');
    setLastfmKey('');
  }, [data]);

  const onSave = () => {
    setSaved(false);
    const body: ProvidersSettingsInput = { spotify: { id: spotifyId }, lastfm: {} };
    if (spotifySecret) body.spotify!.secret = spotifySecret;
    if (lastfmKey) body.lastfm!.apiKey = lastfmKey;
    save.mutate(body, {
      onSuccess: () => {
        setSaved(true);
        if (spotifySecret) setHasSpotifySecret(true);
        if (lastfmKey) setHasLastfmKey(true);
        setSpotifySecret('');
        setLastfmKey('');
      },
    });
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted">
        Credenciales de los proveedores de metadatos. Se usan para importar artistas, álbumes, géneros y bios.
      </p>

      <section className="space-y-3 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Spotify</h3>
        <label className="block">
          <span className="mb-1 block text-sm">Client ID</span>
          <input value={spotifyId} onChange={(e) => setSpotifyId(e.target.value)} autoComplete="off" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Client Secret</span>
          <input
            type="password"
            value={spotifySecret}
            onChange={(e) => setSpotifySecret(e.target.value)}
            autoComplete="new-password"
            placeholder={hasSpotifySecret ? '•••••••• (guardado — dejá vacío para mantener)' : 'Client secret'}
            className={inputClass}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Last.fm</h3>
        <label className="block">
          <span className="mb-1 block text-sm">API Key</span>
          <input
            type="password"
            value={lastfmKey}
            onChange={(e) => setLastfmKey(e.target.value)}
            autoComplete="new-password"
            placeholder={hasLastfmKey ? '•••••••• (guardada — dejá vacío para mantener)' : 'API key'}
            className={inputClass}
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={save.isPending}
          className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-brand-secondary">Guardado.</span>}
      </div>
    </div>
  );
}
