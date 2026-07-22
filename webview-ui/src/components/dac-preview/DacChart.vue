<template>
  <div class="dac-chart" ref="chartEl">
    <!-- Bar / line / area share a cartesian frame -->
    <svg
      v-if="cartesian && points.length"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      class="dac-chart-svg"
      role="img"
      @mouseleave="hideTip"
    >
      <line :x1="pad.l" :y1="H - pad.b" :x2="W - pad.r" :y2="H - pad.b" class="dac-axis" />
      <line :x1="pad.l" :y1="pad.t" :x2="pad.l" :y2="H - pad.b" class="dac-axis" />

      <template v-for="(series, si) in seriesList" :key="si">
        <polygon
          v-if="kind === 'area'"
          :points="areaPoints(series)"
          :fill="color(si)"
          fill-opacity="0.18"
          stroke="none"
        />
        <polyline
          v-if="kind === 'line' || kind === 'area'"
          :points="linePoints(series)"
          fill="none"
          :stroke="color(si)"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
        <template v-if="kind === 'bar'">
          <rect
            v-for="(v, pi) in series.values"
            :key="pi"
            :x="barX(pi, si)"
            :y="v === null ? zeroY : Math.min(scaleY(v), zeroY)"
            :width="barWidth"
            :height="v === null ? 0 : Math.abs(scaleY(v) - zeroY)"
            :fill="color(si)"
            :fill-opacity="hover.point === null || hover.point === pi ? 1 : 0.45"
            @mousemove="showBarTip($event, pi, si, v)"
            @mouseleave="hideTip"
          />
        </template>
      </template>

      <template v-if="(kind === 'line' || kind === 'area') && hover.point !== null">
        <line
          :x1="scaleX(hover.point)"
          :y1="pad.t"
          :x2="scaleX(hover.point)"
          :y2="H - pad.b"
          class="dac-guide"
        />
        <template v-for="(series, si) in seriesList" :key="`d${si}`">
          <circle
            v-if="series.values[hover.point] !== null"
            :cx="scaleX(hover.point)"
            :cy="scaleY(series.values[hover.point] as number)"
            r="3.5"
            :fill="color(si)"
          />
        </template>
      </template>

      <template v-if="kind === 'line' || kind === 'area'">
        <rect
          v-for="(_, i) in points"
          :key="`h${i}`"
          :x="colX(i)"
          :y="pad.t"
          :width="colWidth"
          :height="H - pad.t - pad.b"
          fill="transparent"
          @mousemove="showColumnTip($event, i)"
          @mouseleave="hideTip"
        />
      </template>
    </svg>

    <!-- pie / donut -->
    <svg
      v-else-if="kind === 'pie' && pieSlices.length"
      :viewBox="`0 0 ${H} ${H}`"
      class="dac-chart-svg"
      role="img"
      @mouseleave="hideTip"
    >
      <path
        v-for="(slice, i) in pieSlices"
        :key="i"
        :d="slice.d"
        :fill="color(i)"
        :fill-opacity="hover.point === null || hover.point === i ? 1 : 0.5"
        @mousemove="showPieTip($event, i)"
        @mouseleave="hideTip"
      />
    </svg>

    <!-- gauge -->
    <div v-else-if="kind === 'gauge' && gauge" class="dac-gauge">
      <svg viewBox="0 0 240 140" class="dac-chart-svg dac-gauge-svg" preserveAspectRatio="xMidYMid meet">
        <polyline :points="gaugePts(1)" class="dac-gauge-track" />
        <polyline :points="gaugePts(gauge.frac)" :stroke="color(0)" class="dac-gauge-fill" />
      </svg>
      <div class="dac-gauge-value">{{ fmt(gauge.cur) }}</div>
      <div class="dac-gauge-sub">
        {{ (gauge.frac * 100).toFixed(0) }}% of {{ fmt(gauge.tgt) }} target
      </div>
    </div>

    <!-- treemap (HTML tiles keep labels crisp & fill width) -->
    <div v-else-if="kind === 'treemap' && treemap.length" class="dac-treemap">
      <div
        v-for="(t, i) in treemap"
        :key="i"
        class="dac-tile"
        :style="{
          left: `${t.x * 100}%`,
          top: `${t.y * 100}%`,
          width: `${t.w * 100}%`,
          height: `${t.h * 100}%`,
          background: color(t.idx),
        }"
        :title="`${t.label}: ${fmt(t.value)}`"
      >
        <span v-if="t.w > 0.1 && t.h > 0.14" class="dac-tile-text">
          <span class="dac-tile-label">{{ t.label }}</span>
          <span class="dac-tile-value">{{ fmt(t.value) }}</span>
        </span>
      </div>
    </div>

    <!-- radar -->
    <svg
      v-else-if="kind === 'radar' && radar"
      viewBox="0 0 260 260"
      class="dac-chart-svg"
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <polygon v-for="(ring, i) in radar.rings" :key="`r${i}`" :points="ring" class="dac-radar-ring" />
      <line
        v-for="(ax, i) in radar.axisEnds"
        :key="`a${i}`"
        :x1="radar.cx"
        :y1="radar.cy"
        :x2="ax.x"
        :y2="ax.y"
        class="dac-radar-ring"
      />
      <polygon
        v-for="(poly, si) in radar.polys"
        :key="`p${si}`"
        :points="poly.points"
        :stroke="poly.color"
        :fill="poly.color"
        fill-opacity="0.12"
        stroke-width="2"
      />
      <text
        v-for="(ax, i) in radar.axisEnds"
        :key="`t${i}`"
        :x="ax.lx"
        :y="ax.ly"
        class="dac-radar-label"
        :text-anchor="ax.lx < radar.cx - 5 ? 'end' : ax.lx > radar.cx + 5 ? 'start' : 'middle'"
      >{{ ax.label }}</text>
    </svg>

    <!-- candlestick -->
    <svg
      v-else-if="kind === 'candlestick' && candles"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      class="dac-chart-svg"
      role="img"
      @mouseleave="hideTip"
    >
      <line :x1="pad.l" :y1="H - pad.b" :x2="W - pad.r" :y2="H - pad.b" class="dac-axis" />
      <template v-for="(c, i) in candles" :key="i">
        <line
          v-if="c.h !== null && c.l !== null"
          :x1="candleX(i)"
          :y1="scaleYC(c.h)"
          :x2="candleX(i)"
          :y2="scaleYC(c.l)"
          :stroke="candleColor(c)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
        <rect
          v-if="c.o !== null && c.c !== null"
          :x="candleX(i) - candleBodyW / 2"
          :y="Math.min(scaleYC(c.o), scaleYC(c.c))"
          :width="candleBodyW"
          :height="Math.max(Math.abs(scaleYC(c.o) - scaleYC(c.c)), 1)"
          :fill="candleColor(c)"
        />
        <rect
          :x="candleX(i) - candleSlot / 2"
          :y="pad.t"
          :width="candleSlot"
          :height="H - pad.t - pad.b"
          fill="transparent"
          @mousemove="showCandleTip($event, i)"
          @mouseleave="hideTip"
        />
      </template>
    </svg>

    <div v-else class="dac-chart-fallback">
      <DacTable :widget="widget" :result="result" />
    </div>

    <div v-if="showLegend" class="dac-legend">
      <span v-for="(label, i) in legendLabels" :key="i" class="dac-legend-item">
        <span class="dac-legend-swatch" :style="{ background: color(i) }"></span>{{ label }}
      </span>
    </div>

    <div v-if="tip.show" class="dac-tooltip" :style="{ left: `${tip.left}px`, top: `${tip.top}px` }">
      <div class="dac-tip-title">{{ tip.title }}</div>
      <div v-for="(row, i) in tip.rows" :key="i" class="dac-tip-row">
        <span class="dac-tip-swatch" :style="{ background: row.color }"></span>
        <span class="dac-tip-label">{{ row.label }}</span>
        <span class="dac-tip-value">{{ row.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { DacWidget, DacWidgetResult } from "./types";
import { columnIndex, toNumber } from "./format";
import DacTable from "./DacTable.vue";

const props = defineProps<{ widget: DacWidget; result?: DacWidgetResult }>();

const W = 640;
const H = 240;
const pad = { t: 12, r: 12, b: 28, l: 44 };

const PALETTE = [
  "--vscode-charts-blue",
  "--vscode-charts-green",
  "--vscode-charts-orange",
  "--vscode-charts-purple",
  "--vscode-charts-red",
  "--vscode-charts-yellow",
  "--vscode-charts-foreground",
];
function color(i: number): string {
  return `var(${PALETTE[i % PALETTE.length]})`;
}

const kind = computed(() => {
  const c = (props.widget.chart || "").toLowerCase();
  if (["bar", "column"].includes(c)) {
    return "bar";
  }
  if (["line", "spline"].includes(c)) {
    return "line";
  }
  if (["area"].includes(c)) {
    return "area";
  }
  if (["pie", "donut", "doughnut"].includes(c)) {
    return "pie";
  }
  if (c === "gauge") {
    return "gauge";
  }
  if (c === "treemap") {
    return "treemap";
  }
  if (c === "radar") {
    return "radar";
  }
  if (c === "candlestick") {
    return "candlestick";
  }
  return "table";
});
const cartesian = computed(() => ["bar", "line", "area"].includes(kind.value));

const cols = computed(() => props.result?.columns ?? []);
const rows = computed(() => props.result?.rows ?? []);
function idx(name?: string, fallback = -1): number {
  const i = columnIndex(cols.value, name);
  return i >= 0 ? i : fallback;
}

const xIndex = computed(() => idx(props.widget.x, 0));

const yColumns = computed(() => {
  const y = props.widget.y && props.widget.y.length ? props.widget.y : undefined;
  if (y) {
    return y.map((name) => ({ name, index: columnIndex(cols.value, name) })).filter((c) => c.index >= 0);
  }
  return cols.value
    .map((c, i) => ({ name: c.name, index: i }))
    .filter((c) => c.index !== xIndex.value);
});

const points = computed(() => rows.value.map((r) => String(r[xIndex.value] ?? "")));

interface Series {
  name: string;
  values: (number | null)[];
}
const seriesList = computed<Series[]>(() =>
  yColumns.value.map((yc) => ({
    name: yc.name,
    values: rows.value.map((r) => toNumber(r[yc.index])),
  }))
);

// Domain spans the data's min/max but always includes zero, so negative
// values render below the zero baseline instead of falling off the viewport.
const yDomain = computed(() => {
  let min = 0;
  let max = 0;
  for (const s of seriesList.value) {
    for (const v of s.values) {
      if (v === null) {
        continue;
      }
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
  }
  if (min === 0 && max === 0) {
    max = 1;
  }
  return { min, max };
});

function scaleY(v: number): number {
  const h = H - pad.t - pad.b;
  const { min, max } = yDomain.value;
  const span = max - min || 1;
  return H - pad.b - ((v - min) / span) * h;
}
const zeroY = computed(() => scaleY(0));
function scaleX(i: number): number {
  const n = Math.max(points.value.length - 1, 1);
  const w = W - pad.l - pad.r;
  return pad.l + (i / n) * w;
}
function linePoints(series: Series): string {
  return series.values
    .map((v, i) => (v === null ? null : `${scaleX(i)},${scaleY(v)}`))
    .filter(Boolean)
    .join(" ");
}
function areaPoints(series: Series): string {
  const line = linePoints(series);
  if (!line) {
    return "";
  }
  const base = zeroY.value;
  return `${scaleX(0)},${base} ${line} ${scaleX(points.value.length - 1)},${base}`;
}

const barWidth = computed(() => {
  const slot = (W - pad.l - pad.r) / Math.max(points.value.length, 1);
  return Math.max((slot * 0.7) / Math.max(seriesList.value.length, 1), 1);
});
function barX(pointIndex: number, seriesIndex: number): number {
  const slot = (W - pad.l - pad.r) / Math.max(points.value.length, 1);
  return pad.l + pointIndex * slot + slot * 0.15 + seriesIndex * barWidth.value;
}

const colWidth = computed(() => (W - pad.l - pad.r) / Math.max(points.value.length, 1));
function colX(i: number): number {
  return scaleX(i) - colWidth.value / 2;
}

const pieSlices = computed(() => {
  if (kind.value !== "pie") {
    return [];
  }
  const valIdx = yColumns.value[0]?.index ?? -1;
  if (valIdx < 0) {
    return [];
  }
  const values = rows.value.map((r) => Math.max(toNumber(r[valIdx]) ?? 0, 0));
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return [];
  }
  const cx = H / 2;
  const cy = H / 2;
  const rad = H / 2 - 8;
  let angle = -Math.PI / 2;
  return values.map((v) => {
    const slice = (v / total) * Math.PI * 2;
    const x1 = cx + rad * Math.cos(angle);
    const y1 = cy + rad * Math.sin(angle);
    angle += slice;
    const x2 = cx + rad * Math.cos(angle);
    const y2 = cy + rad * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${rad} ${rad} 0 ${large} 1 ${x2} ${y2} Z`, value: v, total };
  });
});

// --- gauge ---
const gauge = computed(() => {
  if (kind.value !== "gauge") {
    return null;
  }
  const cur = toNumber(rows.value[0]?.[idx(props.widget.value, 0)]) ?? 0;
  const ti = idx(props.widget.target);
  const tgt = ti >= 0 ? toNumber(rows.value[0]?.[ti]) ?? 0 : 0;
  return { cur, tgt, frac: tgt > 0 ? cur / tgt : 0 };
});
function gaugePts(frac: number): string {
  const cx = 120;
  const cy = 125;
  const r = 104;
  const n = 60;
  const f = Math.max(0, Math.min(frac, 1));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * f * Math.PI;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

// --- treemap (unit-box layout, rendered as % positioned tiles) ---
interface Tile {
  label: string;
  value: number;
  idx: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
const treemap = computed<Tile[]>(() => {
  if (kind.value !== "treemap") {
    return [];
  }
  const li = idx(props.widget.label, 0);
  const vi = idx(props.widget.value, 1);
  const items = rows.value
    .map((r, i) => ({ label: String(r[li] ?? ""), value: Math.max(toNumber(r[vi]) ?? 0, 0), idx: i }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  const out: Tile[] = [];
  splitTiles(items, 0, 0, 1, 1, out);
  return out;
});
function splitTiles(
  items: { label: string; value: number; idx: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  out: Tile[]
): void {
  if (!items.length) {
    return;
  }
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return;
  }
  const total = items.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  let k = 0;
  while (k < items.length - 1 && acc + items[k].value < total / 2) {
    acc += items[k].value;
    k++;
  }
  const a = items.slice(0, k + 1);
  const b = items.slice(k + 1);
  const frac = (acc + items[k].value) / total || 0;
  if (w >= h) {
    splitTiles(a, x, y, w * frac, h, out);
    splitTiles(b, x + w * frac, y, w * (1 - frac), h, out);
  } else {
    splitTiles(a, x, y, w, h * frac, out);
    splitTiles(b, x, y + h * frac, w, h * (1 - frac), out);
  }
}

// --- radar ---
const radar = computed(() => {
  if (kind.value !== "radar") {
    return null;
  }
  const axes = points.value;
  const n = axes.length;
  if (n < 3) {
    return null;
  }
  const series = seriesList.value;
  let mx = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v !== null && v > mx) {
        mx = v;
      }
    }
  }
  mx = mx || 1;
  const cx = 130;
  const cy = 130;
  const R = 88;
  const at = (k: number, val: number): [number, number] => {
    const a = -Math.PI / 2 + k * ((2 * Math.PI) / n);
    const r = R * (val / mx);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const polys = series.map((s, si) => ({
    color: color(si),
    points: s.values.map((v, k) => at(k, v ?? 0).join(",")).join(" "),
  }));
  const axisEnds = axes.map((label, k) => {
    const a = -Math.PI / 2 + k * ((2 * Math.PI) / n);
    return {
      x: cx + R * Math.cos(a),
      y: cy + R * Math.sin(a),
      lx: cx + (R + 16) * Math.cos(a),
      ly: cy + (R + 16) * Math.sin(a),
      label,
    };
  });
  const rings = [0.25, 0.5, 0.75, 1].map((f) => axes.map((_, k) => at(k, mx * f).join(",")).join(" "));
  return { cx, cy, R, polys, axisEnds, rings };
});

// --- candlestick ---
interface Candle {
  x: string;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number | null;
}
const candles = computed<Candle[] | null>(() => {
  if (kind.value !== "candlestick") {
    return null;
  }
  const oi = idx(props.widget.open);
  const hi = idx(props.widget.high);
  const li = idx(props.widget.low);
  const ci = idx(props.widget.close);
  if ([oi, hi, li, ci].some((i) => i < 0)) {
    return null;
  }
  const xi = idx(props.widget.x, 0);
  return rows.value.map((r) => ({
    x: String(r[xi] ?? ""),
    o: toNumber(r[oi]),
    h: toNumber(r[hi]),
    l: toNumber(r[li]),
    c: toNumber(r[ci]),
  }));
});
const candleRange = computed(() => {
  let mn = Infinity;
  let mx = -Infinity;
  for (const d of candles.value ?? []) {
    if (d.l !== null) {
      mn = Math.min(mn, d.l);
    }
    if (d.h !== null) {
      mx = Math.max(mx, d.h);
    }
  }
  if (!isFinite(mn)) {
    mn = 0;
    mx = 1;
  }
  return { mn, mx };
});
function scaleYC(v: number): number {
  const { mn, mx } = candleRange.value;
  const h = H - pad.t - pad.b;
  return H - pad.b - ((v - mn) / (mx - mn || 1)) * h;
}
const candleSlot = computed(() => (W - pad.l - pad.r) / Math.max(candles.value?.length ?? 1, 1));
const candleBodyW = computed(() => Math.max(candleSlot.value * 0.6, 1));
function candleX(i: number): number {
  return pad.l + (i + 0.5) * candleSlot.value;
}
function candleColor(c: Candle): string {
  return (c.c ?? 0) >= (c.o ?? 0) ? "var(--vscode-charts-green)" : "var(--vscode-charts-red)";
}

// --- legend + tooltip ---
const isRadar = computed(() => kind.value === "radar");
const legendLabels = computed(() =>
  kind.value === "pie" ? points.value : seriesList.value.map((s) => s.name)
);
const showLegend = computed(
  () =>
    (cartesian.value && seriesList.value.length > 1) ||
    (kind.value === "pie" && pieSlices.value.length > 0) ||
    (isRadar.value && seriesList.value.length > 1)
);

const chartEl = ref<HTMLElement | null>(null);
const hover = reactive<{ point: number | null }>({ point: null });
const tip = reactive<{
  show: boolean;
  left: number;
  top: number;
  title: string;
  rows: { label: string; value: string; color: string }[];
}>({ show: false, left: 0, top: 0, title: "", rows: [] });

function fmt(v: number | null): string {
  return v === null ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function position(e: MouseEvent): void {
  const el = chartEl.value;
  if (!el) {
    return;
  }
  const rect = el.getBoundingClientRect();
  let left = e.clientX - rect.left + 14;
  left = Math.min(left, rect.width - 170);
  tip.left = Math.max(left, 4);
  tip.top = e.clientY - rect.top + 14;
}
function showBarTip(e: MouseEvent, pi: number, si: number, v: number | null): void {
  hover.point = pi;
  tip.show = true;
  tip.title = points.value[pi];
  tip.rows = [{ label: seriesList.value[si].name, value: fmt(v), color: color(si) }];
  position(e);
}
function showColumnTip(e: MouseEvent, i: number): void {
  hover.point = i;
  tip.show = true;
  tip.title = points.value[i];
  tip.rows = seriesList.value.map((s, si) => ({ label: s.name, value: fmt(s.values[i]), color: color(si) }));
  position(e);
}
function showPieTip(e: MouseEvent, i: number): void {
  hover.point = i;
  const slice = pieSlices.value[i];
  const pct = slice ? ((slice.value / slice.total) * 100).toFixed(1) : "0";
  tip.show = true;
  tip.title = points.value[i];
  tip.rows = [{ label: fmt(slice?.value ?? 0), value: `${pct}%`, color: color(i) }];
  position(e);
}
function showCandleTip(e: MouseEvent, i: number): void {
  const c = candles.value?.[i];
  if (!c) {
    return;
  }
  tip.show = true;
  tip.title = c.x;
  tip.rows = [
    { label: "Open", value: fmt(c.o), color: candleColor(c) },
    { label: "High", value: fmt(c.h), color: candleColor(c) },
    { label: "Low", value: fmt(c.l), color: candleColor(c) },
    { label: "Close", value: fmt(c.c), color: candleColor(c) },
  ];
  position(e);
}
function hideTip(): void {
  tip.show = false;
  hover.point = null;
}
</script>

<style scoped>
.dac-chart {
  width: 100%;
  position: relative;
}
.dac-chart-svg {
  width: 100%;
  height: 240px;
  display: block;
}
.dac-axis {
  stroke: var(--vscode-editorWidget-border, var(--vscode-panel-border));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.dac-guide {
  stroke: var(--vscode-descriptionForeground);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  vector-effect: non-scaling-stroke;
  opacity: 0.6;
}
/* gauge */
.dac-gauge {
  text-align: center;
}
.dac-gauge-svg {
  height: 150px;
}
.dac-gauge-track {
  fill: none;
  stroke: var(--vscode-editorWidget-border, var(--vscode-panel-border));
  stroke-width: 16;
  stroke-linecap: round;
}
.dac-gauge-fill {
  fill: none;
  stroke-width: 16;
  stroke-linecap: round;
}
.dac-gauge-value {
  font-size: 26px;
  font-weight: 600;
  margin-top: -18px;
  color: var(--vscode-foreground);
}
.dac-gauge-sub {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
}
/* treemap */
.dac-treemap {
  position: relative;
  width: 100%;
  height: 240px;
}
.dac-tile {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--vscode-editorWidget-background, var(--vscode-editor-background));
  overflow: hidden;
  display: flex;
  align-items: flex-start;
}
.dac-tile-text {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  min-width: 0;
}
.dac-tile-label {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dac-tile-value {
  font-size: 11px;
  opacity: 0.9;
}
/* radar */
.dac-radar-ring {
  fill: none;
  stroke: var(--vscode-editorWidget-border, var(--vscode-panel-border));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.dac-radar-label {
  fill: var(--vscode-descriptionForeground);
  font-size: 9px;
}
/* legend */
.dac-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
.dac-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.dac-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.dac-chart-fallback {
  width: 100%;
}
/* tooltip */
.dac-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 30;
  min-width: 120px;
  max-width: 220px;
  background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background));
  color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground));
  border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-panel-border));
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.dac-tip-title {
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dac-tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dac-tip-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dac-tip-label {
  color: var(--vscode-descriptionForeground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dac-tip-value {
  margin-left: auto;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
