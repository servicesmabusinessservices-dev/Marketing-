import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Icon from './Icon';
import { gmailService } from '../../services/gmailService';
import './CommandPalette.css';

const NAV_ITEMS = [
  { id: 'dashboard',  icon: 'home',     label: 'Dashboard',       to: '/dashboard',                  shortcut: 'G D' },
  { id: 'inbox',      icon: 'inbox',    label: 'Inbox',           to: '/emails',                     shortcut: 'G I' },
  { id: 'bulk',       icon: 'bulk',     label: 'Bulk Email',      to: '/emails/bulk',                shortcut: 'E' },
  { id: 'contacts',   icon: 'users',    label: 'Contacts',        to: '/marketing?tab=contacts',     shortcut: 'G C' },
  { id: 'pipeline',   icon: 'pipeline', label: 'Pipeline',        to: '/marketing/pipeline',         shortcut: 'G P' },
  { id: 'campaigns',  icon: 'campaign', label: 'Campaigns',       to: '/marketing?tab=campaigns' },
  { id: 'templates',  icon: 'template', label: 'Templates',       to: '/marketing/template-editor' },
  { id: 'journeys',   icon: 'journey',  label: 'Journeys',        to: '/marketing?tab=journeys' },
  { id: 'analytics',  icon: 'bar',      label: 'Analytics',       to: '/marketing/analytics',        shortcut: 'G A' },
  { id: 'suppression',icon: 'shield',   label: 'Suppression List',to: '/marketing/suppression' },
];

const CommandPalette = ({ open, onOpenChange, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Filter nav items by query
  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) || item.id.includes(q)
    );
  }, [query]);

  // All items flattened for keyboard nav
  const allItems = useMemo(() => {
    const items = [];
    filteredNav.forEach(n => items.push({ type: 'nav', ...n }));
    if (searchResults?.contacts?.length) {
      searchResults.contacts.forEach(c => items.push({ type: 'contact', ...c }));
    }
    if (searchResults?.templates?.length) {
      searchResults.templates.forEach(t => items.push({ type: 'template', ...t }));
    }
    return items;
  }, [filteredNav, searchResults]);

  // Debounced API search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await gmailService.globalSearch(query.trim());
        setSearchResults(data);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setSearchResults(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= allItems.length) {
      setActiveIndex(Math.max(0, allItems.length - 1));
    }
  }, [allItems.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectItem = useCallback((item) => {
    onOpenChange(false);
    if (item.type === 'nav') {
      onNavigate(item.to);
    } else if (item.type === 'contact') {
      onNavigate(`/marketing/contacts/${item.id}`);
    } else if (item.type === 'template') {
      onNavigate(`/marketing/template-editor?id=${item.id}`);
    }
  }, [onNavigate, onOpenChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[activeIndex]) selectItem(allItems[activeIndex]);
    }
  }, [allItems, activeIndex, selectItem]);

  const renderItem = (item, index) => (
    <button
      key={`${item.type}-${item.id}`}
      className="cp-item"
      data-active={index === activeIndex}
      data-index={index}
      onClick={() => selectItem(item)}
      onMouseEnter={() => setActiveIndex(index)}
      type="button"
    >
      {item.icon && <Icon name={item.icon} size={16} decorative />}
      <span className="cp-item-label">{item.label}</span>
      {item.subtitle && <span className="cp-item-subtitle">{item.subtitle}</span>}
      {item.shortcut && <span className="cp-item-shortcut">{item.shortcut}</span>}
    </button>
  );

  let itemIndex = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content
          className="command-palette-content"
          onKeyDown={handleKeyDown}
          aria-label="Command palette"
        >
          <div className="cp-search-wrap">
            <Icon name="search" size={16} decorative />
            <input
              ref={inputRef}
              className="cp-search-input"
              placeholder="Type a command or search..."
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="cp-results" ref={listRef}>
            {/* Navigation group */}
            {filteredNav.length > 0 && (
              <>
                <div className="cp-group-label">Navigation</div>
                {filteredNav.map(nav => {
                  const idx = itemIndex++;
                  return renderItem({ type: 'nav', ...nav }, idx);
                })}
              </>
            )}

            {/* Contact results */}
            {searchResults?.contacts?.length > 0 && (
              <>
                <div className="cp-group-label">Contacts</div>
                {searchResults.contacts.map(c => {
                  const idx = itemIndex++;
                  return renderItem({ type: 'contact', icon: 'users', ...c }, idx);
                })}
              </>
            )}

            {/* Template results */}
            {searchResults?.templates?.length > 0 && (
              <>
                <div className="cp-group-label">Templates</div>
                {searchResults.templates.map(t => {
                  const idx = itemIndex++;
                  return renderItem({ type: 'template', icon: 'template', ...t }, idx);
                })}
              </>
            )}

            {/* Empty state */}
            {allItems.length === 0 && !searching && (
              <div className="cp-empty">No results found</div>
            )}
            {searching && allItems.length === 0 && (
              <div className="cp-empty">Searching...</div>
            )}
          </div>

          <div className="cp-footer">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CommandPalette;
