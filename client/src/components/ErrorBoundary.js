import React from 'react';
import errorService from '../services/errorService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error service
    const errorEntry = errorService.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown'
    });

    this.setState({
      error,
      errorInfo,
      errorId: errorEntry.timestamp
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // In a real app, you would send this to your error reporting service
    console.log('Error reported:', {
      errorId,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });

    // Show user feedback
    alert('Error has been reported. Thank you for your feedback!');
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      const userFriendlyMessage = errorService.getUserFriendlyMessage(error);

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">{userFriendlyMessage}</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {error && error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="btn-retry" 
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              <button 
                className="btn-report" 
                onClick={this.handleReportError}
              >
                Report Error
              </button>
              
              <button 
                className="btn-home" 
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </button>
            </div>

            {errorId && (
              <p className="error-id">
                Error ID: {errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
