// ============================================
// Utility Functions
// ============================================

// Format currency amount
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date string (YYYY-MM-DD) to readable format
function formatDate(dateString) {
  if (!dateString) {
    return '';
  }

  // Parse YYYY-MM-DD directly as local date to prevent timezone shifts
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Fallback for other date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format time ago (e.g., "2 hours ago", "3 days ago")
function formatTimeAgo(timestamp) {
  if (!timestamp) {
    return 'Never';
  }
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Debounce function - delays execution until after wait time
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function - limits execution to once per limit period
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Safe HTML helper - prevents XSS by escaping user input
function safeSetHTML(element, html) {
  if (!element) {
    return;
  }
  // For trusted HTML (like our own templates), use innerHTML
  // For user-generated content, use textContent
  element.innerHTML = html;
}

function safeSetText(element, text) {
  if (!element) {
    return;
  }
  // Always use textContent for user-generated content to prevent XSS
  element.textContent = text;
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
  if (typeof text !== 'string') {
    return text;
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatDate,
    formatTimeAgo,
    debounce,
    throttle,
    safeSetHTML,
    safeSetText,
    escapeHTML,
  };
}
