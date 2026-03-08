import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';
import AnimatedCard from './ui/AnimatedCard';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [data, setData] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const result = await gmailService.getAnalytics({
        days,
        ownerEmail: ownerEmail || null
      });
      setData(result);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    { label: 'New', count: stageFunnel.New || 0, pct: funnelMax ? Math.round((stageFunnel.New || 0) / funnelMax * 100) : 0, color: '#60a5fa' },
    { label: 'Qualified', count: stageFunnel.Qualified || 0, pct: funnelMax ? Math.round((stageFunnel.Qualified || 0) / funnelMax * 100) : 0, color: '#f59e0b' },
    { label: 'Proposal', count: stageFunnel.Proposal || 0, pct: funnelMax ? Math.round((stageFunnel.Proposal || 0) / funnelMax * 100) : 0, color: '#8b5cf6' },
    { label: 'Won', count: stageFunnel.Won || 0, pct: funnelMax ? Math.round((stageFunnel.Won || 0) / funnelMax * 100) : 0, color: '#10b981' }
  ];

  return (
    <div className="content fade-in">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {[7, 30, 90, 180].map((value) => (
          <div key={value} className={`filter-chip ${days === value ? 'active' : ''}`} onClick={() => setDays(value)}>
            Last {value} days
          </div>
        ))}
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          placeholder="Filter by owner email"
        />
        <div style={{ marginLeft: 'auto' }}>
          <button className="topbar-btn" onClick={fetchAnalytics}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Loading analytics...</p>
        </div>
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
                <Icon name="journey" size={14} color="#a78bfa" />
                <span className="card-title">Journey Performance</span>
              </div>
              <div className="card-body">
                {[
                  { label: 'Active', value: journeyPerformance.active || 0 },
                  { label: 'Completed', value: journeyPerformance.completed || 0 },
                  { label: 'Failed', value: journeyPerformance.failed || 0 },
                  { label: 'Paused', value: journeyPerformance.paused || 0 }
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500 }}>{row.label}</div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--text-1)' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <Icon name="users" size={14} color="var(--indigo)" />
              <span className="card-title">Owner Workload</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
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
                        <td style={{ color: owner.overdueTasks > 0 ? 'var(--rose)' : 'var(--text-2)' }}>{owner.overdueTasks}</td>
                      </tr>
                    ))}
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
            <div className="card-body" style={{ padding: 0 }}>
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
