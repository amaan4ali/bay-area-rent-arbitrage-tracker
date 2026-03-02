import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { Text, FAB, Card, Chip, ActivityIndicator } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useUserMeals } from "../../src/hooks/useMeal";
import { Meal } from "../../src/types";

export default function HomeScreen() {
  const { user } = useAuth();
  const { meals, loading, refresh } = useUserMeals(user?.id ?? null);

  const activeMeals = meals.filter((m) => m.status !== "settled");
  const pendingAmount = activeMeals.reduce((total, meal) => {
    const mySplit = meal.splits.find((s) => s.userId === user?.id);
    if (mySplit && !mySplit.isPayer && mySplit.paymentStatus === "pending") {
      return total + mySplit.totalOwed;
    }
    return total;
  }, 0);

  const renderMealCard = ({ item: meal }: { item: Meal }) => {
    const mySplit = meal.splits.find((s) => s.userId === user?.id);
    const statusColors: Record<string, string> = {
      draft: "#ffa726",
      splitting: "#42a5f5",
      pending_payment: "#e94560",
      settled: "#66bb6a",
    };

    return (
      <Pressable onPress={() => router.push(`/meal/${meal.id}`)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.mealName}>
                {meal.name}
              </Text>
              <Chip
                compact
                style={{ backgroundColor: statusColors[meal.status] || "#666" }}
                textStyle={{ color: "#fff", fontSize: 11 }}
              >
                {meal.status.replace("_", " ")}
              </Chip>
            </View>

            <Text style={styles.participants}>
              {meal.participants.length} people
            </Text>

            {mySplit && (
              <View style={styles.splitInfo}>
                <Text style={styles.amount}>
                  {mySplit.isPayer ? "You paid" : "You owe"}{" "}
                  <Text style={styles.amountValue}>
                    ${mySplit.totalOwed.toFixed(2)}
                  </Text>
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLabel}>You owe</Text>
        <Text style={styles.summaryAmount}>${pendingAmount.toFixed(2)}</Text>
      </View>

      {/* Meal list */}
      {activeMeals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active splits</Text>
          <Text style={styles.emptySubtext}>
            Tap + to start splitting a bill
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeMeals}
          keyExtractor={(item) => item.id}
          renderItem={renderMealCard}
          contentContainerStyle={styles.list}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}

      {/* New meal FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => router.push("/meal/create")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#16213e",
    borderBottomWidth: 1,
    borderBottomColor: "#0f3460",
  },
  summaryLabel: { color: "#888", fontSize: 16 },
  summaryAmount: { color: "#e94560", fontSize: 28, fontWeight: "bold" },
  list: { padding: 16 },
  card: {
    marginBottom: 12,
    backgroundColor: "#16213e",
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealName: { color: "#fff", fontWeight: "600" },
  participants: { color: "#888", marginTop: 4 },
  splitInfo: { marginTop: 12 },
  amount: { color: "#ccc" },
  amountValue: { color: "#e94560", fontWeight: "bold", fontSize: 18 },
  emptyText: { color: "#666", fontSize: 18 },
  emptySubtext: { color: "#444", marginTop: 8 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#e94560",
    borderRadius: 30,
  },
});
