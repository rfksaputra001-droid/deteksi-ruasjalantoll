/**
 * Production-ready Error Boundary with comprehensive error handling
 * Catches JavaScript errors anywhere in the child component tree
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Capture error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error details
    console.error('🚨 Error Boundary Caught Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // TODO: Integrate with error monitoring service like Sentry
    // For now, just log to console and localStorage for debugging
    
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      props: this.props.errorMetadata || {}
    };

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('errorReports', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error report in localStorage:', e);
    }

    // Send to backend API for logging (optional)
    this.sendErrorToAPI(errorReport);
  };

  getUserId = () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : 'anonymous';
    } catch (e) {
      return 'anonymous';
    }
  };

  sendErrorToAPI = async (errorReport) => {
    try {
      // Only send in production or when explicitly enabled
      if (process.env.NODE_ENV === 'production' && this.props.reportErrors !== false) {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport)
        });
      }
    } catch (e) {
      console.warn('Failed to send error report to API:', e);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Default error UI
      return (
        <div className=\"min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8\">
          <div className=\"sm:mx-auto sm:w-full sm:max-w-md\">
            <div className=\"bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10\">
              {/* Error Icon */}
              <div className=\"flex justify-center mb-6\">
                <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center\">
                  <svg 
                    className=\"w-8 h-8 text-red-600\" 
                    fill=\"none\" 
                    stroke=\"currentColor\" 
                    viewBox=\"0 0 24 24\"
                  >
                    <path 
                      strokeLinecap=\"round\" 
                      strokeLinejoin=\"round\" 
                      strokeWidth={2} 
                      d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z\" 
                    />
                  </svg>
                </div>
              </div>

              {/* Error Title */}
              <h2 className=\"text-center text-2xl font-bold text-gray-900 mb-4\">
                Oops! Terjadi Kesalahan
              </h2>

              {/* Error Message */}
              <div className=\"text-center text-gray-600 mb-6\">
                <p className=\"mb-2\">
                  Maaf, aplikasi mengalami error yang tidak terduga.
                </p>
                <p className=\"text-sm\">
                  Tim teknis telah diberitahu dan akan segera memperbaikinya.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className=\"mb-6 p-4 bg-red-50 border border-red-200 rounded-md\">
                  <h3 className=\"text-sm font-medium text-red-800 mb-2\">
                    Error Details (Development):
                  </h3>
                  <pre className=\"text-xs text-red-700 whitespace-pre-wrap break-words\">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className=\"mt-2\">
                      <summary className=\"text-xs text-red-600 cursor-pointer\">
                        Component Stack
                      </summary>
                      <pre className=\"text-xs text-red-600 mt-1 whitespace-pre-wrap break-words\">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className=\"flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3\">
                <button
                  onClick={this.handleReload}
                  className=\"flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
                >
                  Muat Ulang Halaman
                </button>
                <button
                  onClick={this.handleGoBack}
                  className=\"flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
                >
                  Kembali
                </button>
              </div>

              {/* Report Issue Link */}
              <div className=\"mt-6 text-center\">
                <a 
                  href=\"mailto:support@example.com?subject=Error Report\"
                  className=\"text-sm text-blue-600 hover:text-blue-500\"
                >
                  Laporkan masalah ini ke tim support
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  reportErrors: true
};

export default ErrorBoundary;