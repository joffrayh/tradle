import { csv } from "d3-fetch";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Values come from tradle.net's own per-country files (downloaded into
// public/countries/ at build time by scripts/fetch-tradle-data.sh), so the
// treemap matches tradle.net exactly. For countries tradle.net has no file
// for, fall back to OEC's public data API (CORS-enabled, no cookies) for the
// same year. Either way nothing is embedded from oec.world, whose embed
// brought a cookie banner and cookies with it.
const API =
  "https://api-v2.oec.world/tesseract/data.jsonrecords?cube=trade_i_baci_a_92&drilldowns=Year,HS4&measures=Trade+Value&parents=true";
const FALLBACK_YEAR = 2021; // tradle.net's data year

type Row = Record<string, string | number | undefined>;

interface Leaf {
  id: number;
  name: string;
  sectionId: number;
  section: string;
  value: number;
}

interface Dataset {
  leaves: Leaf[];
  year: number | null;
}

const SECTION_COLORS: Record<number, string> = {
  1: "#F4C27A", // Animal Products
  2: "#8BC34A", // Vegetable Products
  3: "#D6C25B", // Animal and Vegetable Bi-Products
  4: "#C9A227", // Foodstuffs
  5: "#A0522D", // Mineral Products
  6: "#D35BA6", // Chemical Products
  7: "#7E57C2", // Plastics and Rubbers
  8: "#B07A5A", // Animal Hides
  9: "#7B9A5B", // Wood Products
  10: "#E0D6A8", // Paper Goods
  11: "#4DB6AC", // Textiles
  12: "#26A69A", // Footwear and Headwear
  13: "#B0A99F", // Stone and Glass
  14: "#E6B800", // Precious Metals
  15: "#8D99AE", // Metals
  16: "#3F7FD9", // Machines
  17: "#5EC8F2", // Transportation
  18: "#2E4F7A", // Instruments
  19: "#5D4037", // Weapons
  20: "#F48FB1", // Miscellaneous
  21: "#FF8A65", // Arts and Antiques
  22: "#78909C", // Unspecified
};

// Minimal line icons for the section filter buttons (24x24, drawn with
// currentColor); the section name appears when a button is tapped.
const SECTION_ICONS: Record<number, React.ReactNode> = {
  // Animal Products: fish
  1: (
    <>
      <path d="M2 12c3-4 8-6 13-3l5-3v12l-5-3c-5 3-10 1-13-3z" />
      <path d="M8 11.5h.01" />
    </>
  ),
  // Vegetable Products: leaf
  2: (
    <>
      <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" />
      <path d="M5 19l8-8" />
    </>
  ),
  // Animal and Vegetable Bi-Products (fats and oils): drop
  3: <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />,
  // Foodstuffs: cup
  4: (
    <>
      <path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
    </>
  ),
  // Mineral Products: flame
  5: (
    <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-2 1-4 3-5 0 2 1 3 2 3 0-3 0-6 1-9z" />
  ),
  // Chemical Products: flask
  6: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  // Plastics and Rubbers: tyre
  7: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  // Animal Hides: bag
  8: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  // Wood Products: tree
  9: (
    <>
      <path d="M12 3l6 8h-3l4 6H5l4-6H6z" />
      <path d="M12 17v4" />
    </>
  ),
  // Paper Goods: page
  10: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  // Textiles: shirt
  11: <path d="M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3c-1 2-2 3-4 3S9 6 8 4z" />,
  // Footwear and Headwear: shoe
  12: <path d="M3 7h5l1 4 8 2c2 .5 4 2 4 4v1H3z" />,
  // Stone and Glass: glass
  13: (
    <>
      <path d="M8 3h8v5a4 4 0 0 1-8 0z" />
      <path d="M12 12v8M8 21h8" />
    </>
  ),
  // Precious Metals: gem
  14: (
    <>
      <path d="M6 4h12l3 5-9 11L3 9z" />
      <path d="M3 9h18" />
    </>
  ),
  // Metals: nut
  15: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Machines: chip
  16: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  // Transportation: car
  17: (
    <>
      <path d="M4 16v-4l2-5h12l2 5v4z" />
      <path d="M4 12h16" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </>
  ),
  // Instruments: dial
  18: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12l4-4M12 3v2M3 12h2M19 12h2" />
    </>
  ),
  // Weapons: crosshair
  19: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
    </>
  ),
  // Miscellaneous: star
  20: (
    <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />
  ),
  // Arts and Antiques: picture
  21: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </>
  ),
  // Unspecified: question mark
  22: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5M12 17h.01" />
    </>
  ),
};

function SectionIcon({ id }: { id: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {SECTION_ICONS[id] ?? SECTION_ICONS[22]}
    </svg>
  );
}

function textColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0f172a" : "#ffffff";
}

export function formatMoney(value: number) {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) return `$${(value / size).toFixed(1)}${suffix}`;
  }
  return `$${Math.round(value)}`;
}

let indexPromise: Promise<Set<string>> | null = null;
function loadLocalIndex(): Promise<Set<string>> {
  if (indexPromise == null) {
    indexPromise = fetch(`${process.env.PUBLIC_URL}/countries/index.json`, {
      cache: "no-cache",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((codes: string[]) => new Set(codes))
      .catch(() => new Set<string>());
  }
  return indexPromise;
}

/** Lowercase ISO2 codes that have a tradle.net data file (undefined while loading). */
export function useLocalDataIndex(): Set<string> | undefined {
  const [index, setIndex] = useState<Set<string>>();
  useEffect(() => {
    let cancelled = false;
    loadLocalIndex().then((codes) => !cancelled && setIndex(codes));
    return () => {
      cancelled = true;
    };
  }, []);
  return index;
}

function toDataset(rows: Row[]): Dataset {
  const leaves = rows
    .map((row) => ({
      id: Number(row["HS4 ID"]),
      name: String(row.HS4 ?? ""),
      sectionId: Number(row["Section ID"]),
      section: String(row.Section ?? ""),
      value: Number(row["Trade Value"]),
    }))
    .filter((leaf) => leaf.value > 0 && Number.isFinite(leaf.id));
  const year = rows.length ? Number(rows[0].Year) || null : null;
  return { leaves, year };
}

const cache = new Map<string, Promise<Dataset>>();
function fetchExports(code: string, oecId?: string): Promise<Dataset> {
  let request = cache.get(code);
  if (!request) {
    request = loadLocalIndex()
      .then((index) => {
        if (index.has(code)) {
          return csv(`${process.env.PUBLIC_URL}/countries/${code}.csv`);
        }
        if (!oecId) throw new Error(`No export data for ${code}`);
        const url = `${API}&include=Year:${FALLBACK_YEAR};Exporter+Country:${oecId}`;
        return fetch(url, { credentials: "omit" })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((json: { data: Row[] }) => json.data);
      })
      .then((rows) => toDataset(rows as Row[]))
      .catch((error) => {
        cache.delete(code);
        throw error;
      });
    cache.set(code, request);
  }
  return request;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

interface TreemapProps {
  /** Lowercase ISO2 code, e.g. "ng" */
  code: string;
  oecId?: string;
}

export function Treemap({ code, oecId }: TreemapProps) {
  const [leaves, setLeaves] = useState<Leaf[] | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [section, setSection] = useState<number | null>(null);
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    setLeaves(null);
    setError(false);
    setSelected(null);
    setSection(null);
    fetchExports(code, oecId)
      .then((data) => {
        if (cancelled) return;
        setLeaves(data.leaves);
        setYear(data.year);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [code, oecId, attempt]);

  const total = useMemo(
    () => (leaves ?? []).reduce((sum, leaf) => sum + leaf.value, 0),
    [leaves]
  );

  // Product sections (Textiles, Machines, ...) by total value, for the filter
  // buttons under the treemap, like the legend on tradle.net.
  const sections = useMemo(() => {
    const bySection = new Map<
      number,
      { id: number; name: string; value: number }
    >();
    for (const leaf of leaves ?? []) {
      const entry = bySection.get(leaf.sectionId) ?? {
        id: leaf.sectionId,
        name: leaf.section,
        value: 0,
      };
      entry.value += leaf.value;
      bySection.set(leaf.sectionId, entry);
    }
    return Array.from(bySection.values()).sort((a, b) => b.value - a.value);
  }, [leaves]);
  const activeSection = sections.find((item) => item.id === section);

  const visibleLeaves = useMemo(
    () =>
      section == null
        ? leaves
        : (leaves ?? []).filter((leaf) => leaf.sectionId === section),
    [leaves, section]
  );

  const tiles = useMemo(() => {
    if (!visibleLeaves || width === 0 || height === 0) return [];
    const sections = new Map<number, Leaf[]>();
    for (const leaf of visibleLeaves) {
      sections.set(leaf.sectionId, [
        ...(sections.get(leaf.sectionId) ?? []),
        leaf,
      ]);
    }
    type Node = { children?: Node[]; leaf?: Leaf };
    const root = hierarchy<Node>({
      children: Array.from(sections.values()).map((items) => ({
        children: items.map((leaf) => ({ leaf })),
      })),
    })
      .sum((node) => node.leaf?.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    treemap<Node>()
      .tile(treemapSquarify)
      .size([width, height])
      .paddingInner(1)
      .round(true)(root);
    return root.leaves().map((node) => {
      const n = node as typeof node & {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
      };
      return {
        leaf: node.data.leaf as Leaf,
        x: n.x0,
        y: n.y0,
        w: n.x1 - n.x0,
        h: n.y1 - n.y0,
      };
    });
  }, [visibleLeaves, width, height]);

  const share = useCallback(
    (value: number) => `${((value / (total || 1)) * 100).toFixed(1)}%`,
    [total]
  );
  const selectedLeaf = visibleLeaves?.find((leaf) => leaf.id === selected);

  const toggleSection = (id: number | null) => {
    setSection((current) => (current === id ? null : id));
    setSelected(null);
  };

  return (
    <div>
      <p className="mb-1 text-center text-slate-700 dark:text-slate-300">
        {!leaves
          ? " "
          : activeSection
          ? `${activeSection.name}: ${formatMoney(
              activeSection.value
            )} (${share(activeSection.value)} of exports)`
          : `Total exports${year ? ` (${year})` : ""}: ${formatMoney(total)}`}
      </p>
      <div
        ref={ref}
        className="relative w-full overflow-hidden rounded-lg bg-slate-200/70 dark:bg-slate-800/70"
        style={{ height: "clamp(16rem, 52vh, 24rem)" }}
      >
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <p>Couldn&apos;t load this country&apos;s export data.</p>
            <button
              type="button"
              className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-white dark:bg-oec-orange dark:text-slate-950"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        ) : !leaves ? (
          <div className="h-full w-full animate-pulse" aria-label="Loading" />
        ) : (
          tiles.map(({ leaf, x, y, w, h }) => {
            const bg = SECTION_COLORS[leaf.sectionId] ?? "#94a3b8";
            const fontSize = Math.max(9, Math.min(28, Math.sqrt(w * h) / 7));
            const showName = w >= 44 && h >= fontSize * 2.4;
            const showShare = w >= 30 && h >= fontSize * 1.3;
            const isSelected = leaf.id === selected;
            return (
              <div
                key={leaf.id}
                role="button"
                tabIndex={-1}
                title={`${leaf.name} — ${share(leaf.value)}`}
                onClick={() => setSelected(isSelected ? null : leaf.id)}
                className="absolute cursor-pointer overflow-hidden p-1 leading-tight"
                style={{
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  backgroundColor: bg,
                  color: textColor(bg),
                  fontSize,
                  outline: isSelected ? "3px solid #0f172a" : undefined,
                  outlineOffset: -3,
                  zIndex: isSelected ? 1 : undefined,
                }}
              >
                {showName && (
                  <div className="break-words font-semibold">{leaf.name}</div>
                )}
                {showShare && (
                  <div className="opacity-90">{share(leaf.value)}</div>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="mt-1 min-h-[1.5rem] text-center text-sm text-slate-700 dark:text-slate-300">
        {selectedLeaf
          ? `${selectedLeaf.name} · ${share(
              selectedLeaf.value
            )} · ${formatMoney(selectedLeaf.value)}`
          : leaves
          ? "Tap a tile to see the product"
          : ""}
      </p>
      {sections.length > 1 && (
        <div
          className="mb-2 flex flex-wrap items-center justify-center gap-1"
          role="group"
          aria-label="Filter by product type"
        >
          <button
            type="button"
            aria-pressed={section == null}
            onClick={() => toggleSection(null)}
            className={`h-7 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
              section == null
                ? "border-slate-800 bg-slate-800 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-300 bg-white/70 text-slate-700 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200"
            }`}
          >
            All
          </button>
          {sections.map((item) => {
            const color = SECTION_COLORS[item.id] ?? "#94a3b8";
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                aria-label={item.name}
                title={`${item.name} — ${share(item.value)}`}
                onClick={() => toggleSection(item.id)}
                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center whitespace-nowrap rounded-full text-xs font-semibold transition-all duration-200 ${
                  active ? "px-2.5" : ""
                } ${section != null && !active ? "opacity-40" : ""}`}
                style={{ backgroundColor: color, color: textColor(color) }}
              >
                <SectionIcon id={item.id} />
                <span
                  className={`overflow-hidden transition-all duration-200 ${
                    active ? "ml-1 max-w-[14rem]" : "max-w-0"
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
