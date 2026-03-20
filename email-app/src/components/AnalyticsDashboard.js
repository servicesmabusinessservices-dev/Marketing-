import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import KPICard from './ui/KPICard';
import ChartCard from './ui/ChartCard';
import InsightCard from './ui/InsightCard';
import { KPIRowSkeleton, ChartSkeleton, InsightSkeleton } from './ui/PageSkeleton';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import '../components/ui/DashboardCards.css';
import { useAnalytics } from '../hooks/useApi';
import { generateAnalyticsInsights } from '../utils/insightEngine';
import {
  STAGE_COLORS, CHART_COLORS, CHART_PALETTE, CHART_HEIGHT, DONUT_INNER_RATIO,
  getThemeStyles,
} from '../utils/chartTheme';

const formatNumber = (v) => {
  const safe = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safe);
};

const metricValue = (value, suffix = '') => (value === 0 || value) ? `${value}${suffix}` : '--';

/* ── Custom Tooltips ──────────────────────────────── */

const FunnelTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const theme = getThemeStyles();
  return <div style={theme.tooltip}><strong>{d.name}</strong>: {formatNumber(d.value)}</div>;
};

const ConversionTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const theme = getThemeStyles();
  return <div style={theme.tooltip}><strong>{d.name}</strong>: {d.value}%</div>;
};

const JourneyPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const theme = getThemeStyles();
  return <div style={theme.tooltip}><strong>{d.name}</strong>: {d.value}</div>;
};

/* ── Pie Chart custom label ── */
const renderPieCenter = (total) => ({ cx, cy }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", fill: 'var(--text-primary)' }}>
    {total}
  </text>
);

/* ── Main Component ───────────────────────────────── */

const AnalyticsDashboard = () => {
  const { showFeedback } = useFeedback();
  const [days, setDays] = useState(30);
  const [ownerEmail, setOwnerEmail] = useState('');

  const { data, isLoading, isError, refetch } = useAnalytics({
    days,
    ownerEmail: ownerEmail || undefined
  });

  React.useEffect(() => {
    if (isError) showFeedback('Failed to load analytics.', 'error');
  }, [isError, showFeedback]);

  const stageFunnel = data?.stageFunnel || {};
  const conversionRates = data?.conversionRates || {};
  const engagement = data?.engagement || {};
  const journeyPerformance = data?.journeyPerformance || {};
  const ownerWorkload = data?.ownerWorkload || [];
  const transitions = data?.transitions || [];

  const hasAnyData = useMemo(() =>
    Object.values(stageFunnel).some((v) => v > 0) ||
    ownerWorkload.length > 0 ||
    transitions.length > 0 ||
    Boolean(engagement.sent) ||
    Boolean(journeyPerformance.active) ||
    Boolean(journeyPerformance.completed) ||
    Boolean(journeyPerformance.failed) ||
    Boolean(journeyPerformance.paused),
    [stageFunnel, ownerWorkload, transitions, engagement, journeyPerformance]
  );

  /* ── Chart data ── */
  const funnelChartData = useMemo(() => [
    { name: 'New', value: stageFunnel.New || 0, fill: STAGE_COLORS.New },
    { name: 'Qualified', value: stageFunnel.Qualified || 0, fill: STAGE_COLORS.Qualified },
    { name: 'Proposal', value: stageFunnel.Proposal || 0, fill: STAGE_COLORS.Proposal },
    { name: 'Won', value: stageFunnel.Won || 0, fill: STAGE_COLORS.Won },
  ], [stageFunnel]);

  const conversionChartData = useMemo(() => [
    { name: 'New → Qual', value: conversionRates.newToQualified || 0, fill: STAGE_COLORS.New },
    { name: 'Qual → Prop', value: conversionRates.qualifiedToProposal || 0, fill: STAGE_COLORS.Qualified },
    { name: 'Prop → Won', value: conversionRates.proposalToWon || 0, fill: STAGE_COLORS.Proposal },
    { name: 'Win Rate', value: conversionRates.overallWinRate || 0, fill: STAGE_COLORS.Won },
  ], [conversionRates]);

  const journeyPieData = useMemo(() => {
    const items = [
      { name: 'Active', value: journeyPerformance.active || 0 },
      { name: 'Completed', value: journeyPerformance.completed || 0 },
      { name: 'Failed', value: journeyPerformance.failed || 0 },
      { name: 'Paused', value: journeyPerformance.paused || 0 },
    ];
    return items.filter((i) => i.value > 0);
  }, [journeyPerformance]);

  const journeyTotal = useMemo(
    () => journeyPieData.reduce((s, d) => s + d.value, 0),
    [journeyPieData]
  );

  const JOURNEY_COLORS = [CHART_COLORS.emerald, CHART_COLORS.primary, CHART_COLORS.rose, CHART_COLORS.amber];

  /* ── Insights ── */
  const insights = useMemo(
    () => generateAnalyticsInsights({ engagement, stageFunnel, conversionRates, journeyPerformance, ownerWorkload }),
    [engagement, stageFunnel, conversionRates, journeyPerformance, ownerWorkload]
  );

  const theme = getThemeStyles();

  return (
    <div className="content fade-in">
      {/* ── Header + Filters ── */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <h1>Analytics</h1>
          <span className="analytics-subtitle">Email &amp; pipeline performance</span>
        </div>
        <div className="analytics-header-right">
          <div role="group" aria-label="Analytics date range">
            {[7, 30, 90, 180].map((value) => (
              <button
                type="button"
                key={value}
                className={`filter-chip ${days === value ? 'active' : ''}`}
                onClick={() => setDays(value)}
                aria-pressed={days === value}
              >
                {value}d
              </button>
            ))}
          </div>
          <input
            type="text"
            className="analytics-owner-input"
            aria-label="Filter analytics by owner email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Owner email"
          />
          <button type="button" className="refresh-btn" onClick={refetch}>
            <Icon name="refresh" size={14} color="currentColor" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Loading / Error / Empty ── */}
      {isLoading ? (
        <>
          <KPIRowSkeleton count={4} />
          <div className="charts-row"><ChartSkeleton /><ChartSkeleton /></div>
          <InsightSkeleton />
        </>
      ) : isError ? (
        <ErrorState message="Failed to load analytics." onRetry={refetch} />
      ) : !hasAnyData ? (
        <EmptyState
          icon="-"
          title="No analytics data yet"
          subtitle="Data will appear after emails, events, and journeys start flowing."
          action={{ label: 'Refresh', onClick: refetch }}
        />
      ) : (
        <>
          {/* ── KPI Row (4 cards) ── */}
          <div className="kpi-grid kpi-grid--4">
            <KPICard label="Total Sent" value={metricValue(engagement.sent)} change={`Last ${days}d`} changeDirection="neutral" icon="send" accentColor="primary" />
            <KPICard label="Open Rate" value={metricValue(engagement.openRate, '%')} change={`Last ${days}d`} changeDirection="neutral" icon="mail" accentColor="amber" />
            <KPICard label="Click Rate" value={metricValue(engagement.clickRate, '%')} change={`Last ${days}d`} changeDirection="neutral" icon="cursor" accentColor="emerald" />
            <KPICard label="Reply Rate" value={metricValue(engagement.replyRate, '%')} change={`Last ${days}d`} changeDirection="neutral" icon="reply" accentColor="blue" />
          </div>

          {/* ── Primary Charts ── */}
          <div className="charts-row">
            <ChartCard title="Lead Funnel" subtitle="Leads by pipeline stage" icon="pipeline">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={funnelChartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                  <CartesianGrid horizontal={false} {...theme.grid} />
                  <XAxis type="number" tick={theme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={theme.axisTick} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<FunnelTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {funnelChartData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Conversion Rates" subtitle="Stage-to-stage %" icon="trending">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={conversionChartData} margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                  <CartesianGrid vertical={false} {...theme.grid} />
                  <XAxis dataKey="name" tick={theme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axisTick} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<ConversionTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {conversionChartData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Secondary Widgets ── */}
          <div className="secondary-row">
            {/* Journey Performance — Donut */}
            <ChartCard title="Journey Performance" icon="journey">
              {journeyPieData.length === 0 ? (
                <div className="empty-state empty-state-sm" style={{ padding: 24 }}>
                  <p>No journey data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={journeyPieData}
                      innerRadius={CHART_HEIGHT * DONUT_INNER_RATIO * 0.4}
                      outerRadius={CHART_HEIGHT * 0.4}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderPieCenter(journeyTotal)}
                      labelLine={false}
                    >
                      {journeyPieData.map((_, i) => (
                        <Cell key={i} fill={JOURNEY_COLORS[i % JOURNEY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<JourneyPieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Owner Workload — Table */}
            <ChartCard title="Owner Workload" icon="users">
              <div style={{ overflowX: 'auto' }}>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Contacts</th>
                      <th>Open</th>
                      <th>Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerWorkload.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No owner data</td></tr>
                    ) : ownerWorkload.map((owner) => (
                      <tr key={owner.ownerEmail}>
                        <td style={{ fontWeight: 600 }}>{owner.ownerEmail}</td>
                        <td className="count-cell">{owner.contacts}</td>
                        <td className="count-cell">{owner.openTasks}</td>
                        <td className="count-cell" style={owner.overdueTasks > 0 ? { color: 'var(--rose)', fontWeight: 600 } : undefined}>{owner.overdueTasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {/* Stage Transitions — Table */}
            <ChartCard title="Stage Transitions" icon="bar">
              <div style={{ overflowX: 'auto' }}>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transitions.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No transitions yet</td></tr>
                    ) : transitions.map((t, i) => (
                      <tr key={`${t.fromStage}-${t.toStage}-${i}`}>
                        <td style={{ fontWeight: 600 }}>{t.fromStage || 'None'}</td>
                        <td>{t.toStage}</td>
                        <td className="count-cell">{t.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {/* ── Insights Panel ── */}
          <InsightCard insights={insights} />
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
