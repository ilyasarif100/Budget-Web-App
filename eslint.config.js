import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  // Base recommended rules
  js.configs.recommended,

  // Prettier config (must be last to override formatting rules)
  prettier,

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.min.js',
      'package-lock.json',
      '.husky/**',
      'logs/**',
    ],
  },

  // Browser files configuration
  {
    files: ['js/**/*.js', 'script.js', 'config.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        indexedDB: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        crypto: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        Response: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',
        // Global functions from other modules (loaded via script tags)
        showToast: 'readonly',
        errorHandler: 'readonly',
        loadData: 'readonly',
        saveData: 'readonly',
        filterTransactions: 'readonly',
        initializeDashboard: 'readonly',
        renderCategories: 'readonly',
        renderAccounts: 'readonly',
        populateCategoryFilters: 'readonly',
        populateAccountFilters: 'readonly',
        setLoading: 'readonly',
        authenticatedFetch: 'readonly',
        Plaid: 'readonly',
        // Global data (defined in script.js) - writable because they're modified
        transactions: 'writable',
        accounts: 'writable',
        categories: 'writable',
        filteredTransactions: 'writable',
        plaidItemIds: 'writable',
        // Global from db.js
        db: 'readonly',
        initDB: 'readonly',
        STORES: 'readonly',
        getAllFromStore: 'readonly',
        migrateFromLocalStorage: 'readonly',
        // Global from data.js
        accountsMap: 'readonly',
        transactionsMap: 'readonly',
        transactionsByAccountMap: 'readonly',
        transactionsByPlaidIdMap: 'readonly',
        transactionsByCategoryMap: 'readonly',
        transactionsByDateMap: 'readonly',
        memoize: 'readonly',
        buildTransactionsMaps: 'readonly',
        buildAccountsMap: 'readonly',
        invalidateCache: 'readonly',
        // Global from script.js - writable because they're modified
        editingCategoryId: 'writable',
        editingTransactionId: 'writable',
        editingAccountId: 'writable',
        includedAccountIds: 'writable',
        dirtyTransactions: 'writable',
        dirtyAccounts: 'writable',
        dirtyCategories: 'writable',
        // Additional globals
        alert: 'readonly',
        confirm: 'readonly',
        checkServerHealth: 'readonly',
        syncAllTransactions: 'readonly',
        saveIncludedAccounts: 'readonly',
        escapeHTML: 'readonly',
        getAccountSyncTime: 'readonly',
        getSyncStatusColor: 'readonly',
        formatTimeAgo: 'readonly',
        throttledSaveData: 'readonly',
        updateTotalBalance: 'readonly',
        confirmSyncSelectedAccounts: 'readonly',
        updateBalanceDisplay: 'readonly',
        calculateAccountBalances: 'readonly',
        updateTotalSpent: 'readonly',
        recalculateCategorySpent: 'readonly',
        formatCurrency: 'readonly',
        includedSpentAccountIds: 'readonly',
        includedSpentCategoryIds: 'readonly',
        includeExemptInSpent: 'readonly',
        renderCategoriesSummary: 'readonly',
        renderCategoriesExpanded: 'readonly',
        CONFIG: 'writable',
        waitForConfig: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-redeclare': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
  },

  // Server files configuration
  {
    files: ['server.js', 'scripts/**/*.js', 'utils/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-redeclare': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
  },

  // Test files configuration
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Config files (CommonJS)
  {
    files: ['jest.config.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },

  // JS module files that use CommonJS exports
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
  },

  // Config.js special case
  {
    files: ['config.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        AbortSignal: 'readonly',
        CONFIG: 'writable',
        waitForConfig: 'readonly',
      },
    },
    rules: {
      'no-redeclare': 'off',
      'no-global-assign': 'off',
    },
  },

  // Service Worker files
  {
    files: ['sw.js', 'workers/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        location: 'readonly',
        console: 'readonly',
        addEventListener: 'readonly',
        skipWaiting: 'readonly',
        clients: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
