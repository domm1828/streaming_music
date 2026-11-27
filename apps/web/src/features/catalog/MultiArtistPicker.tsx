import { useState } from 'react';
import { useArtists } from './catalog-queries';
import { useDebounce } from '../../lib/use-debounce';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export interface ArtistRef {
  id: string;
  name: string;
}

/** Selección de varios artistas (buscable). Opcional: la lista puede quedar vacía. */
export function MultiArtistPicker({
  value,
  onChange,
  placeholder = 'Buscar artista…',
}: {
  value: ArtistRef[];
  onChange: (artists: ArtistRef[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const deb = useDebounce(q, 250);
  const { data } = useArtists(deb || undefined);

  const add = (a: ArtistRef) => {
    if (!value.some((x) => x.id === a.id)) onChange([...value, a]);
    setQ('');
    setOpen(false);
  };
  const remove = (id: string) => onChange(value.filter((x) => x.id !== id));

  const results = (data?.data ?? []).filter((a) => !value.some((x) => x.id === a._id));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
              {a.name}
              <button type="button" onClick={() => remove(a.id)} className="text-muted hover:text-red-500" aria-label={`Quitar ${a.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={field}
        />
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
            {results.map((a) => (
              <li key={a._id}>
                <button
                  type="button"
                  onMouseDown={() => add({ id: a._id, name: a.name })}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-main/10"
                >
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
