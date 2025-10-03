class ErrorService {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  // Log error with context
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      type: error.constructor.name
    };

    this.errorLog.unshift(errorEntry);
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }

    return errorEntry;
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error) {
    if (error.response) {
      // API error
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Please log in to continue.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This action conflicts with existing data.';
        case 422:
          return message || 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return message || 'An unexpected error occurred.';
      }
    } else if (error.request) {
      // Network error
      return 'Network error. Please check your connection.';
    } else {
      // Other error
      return error.message || 'An unexpected error occurred.';
    }
  }

  // Handle API errors
  handleApiError(error, context = {}) {
    const errorEntry = this.logError(error, context);
    return {
      message: this.getUserFriendlyMessage(error),
      originalError: error,
      errorId: errorEntry.timestamp
    };
  }

  // Handle WebSocket errors
  handleSocketError(error, context = {}) {
    const errorEntry = this.logError(error, context);
    return {
      message: 'Connection error. Please refresh the page.',
      originalError: error,
      errorId: errorEntry.timestamp
    };
  }

  // Get error history
  getErrorHistory(limit = 10) {
    return this.errorLog.slice(0, limit);
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }

  // Check if error is retryable
  isRetryableError(error) {
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429; // Server errors or rate limiting
    }
    return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT';
  }

  // Retry function with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

export default new ErrorService();
