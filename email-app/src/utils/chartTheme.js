/* Shared Recharts theme constants — reads CSS custom properties at render time */

const getCSSVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Color palette for chart series (index-based) */
export const CHART_COLORS = {
  primary: '#4F46E5',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#38bdf8',
  purple: '#6366f1',
};

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
];

/** Stage-specific colors matching the CRM pipeline */
export const STAGE_COLORS = {
  New: '#38bdf8',
  Qualified: '#f59e0b',
  Proposal: '#6366f1',
  Won: '#10b981',
  Lost: '#f43f5e',
};

/** Shared axis tick style */
export const AXIS_TICK_STYLE = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 12,
  fill: '#8094b0',
};

/** Shared axis tick style for light theme */
export const AXIS_TICK_STYLE_LIGHT = {
  ...AXIS_TICK_STYLE,
  fill: '#64748b',
};

/** Tooltip wrapper style */
export const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  color: '#ffffff',
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
};

export const TOOLTIP_STYLE_LIGHT = {
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  boxShadow: '0 4px 20px rgba(15,23,42,0.12)',
  color: '#0f172a',
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
};

/** Minimal grid line style */
export const GRID_STYLE = {
  stroke: 'rgba(255,255,255,0.06)',
  strokeDasharray: '3 3',
};

export const GRID_STYLE_LIGHT = {
  stroke: 'rgba(15,23,42,0.06)',
  strokeDasharray: '3 3',
};

/** Detect active theme */
export const isLightTheme = () =>
  document.documentElement.classList.contains('light-theme') ||
  document.querySelector('.light-theme') !== null;

/** Get theme-aware styles */
export const getThemeStyles = () => {
  const light = isLightTheme();
  return {
    axisTick: light ? AXIS_TICK_STYLE_LIGHT : AXIS_TICK_STYLE,
    tooltip: light ? TOOLTIP_STYLE_LIGHT : TOOLTIP_STYLE,
    grid: light ? GRID_STYLE_LIGHT : GRID_STYLE,
  };
};

/** Default responsive container height */
export const CHART_HEIGHT = 280;

/** Donut inner radius ratio (for pie charts) */
export const DONUT_INNER_RATIO = 0.62;
