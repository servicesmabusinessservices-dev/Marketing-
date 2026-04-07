import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/authConfig';

/**
 * Hook to consume a Server-Sent Events (SSE) endpoint
 *
 * @param {string|null} path Relative API path (e.g. "/email/bulk-send/abc/stream")
 * @returns {{
 *   data: any,
 *   status: 'idle'|'connecting'|'open'|'closed'|'error',
 *   error: string|null,
 *   close: () => void
 * }}
 */
export function useSSE(path) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const esRef = useRef(null);

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('closed');
  }, []);

  useEffect(() => {
    if (!path) {
      close();
      setStatus('idle');
      setData(null);
      setError(null);
      return;
    }

    // SECURITY: EventSource sends cookies automatically with credentials
    // No need to pass token in URL anymore
    const url = `${API_BASE_URL}${path}`;

    setStatus('connecting');
    setError(null);

    // EventSource automatically includes cookies if same-origin
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setStatus('open');
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch {
        setData(event.data);
      }
    };

    es.onerror = () => {
      setError('SSE connection failed');
      setStatus('error');

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [path, close]);

  return { data, status, error, close };
}