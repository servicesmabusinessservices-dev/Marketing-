import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login action button', () => {
  render(<App />);
  const loginButton = screen.getByText(/Continue with Google/i);
  expect(loginButton).toBeInTheDocument();
});
