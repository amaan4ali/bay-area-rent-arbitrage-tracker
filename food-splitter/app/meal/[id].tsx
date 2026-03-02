import { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Divider,
  ActivityIndicator,
  IconButton,
} from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useMeal } from "../../src/hooks/useMeal";
import { usePayment } from "../../src/hooks/usePayment";
import { getDisplayName } from "../../src/utils/names";
import { DEMO_MODE } from "../../src/config";
import { BillItem } from "../../src/types";

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { meal, loading, finalizeSplits, markSplitPaid } = useMeal(id ?? null);
  const { pay, processing: paymentProcessing } = usePayment();

  // ─── Item editing state ───────────────────────────────
  const [items, setItems] = useState<BillItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [taxInput, setTaxInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);

  const addItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const item: BillItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      price: parseFloat(newItemPrice),
      quantity: 1,
      assignedTo: [],
    };
    setItems([...items, item]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const toggleAssignment = (itemId: string, userId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const isAssigned = item.assignedTo.includes(userId);
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter((id) => id !== userId)
            : [...item.assignedTo, userId],
        };
      })
    );
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId));
  };

  const handleFinalize = async () => {
    const tax = parseFloat(taxInput) || 0;
    const tip = parseFloat(tipInput) || 0;
    await finalizeSplits(items, tax, tip);
  };

  const handlePay = async () => {
    if (!meal || !user) return;
    const mySplit = meal.splits.find((s) => s.userId === user.id);
    if (!mySplit || mySplit.isPayer) return;

    if (DEMO_MODE) {
      // In demo mode, simulate instant payment
      await markSplitPaid(user.id, "demo-payment");
      return;
    }

    const success = await pay(meal.id, user.id, meal.payerId, mySplit.totalOwed);
    if (success) {
      await markSplitPaid(user.id, "stripe_payment");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Meal not found</Text>
      </View>
    );
  }

  const mySplit = meal.splits.find((s) => s.userId === user?.id);
  const isDraft = meal.status === "draft" || meal.status === "splitting";
  const isPendingPayment = meal.status === "pending_payment";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Meal header */}
      <Text variant="headlineSmall" style={styles.title}>
        {meal.name}
      </Text>
      <Text style={styles.participantCount}>
        {meal.participants.length} people splitting
      </Text>

      {/* ─── DRAFT MODE: Add items & assign ─────────── */}
      {isDraft && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Add Items
              </Text>

              {items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Pressable
                    style={styles.itemInfo}
                    onPress={() =>
                      setAssigningItemId(assigningItemId === item.id ? null : item.id)
                    }
                  >
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  </Pressable>
                  <IconButton
                    icon="close"
                    size={16}
                    iconColor="#666"
                    onPress={() => removeItem(item.id)}
                  />

                  {assigningItemId === item.id && (
                    <View style={styles.assignRow}>
                      <Text style={styles.assignLabel}>Who ordered this?</Text>
                      <View style={styles.chipRow}>
                        {meal.participants.map((pId) => (
                          <Chip
                            key={pId}
                            selected={item.assignedTo.includes(pId)}
                            onPress={() => toggleAssignment(item.id, pId)}
                            style={[
                              styles.assignChip,
                              item.assignedTo.includes(pId) && styles.assignChipSelected,
                            ]}
                            textStyle={{ color: "#fff", fontSize: 12 }}
                          >
                            {getDisplayName(pId, user?.id)}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}

              <View style={styles.addItemRow}>
                <TextInput
                  mode="outlined"
                  label="Item"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  style={styles.itemInput}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="$"
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                  dense
                />
                <IconButton
                  icon="plus"
                  mode="contained"
                  containerColor="#e94560"
                  iconColor="#fff"
                  size={20}
                  onPress={addItem}
                />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Tax & Tip
              </Text>
              <View style={styles.taxTipRow}>
                <TextInput
                  mode="outlined"
                  label="Tax $"
                  value={taxInput}
                  onChangeText={setTaxInput}
                  keyboardType="decimal-pad"
                  style={styles.halfInput}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Tip $"
                  value={tipInput}
                  onChangeText={setTipInput}
                  keyboardType="decimal-pad"
                  style={styles.halfInput}
                  dense
                />
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleFinalize}
            disabled={items.length === 0}
            style={styles.calculateButton}
          >
            Calculate Split
          </Button>
        </>
      )}

      {/* ─── PAYMENT MODE: Show splits ───────────────── */}
      {isPendingPayment && meal.splits.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Everyone's Share
            </Text>

            {meal.splits.map((split) => {
              const isMe = split.userId === user?.id;
              const name = getDisplayName(split.userId, user?.id);
              return (
                <View key={split.userId}>
                  <View style={styles.splitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.splitName, isMe && styles.splitNameMe]}>
                        {name}
                        {split.isPayer ? " (paid the bill)" : ""}
                      </Text>
                      <Text style={styles.splitBreakdown}>
                        Food: ${split.itemsSubtotal.toFixed(2)} + Tax: $
                        {split.taxShare.toFixed(2)} + Tip: ${split.tipShare.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.splitRight}>
                      <Text style={styles.splitAmount}>
                        ${split.totalOwed.toFixed(2)}
                      </Text>
                      <Chip
                        compact
                        style={{
                          backgroundColor:
                            split.paymentStatus === "completed" ? "#66bb6a" : "#e94560",
                        }}
                        textStyle={{ color: "#fff", fontSize: 10 }}
                      >
                        {split.paymentStatus === "completed" ? "paid" : "owes"}
                      </Chip>
                    </View>
                  </View>
                  <Divider style={styles.splitDivider} />
                </View>
              );
            })}

            {/* Total summary */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Bill Total</Text>
              <Text style={styles.totalValue}>${meal.totalAmount.toFixed(2)}</Text>
            </View>

            {mySplit && !mySplit.isPayer && mySplit.paymentStatus === "pending" && (
              <Button
                mode="contained"
                onPress={handlePay}
                loading={paymentProcessing}
                style={styles.payButton}
              >
                Pay ${mySplit.totalOwed.toFixed(2)}
              </Button>
            )}

            {mySplit?.paymentStatus === "completed" && !mySplit.isPayer && (
              <Text style={styles.paidText}>You've paid your share!</Text>
            )}

            {mySplit?.isPayer && (
              <Text style={styles.payerText}>
                You paid the bill. Waiting for {meal.splits.filter((s) => !s.isPayer && s.paymentStatus === "pending").length} people to pay you back.
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Settled state */}
      {meal.status === "settled" && (
        <Card style={styles.card}>
          <Card.Content style={styles.settledContent}>
            <Text variant="headlineMedium" style={styles.settledEmoji}>
              All settled!
            </Text>
            <Text style={styles.settledSubtext}>
              Everyone has paid their share.
            </Text>

            {/* Show final breakdown even in settled state */}
            <Divider style={[styles.splitDivider, { marginVertical: 16 }]} />
            {meal.splits.map((split) => (
              <View key={split.userId} style={styles.settledRow}>
                <Text style={styles.settledName}>
                  {getDisplayName(split.userId, user?.id)}
                </Text>
                <Text style={styles.settledAmount}>${split.totalOwed.toFixed(2)}</Text>
              </View>
            ))}
            <Divider style={[styles.splitDivider, { marginVertical: 8 }]} />
            <View style={styles.settledRow}>
              <Text style={[styles.settledName, { fontWeight: "bold" }]}>Total</Text>
              <Text style={[styles.settledAmount, { color: "#e94560" }]}>
                ${meal.totalAmount.toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" },
  title: { color: "#fff", fontWeight: "bold" },
  participantCount: { color: "#888", marginBottom: 20 },
  card: { backgroundColor: "#16213e", borderRadius: 12, marginBottom: 16 },
  sectionTitle: { color: "#fff", marginBottom: 12 },
  itemRow: { borderBottomWidth: 1, borderBottomColor: "#0f3460", paddingVertical: 8 },
  itemInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { color: "#ccc", flex: 1 },
  itemPrice: { color: "#fff", fontWeight: "600", marginRight: 8 },
  assignRow: { marginTop: 8, marginBottom: 4 },
  assignLabel: { color: "#888", fontSize: 12, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  assignChip: { backgroundColor: "#0f3460" },
  assignChipSelected: { backgroundColor: "#e94560" },
  addItemRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  itemInput: { flex: 2 },
  priceInput: { flex: 1 },
  taxTipRow: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  calculateButton: { backgroundColor: "#e94560", paddingVertical: 4, marginBottom: 16 },
  splitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  splitName: { color: "#ccc", fontSize: 16 },
  splitNameMe: { color: "#e94560", fontWeight: "bold" },
  splitBreakdown: { color: "#666", fontSize: 12, marginTop: 2 },
  splitRight: { alignItems: "flex-end", gap: 4 },
  splitAmount: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  splitDivider: { backgroundColor: "#0f3460" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  totalLabel: { color: "#888", fontSize: 14 },
  totalValue: { color: "#e94560", fontSize: 18, fontWeight: "bold" },
  payButton: { backgroundColor: "#e94560", marginTop: 16, paddingVertical: 4 },
  paidText: { color: "#66bb6a", textAlign: "center", marginTop: 16, fontSize: 16 },
  payerText: { color: "#888", textAlign: "center", marginTop: 16, fontSize: 14 },
  settledContent: { alignItems: "center", padding: 24 },
  settledEmoji: { color: "#66bb6a" },
  settledSubtext: { color: "#888", marginTop: 8 },
  settledRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 6 },
  settledName: { color: "#ccc", fontSize: 15 },
  settledAmount: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
