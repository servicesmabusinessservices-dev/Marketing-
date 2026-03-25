import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/authConfig';

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
      setStatus('idle');
      setData(null);
      setError(null);
      return;
    }

    const token = localStorage.getItem('jwt_token');
    const separator = path.includes('?') ? '&' : '?';
    const url = API_BASE_URL + path + (token ? separator + 'access_token=' + encodeURIComponent(token) : '');

    setStatus('connecting');
    setError(null);

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus('open');

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
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [path]);

  return { data, status, error, close };
}