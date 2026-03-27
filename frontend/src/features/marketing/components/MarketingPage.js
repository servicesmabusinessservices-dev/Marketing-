import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ContactsTab from './ContactsTab';
import ListsTab from './ListsTab';
import TemplatesTab from './TemplatesTab';
import CampaignsTab from './CampaignsTab';
import JourneysTab from './JourneysTab';

const TABS = [
  { id: 'contacts',  label: 'Contacts' },
  { id: 'lists',     label: 'Lists' },
  { id: 'templates', label: 'Templates' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'journeys',  label: 'Journeys' },
];

const TAB_COMPONENTS = {
  contacts:  ContactsTab,
  lists:     ListsTab,
  templates: TemplatesTab,
  campaigns: CampaignsTab,
  journeys:  JourneysTab,
};

const MarketingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = TABS.some(t => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'contacts';

  const setTab = useCallback((id) => {
    setSearchParams({ tab: id }, { replace: true });
  }, [setSearchParams]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
    queryClient.invalidateQueries({ queryKey: ['templates'] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['journeys'] });
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="content fade-in">
      <div className="marketing-header-row">
        <div>
          <div className="syne marketing-header-title">Marketing Workspace</div>
          <div className="helper-text">Templates, campaigns, and automation journeys.</div>
        </div>
        <button className="topbar-btn" onClick={refreshAll}>Refresh Data</button>
      </div>

      <div
        className="marketing-tab-bar"
        role="tablist"
        aria-label="Marketing sections"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`marketing-${id}`}
            className={`marketing-tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id={`marketing-${activeTab}`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="marketing-tab-panel"
      >
        <ActiveComponent />
      </div>
    </div>
  );
};

export default MarketingPage;
