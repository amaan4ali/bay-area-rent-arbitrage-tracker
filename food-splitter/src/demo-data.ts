/**
 * Demo data for previewing the app without any backend.
 * When DEMO_MODE is true, the app uses this data instead of Firebase.
 */
import { Meal, User, Split } from "./types";

export const DEMO_USER: User = {
  id: "demo-user",
  displayName: "You",
  email: "demo@foodsplitter.app",
  phone: "+1 555-000-0000",
  createdAt: new Date(),
};

export const DEMO_FRIENDS: User[] = [
  { id: "alex", displayName: "Alex", email: "", phone: "+1 555-111-1111", createdAt: new Date() },
  { id: "jordan", displayName: "Jordan", email: "", phone: "+1 555-222-2222", createdAt: new Date() },
  { id: "sam", displayName: "Sam", email: "", phone: "+1 555-333-3333", createdAt: new Date() },
];

// The dinner example from the walkthrough
const dinnerSplits: Split[] = [
  {
    userId: "demo-user",
    itemsSubtotal: 25.75,
    taxShare: 2.25,
    tipShare: 5.15,
    totalOwed: 33.15,
    isPayer: true,
    paymentStatus: "completed",
  },
  {
    userId: "alex",
    itemsSubtotal: 29.75,
    taxShare: 2.60,
    tipShare: 5.95,
    totalOwed: 38.30,
    isPayer: false,
    paymentStatus: "completed",
    paidAt: new Date(Date.now() - 3600000),
  },
  {
    userId: "jordan",
    itemsSubtotal: 21.75,
    taxShare: 1.90,
    tipShare: 4.35,
    totalOwed: 28.00,
    isPayer: false,
    paymentStatus: "completed",
    paidAt: new Date(Date.now() - 1800000),
  },
  {
    userId: "sam",
    itemsSubtotal: 42.75,
    taxShare: 3.74,
    tipShare: 8.55,
    totalOwed: 55.04,
    isPayer: false,
    paymentStatus: "completed",
    paidAt: new Date(Date.now() - 900000),
  },
];

const brunchSplits: Split[] = [
  {
    userId: "demo-user",
    itemsSubtotal: 18.00,
    taxShare: 1.58,
    tipShare: 3.60,
    totalOwed: 23.18,
    isPayer: true,
    paymentStatus: "completed",
  },
  {
    userId: "alex",
    itemsSubtotal: 22.00,
    taxShare: 1.93,
    tipShare: 4.40,
    totalOwed: 28.33,
    isPayer: false,
    paymentStatus: "pending",
  },
  {
    userId: "jordan",
    itemsSubtotal: 16.00,
    taxShare: 1.40,
    tipShare: 3.20,
    totalOwed: 20.60,
    isPayer: false,
    paymentStatus: "pending",
  },
];

const tacosSplits: Split[] = [
  {
    userId: "demo-user",
    itemsSubtotal: 14.50,
    taxShare: 1.27,
    tipShare: 2.90,
    totalOwed: 18.67,
    isPayer: false,
    paymentStatus: "pending",
  },
  {
    userId: "sam",
    itemsSubtotal: 19.50,
    taxShare: 1.71,
    tipShare: 3.90,
    totalOwed: 25.11,
    isPayer: true,
    paymentStatus: "completed",
  },
];

export const DEMO_MEALS: Meal[] = [
  {
    id: "meal-1",
    name: "Brunch at The Mill",
    createdBy: "demo-user",
    payerId: "demo-user",
    participants: ["demo-user", "alex", "jordan"],
    items: [
      { id: "1", name: "Avocado Toast", price: 18.00, quantity: 1, assignedTo: ["demo-user"] },
      { id: "2", name: "Eggs Benedict", price: 22.00, quantity: 1, assignedTo: ["alex"] },
      { id: "3", name: "Pancakes", price: 16.00, quantity: 1, assignedTo: ["jordan"] },
    ],
    taxAmount: 4.91,
    tipAmount: 11.20,
    totalAmount: 72.11,
    status: "pending_payment",
    splits: brunchSplits,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    id: "meal-2",
    name: "Tacos with Sam",
    createdBy: "sam",
    payerId: "sam",
    participants: ["demo-user", "sam"],
    items: [
      { id: "1", name: "Fish Tacos x2", price: 14.50, quantity: 1, assignedTo: ["demo-user"] },
      { id: "2", name: "Carne Asada x3", price: 19.50, quantity: 1, assignedTo: ["sam"] },
    ],
    taxAmount: 2.98,
    tipAmount: 6.80,
    totalAmount: 43.78,
    status: "pending_payment",
    splits: tacosSplits,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "meal-3",
    name: "Dinner at Olive Garden",
    createdBy: "demo-user",
    payerId: "demo-user",
    participants: ["demo-user", "alex", "jordan", "sam"],
    items: [
      { id: "1", name: "Burger", price: 18.00, quantity: 1, assignedTo: ["demo-user"] },
      { id: "2", name: "Pasta", price: 22.00, quantity: 1, assignedTo: ["alex"] },
      { id: "3", name: "Salad", price: 14.00, quantity: 1, assignedTo: ["jordan"] },
      { id: "4", name: "Steak", price: 35.00, quantity: 1, assignedTo: ["sam"] },
      { id: "5", name: "Nachos", price: 12.00, quantity: 1, assignedTo: ["demo-user", "alex", "jordan", "sam"] },
      { id: "6", name: "Pitcher", price: 19.00, quantity: 1, assignedTo: ["demo-user", "alex", "jordan", "sam"] },
    ],
    taxAmount: 10.50,
    tipAmount: 24.00,
    totalAmount: 154.50,
    status: "settled",
    splits: dinnerSplits,
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(Date.now() - 259200000),
  },
];
