import React from 'react';
import Icon from './Icon';

const TYPE_CONFIG = {
  positive: { dot: 'var(--emerald)', icon: 'trending' },
  negative: { dot: 'var(--rose)', icon: 'arrow-down' },
  neutral:  { dot: 'var(--text-muted)', icon: 'zap' },
};

/**
 * AI-style insights panel showing derived insights from analytics data.
 *
 * @param {{ insights: { text: string, type: 'positive'|'negative'|'neutral' }[] }} props
 */
const InsightCard = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="insight-card">
      <div className="insight-header">
        <Icon name="sparkle" size={16} color="var(--indigo)" />
        <span className="insight-header-text">Insights</span>
      </div>
      <ul className="insight-list">
        {insights.map((insight, i) => {
          const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.neutral;
          return (
            <li key={i} className={`insight-item insight-item--${insight.type}`}>
              <span className="insight-dot" style={{ background: cfg.dot }} />
              <span className="insight-text">{insight.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default React.memo(InsightCard);
