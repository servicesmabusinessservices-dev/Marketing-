/**
 * Rule-based insight generation — derives actionable text from analytics data.
 * No AI required; pure functions returning structured insight arrays.
 */

/**
 * Generate insights for the main Dashboard page.
 * @param {Object} params
 * @param {Object} params.analytics - useAnalytics() data
 * @param {Object} params.contacts  - useContacts() data
 * @param {Object} params.tasks     - useTasks() data
 * @param {Object} params.journeys  - useJourneySummary() data
 * @returns {{ text: string, type: 'positive'|'negative'|'neutral' }[]}
 */
export function generateDashboardInsights({ analytics, contacts, tasks, journeys }) {
  const insights = [];
  const engagement = analytics?.engagement || {};
  const funnel = analytics?.stageFunnel || {};
  const conversion = analytics?.conversionRates || {};

  // Open rate benchmark (industry average ~20%)
  if (Number.isFinite(engagement.openRate)) {
    if (engagement.openRate >= 25) {
      insights.push({
        text: `Email open rate is strong at ${engagement.openRate.toFixed(1)}% — above industry average`,
        type: 'positive',
      });
    } else if (engagement.openRate < 15 && engagement.openRate > 0) {
      insights.push({
        text: `Email open rate at ${engagement.openRate.toFixed(1)}% is below average — consider A/B testing subject lines`,
        type: 'negative',
      });
    }
  }

  // Overall win rate
  if (Number.isFinite(conversion.overallWinRate) && conversion.overallWinRate > 0) {
    insights.push({
      text: `Pipeline win rate: ${conversion.overallWinRate.toFixed(1)}%`,
      type: conversion.overallWinRate >= 20 ? 'positive' : 'neutral',
    });
  }

  // Overdue tasks
  const openTasks = tasks?.tasks || [];
  const now = Date.now();
  const overdueCount = openTasks.filter(
    (t) => t.dueAtUtc && new Date(t.dueAtUtc).getTime() < now && String(t.status || '').toLowerCase() !== 'completed'
  ).length;
  if (overdueCount > 0) {
    insights.push({
      text: `${overdueCount} task${overdueCount === 1 ? ' is' : 's are'} overdue — review your task queue`,
      type: 'negative',
    });
  }

  // Unqualified leads pile-up
  const newCount = funnel.New || 0;
  const qualifiedCount = funnel.Qualified || 0;
  if (newCount > 0 && qualifiedCount > 0 && newCount > qualifiedCount * 3) {
    insights.push({
      text: `Large number of unqualified leads (${newCount}) — consider lead scoring`,
      type: 'negative',
    });
  }

  // Journey enrollments
  const published = (journeys?.journeys || []).filter(
    (j) => String(j.status || '').toLowerCase() === 'published'
  );
  const topJourney = published.sort((a, b) => (b.activeEnrollments || 0) - (a.activeEnrollments || 0))[0];
  if (topJourney && (topJourney.activeEnrollments || 0) > 0) {
    insights.push({
      text: `"${topJourney.name}" journey has ${topJourney.activeEnrollments} active enrollments`,
      type: 'positive',
    });
  }

  // Total contacts milestone
  const totalContacts = contacts?.totalCount ?? (contacts?.contacts || []).length;
  if (totalContacts >= 100) {
    insights.push({
      text: `${totalContacts.toLocaleString()} contacts in your CRM`,
      type: 'neutral',
    });
  }

  return insights.slice(0, 5);
}

/**
 * Generate insights for the Analytics Dashboard page.
 * @param {Object} params
 * @param {Object} params.engagement       - { sent, openRate, clickRate, replyRate }
 * @param {Object} params.stageFunnel      - { New, Qualified, Proposal, Won }
 * @param {Object} params.conversionRates  - { newToQualified, qualifiedToProposal, proposalToWon, overallWinRate }
 * @param {Object} params.journeyPerformance - { active, completed, failed, paused }
 * @param {Array}  params.ownerWorkload     - [{ ownerEmail, count }]
 * @returns {{ text: string, type: 'positive'|'negative'|'neutral' }[]}
 */
export function generateAnalyticsInsights({ engagement, stageFunnel, conversionRates, journeyPerformance, ownerWorkload }) {
  const insights = [];
  const eng = engagement || {};
  const funnel = stageFunnel || {};
  const conv = conversionRates || {};
  const jp = journeyPerformance || {};
  const owners = ownerWorkload || [];

  // Open rate vs benchmark
  if (Number.isFinite(eng.openRate) && eng.openRate > 0) {
    if (eng.openRate >= 20) {
      insights.push({
        text: `Open rate ${eng.openRate.toFixed(1)}% is above the 20% industry benchmark`,
        type: 'positive',
      });
    } else {
      insights.push({
        text: `Open rate ${eng.openRate.toFixed(1)}% is below the 20% benchmark — optimize subject lines`,
        type: 'negative',
      });
    }
  }

  // Biggest funnel drop-off
  const stages = [
    { name: 'New', count: funnel.New || 0 },
    { name: 'Qualified', count: funnel.Qualified || 0 },
    { name: 'Proposal', count: funnel.Proposal || 0 },
    { name: 'Won', count: funnel.Won || 0 },
  ];
  let maxDrop = 0;
  let dropFrom = '';
  let dropTo = '';
  for (let i = 0; i < stages.length - 1; i++) {
    if (stages[i].count > 0) {
      const drop = stages[i].count - stages[i + 1].count;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropFrom = stages[i].name;
        dropTo = stages[i + 1].name;
      }
    }
  }
  if (maxDrop > 0 && dropFrom) {
    const pct = stages.find((s) => s.name === dropFrom)?.count
      ? Math.round((maxDrop / stages.find((s) => s.name === dropFrom).count) * 100)
      : 0;
    insights.push({
      text: `Biggest drop-off: ${dropFrom} → ${dropTo} (${pct}% loss)`,
      type: pct > 50 ? 'negative' : 'neutral',
    });
  }

  // Clicks but no replies
  if (eng.clickRate > 0 && (eng.replyRate === 0 || !eng.replyRate)) {
    insights.push({
      text: 'Links clicked but no replies — review CTA placement and messaging',
      type: 'negative',
    });
  }

  // Journey summary
  if ((jp.completed || 0) > 0 || (jp.failed || 0) > 0) {
    const parts = [];
    if (jp.completed) parts.push(`${jp.completed} completed`);
    if (jp.failed) parts.push(`${jp.failed} failed`);
    insights.push({
      text: `Journeys: ${parts.join(', ')}`,
      type: jp.failed > jp.completed ? 'negative' : 'positive',
    });
  }

  // Owner concentration
  if (owners.length > 1) {
    const total = owners.reduce((sum, o) => sum + (o.contactCount || o.count || 0), 0);
    const top = owners[0];
    const topCount = top?.contactCount || top?.count || 0;
    if (total > 0 && topCount / total > 0.5) {
      insights.push({
        text: `Workload concentrated — ${top.ownerEmail || 'top owner'} handles ${Math.round((topCount / total) * 100)}% of contacts`,
        type: 'negative',
      });
    }
  }

  return insights.slice(0, 5);
}
