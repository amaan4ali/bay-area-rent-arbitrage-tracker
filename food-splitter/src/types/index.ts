// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  stripeCustomerId?: string; // linked Stripe account for receiving money
  stripePaymentMethodId?: string; // linked card/bank for sending money
  createdAt: Date;
}

// ─── Meal / Bill ────────────────────────────────────────
export interface Meal {
  id: string;
  name: string; // e.g. "Dinner at Olive Garden"
  createdBy: string; // userId of person who created the meal
  payerId: string; // userId of person who paid the full bill
  participants: string[]; // array of userIds
  items: BillItem[];
  taxAmount: number;
  tipAmount: number;
  tipPercent?: number;
  totalAmount: number; // final total (subtotal + tax + tip)
  receiptImageUrl?: string;
  status: MealStatus;
  splits: Split[]; // calculated splits per person
  createdAt: Date;
  updatedAt: Date;
}

export type MealStatus = "draft" | "splitting" | "pending_payment" | "settled";

// ─── Bill Item ──────────────────────────────────────────
export interface BillItem {
  id: string;
  name: string; // e.g. "Burger", "Pasta"
  price: number;
  quantity: number;
  assignedTo: string[]; // userIds — if multiple, item is shared among them
}

// ─── Split (what each person owes) ──────────────────────
export interface Split {
  userId: string;
  itemsSubtotal: number; // sum of their food items (shared items divided)
  taxShare: number; // proportional tax
  tipShare: number; // proportional tip
  totalOwed: number; // itemsSubtotal + taxShare + tipShare
  isPayer: boolean; // true if this person paid the bill
  paymentStatus: PaymentStatus;
  paymentId?: string; // Stripe payment intent id
  paidAt?: Date;
}

export type PaymentStatus = "pending" | "processing" | "completed" | "failed";

// ─── Payment ────────────────────────────────────────────
export interface Payment {
  id: string;
  mealId: string;
  fromUserId: string;
  toUserId: string; // the payer who is owed money
  amount: number;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
}

// ─── Friend ─────────────────────────────────────────────
export interface Friend {
  id: string;
  userId: string;
  friendUserId: string;
  displayName: string;
  addedAt: Date;
}

// ─── OCR Result ─────────────────────────────────────────
export interface OCRResult {
  items: { name: string; price: number }[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  confidence: number; // 0-1
}

// ─── Split Calculation Input ────────────────────────────
export interface SplitCalculationInput {
  items: BillItem[];
  taxAmount: number;
  tipAmount: number;
  payerId: string;
  participants: string[];
}
