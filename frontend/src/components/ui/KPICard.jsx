import React from 'react';
import AnimatedCard from './AnimatedCard';
import Icon from './Icon';

const ACCENT_MAP = {
  primary: { bg: 'rgba(234, 179, 8, 0.12)',  text: 'var(--amber)' },
  amber:   { bg: 'rgba(234, 179, 8, 0.12)',  text: 'var(--amber)' },
  emerald: { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--emerald)' },
  blue:    { bg: 'rgba(56, 189, 248, 0.12)', text: 'var(--blue)' },
  rose:    { bg: 'rgba(244, 63, 94, 0.12)',  text: 'var(--rose)' },
  purple:  { bg: 'rgba(139, 92, 246, 0.12)', text: 'var(--purple)' },
};

/**
 * KPI metric card with large value emphasis, label, change indicator, and icon.
 *
 * @param {{ label: string, value: string|number, change: string, changeDirection?: 'up'|'down'|'neutral', icon: string, accentColor?: string }} props
 */
const KPICard = ({ label, value, change, changeDirection = 'neutral', icon, accentColor = 'primary' }) => {
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.primary;

  const changeIcon = changeDirection === 'up' ? 'arrow-up' : changeDirection === 'down' ? 'arrow-down' : null;
  const changeClass = `kpi-change kpi-change--${changeDirection}`;

  return (
    <AnimatedCard className="kpi-card">
      <div className="kpi-icon-wrap" style={{ background: accent.bg }}>
        <Icon name={icon} size={20} color={accent.text} />
      </div>
      <div className="kpi-content">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value}</span>
        <span className={changeClass}>
          {changeIcon && <Icon name={changeIcon} size={12} color="currentColor" />}
          {change}
        </span>
      </div>
    </AnimatedCard>
  );
};

export default React.memo(KPICard);
