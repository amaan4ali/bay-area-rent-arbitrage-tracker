import { View, FlatList, StyleSheet } from "react-native";
import { Text, Card, ActivityIndicator } from "react-native-paper";
import { useAuth } from "../../src/hooks/useAuth";
import { useUserMeals } from "../../src/hooks/useMeal";
import { Meal } from "../../src/types";

export default function HistoryScreen() {
  const { user } = useAuth();
  const { meals, loading } = useUserMeals(user?.id ?? null);

  const settledMeals = meals.filter((m) => m.status === "settled");

  const renderItem = ({ item: meal }: { item: Meal }) => {
    const mySplit = meal.splits.find((s) => s.userId === user?.id);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.name}>
            {meal.name}
          </Text>
          <Text style={styles.date}>
            {meal.createdAt instanceof Date
              ? meal.createdAt.toLocaleDateString()
              : ""}
          </Text>
          <Text style={styles.amount}>
            Your share: ${mySplit?.totalOwed.toFixed(2) ?? "0.00"}
          </Text>
          <Text style={styles.total}>
            Bill total: ${meal.totalAmount.toFixed(2)}
          </Text>
        </Card.Content>
      </Card>
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
      {settledMeals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No settled meals yet</Text>
        </View>
      ) : (
        <FlatList
          data={settledMeals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: "#16213e", borderRadius: 12 },
  name: { color: "#fff", fontWeight: "600" },
  date: { color: "#666", marginTop: 4 },
  amount: { color: "#66bb6a", marginTop: 8 },
  total: { color: "#888", marginTop: 2 },
  emptyText: { color: "#666", fontSize: 16 },
});
