// ============================================
// UI Helper Functions Module
// ============================================

// Toast Notification System
function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Loading State Management
const loadingStates = new Map(); // Track loading states by key

function setLoading(key, isLoading, element = null) {
  loadingStates.set(key, isLoading);

  // If element provided, update it directly
  if (element) {
    if (isLoading) {
      element.disabled = true;
      element.dataset.originalText = element.textContent || element.innerHTML;
      if (element.tagName === 'BUTTON') {
        element.innerHTML = `<span style="display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 0.5rem;"></span>${element.dataset.originalText || 'Loading...'}`;
      }
    } else {
      element.disabled = false;
      if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    }
  }
}

function isLoading(key) {
  return loadingStates.get(key) || false;
}

// Theme Management
function initializeTheme() {
  // Check localStorage for saved theme preference, default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon) {
      sunIcon.style.display = 'block';
    }
    if (moonIcon) {
      moonIcon.style.display = 'none';
    }
  } else {
    document.body.classList.remove('light-mode');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon) {
      sunIcon.style.display = 'none';
    }
    if (moonIcon) {
      moonIcon.style.display = 'block';
    }
  }
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  setTheme(isLight ? 'dark' : 'light');
}

// Update Current Month Display
function updateCurrentMonth() {
  const now = new Date();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const currentMonthEl = document.getElementById('current-month');
  if (currentMonthEl) {
    currentMonthEl.textContent = monthYear;
  }
}

// Initialize Dashboard
function initializeDashboard() {
  if (typeof updateTotalBalance !== 'undefined') {
    updateTotalBalance();
  }
  if (typeof updateTotalSpent !== 'undefined') {
    updateTotalSpent();
  }
  if (typeof recalculateCategorySpent !== 'undefined') {
    recalculateCategorySpent(); // Recalculate from transactions to ensure accuracy
  }
  if (typeof populateCategoryFilters !== 'undefined') {
    populateCategoryFilters();
  }
  if (typeof populateAccountFilters !== 'undefined') {
    populateAccountFilters();
  }
  if (typeof renderAccounts !== 'undefined') {
    renderAccounts();
  }
  if (typeof renderCategories !== 'undefined') {
    renderCategories();
  }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    setLoading,
    isLoading,
    initializeTheme,
    setTheme,
    toggleTheme,
    updateCurrentMonth,
    initializeDashboard,
  };
}
