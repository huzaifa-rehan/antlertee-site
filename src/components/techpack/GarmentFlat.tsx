import { silhouetteFor, type GarmentId, type Silhouette, type View } from "@/content/techpack";

/**
 * Flat sketch (front or back) of the chosen garment, with the placement zones drawn on it.
 * Plain SVG, no library. Zones on the front view are mirrored: the wearer's left chest sits on the viewer's right.
 * Interactive use passes `onZone`; the sketch itself is aria-hidden there, because the zone list next to it
 * is the keyboard and screen-reader control. In print it is a labelled image.
 */

type Shape = { kind: "rect"; x: number; y: number; w: number; h: number } | { kind: "poly"; points: [number, number][] };

const rect = (x: number, y: number, w: number, h: number): Shape => ({ kind: "rect", x, y, w, h });
const poly = (...points: [number, number][]): Shape => ({ kind: "poly", points });
const mirror = (s: Shape): Shape =>
  s.kind === "rect" ? rect(300 - s.x - s.w, s.y, s.w, s.h) : poly(...s.points.map(([x, y]) => [300 - x, y] as [number, number]));

const LONG_SLEEVE_VIEWER_LEFT = poly([54, 112], [78, 150], [58, 268], [34, 262]);
const SHORT_SLEEVE_VIEWER_LEFT = poly([44, 118], [76, 86], [82, 126], [62, 140]);

function zoneShapes(sil: Silhouette, view: View): Record<string, Shape> {
  if (sil === "trousers" || sil === "shorts") {
    const long = sil === "trousers";
    if (view === "front") {
      return {
        waistband: rect(84, 24, 132, 16),
        "right-thigh": rect(96, 66, 40, 40),
        "left-thigh": rect(164, 66, 40, 40),
        "left-leg": long ? poly([206, 60], [220, 60], [234, 300], [220, 300]) : poly([206, 60], [220, 60], [236, 176], [222, 178]),
      };
    }
    return {
      waistband: rect(84, 24, 132, 16),
      "back-pocket": rect(94, 62, 40, 36),
      "back-leg": long ? rect(84, 160, 48, 100) : rect(84, 116, 48, 52),
    };
  }
  const sleeve = sil === "tee" ? SHORT_SLEEVE_VIEWER_LEFT : LONG_SLEEVE_VIEWER_LEFT;
  const sleeves: Record<string, Shape> =
    sil === "jersey"
      ? {}
      : view === "front"
        ? { "right-sleeve": sleeve, "left-sleeve": mirror(sleeve) }
        : { "left-sleeve": sleeve, "right-sleeve": mirror(sleeve) };
  if (view === "front") {
    return {
      ...sleeves,
      "centre-chest": rect(110, 98, 80, 32),
      "left-chest": rect(166, 102, 34, 28),
      "full-front": rect(100, 140, 100, 90),
    };
  }
  return {
    ...sleeves,
    ...(sil === "hoodie" ? { hood: rect(124, 24, 52, 40) } : {}),
    "back-yoke": rect(112, 84, 76, 26),
    "full-back": rect(98, 122, 104, 150),
  };
}

function centre(s: Shape): [number, number] {
  if (s.kind === "rect") return [s.x + s.w / 2, s.y + s.h / 2];
  const n = s.points.length;
  return [s.points.reduce((a, p) => a + p[0], 0) / n, s.points.reduce((a, p) => a + p[1], 0) / n];
}

function Outline({ sil, view }: { sil: Silhouette; view: View }) {
  const neck = view === "front" ? 86 : 70;
  const long = `M122 62 Q150 ${neck} 178 62 L220 72 Q244 78 250 100 L280 284 L250 292 L216 150 L216 316 L84 316 L84 150 L50 292 L20 284 L50 100 Q56 78 80 72 Z`;
  switch (sil) {
    case "tee":
      return (
        <>
          <path className="tp-body" d={`M122 62 Q150 ${neck} 178 62 L220 72 L266 118 L240 150 L216 132 L216 316 L84 316 L84 132 L60 150 L34 118 L80 72 Z`} />
          <path className="tp-detail" d={`M128 64 Q150 ${neck - 6} 172 64`} />
          <path className="tp-detail" d="M64 145 L39 121 M236 145 L261 121 M84 306 L216 306" />
        </>
      );
    case "jersey":
      return (
        <>
          <path className="tp-body" d={`M126 62 Q150 ${view === "front" ? 100 : 74} 174 62 L196 64 Q200 120 222 140 L222 316 L78 316 L78 140 Q100 120 104 64 Z`} />
          <path className="tp-detail" d={`M132 64 Q150 ${view === "front" ? 92 : 70} 168 64 M200 70 Q204 118 218 132 M100 70 Q96 118 82 132`} />
        </>
      );
    case "hoodie":
      return (
        <>
          <path className="tp-body" d={view === "back" ? "M114 72 Q106 14 150 10 Q194 14 186 72 Q150 84 114 72 Z" : "M112 74 Q104 18 150 12 Q196 18 188 74 Z"} />
          <path className="tp-body" d={long} />
          {view === "front" ? (
            <>
              <path className="tp-face" d="M128 66 Q130 34 150 32 Q170 34 172 66 Q150 88 128 66 Z" />
              <path className="tp-detail" d="M141 80 L139 122 M159 80 L161 122" />
              <path className="tp-detail" d="M112 236 L188 236 L204 290 L96 290 Z" />
            </>
          ) : (
            <path className="tp-detail" d="M150 12 L150 78" />
          )}
          <path className="tp-detail" d="M84 300 L216 300 M27 270 L54 277 M273 270 L246 277" />
        </>
      );
    case "sweatshirt":
      return (
        <>
          <path className="tp-body" d={long} />
          <path className="tp-detail" d={`M128 64 Q150 ${neck - 7} 172 64 M84 300 L216 300 M27 270 L54 277 M273 270 L246 277`} />
        </>
      );
    case "jacket":
      return (
        <>
          <path className="tp-body" d={long} />
          {view === "front" ? (
            <path className="tp-detail" d="M122 62 L138 92 L150 78 L162 92 L178 62 M150 80 L150 316 M104 222 L128 214 M196 222 L172 214" />
          ) : (
            <path className="tp-detail" d="M124 64 Q150 74 176 64" />
          )}
          <path className="tp-detail" d="M84 300 L216 300 M27 270 L54 277 M273 270 L246 277" />
        </>
      );
    case "trousers":
    case "shorts": {
      const legs =
        sil === "trousers"
          ? "M80 44 L220 44 L236 320 L164 320 L150 120 L136 320 L64 320 Z"
          : "M80 44 L220 44 L240 190 L160 196 L150 120 L140 196 L60 190 Z";
      return (
        <>
          <path className="tp-body" d={legs} />
          <rect className="tp-body" x="80" y="20" width="140" height="24" rx="3" />
          {view === "front" ? (
            <path className="tp-detail" d="M150 44 L150 108 M88 50 Q106 70 112 50 M212 50 Q194 70 188 50" />
          ) : (
            <path className="tp-detail" d="M82 58 Q150 74 218 58 M168 62 L208 62 L208 98 L168 98 Z" />
          )}
        </>
      );
    }
  }
}

export interface FlatMarker {
  id: string;
  n: number;
}

export function GarmentFlat({
  garment,
  view,
  markers,
  selected,
  onZone,
  title,
  className,
}: {
  garment: GarmentId | "";
  view: View;
  /** Zones with a placement, numbered as in the placement list. */
  markers: FlatMarker[];
  selected?: string | null;
  onZone?: (zoneId: string) => void;
  /** Accessible name when the sketch is shown as an image (print). */
  title?: string;
  className?: string;
}) {
  const sil = silhouetteFor(garment);
  const shapes = zoneShapes(sil, view);
  const placed = new Map(markers.map((m) => [m.id, m.n]));
  const interactive = Boolean(onZone);

  return (
    <svg
      className={className}
      viewBox="0 0 300 340"
      role={interactive ? undefined : "img"}
      aria-hidden={interactive ? true : undefined}
      aria-label={interactive ? undefined : title}
    >
      <Outline sil={sil} view={view} />
      {Object.entries(shapes).map(([id, s]) => {
        const n = placed.get(id);
        const cls = ["tp-zone", n ? "is-placed" : "", selected === id ? "is-selected" : ""].filter(Boolean).join(" ");
        const [cx, cy] = centre(s);
        return (
          <g key={id} className={cls} data-zone={id} onClick={onZone ? () => onZone(id) : undefined}>
            {s.kind === "rect" ? (
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="3" />
            ) : (
              <polygon points={s.points.map((p) => p.join(",")).join(" ")} />
            )}
            {n !== undefined && (
              <g className="tp-pin">
                <circle cx={cx} cy={cy} r="9" />
                <text x={cx} y={cy + 3.6} textAnchor="middle">
                  {n}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
