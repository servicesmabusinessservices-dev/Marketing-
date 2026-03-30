import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Class-based error boundary — catches unhandled render/lifecycle errors
 * in the subtree and shows a friendly fallback instead of crashing the app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In a real project, send to Sentry / App Insights here.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary">
        <div className="error-boundary__card">
          <div className="error-boundary__icon">⚠</div>
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">
            {this.props.message || 'An unexpected error occurred while loading this page.'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="error-boundary__detail">
              {this.state.error.toString()}
            </pre>
          )}
          <button className="error-boundary__btn" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
