// ============================================
// Authentication Module
// ============================================

// Authentication State
let authToken = null;
let currentUser = null;
let isRegisterMode = false;

// Get authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Set authentication token in localStorage
function setAuthToken(token) {
    if (token) {
        localStorage.setItem('authToken', token);
        authToken = token;
    } else {
        localStorage.removeItem('authToken');
        authToken = null;
    }
}

// Authenticated fetch wrapper - adds Authorization header
async function authenticatedFetch(url, options = {}) {
    // Skip auth if AUTH_REQUIRED is false
    const authRequired = window.CONFIG?.FEATURES?.AUTH_REQUIRED;
    if (authRequired === false || authRequired === 'false' || authRequired === null || authRequired === undefined) {
        // No auth required - make regular fetch
        try {
            return await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
        } catch (error) {
            // Handle network errors (connection refused, etc.)
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3000.');
            }
            throw error;
        }
    }
    
    const token = getAuthToken();
    if (!token) {
        showAuthModal();
        throw new Error('Not authenticated. Please log in.');
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            setAuthToken(null);
            showAuthModal();
            throw new Error('Session expired. Please log in again.');
        }
        
        return response;
    } catch (error) {
        // Handle network errors (connection refused, etc.) - fail fast, no retry
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timed out. The server may be overloaded or unavailable.');
        }
        if (error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('network error')
        )) {
            throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3000.');
        }
        throw error;
    }
}

// Register new user
async function register(email, password) {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    currentUser = { email: data.user.email };
    return data;
}

// Login user
async function login(email, password) {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    currentUser = { email: data.user.email };
    return data;
}

// Verify token validity
async function verifyToken() {
    // Skip verification if AUTH_REQUIRED is false
    const authRequired = window.CONFIG?.FEATURES?.AUTH_REQUIRED;
    if (authRequired === false || authRequired === 'false' || authRequired === null || authRequired === undefined) {
        return true; // No auth required, consider "verified"
    }
    
    const token = getAuthToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            return true;
        }
        
        setAuthToken(null);
        return false;
    } catch (error) {
        console.error('Token verification error:', error);
        setAuthToken(null);
        return false;
    }
}

// Show authentication modal
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    
    isRegisterMode = false;
    updateAuthModal();
    modal.classList.add('active');
}

// Hide authentication modal
function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
}

// Toggle between login and register modes
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    updateAuthModal();
}

// Update auth modal UI based on mode
function updateAuthModal() {
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit');
    const switchBtn = document.getElementById('auth-switch-mode');
    const errorDiv = document.getElementById('auth-error');
    
    if (title) {
        title.textContent = isRegisterMode ? 'Register' : 'Login';
    }
    if (submitBtn) {
        submitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    }
    if (switchBtn) {
        switchBtn.textContent = isRegisterMode ? 'Already have an account?' : 'Need to register?';
    }
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

// Handle auth form submission
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');
    
    // Clear previous errors
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
    
    try {
        if (isRegisterMode) {
            await register(email, password);
            showToast('Registration successful!', 'success');
        } else {
            await login(email, password);
            showToast('Login successful!', 'success');
        }
        
        hideAuthModal();
        
        // Reload page to initialize with authenticated state
        window.location.reload();
    } catch (error) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = error.message || 'An error occurred. Please try again.';
        }
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Authentication', false);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAuthToken,
        setAuthToken,
        authenticatedFetch,
        register,
        login,
        verifyToken,
        showAuthModal,
        hideAuthModal,
        toggleAuthMode,
        handleAuthSubmit
    };
}

