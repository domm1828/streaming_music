import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, TextField } from '../components/ui';
import { useAuth } from '../features/auth/use-auth';
import { usePublicProfile, useUpdateProfile } from '../features/profile/profile-queries';
import type { ProfileLink } from '../features/library/types';

export function ProfileEditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = usePublicProfile(user?.username ?? '');
  const update = useUpdateProfile();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [image, setImage] = useState('');
  const [links, setLinks] = useState<ProfileLink[]>([]);

  useEffect(() => {
    if (!data) return;
    setName(data.user.name);
    setBio(data.user.bio ?? '');
    setCountry(data.user.country ?? '');
    setImage(data.user.image ?? '');
    setLinks(data.user.links);
  }, [data]);

  const onSubmit = async () => {
    await update.mutateAsync({
      name,
      bio,
      country,
      image,
      links: links.filter((l) => l.label.trim() && l.url.trim()),
    });
    if (user) navigate(`/u/${user.username}`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-3xl font-bold">Editar perfil</h1>
      <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium opacity-80">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-brand-secondary/40 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
        />
      </label>
      <TextField label="País" value={country} onChange={(e) => setCountry(e.target.value)} />
      <TextField
        label="URL de imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        placeholder="https://…"
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium opacity-80">Enlaces</span>
          <button
            type="button"
            onClick={() => setLinks((l) => [...l, { label: '', url: '' }])}
            className="text-sm text-brand-secondary hover:underline"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={link.label}
                onChange={(e) =>
                  setLinks((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                placeholder="Etiqueta"
                className="w-32 rounded-lg border border-brand-secondary/40 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
              />
              <input
                value={link.url}
                onChange={(e) => setLinks((l) => l.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-lg border border-brand-secondary/40 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
              />
              <button
                type="button"
                onClick={() => setLinks((l) => l.filter((_, j) => j !== i))}
                className="rounded-lg px-3 text-red-500 hover:bg-red-500/10"
                aria-label="Quitar enlace"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button type="button" onClick={onSubmit} disabled={update.isPending}>
        {update.isPending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  );
}
