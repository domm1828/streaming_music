import { useState } from 'react';
import { useArtists } from './catalog-queries';
import { useDebounce } from '../../lib/use-debounce';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function ArtistPicker({
  value,
  onChange,
  placeholder = 'Buscar artista…',
}: {
  value: { id: string; name: string } | null;
  onChange: (a: { id: string; name: string } | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const deb = useDebounce(q, 250);
  const { data } = useArtists(deb || undefined);

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-chip px-3 py-1 text-sm">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted hover:text-red-500">
          quitar
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={field}
      />
      {open && data && data.data.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
          {data.data.map((a) => (
            <li key={a._id}>
              <button
                type="button"
                onMouseDown={() => { onChange({ id: a._id, name: a.name }); setQ(''); setOpen(false); }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-main/10"
              >
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
