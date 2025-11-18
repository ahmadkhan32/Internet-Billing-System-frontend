// Use environment variable if set, otherwise use relative path for same-domain deployment
// This allows the frontend to work on the same Vercel domain as the backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ACCOUNT_MANAGER: 'account_manager',
  TECHNICAL_OFFICER: 'technical_officer',
  RECOVERY_OFFICER: 'recovery_officer',
  MARKETING_OFFICER: 'marketing_officer',
  CUSTOMER: 'customer'
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Business Admin', // Changed from 'Admin' to 'Business Admin'
  [ROLES.ACCOUNT_MANAGER]: 'Account Manager',
  [ROLES.TECHNICAL_OFFICER]: 'Technical Officer',
  [ROLES.RECOVERY_OFFICER]: 'Recovery Officer',
  [ROLES.MARKETING_OFFICER]: 'Marketing / Promotion Officer',
  [ROLES.CUSTOMER]: 'Customer'
};

// Role options for dropdowns (matching screenshot)
export const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.ACCOUNT_MANAGER, label: ROLE_LABELS[ROLES.ACCOUNT_MANAGER] },
  { value: ROLES.TECHNICAL_OFFICER, label: ROLE_LABELS[ROLES.TECHNICAL_OFFICER] },
  { value: ROLES.RECOVERY_OFFICER, label: ROLE_LABELS[ROLES.RECOVERY_OFFICER] },
  { value: ROLES.MARKETING_OFFICER, label: ROLE_LABELS[ROLES.MARKETING_OFFICER] },
  { value: ROLES.CUSTOMER, label: ROLE_LABELS[ROLES.CUSTOMER] }
];

export const BILL_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

export const BILL_STATUS_LABELS = {
  [BILL_STATUS.PENDING]: 'Pending',
  [BILL_STATUS.PAID]: 'Paid',
  [BILL_STATUS.PARTIAL]: 'Partial',
  [BILL_STATUS.OVERDUE]: 'Overdue',
  [BILL_STATUS.CANCELLED]: 'Cancelled'
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  BANK_TRANSFER: 'bank_transfer',
  JAZZCASH: 'jazzcash',
  EASYPAISA: 'easypaisa',
  STRIPE: 'stripe'
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Cash',
  [PAYMENT_METHODS.CARD]: 'Card',
  [PAYMENT_METHODS.ONLINE]: 'Online',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
  [PAYMENT_METHODS.JAZZCASH]: 'JazzCash',
  [PAYMENT_METHODS.EASYPAISA]: 'EasyPaisa',
  [PAYMENT_METHODS.STRIPE]: 'Stripe'
};

export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DISCONNECTED: 'disconnected'
};

export const CUSTOMER_STATUS_LABELS = {
  [CUSTOMER_STATUS.ACTIVE]: 'Active',
  [CUSTOMER_STATUS.INACTIVE]: 'Inactive',
  [CUSTOMER_STATUS.SUSPENDED]: 'Suspended',
  [CUSTOMER_STATUS.DISCONNECTED]: 'Disconnected'
};

