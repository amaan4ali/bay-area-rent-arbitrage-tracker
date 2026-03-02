import { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput, Button, Chip, Card } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useCreateMeal } from "../../src/hooks/useMeal";

export default function CreateMealScreen() {
  const { user } = useAuth();
  const { createNewMeal, creating } = useCreateMeal();
  const [name, setName] = useState("");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendInput, setFriendInput] = useState("");

  // In production, this would pull from the friends list
  // For now, we add participants by name/id
  const addParticipant = () => {
    if (friendInput.trim() && !friendIds.includes(friendInput.trim())) {
      setFriendIds([...friendIds, friendInput.trim()]);
      setFriendInput("");
    }
  };

  const removeParticipant = (id: string) => {
    setFriendIds(friendIds.filter((f) => f !== id));
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;

    // Include the current user as a participant
    const participants = [user.id, ...friendIds];

    const mealId = await createNewMeal(name.trim(), user.id, participants);

    // Navigate to the meal detail page where they can add items
    router.replace(`/meal/${mealId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        New Meal
      </Text>

      {/* Meal name */}
      <TextInput
        mode="outlined"
        label="What's the occasion?"
        placeholder="Dinner at Olive Garden"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      {/* Add participants */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Who's splitting?
          </Text>

          {/* Current user (always included) */}
          <Chip style={styles.meChip} textStyle={{ color: "#fff" }}>
            You (payer)
          </Chip>

          {/* Added friends */}
          <View style={styles.chipRow}>
            {friendIds.map((id) => (
              <Chip
                key={id}
                onClose={() => removeParticipant(id)}
                style={styles.friendChip}
                textStyle={{ color: "#fff" }}
              >
                {id}
              </Chip>
            ))}
          </View>

          {/* Add friend input */}
          <View style={styles.addRow}>
            <TextInput
              mode="outlined"
              label="Add friend"
              value={friendInput}
              onChangeText={setFriendInput}
              style={styles.addInput}
              onSubmitEditing={addParticipant}
            />
            <Button mode="contained" onPress={addParticipant} style={styles.addButton}>
              Add
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Scan or manual entry */}
      <View style={styles.entryOptions}>
        <Button
          mode="contained"
          icon="camera"
          onPress={() => router.push("/meal/scan")}
          style={styles.scanButton}
        >
          Scan Receipt
        </Button>

        <Button
          mode="outlined"
          icon="pencil"
          onPress={handleCreate}
          loading={creating}
          disabled={!name.trim() || friendIds.length === 0 || creating}
          style={styles.manualButton}
          textColor="#e94560"
        >
          Enter Manually
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  content: { padding: 16 },
  title: { color: "#fff", fontWeight: "bold", marginBottom: 20 },
  input: { marginBottom: 16 },
  card: { backgroundColor: "#16213e", borderRadius: 12, marginBottom: 20 },
  sectionTitle: { color: "#fff", marginBottom: 12 },
  meChip: {
    backgroundColor: "#0f3460",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  friendChip: { backgroundColor: "#e94560" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: { flex: 1 },
  addButton: { backgroundColor: "#0f3460", marginTop: 6 },
  entryOptions: { gap: 12 },
  scanButton: { backgroundColor: "#e94560", paddingVertical: 4 },
  manualButton: { borderColor: "#e94560", paddingVertical: 4 },
});
