import {
  calculateSplits,
  calculatePayments,
  calculateEvenSplit,
} from "../splitCalculator";
import { BillItem, SplitCalculationInput } from "../../types";

describe("splitCalculator", () => {
  // The exact example from our dinner scenario
  describe("proportional split with shared items", () => {
    const items: BillItem[] = [
      { id: "1", name: "Burger", price: 18.0, quantity: 1, assignedTo: ["alex"] },
      { id: "2", name: "Pasta", price: 22.0, quantity: 1, assignedTo: ["jordan"] },
      { id: "3", name: "Salad", price: 14.0, quantity: 1, assignedTo: ["sam"] },
      { id: "4", name: "Steak", price: 35.0, quantity: 1, assignedTo: ["taylor"] },
      { id: "5", name: "Nachos", price: 12.0, quantity: 1, assignedTo: ["alex", "jordan", "sam", "taylor"] },
      { id: "6", name: "Pitcher", price: 19.0, quantity: 1, assignedTo: ["alex", "jordan", "sam", "taylor"] },
    ];

    const input: SplitCalculationInput = {
      items,
      taxAmount: 10.5,
      tipAmount: 24.0,
      payerId: "taylor",
      participants: ["alex", "jordan", "sam", "taylor"],
    };

    it("calculates correct subtotals per person", () => {
      const splits = calculateSplits(input);
      const alex = splits.find((s) => s.userId === "alex")!;
      const jordan = splits.find((s) => s.userId === "jordan")!;
      const sam = splits.find((s) => s.userId === "sam")!;
      const taylor = splits.find((s) => s.userId === "taylor")!;

      // Each person's food: personal item + ($12 + $19) / 4 = personal + $7.75
      expect(alex.itemsSubtotal).toBe(25.75);
      expect(jordan.itemsSubtotal).toBe(29.75);
      expect(sam.itemsSubtotal).toBe(21.75);
      expect(taylor.itemsSubtotal).toBe(42.75);
    });

    it("tax + tip shares sum to the original amounts", () => {
      const splits = calculateSplits(input);
      const totalTax = splits.reduce((sum, s) => sum + s.taxShare, 0);
      const totalTip = splits.reduce((sum, s) => sum + s.tipShare, 0);

      expect(Math.round(totalTax * 100) / 100).toBe(10.5);
      expect(Math.round(totalTip * 100) / 100).toBe(24.0);
    });

    it("all splits sum to the grand total", () => {
      const splits = calculateSplits(input);
      const grandTotal = splits.reduce((sum, s) => sum + s.totalOwed, 0);

      expect(Math.round(grandTotal * 100) / 100).toBe(154.5);
    });

    it("marks the payer correctly", () => {
      const splits = calculateSplits(input);
      const taylor = splits.find((s) => s.userId === "taylor")!;
      const alex = splits.find((s) => s.userId === "alex")!;

      expect(taylor.isPayer).toBe(true);
      expect(taylor.paymentStatus).toBe("completed");
      expect(alex.isPayer).toBe(false);
      expect(alex.paymentStatus).toBe("pending");
    });

    it("calculates correct payments owed to payer", () => {
      const splits = calculateSplits(input);
      const payments = calculatePayments(splits, "taylor");

      expect(payments.size).toBe(3); // 3 people owe taylor
      expect(payments.has("taylor")).toBe(false);

      // Total owed to Taylor should be grand total minus Taylor's share
      const totalOwedToTaylor = Array.from(payments.values()).reduce((a, b) => a + b, 0);
      const taylorShare = splits.find((s) => s.userId === "taylor")!.totalOwed;
      expect(Math.round((totalOwedToTaylor + taylorShare) * 100) / 100).toBe(154.5);
    });
  });

  describe("even split", () => {
    it("splits evenly among participants", () => {
      const splits = calculateEvenSplit(100, ["a", "b", "c", "d"], "a");
      expect(splits).toHaveLength(4);
      expect(splits[0].totalOwed).toBe(25);
      expect(splits[1].totalOwed).toBe(25);
      expect(splits[2].totalOwed).toBe(25);
      expect(splits[3].totalOwed).toBe(25);
    });

    it("handles uneven amounts with remainder on last person", () => {
      const splits = calculateEvenSplit(100, ["a", "b", "c"], "a");
      const total = splits.reduce((sum, s) => sum + s.totalOwed, 0);
      expect(Math.round(total * 100) / 100).toBe(100);
    });

    it("marks payer as completed", () => {
      const splits = calculateEvenSplit(80, ["a", "b"], "a");
      expect(splits.find((s) => s.userId === "a")!.paymentStatus).toBe("completed");
      expect(splits.find((s) => s.userId === "b")!.paymentStatus).toBe("pending");
    });
  });

  describe("edge cases", () => {
    it("handles a single person (no split needed)", () => {
      const input: SplitCalculationInput = {
        items: [{ id: "1", name: "Burger", price: 20, quantity: 1, assignedTo: ["solo"] }],
        taxAmount: 2,
        tipAmount: 4,
        payerId: "solo",
        participants: ["solo"],
      };
      const splits = calculateSplits(input);
      expect(splits).toHaveLength(1);
      expect(splits[0].totalOwed).toBe(26);
    });

    it("handles items with quantity > 1", () => {
      const input: SplitCalculationInput = {
        items: [{ id: "1", name: "Tacos", price: 5, quantity: 3, assignedTo: ["a", "b"] }],
        taxAmount: 0,
        tipAmount: 0,
        payerId: "a",
        participants: ["a", "b"],
      };
      const splits = calculateSplits(input);
      // 3 tacos at $5 = $15, split between 2 = $7.50 each
      expect(splits[0].totalOwed).toBe(7.5);
      expect(splits[1].totalOwed).toBe(7.5);
    });

    it("handles zero tax and tip", () => {
      const input: SplitCalculationInput = {
        items: [
          { id: "1", name: "A", price: 10, quantity: 1, assignedTo: ["x"] },
          { id: "2", name: "B", price: 20, quantity: 1, assignedTo: ["y"] },
        ],
        taxAmount: 0,
        tipAmount: 0,
        payerId: "x",
        participants: ["x", "y"],
      };
      const splits = calculateSplits(input);
      expect(splits.find((s) => s.userId === "x")!.totalOwed).toBe(10);
      expect(splits.find((s) => s.userId === "y")!.totalOwed).toBe(20);
    });
  });
});
