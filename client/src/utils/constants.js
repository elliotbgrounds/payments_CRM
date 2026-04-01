export const PIPELINE_STAGES = ['New', 'Contacted', 'Connected', 'Interest', 'Opportunity', 'Closed'];

// Adobe Spectrum-aligned status colors (light theme)
export const STAGE_COLORS = {
  New:         { bg: 'bg-gray-100',   text: 'text-gray-600',   hex: '#747474' },
  Contacted:   { bg: 'bg-blue-100',   text: 'text-blue-700',   hex: '#1473E6' },
  Connected:   { bg: 'bg-violet-100', text: 'text-violet-700', hex: '#7E22CE' },
  Interest:    { bg: 'bg-orange-100', text: 'text-orange-700', hex: '#E68619' },
  Opportunity: { bg: 'bg-green-100',  text: 'text-green-700',  hex: '#2D9D78' },
  Closed:      { bg: 'bg-red-100',    text: 'text-red-700',    hex: '#D7373F' },
};

export const PROCESSORS = [
  'Stripe', 'PayPal', 'Adyen', 'Worldpay', 'Checkout.com',
  'Braintree', 'Square', 'Mollie', 'Klarna',
];

export const NOTE_TYPES = ['general', 'call', 'email', 'meeting', 'follow_up'];
export const NOTE_TYPE_LABELS = {
  general: 'General', call: 'Call', email: 'Email', meeting: 'Meeting', follow_up: 'Follow-up'
};
export const NOTE_TYPE_COLORS = {
  general:   'bg-gray-100 text-gray-600',
  call:      'bg-blue-100 text-blue-700',
  email:     'bg-violet-100 text-violet-700',
  meeting:   'bg-green-100 text-green-700',
  follow_up: 'bg-orange-100 text-orange-700',
};

export const TASK_TYPES = ['follow_up', 'call', 'email', 'meeting', 'demo', 'other'];
export const TASK_TYPE_LABELS = {
  follow_up: 'Follow-up', call: 'Call', email: 'Email',
  meeting: 'Meeting', demo: 'Demo', other: 'Other'
};
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const PRIORITY_COLORS = {
  low:    'text-gray-400',
  medium: 'text-blue-500',
  high:   'text-orange-500',
  urgent: 'text-red-600',
};
export const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
export const INDUSTRIES = [
  'Consumer Electronics', 'Apparel & Fashion', 'Grocery & Food Delivery',
  'Health & Beauty', 'Home & Garden', 'Travel & Hospitality',
  'Financial Services', 'SaaS / Software', 'Marketplace', 'Other',
];
export const ECOMMERCE_PLATFORMS = [
  'Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Salesforce Commerce Cloud',
  'Custom', 'PrestaShop', 'OpenCart', 'Other',
];
export const SOURCES = ['Outbound', 'Inbound', 'Referral', 'Partner', 'Event', 'Import', 'Other'];

export const CRM_FIELDS = [
  { key: 'name', label: 'Company Name' },
  { key: 'domain', label: 'Domain' },
  { key: 'industry', label: 'Industry' },
  { key: 'company_size', label: 'Company Size' },
  { key: 'country', label: 'Country' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'current_processor', label: 'Payment Processor' },
  { key: 'annual_revenue', label: 'Annual Revenue' },
  { key: 'ecommerce_platform', label: 'eCommerce Platform' },
  { key: 'source', label: 'Source' },
  { key: 'first_name', label: 'Contact First Name' },
  { key: 'last_name', label: 'Contact Last Name' },
  { key: 'email', label: 'Contact Email' },
  { key: 'phone', label: 'Contact Phone' },
  { key: 'job_title', label: 'Contact Job Title' },
];
