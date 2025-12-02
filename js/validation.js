/**
 * Input Validation Module
 * Provides comprehensive input validation for forms
 */

class Validator {
  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const trimmed = email.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    if (trimmed.length > 254) {
      return { valid: false, error: 'Email is too long (max 254 characters)' };
    }

    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }

    return { valid: true };
  }

  /**
   * Validate password
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password is too long (max 128 characters)' };
    }

    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    return { valid: true };
  }

  /**
   * Validate transaction amount
   */
  static validateAmount(amount) {
    if (amount === null || amount === undefined || amount === '') {
      return { valid: false, error: 'Amount is required' };
    }

    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    if (!isFinite(num)) {
      return { valid: false, error: 'Amount must be a finite number' };
    }

    if (Math.abs(num) > 999999999) {
      return { valid: false, error: 'Amount is too large' };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate date
   */
  static validateDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return { valid: false, error: 'Date is required' };
    }

    // Check YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
    }

    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }

    // Check if date is reasonable (not too far in past/future)
    const now = new Date();
    const yearDiff = date.getFullYear() - now.getFullYear();
    if (yearDiff < -10 || yearDiff > 1) {
      return { valid: false, error: 'Date must be within the last 10 years and not in the future' };
    }

    return { valid: true, value: dateString };
  }

  /**
   * Validate category name
   */
  static validateCategoryName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Category name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Category name cannot be empty' };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'Category name is too long (max 50 characters)' };
    }

    // Check for potentially dangerous characters (basic XSS prevention)
    if (/<script|javascript:|on\w+\s*=/i.test(trimmed)) {
      return { valid: false, error: 'Category name contains invalid characters' };
    }

    return { valid: true, value: trimmed };
  }

  /**
   * Validate category allocation
   */
  static validateAllocation(allocation) {
    if (allocation === null || allocation === undefined || allocation === '') {
      return { valid: false, error: 'Allocation is required' };
    }

    const num = typeof allocation === 'string' ? parseFloat(allocation) : allocation;

    if (isNaN(num)) {
      return { valid: false, error: 'Allocation must be a valid number' };
    }

    if (num < 0) {
      return { valid: false, error: 'Allocation cannot be negative' };
    }

    if (num > 999999999) {
      return { valid: false, error: 'Allocation is too large' };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate account name
   */
  static validateAccountName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Account name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Account name cannot be empty' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Account name is too long (max 100 characters)' };
    }

    return { valid: true, value: trimmed };
  }

  /**
   * Validate merchant name
   */
  static validateMerchant(merchant) {
    if (!merchant || typeof merchant !== 'string') {
      return { valid: false, error: 'Merchant name is required' };
    }

    const trimmed = merchant.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Merchant name cannot be empty' };
    }

    if (trimmed.length > 200) {
      return { valid: false, error: 'Merchant name is too long (max 200 characters)' };
    }

    return { valid: true, value: trimmed };
  }

  /**
   * Sanitize input (remove dangerous characters)
   */
  static sanitize(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Validate form data object
   */
  static validateForm(formData, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, rule] of Object.entries(rules)) {
      const value = formData[field];
      const result = rule(value);

      if (!result.valid) {
        errors[field] = result.error;
        isValid = false;
      } else if (result.value !== undefined) {
        formData[field] = result.value; // Update with validated value
      }
    }

    return { valid: isValid, errors, data: formData };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
}
