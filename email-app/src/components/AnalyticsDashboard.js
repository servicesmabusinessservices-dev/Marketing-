import React, { useState } from 'react';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import AnimatedCard from './ui/AnimatedCard';
import { useAnalytics } from '../hooks/useApi';
import LoadingSpinner from './ui/LoadingSpinner';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import { getStageColorVar, JOURNEY_ICON_COLOR } from '../utils/uiColorMaps';

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

  const metricValue = (value, suffix = '') => {
    if (value === 0 || value) {
      return `${value}${suffix}`;
    }
    return '--';
  };

  const funnelMax = stageFunnel.New || 0;
  const funnelData = [
    { label: 'New', count: stageFunnel.New || 0, pct: funnelMax ? Math.round((stageFunnel.New || 0) / funnelMax * 100) : 0, color: getStageColorVar('New') },
    { label: 'Qualified', count: stageFunnel.Qualified || 0, pct: funnelMax ? Math.round((stageFunnel.Qualified || 0) / funnelMax * 100) : 0, color: getStageColorVar('Qualified') },
    { label: 'Proposal', count: stageFunnel.Proposal || 0, pct: funnelMax ? Math.round((stageFunnel.Proposal || 0) / funnelMax * 100) : 0, color: getStageColorVar('Proposal') },
    { label: 'Won', count: stageFunnel.Won || 0, pct: funnelMax ? Math.round((stageFunnel.Won || 0) / funnelMax * 100) : 0, color: getStageColorVar('Won') }
  ];

  const hasAnyData =
    funnelData.some((f) => f.count > 0) ||
    ownerWorkload.length > 0 ||
    transitions.length > 0 ||
    Boolean(engagement.sent) ||
    Boolean(journeyPerformance.active) ||
    Boolean(journeyPerformance.completed) ||
    Boolean(journeyPerformance.failed) ||
    Boolean(journeyPerformance.paused);

  return (
    <div className="content fade-in">
      <div className="analytics-toolbar-row">
        <div className="analytics-chip-row" role="group" aria-label="Analytics date range">
          {[7, 30, 90, 180].map((value) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${days === value ? 'active' : ''}`}
              onClick={() => setDays(value)}
              aria-pressed={days === value}
            >
              Last {value} days
            </button>
          ))}
        </div>
        <input
          type="text"
          className="form-input analytics-owner-input"
          aria-label="Filter analytics by owner email"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          placeholder="Filter by owner email"
        />
        <div className="analytics-toolbar-action ml-auto">
          <button type="button" className="topbar-btn" onClick={refetch}>Refresh</button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading analytics..." />
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
          <div className="stats-grid">
            {[
              { label: 'Total Sent', value: metricValue(engagement.sent, ''), color: 'blue' },
              { label: 'Open Rate', value: metricValue(engagement.openRate, '%'), color: 'amber' },
              { label: 'Click Rate', value: metricValue(engagement.clickRate, '%'), color: 'emerald' },
              { label: 'Reply Rate', value: metricValue(engagement.replyRate, '%'), color: 'rose' }
            ].map((stat) => (
              <AnimatedCard key={stat.label} className={`stat-card ${stat.color}`}>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </AnimatedCard>
            ))}
          </div>

          <div className="analytics-row">
            <div className="card">
              <div className="card-header">
                <Icon name="pipeline" size={14} color="var(--blue)" />
                <span className="card-title">Lead Funnel</span>
              </div>
              <div className="card-body">
                <div className="funnel-bar-wrap">
                  {funnelData.map((funnel) => (
                    <div key={funnel.label} className="funnel-bar-row">
                      <div className="funnel-label">{funnel.label}</div>
                      <div className="funnel-bar">
                        <div className="funnel-fill" style={{ width: `${funnel.pct}%`, background: funnel.color }} />
                      </div>
                      <div className="funnel-num">{funnel.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <Icon name="zap" size={14} color="var(--emerald)" />
                <span className="card-title">Conversion Rates</span>
              </div>
              <div className="card-body">
                <div className="rate-grid">
                  {[
                    { label: 'New to Qualified', val: metricValue(conversionRates.newToQualified, '%'), note: 'vs last month' },
                    { label: 'Qualified to Proposal', val: metricValue(conversionRates.qualifiedToProposal, '%'), note: 'vs last month' },
                    { label: 'Proposal to Won', val: metricValue(conversionRates.proposalToWon, '%'), note: 'vs last month' },
                    { label: 'Overall Win Rate', val: metricValue(conversionRates.overallWinRate, '%'), note: 'industry avg' }
                  ].map((rate) => (
                    <div key={rate.label} className="rate-item">
                      <div className="rate-label">{rate.label}</div>
                      <div className="rate-value">{rate.val}</div>
                      <div className="rate-sub">{rate.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <Icon name="journey" size={14} color={JOURNEY_ICON_COLOR} />
                <span className="card-title">Journey Performance</span>
              </div>
              <div className="card-body">
                {[
                  { label: 'Active', value: journeyPerformance.active || 0 },
                  { label: 'Completed', value: journeyPerformance.completed || 0 },
                  { label: 'Failed', value: journeyPerformance.failed || 0 },
                  { label: 'Paused', value: journeyPerformance.paused || 0 }
                ].map((row) => (
                  <div key={row.label} className="analytics-kv-row">
                    <div className="analytics-kv-label-wrap">
                      <div className="analytics-kv-label">{row.label}</div>
                    </div>
                    <div className="analytics-kv-value">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card card-stack">
            <div className="card-header">
              <Icon name="users" size={14} color="var(--indigo)" />
              <span className="card-title">Owner Workload</span>
            </div>
            <div className="card-body card-body-flush">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Contacts</th>
                      <th>Open Tasks</th>
                      <th>Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerWorkload.map((owner) => (
                      <tr key={owner.ownerEmail}>
                        <td className="bold">{owner.ownerEmail}</td>
                        <td>{owner.contacts}</td>
                        <td>{owner.openTasks}</td>
                        <td className={owner.overdueTasks > 0 ? 'table-overdue' : ''}>{owner.overdueTasks}</td>
                      </tr>
                    ))}
                    {ownerWorkload.length === 0 && (
                      <tr>
                        <td colSpan={4} className="marketing-table-empty">No owner workload data.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Icon name="bar" size={14} color="var(--indigo)" />
              <span className="card-title">Stage Transitions</span>
            </div>
            <div className="card-body card-body-flush">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transitions.map((transition, index) => (
                      <tr key={`${transition.fromStage || 'none'}-${transition.toStage}-${index}`}>
                        <td className="bold">{transition.fromStage || 'None'}</td>
                        <td>{transition.toStage}</td>
                        <td>{transition.count}</td>
                      </tr>
                    ))}
                    {transitions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="marketing-table-empty">No stage transitions yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
