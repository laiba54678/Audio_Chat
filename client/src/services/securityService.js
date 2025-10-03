class SecurityService {
  constructor() {
    this.suspiciousActivities = [];
    this.maxSuspiciousActivities = 50;
    this.rateLimits = new Map();
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      strength: this.calculatePasswordStrength(password, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar),
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar) {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (hasUpperCase) score += 1;
    if (hasLowerCase) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecialChar) score += 1;
    if (password.length >= 16) score += 1;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 6) return 'strong';
    return 'very-strong';
  }

  // Rate limiting
  checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }
    
    const requests = this.rateLimits.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.rateLimits.set(key, validRequests);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimits.set(key, validRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - validRequests.length,
      resetTime: now + windowMs
    };
  }

  // Detect suspicious activity
  detectSuspiciousActivity(activity, context = {}) {
    const suspiciousPatterns = [
      { pattern: /script/i, type: 'xss_attempt' },
      { pattern: /union.*select/i, type: 'sql_injection_attempt' },
      { pattern: /<iframe/i, type: 'iframe_injection_attempt' },
      { pattern: /javascript:/i, type: 'javascript_injection_attempt' },
      { pattern: /eval\(/i, type: 'code_injection_attempt' }
    ];

    const detected = suspiciousPatterns.find(({ pattern }) => 
      pattern.test(activity)
    );

    if (detected) {
      this.logSuspiciousActivity({
        type: detected.type,
        activity,
        context,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      
      return {
        isSuspicious: true,
        type: detected.type,
        riskLevel: 'high'
      };
    }

    return { isSuspicious: false };
  }

  // Log suspicious activity
  logSuspiciousActivity(activity) {
    this.suspiciousActivities.unshift(activity);
    
    if (this.suspiciousActivities.length > this.maxSuspiciousActivities) {
      this.suspiciousActivities = this.suspiciousActivities.slice(0, this.maxSuspiciousActivities);
    }

    // In production, this would be sent to a security monitoring service
    console.warn('Suspicious activity detected:', activity);
  }

  // Get suspicious activities
  getSuspiciousActivities(limit = 10) {
    return this.suspiciousActivities.slice(0, limit);
  }

  // Clear suspicious activities
  clearSuspiciousActivities() {
    this.suspiciousActivities = [];
  }

  // Validate room access
  validateRoomAccess(room, user) {
    if (!room || !user) {
      return { allowed: false, reason: 'Invalid room or user' };
    }

    // Check if room is private and user has access
    if (room.type === 'Private') {
      const isParticipant = room.participants.some(p => 
        p.user.toString() === user.id || p.user.toString() === user._id
      );
      
      if (!isParticipant) {
        return { allowed: false, reason: 'Access denied to private room' };
      }
    }

    // Check room capacity
    if (room.participants.length >= room.maxParticipants) {
      return { allowed: false, reason: 'Room is full' };
    }

    return { allowed: true };
  }

  // Generate secure token
  generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const crypto = window.crypto || window.msCrypto;
    
    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for older browsers
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return result;
  }

  // Validate access code format
  validateAccessCode(code) {
    if (!code || typeof code !== 'string') {
      return { isValid: false, reason: 'Invalid access code format' };
    }

    if (code.length !== 6) {
      return { isValid: false, reason: 'Access code must be 6 characters' };
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
      return { isValid: false, reason: 'Access code must contain only uppercase letters and numbers' };
    }

    return { isValid: true };
  }

  // Check for potential security vulnerabilities
  checkSecurityVulnerabilities() {
    const vulnerabilities = [];

    // Check for mixed content
    if (window.location.protocol === 'https:' && 
        (document.querySelector('img[src^="http:"]') || 
         document.querySelector('script[src^="http:"]'))) {
      vulnerabilities.push({
        type: 'mixed_content',
        severity: 'medium',
        description: 'Mixed content detected - some resources are loaded over HTTP'
      });
    }

    // Check for insecure WebSocket connections
    if (window.location.protocol === 'https:' && 
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      const wsUrl = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:5001';
      if (wsUrl.startsWith('ws://')) {
        vulnerabilities.push({
          type: 'insecure_websocket',
          severity: 'high',
          description: 'WebSocket connection is not secure'
        });
      }
    }

    return vulnerabilities;
  }

  // Get security recommendations
  getSecurityRecommendations() {
    const recommendations = [];

    // Check password strength
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.password) {
      const passwordCheck = this.validatePassword(user.password);
      if (passwordCheck.strength === 'weak') {
        recommendations.push({
          type: 'password_strength',
          priority: 'high',
          message: 'Consider using a stronger password'
        });
      }
    }

    // Check for HTTPS
    if (window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost') {
      recommendations.push({
        type: 'https',
        priority: 'high',
        message: 'Use HTTPS in production for secure communication'
      });
    }

    return recommendations;
  }
}

export default new SecurityService();
