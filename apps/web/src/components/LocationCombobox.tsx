import * as React from "react";

type Loc = { city: string; state: string };
type Props = {
  value: string;
  onChange: (next: string) => void; // call this whenever user selects or types
  fetchLocations?: (q: string) => Promise<Loc[]>; // optional async source
  placeholder?: string;
  disabled?: boolean;
};

const DEFAULT_CITIES: Loc[] = [
  { city: "New York", state: "NY" }, { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" }, { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },   { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" },   { city: "Jacksonville", state: "FL" },
  { city: "Fort Worth", state: "TX" }, { city: "Columbus", state: "OH" },
  { city: "Charlotte", state: "NC" }, { city: "San Francisco", state: "CA" },
  { city: "Indianapolis", state: "IN" }, { city: "Tampa", state: "FL" },
  { city: "Orlando", state: "FL" },  { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" },   { city: "Washington", state: "DC" },
  { city: "Boston", state: "MA" },   { city: "El Paso", state: "TX" },
  { city: "Nashville", state: "TN" }, { city: "Detroit", state: "MI" },
  { city: "Oklahoma City", state: "OK" }, { city: "Portland", state: "OR" },
  { city: "Las Vegas", state: "NV" }, { city: "Memphis", state: "TN" },
  { city: "Louisville", state: "KY" }, { city: "Baltimore", state: "MD" },
  { city: "Milwaukee", state: "WI" }, { city: "Albuquerque", state: "NM" },
  { city: "Tucson", state: "AZ" },   { city: "Fresno", state: "CA" },
  { city: "Sacramento", state: "CA" }, { city: "Mesa", state: "AZ" },
  { city: "Kansas City", state: "MO" }, { city: "Atlanta", state: "GA" },
  { city: "Long Beach", state: "CA" }, { city: "Colorado Springs", state: "CO" },
  { city: "Raleigh", state: "NC" },  { city: "Miami", state: "FL" },
  { city: "Virginia Beach", state: "VA" }, { city: "Omaha", state: "NE" },
  { city: "Oakland", state: "CA" },  { city: "Minneapolis", state: "MN" },
  { city: "Tulsa", state: "OK" },   { city: "Arlington", state: "TX" },
];

function format(loc: Loc) { return `${loc.city}, ${loc.state}`; }

export default function LocationCombobox({
  value,
  onChange,
  fetchLocations,
  placeholder = "e.g., Tampa, FL or New York, NY",
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value ?? "");
  const [items, setItems] = React.useState<Loc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const panelId = React.useId();

  // keep external value and internal query in sync when parent updates it
  React.useEffect(() => { setQuery(value ?? ""); }, [value]);

  // debounced search
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        let next: Loc[];
        if (fetchLocations) {
          next = await fetchLocations(q);
        } else {
          const lc = q.toLowerCase();
          next = DEFAULT_CITIES.filter(c =>
            c.city.toLowerCase().includes(lc) ||
            c.state.toLowerCase().includes(lc)
          ).slice(0, 12);
        }
        if (alive) {
          setItems(next);
          setActive(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query, fetchLocations]);

  function select(loc: Loc) {
    const next = format(loc);
    onChange(next);       // update parent form state
    setQuery(next);       // reflect selection in input
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) select(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-activedescendant={open && items[active] ? `${panelId}-opt-${active}` : undefined}
        className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-200 placeholder-zinc-500 px-4 py-2"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />

      {open && (
        <div
          id={panelId}
          className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur shadow-xl p-1"
        >
          {loading ? (
            <div className="px-3 py-3 text-sm text-zinc-400">Searching…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-3 text-sm text-zinc-400">No matches. Try "City, ST".</div>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {items.map((loc, i) => {
                const isActive = i === active;
                return (
                  <li
                    id={`${panelId}-opt-${i}`}
                    key={format(loc)}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/70 data-[active=true]:bg-zinc-800"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(loc)}
                  >
                    {format(loc)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
