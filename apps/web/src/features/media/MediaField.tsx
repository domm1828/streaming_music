import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { MediaPickerDialog } from './MediaPickerDialog';
import type { MediaKind, MediaScope } from './media-queries';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  /** Forma del preview para imágenes. */
  shape?: 'circle' | 'rounded';
  kind?: MediaKind;
  scope?: MediaScope;
}

/** Campo de medio reutilizable: muestra el preview y abre el selector (subir / biblioteca). */
export function MediaField({ value, onChange, label = 'Imagen', shape = 'rounded', kind = 'image', scope = 'all' }: Props) {
  const [open, setOpen] = useState(false);
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded';

  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-muted">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className={`h-16 w-16 ${radius} object-cover`} />
        ) : (
          <div className={`flex h-16 w-16 items-center justify-center ${radius} bg-chip text-muted`}>
            <ImagePlus size={18} />
          </div>
        )}
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-divider px-3 py-1.5 text-sm font-medium text-brand-secondary hover:border-brand-secondary"
          >
            {value ? 'Cambiar' : 'Elegir imagen'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-xs text-muted hover:text-red-500">
              Quitar
            </button>
          )}
        </div>
      </div>

      {open && (
        <MediaPickerDialog
          kind={kind}
          scope={scope}
          title={`Seleccionar ${label.toLowerCase()}`}
          onSelect={({ url }) => onChange(url)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
