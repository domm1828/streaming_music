interface TabsProps<T extends string> {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}

/** Tabs tipo pill reutilizables. */
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-divider pb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            value === t.key ? 'bg-brand-primary text-white' : 'text-muted hover:bg-main/10 hover:text-main'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
