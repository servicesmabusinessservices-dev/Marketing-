import { useEffect, useRef, useCallback } from 'react';

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta']);
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Parse a shortcut string into a normalized descriptor.
 * Supports: "mod+k", "shift+mod+k", "g d" (two-key sequence), "j", "Escape"
 * "mod" maps to Meta on Mac and Control elsewhere.
 */
function parseShortcut(shortcut) {
  const parts = shortcut.split(' ').map(s => s.trim()).filter(Boolean);

  if (parts.length === 2) {
    return { type: 'sequence', first: parts[0].toLowerCase(), second: parts[1].toLowerCase() };
  }

  const keys = parts[0].split('+').map(k => k.trim().toLowerCase());
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const modifiers = { ctrl: false, alt: false, shift: false, meta: false };
  let key = '';

  for (const k of keys) {
    if (k === 'mod') {
      if (isMac) modifiers.meta = true;
      else modifiers.ctrl = true;
    } else if (k === 'ctrl' || k === 'control') {
      modifiers.ctrl = true;
    } else if (k === 'alt') {
      modifiers.alt = true;
    } else if (k === 'shift') {
      modifiers.shift = true;
    } else if (k === 'meta') {
      modifiers.meta = true;
    } else {
      key = k;
    }
  }

  return { type: 'single', key, ...modifiers };
}

function matchesSingle(event, desc) {
  const eventKey = event.key.toLowerCase();
  return (
    eventKey === desc.key &&
    event.ctrlKey === desc.ctrl &&
    event.altKey === desc.alt &&
    event.shiftKey === desc.shift &&
    event.metaKey === desc.meta
  );
}

function isEditableTarget(event) {
  const el = event.target;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Register global keyboard shortcuts.
 *
 * @param {Record<string, () => void>} keyMap
 *   e.g. { 'mod+k': openPalette, 'j': nextEmail, 'g d': gotoDashboard }
 * @param {object} [options]
 * @param {boolean} [options.enableInInputs=false] Fire even when focus is in an input/textarea
 */
export function useHotkeys(keyMap, { enableInInputs = false } = {}) {
  const keyMapRef = useRef(keyMap);
  keyMapRef.current = keyMap;

  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  const handler = useCallback(
    (event) => {
      if (MODIFIER_KEYS.has(event.key)) return;
      if (!enableInInputs && isEditableTarget(event)) return;

      const currentMap = keyMapRef.current;
      if (!currentMap) return;

      for (const [shortcut, callback] of Object.entries(currentMap)) {
        const desc = parseShortcut(shortcut);

        if (desc.type === 'sequence') {
          if (pendingRef.current === desc.first && event.key.toLowerCase() === desc.second &&
              !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            pendingRef.current = null;
            clearTimeout(timerRef.current);
            callback();
            return;
          }
        } else if (desc.type === 'single') {
          if (matchesSingle(event, desc)) {
            event.preventDefault();
            callback();
            return;
          }
        }
      }

      const hasSequences = Object.keys(currentMap).some(s => s.includes(' '));
      if (hasSequences && !event.ctrlKey && !event.altKey && !event.metaKey) {
        pendingRef.current = event.key.toLowerCase();
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { pendingRef.current = null; }, 800);
      } else {
        pendingRef.current = null;
      }
    },
    [enableInInputs]
  );

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearTimeout(timerRef.current);
    };
  }, [handler]);
}
