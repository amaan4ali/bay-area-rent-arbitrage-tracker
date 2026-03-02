import { BillItem, Split, SplitCalculationInput } from "../types";

/**
 * Core split calculation engine.
 *
 * How it works:
 * 1. For each item, divide price equally among assigned users
 * 2. Sum up each person's items subtotal
 * 3. Tax is distributed proportionally (your food % of subtotal = your tax %)
 * 4. Tip is distributed proportionally (same ratio)
 * 5. Round to nearest cent, fix rounding errors on the last person
 */
export function calculateSplits(input: SplitCalculationInput): Split[] {
  const { items, taxAmount, tipAmount, payerId, participants } = input;

  // Step 1: Calculate each person's item subtotal
  const subtotals = new Map<string, number>();
  for (const userId of participants) {
    subtotals.set(userId, 0);
  }

  for (const item of items) {
    const totalItemCost = item.price * item.quantity;
    const assignees = item.assignedTo;

    if (assignees.length === 0) continue;

    const perPersonCost = totalItemCost / assignees.length;

    for (const userId of assignees) {
      const current = subtotals.get(userId) ?? 0;
      subtotals.set(userId, current + perPersonCost);
    }
  }

  // Step 2: Calculate the overall food subtotal
  const foodSubtotal = Array.from(subtotals.values()).reduce((a, b) => a + b, 0);

  // Step 3: Build splits with proportional tax & tip
  const splits: Split[] = [];
  let runningTaxTotal = 0;
  let runningTipTotal = 0;
  let runningGrandTotal = 0;

  const participantList = [...participants];

  for (let i = 0; i < participantList.length; i++) {
    const userId = participantList[i];
    const itemsSubtotal = subtotals.get(userId) ?? 0;
    const isLast = i === participantList.length - 1;

    // Proportional share (handle $0 subtotal edge case)
    const proportion = foodSubtotal > 0 ? itemsSubtotal / foodSubtotal : 1 / participantList.length;

    let taxShare: number;
    let tipShare: number;

    if (isLast) {
      // Last person absorbs rounding remainder so total is exact
      taxShare = roundCents(taxAmount - runningTaxTotal);
      tipShare = roundCents(tipAmount - runningTipTotal);
    } else {
      taxShare = roundCents(taxAmount * proportion);
      tipShare = roundCents(tipAmount * proportion);
      runningTaxTotal += taxShare;
      runningTipTotal += tipShare;
    }

    const roundedSubtotal = roundCents(itemsSubtotal);
    const totalOwed = roundCents(roundedSubtotal + taxShare + tipShare);

    if (isLast) {
      // Also fix the grand total rounding
      const expectedTotal = roundCents(foodSubtotal + taxAmount + tipAmount);
      const adjustedTotal = roundCents(expectedTotal - runningGrandTotal);
      splits.push({
        userId,
        itemsSubtotal: roundedSubtotal,
        taxShare,
        tipShare,
        totalOwed: adjustedTotal,
        isPayer: userId === payerId,
        paymentStatus: userId === payerId ? "completed" : "pending",
      });
    } else {
      runningGrandTotal += totalOwed;
      splits.push({
        userId,
        itemsSubtotal: roundedSubtotal,
        taxShare,
        tipShare,
        totalOwed,
        isPayer: userId === payerId,
        paymentStatus: userId === payerId ? "completed" : "pending",
      });
    }
  }

  return splits;
}

/**
 * Calculate how much each non-payer owes the payer.
 * Returns a map of userId -> amount owed to payer.
 */
export function calculatePayments(
  splits: Split[],
  payerId: string
): Map<string, number> {
  const payments = new Map<string, number>();

  for (const split of splits) {
    if (split.userId === payerId) continue;
    if (split.totalOwed > 0) {
      payments.set(split.userId, split.totalOwed);
    }
  }

  return payments;
}

/**
 * Quick even split — everyone pays the same.
 */
export function calculateEvenSplit(
  totalAmount: number,
  participants: string[],
  payerId: string
): Split[] {
  const count = participants.length;
  const perPerson = roundCents(totalAmount / count);
  const remainder = roundCents(totalAmount - perPerson * count);

  return participants.map((userId, i) => {
    // Give the remainder penny to the last person
    const totalOwed = i === count - 1 ? perPerson + remainder : perPerson;

    return {
      userId,
      itemsSubtotal: totalOwed,
      taxShare: 0,
      tipShare: 0,
      totalOwed,
      isPayer: userId === payerId,
      paymentStatus: userId === payerId ? "completed" : "pending",
    };
  });
}

/**
 * Round to nearest cent.
 */
function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
