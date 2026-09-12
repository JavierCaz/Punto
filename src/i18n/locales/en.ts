import type es from './es';

/**
 * English (en) resource.
 *
 * Typed against `typeof es` so the compiler enforces key parity between the
 * two languages — a translation file can never silently drift out of sync.
 */
const en: typeof es = {
  common: {
    appName: 'Punto',
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
      retry: 'Retry',
      more: 'More options',
      continue: 'Continue',
      signOut: 'Sign out',
    },
    status: {
      loading: 'Loading…',
      error: 'Something went wrong',
      empty: 'No results',
    },
  },

  currencies: {
    MXN: 'Mexican peso (MXN)',
    USD: 'US dollar (USD)',
  },

  accents: {
    royal: 'Royal blue',
    emerald: 'Emerald',
    indigo: 'Indigo',
    amber: 'Amber',
    slate: 'Slate',
    rose: 'Rose',
  },

  business: {
    nameLabel: 'Business name',
    namePlaceholder: 'e.g. Corner Café',
    nameRequired: 'Enter your business name.',
    logoLabel: 'Logo',
    logoHint: 'Optional. It will appear in your point of sale and receipts.',
    logoAdd: 'Add logo',
    logoChange: 'Change logo',
    logoRemove: 'Remove',
    logoPermissionDenied: 'We need permission to access your photos.',
    logoFailed: "We couldn't load the image. Try again.",
    accentLabel: 'Accent color',
    currencyLabel: 'Currency',
    localeLabel: 'Language',
    loading: 'Loading…',
    save: 'Save changes',
    savePending: 'Saving…',
    saved: 'Changes saved',
    saveFailed: "We couldn't save your changes. Try again.",
  },

  tabs: {
    pos: 'POS',
    sales: 'Sales',
    inventory: 'Inventory',
    more: 'More',
  },

  pos: {
    title: 'Point of sale',
    searchPlaceholder: 'Search product by name…',
    empty: {
      title: 'Your catalog is still empty',
      message: 'Add your products and categories to start charging from the point of sale.',
      action: 'Add product',
    },
  },

  sales: {
    title: 'Sales',
    empty: {
      title: 'No sales yet',
      message: 'When you charge a sale from the point of sale, its history will show up here.',
    },
  },

  inventory: {
    title: 'Inventory',
    empty: {
      title: 'No products in inventory',
      message: 'Add products with stock tracking to see your inventory and its movements here.',
    },
  },

  more: {
    account: 'Account',
    signedInAs: 'Signed in as {{name}}',
    team: 'Team',
    teamSubtitle: 'Employees and users',
    settingsSubtitle: 'Appearance, language and preferences',
    about: 'About Punto',
    signOut: 'Sign out',
  },

  settings: {
    title: 'Settings',
    entry: 'Settings',
    appearance: 'Appearance',
    theme: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    languageOptions: {
      es: 'Español',
      en: 'English',
    },
    business: 'Business',
    aboutLine: 'Made for local businesses · Your data lives only on this device.',
  },

  roles: {
    admin: 'Administrator',
    employee: 'Employee',
  },

  onboarding: {
    stepBusiness: '1 · Your business',
    stepAccount: '2 · Your administrator account',
    businessNameLabel: 'Business name',
    businessNamePlaceholder: 'e.g. Corner Café',
    businessNameHint: 'This name shows in your point of sale and receipts.',
    accountHint: 'Create the owner account: it manages Punto and can add employees.',
    firstNameLabel: 'Your name',
    firstNamePlaceholder: 'e.g. Ana',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g. ana.owner',
    usernameHint: '3–32 characters: lowercase letters, numbers, . _ -',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPasswordLabel: 'Repeat password',
    submit: 'Create my business',
    submitPending: 'Creating…',
    errors: {
      businessNameRequired: 'Enter your business name.',
      firstNameRequired: 'Enter your name.',
      usernameInvalid: 'Use 3–32 characters: lowercase letters, numbers, . _ -',
      passwordTooShort: 'Password must be at least 8 characters.',
      passwordMismatch: 'Passwords do not match.',
      usernameTaken: 'That username is taken. Choose another.',
      failed: "We couldn't create your business. Try again.",
    },
  },

  login: {
    title: 'Sign in',
    welcomeBack: 'Welcome back',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Your username',
    continueButton: 'Continue',
    backToUsername: 'Switch user',
    passwordLabel: 'Password',
    pinLabel: '4 to 6 digit PIN',
    submitButton: 'Sign in',
    errors: {
      usernameRequired: 'Enter your username.',
      userNotFound: 'We could not find that user.',
      invalidCredentials: 'Incorrect username or password.',
      invalidPin: 'Incorrect PIN.',
      inactive: 'This account is not active.',
      locked: 'Too many attempts. Wait {{seconds}} s and try again.',
      failed: "We couldn't sign you in. Try again.",
    },
  },

  team: {
    title: 'Team',
    subtitle: 'The people who use your Punto',
    add: 'Add employee',
    emptyTitle: 'No employees yet',
    emptyMessage: 'Add your team members so they can sign in with their PIN.',
    currentUserSuffix: '(you)',
    form: {
      title: 'New employee',
      firstNameLabel: 'First name',
      firstNamePlaceholder: 'e.g. Luis',
      lastNameLabel: 'Last name (optional)',
      lastNamePlaceholder: 'e.g. Garcia',
      usernameLabel: 'Username',
      usernamePlaceholder: 'e.g. luis.garcia',
      usernameHint: '3–32 characters: lowercase letters, numbers, . _ -',
      pinLabel: 'PIN',
      pinPlaceholder: '4 to 6 digits',
      pinHint: 'Used for quick sign-in at the register.',
      submit: 'Add to team',
      errors: {
        firstNameRequired: 'Enter the name.',
        usernameInvalid: 'Use 3–32 characters: lowercase letters, numbers, . _ -',
        pinInvalid: 'PIN must be 4 to 6 digits.',
        usernameTaken: 'That username is taken. Choose another.',
        failed: "We couldn't save. Try again.",
      },
    },
  },

  auth: {
    confirmSignOutTitle: 'Sign out?',
    confirmSignOutMessage: 'You will be signed out on this device until you sign in again.',
    archiveConfirmTitle: 'Remove {{name}}?',
    archiveConfirmMessage: '{{name}} will no longer be able to sign in. Their sales history is kept.',
    archiveBlockedLastAdmin: "You can't remove the last administrator.",
    archiveBlockedSelf: "You can't remove yourself.",
  },
};

export default en;
