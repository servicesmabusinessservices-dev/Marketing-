import React from 'react';
import Icon from './Icon';

/**
 * Wrapper card for Recharts visualizations with consistent header styling.
 *
 * @param {{ title: string, subtitle?: string, icon?: string, children: React.ReactNode, action?: React.ReactNode }} props
 */
const ChartCard = ({ title, subtitle, icon, children, action }) => (
  <div className="chart-card">
    <div className="chart-card-header">
      <div className="chart-card-header-left">
        {icon && <Icon name={icon} size={16} color="var(--indigo)" />}
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <span className="chart-card-subtitle">{subtitle}</span>}
        </div>
      </div>
      {action && <div className="chart-card-action">{action}</div>}
    </div>
    <div className="chart-card-body">{children}</div>
  </div>
);

export default React.memo(ChartCard);
