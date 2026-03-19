const STAGE_TONES = {
  new: 'blue',
  qualified: 'amber',
  proposal: 'purple',
  won: 'emerald',
  lost: 'rose',
};

const EVENT_TONES = {
  replied: 'emerald',
  opened: 'purple',
  clicked: 'blue',
  delivered: 'blue',
  bounced: 'rose',
  unsubscribed: 'rose',
  proposal_sent: 'amber',
  no_reply_3d: 'amber',
  new_lead: 'emerald',
};

const STAGE_COLOR_VARS = {
  new: 'var(--blue)',
  qualified: 'var(--amber)',
  proposal: 'var(--purple)',
  won: 'var(--emerald)',
  lost: 'var(--rose)',
};

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

export const getStageTone = (value, fallback = 'blue') => STAGE_TONES[normalizeKey(value)] || fallback;

export const getEventTone = (value, fallback = 'blue') => EVENT_TONES[normalizeKey(value)] || fallback;

export const getStageColorVar = (value, fallback = 'var(--text-3)') => STAGE_COLOR_VARS[normalizeKey(value)] || fallback;

export const JOURNEY_ICON_COLOR = 'var(--purple)';
export const ON_SOLID_ICON_COLOR = 'var(--text-primary)';