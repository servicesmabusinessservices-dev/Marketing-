import { useState, useEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';

// ─── Exported sender helpers ──────────────────────────────────────────────────

export const parseSenderEmail = (value) => {
  const match = value?.match(/<([^>]+)>/);
  return (match ? match[1] : value || '').trim();
};

export const parseSenderName = (value) => {
  if (!value) return '';
  const match = value.match(/^(.*)<.+>$/);
  const name = (match ? match[1] : value).trim().replace(/^"|"$/g, '');
  return name.includes('@') ? '' : name;
};

const splitName = (value) => {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// ─── Detail panel reducer ─────────────────────────────────────────────────────

const initialPanelState = {
  loading: false,
  data: null,
  error: '',
  showReply: false,
  replyText: '',
  showForward: false,
  forwardTo: '',
  forwardNote: '',
  sending: false,
  forwarding: false,
  addingContact: false,
};

function panelReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialPanelState };
    case 'FETCH_START':
      return { ...state, loading: true, error: '', data: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'TOGGLE_REPLY':
      return { ...state, showReply: !state.showReply, showForward: false };
    case 'TOGGLE_FORWARD':
      return { ...state, showForward: !state.showForward, showReply: false };
    case 'SET_REPLY_TEXT':
      return { ...state, replyText: action.payload };
    case 'SET_FORWARD_TO':
      return { ...state, forwardTo: action.payload };
    case 'SET_FORWARD_NOTE':
      return { ...state, forwardNote: action.payload };
    case 'SEND_START':
      return { ...state, sending: true };
    case 'SEND_END':
      return { ...state, sending: false };
    case 'REPLY_SENT':
      return { ...state, sending: false, showReply: false, replyText: '' };
    case 'FORWARD_SENT':
      return { ...state, forwarding: false, showForward: false, forwardTo: '', forwardNote: '' };
    case 'FORWARD_START':
      return { ...state, forwarding: true };
    case 'FORWARD_END':
      return { ...state, forwarding: false };
    case 'SET_ADDING_CONTACT':
      return { ...state, addingContact: action.payload };
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function useInboxData(emailIdFromRoute) {
  const { showFeedback } = useFeedback();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [updatingClassification, setUpdatingClassification] = useState(() => new Set());
  const [classificationFilter, setClassificationFilter] = useState('All');
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [showBulkEmail, setShowBulkEmail] = useState(false);

  // Controlled input vs debounced API term
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef(null);

  // Stable refs to prevent stale closures in action callbacks
  const emailsRef = useRef(emails);
  useEffect(() => { emailsRef.current = emails; }, [emails]);

  const panelRef = useRef(initialPanelState);
  const [panel, dispatch] = useReducer(panelReducer, initialPanelState);
  useEffect(() => { panelRef.current = panel; }, [panel]);

  // ─── Search ─────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchTerm(val), 300);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
  }, []);

  // ─── Fetch list ──────────────────────────────────────────────────────────

  const refreshEmails = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const data = await gmailService.getEmails({
        pageToken: null,
        maxResults: PAGE_SIZE,
        classification: classificationFilter,
        sortBy: 'date',
        sortDir: 'desc',
        q: searchTerm || null,
      });
      setNextPageToken(data.nextPageToken || null);
      setEmails(data.emails || []);
    } catch (error) {
      setListError('Failed to load emails. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [classificationFilter, searchTerm]);

  const loadMoreEmails = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await gmailService.getEmails({
        pageToken: nextPageToken,
        maxResults: PAGE_SIZE,
        classification: classificationFilter,
        sortBy: 'date',
        sortDir: 'desc',
        q: searchTerm || null,
      });
      setNextPageToken(data.nextPageToken || null);
      setEmails((prev) => {
        const merged = [...prev, ...(data.emails || [])];
        return Array.from(new Map(merged.map((e) => [e.id, e])).values());
      });
    } catch (error) {
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, classificationFilter, searchTerm]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => { refreshEmails(); }, [refreshEmails]);

  useEffect(() => {
    if (emailIdFromRoute) {
      setSelectedEmailId(emailIdFromRoute);
    } else if (!selectedEmailId && emailsRef.current.length > 0) {
      setSelectedEmailId(emailsRef.current[0].id);
    }
  }, [emailIdFromRoute, loading]);

  const fetchEmailDetail = useCallback(async (id) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await gmailService.getEmailById(id);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Unable to load email.' });
    }
  }, []);

  useEffect(() => {
    if (!selectedEmailId) { dispatch({ type: 'RESET' }); return; }
    dispatch({ type: 'RESET' });
    fetchEmailDetail(selectedEmailId);
  }, [selectedEmailId, fetchEmailDetail]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const selectEmail = useCallback((id) => {
    setSelectedEmailId(id);
  }, []);

  const handleUpdateClassification = useCallback(async (targetId, classification) => {
    const previousEmails = emailsRef.current;
    setUpdatingClassification((prev) => new Set([...prev, targetId]));
    setEmails((curr) => curr.map((e) => (e.id === targetId ? { ...e, classification } : e)));
    try {
      await gmailService.updateEmailClassification(targetId, classification);
      showFeedback('Classification updated.', 'success');
    } catch (error) {
      setEmails(previousEmails);
      if (error.response?.status === 404) { showFeedback('Classification API not found.', 'error'); return; }
      showFeedback(error.response?.data?.error || 'Failed to update classification.', 'error');
    } finally {
      setUpdatingClassification((curr) => { const n = new Set(curr); n.delete(targetId); return n; });
    }
  }, [showFeedback]);

  const handleSendReply = useCallback(async () => {
    const { data, replyText } = panelRef.current;
    if (!replyText.trim() || !data) return;
    dispatch({ type: 'SEND_START' });
    try {
      const toEmail = data.from.match(/<(.+?)>/)?.[1] || data.from;
      await gmailService.sendEmail([toEmail], `Re: ${data.subject}`, replyText);
      showFeedback('Reply sent.', 'success');
      dispatch({ type: 'REPLY_SENT' });
    } catch (error) {
      dispatch({ type: 'SEND_END' });
      showFeedback('Failed to send reply.', 'error');
    }
  }, [showFeedback]);

  const handleSendForward = useCallback(async () => {
    const { data, forwardTo, forwardNote } = panelRef.current;
    const messageId = data?.id || selectedEmailId;
    const recipients = forwardTo.split(/[,\n;]/).map((e) => e.trim()).filter(Boolean);
    if (!messageId || !recipients.length) { showFeedback('Add at least one recipient.', 'warning'); return; }
    dispatch({ type: 'FORWARD_START' });
    try {
      await gmailService.forwardEmail({ messageId, to: recipients, note: forwardNote.trim() });
      showFeedback('Email forwarded.', 'success');
      dispatch({ type: 'FORWARD_SENT' });
    } catch (error) {
      dispatch({ type: 'FORWARD_END' });
      showFeedback(error.response?.data?.error || 'Failed to forward email.', 'error');
    }
  }, [selectedEmailId, showFeedback]);

  const handleAddToCrm = useCallback(async () => {
    if (panelRef.current.addingContact) return;
    const fromValue = panelRef.current.data?.from || '';
    const emailAddr = parseSenderEmail(fromValue);
    if (!emailAddr) { showFeedback('No sender email found.', 'warning'); return; }
    const { firstName, lastName } = splitName(parseSenderName(fromValue));
    const classification = emailsRef.current.find(
      (e) => String(e.id) === String(selectedEmailId)
    )?.classification;
    const leadStage = classification && classification !== 'None' ? classification : undefined;
    const payload = {
      email: emailAddr,
      source: 'Inbox',
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(leadStage && { leadStage }),
    };
    dispatch({ type: 'SET_ADDING_CONTACT', payload: true });
    try {
      await gmailService.upsertContact(payload);
      showFeedback('Contact added to CRM.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add contact.', 'error');
    } finally {
      dispatch({ type: 'SET_ADDING_CONTACT', payload: false });
    }
  }, [selectedEmailId, showFeedback]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const selectedEmail = useMemo(
    () => emails.find((e) => String(e.id) === String(selectedEmailId)) ?? null,
    [emails, selectedEmailId]
  );

  const filteredEmails = useMemo(() => {
    if (!searchInput) return emails;
    const q = searchInput.toLowerCase();
    return emails.filter(
      (e) => e.subject?.toLowerCase().includes(q) || e.from?.toLowerCase().includes(q)
    );
  }, [emails, searchInput]);

  return {
    filteredEmails,
    loading,
    listError,
    loadingMore,
    nextPageToken,
    updatingClassification,
    classificationFilter,
    setClassificationFilter,
    searchInput,
    handleSearchChange,
    handleClearSearch,
    selectedEmailId,
    selectedEmail,
    showBulkEmail,
    setShowBulkEmail,
    panel,
    dispatch,
    selectEmail,
    loadMoreEmails,
    handleUpdateClassification,
    handleSendReply,
    handleSendForward,
    handleAddToCrm,
    refresh: refreshEmails,
  };
}
