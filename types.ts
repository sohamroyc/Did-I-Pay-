
export type PaymentMode = 'Cash' | 'UPI';
export type PaymentStatus = 'I Paid' | 'They Paid' | 'Split';

export interface Expense {
  id: string;
  amount: number;
  person: string;
  mode: PaymentMode;
  label?: string;
  status: PaymentStatus;
  timestamp: number;
  proof?: string; // Base64 encoded screenshot
}

export type View = 'home' | 'add' | 'person';
