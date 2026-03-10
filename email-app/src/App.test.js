import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => {
  const React = require('react');

  return {
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: ({ element }) => element || null,
    Navigate: () => null,
    Outlet: () => null,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/', search: '' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()]
  };
}, { virtual: true });

import App from './App';

test('renders initial app shell', () => {
  render(<App />);
  const loadingSkeleton = screen.getByLabelText(/Loading page content/i);
  expect(loadingSkeleton).toBeInTheDocument();
});
