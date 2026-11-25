import { useState } from 'react';
import { Check, Code2, Link2, Share2 } from 'lucide-react';
import { pillClass } from '../../components/media';

export function ShareButton({ path, title, embedPath }: { path: string; title: string; embedPath?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}${path}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* cancelado */
    }
    setOpen(false);
  };

  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-main hover:bg-main/10';

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={pillClass()}>
        <Share2 size={16} /> Compartir
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-divider bg-elevated py-1 shadow-xl">
            <button onClick={() => copy(url, 'link')} className={item}>
              {copied === 'link' ? <Check size={15} className="text-brand-secondary" /> : <Link2 size={15} />}
              {copied === 'link' ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
            {canShare && (
              <button onClick={nativeShare} className={item}>
                <Share2 size={15} /> Compartir…
              </button>
            )}
            {embedPath && (
              <button
                onClick={() =>
                  copy(
                    `<iframe src="${origin}${embedPath}" width="100%" height="152" style="border:0;border-radius:12px" loading="lazy"></iframe>`,
                    'embed',
                  )
                }
                className={item}
              >
                {copied === 'embed' ? <Check size={15} className="text-brand-secondary" /> : <Code2 size={15} />}
                {copied === 'embed' ? 'Código copiado' : 'Insertar (embed)'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
