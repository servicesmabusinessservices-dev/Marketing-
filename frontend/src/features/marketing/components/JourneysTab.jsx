import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../../../services/gmailService';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { useJourneys, useLists, useContacts } from '../../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const JourneysTab = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const journeysQuery = useJourneys();
  const listsQuery = useLists();
  const contactsQuery = useContacts({ limit: 1000 });
  const journeys = journeysQuery.data?.journeys || [];
  const lists = listsQuery.data?.lists || [];
  const contacts = contactsQuery.data?.contacts || [];

  const [journeyForm, setJourneyForm] = useState({
    name: '', triggerType: 'new_lead', triggerRefId: ''
  });
  const [selectedEventContactId, setSelectedEventContactId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('proposal_sent');

  const handleCreateJourney = async (event) => {
    event.preventDefault();
    if (!journeyForm.name.trim()) { showFeedback('Journey name is required.', 'warning'); return; }
    try {
      await gmailService.createJourney(journeyForm);
      setJourneyForm({ name: '', triggerType: 'new_lead', triggerRefId: '' });
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      showFeedback('Journey created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create journey.', 'error');
    }
  };

  const handleJourneyStatus = async (journey, action) => {
    try {
      if (action === 'publish') {
        await gmailService.publishJourney(journey.journeyId);
        showFeedback('Journey published.', 'success');
      } else if (action === 'pause') {
        await gmailService.pauseJourney(journey.journeyId);
        showFeedback('Journey paused.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || `Failed to ${action} journey.`, 'error');
    }
  };

  const handleLogBehaviorEvent = async () => {
    if (!selectedEventContactId) { showFeedback('Select a contact.', 'warning'); return; }
    try {
      await gmailService.createEvent({ contactId: selectedEventContactId, eventType: selectedEventType });
      showFeedback('Event logged.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to log event.', 'error');
    }
  };

  if (journeysQuery.isLoading) return <LoadingSpinner label="Loading journeys..." />;
  if (journeysQuery.isError) return (
    <EmptyState icon="journey" title="Failed to load journeys" action={{ label: 'Retry', onClick: () => journeysQuery.refetch() }} />
  );

  return (
    <section className="card page-grid-wide" id="marketing-journeys">
      <div className="card-header">
        <Icon name="journey" size={14} className="icon-accent" />
        <span className="card-title">Automation Journeys ({journeys.length})</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleCreateJourney}>
          <div className="card-form-grid">
            <div className="form-group">
              <label className="form-label">Journey name</label>
              <input className="form-input" placeholder="Journey name" value={journeyForm.name} onChange={(e) => setJourneyForm({ ...journeyForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Trigger type</label>
              <select className="form-input" value={journeyForm.triggerType} onChange={(e) => setJourneyForm({ ...journeyForm, triggerType: e.target.value })}>
                <option value="new_lead">Trigger: New Lead</option>
                <option value="proposal_sent">Trigger: Proposal Sent</option>
                <option value="no_reply_3d">Trigger: No Reply in 3 Days</option>
                <option value="opened">Trigger: Email Opened</option>
                <option value="clicked">Trigger: Email Clicked</option>
                <option value="replied">Trigger: Replied</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Trigger list</label>
            <select className="form-input" value={journeyForm.triggerRefId} onChange={(e) => setJourneyForm({ ...journeyForm, triggerRefId: e.target.value })}>
              <option value="">Select trigger list</option>
              {lists.map((list) => <option key={list.listId} value={list.listId}>{list.name}</option>)}
            </select>
          </div>
          <button type="submit" className="topbar-btn primary">Create Journey</button>
        </form>

        {journeys.length === 0 ? (
          <EmptyState icon="journey" title="No journeys yet" subtitle="Create one above." size="sm" />
        ) : (
          <div className="data-list marketing-list-gap">
            {journeys.map((journey) => (
              <div key={journey.journeyId} className="data-list-item marketing-item-center">
                <strong>{journey.name}</strong>
                <div className="inline-actions">
                  <span className="helper-text">{journey.status}</span>
                  <button className="topbar-btn" type="button" onClick={() => navigate(`/marketing/journeys/${journey.journeyId}`)}>Build Steps</button>
                  <button className="topbar-btn" type="button" onClick={() => handleJourneyStatus(journey, 'publish')}>Publish</button>
                  <button className="topbar-btn" type="button" onClick={() => handleJourneyStatus(journey, 'pause')}>Pause</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="marketing-divider" />
        <div className="syne marketing-mini-title">Behavior Event Tester</div>
        <div className="inline-actions">
          <select className="form-input" value={selectedEventContactId} onChange={(e) => setSelectedEventContactId(e.target.value)}>
            <option value="">Select contact</option>
            {contacts.map((contact) => <option key={contact.contactId} value={contact.contactId}>{contact.email}</option>)}
          </select>
          <select className="form-input" value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}>
            <option value="proposal_sent">proposal_sent</option>
            <option value="opened">opened</option>
            <option value="clicked">clicked</option>
            <option value="replied">replied</option>
          </select>
          <button type="button" className="topbar-btn" onClick={handleLogBehaviorEvent}>Log Event</button>
        </div>
      </div>
    </section>
  );
};

export default JourneysTab;
