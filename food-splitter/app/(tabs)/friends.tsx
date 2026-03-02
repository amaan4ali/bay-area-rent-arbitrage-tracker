import { useState, useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Text, TextInput, Button, Card, Avatar, IconButton } from "react-native-paper";
import { useAuth } from "../../src/hooks/useAuth";
import { DEMO_MODE } from "../../src/config";
import { DEMO_FRIENDS } from "../../src/demo-data";
import { Friend, User } from "../../src/types";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Load friends list
  useEffect(() => {
    if (!user) return;

    if (DEMO_MODE) {
      setFriends(
        DEMO_FRIENDS.map((f) => ({
          id: f.id,
          userId: user.id,
          friendUserId: f.id,
          displayName: f.displayName,
          addedAt: new Date(),
        }))
      );
      return;
    }

    // Production: load from Firestore
    (async () => {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { firebaseReady } = await import("../../src/services/firebase");
      await firebaseReady;
      const firebase = await import("../../src/services/firebase");
      // In production, would query Firestore here
    })();
  }, [user]);

  // Search for user by phone
  const searchUser = async () => {
    if (DEMO_MODE) {
      // Demo: match against demo friends
      const found = DEMO_FRIENDS.find((f) => f.phone.includes(searchPhone));
      setSearchResult(found ?? null);
      return;
    }

    setLoading(true);
    setSearchResult(null);
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { firebaseReady } = await import("../../src/services/firebase");
      await firebaseReady;
      // Production: query Firestore for user by phone
    } finally {
      setLoading(false);
    }
  };

  // Add friend
  const addFriend = async (friendUser: User) => {
    if (!user) return;

    const newFriend: Friend = {
      id: friendUser.id,
      userId: user.id,
      friendUserId: friendUser.id,
      displayName: friendUser.displayName,
      addedAt: new Date(),
    };

    if (!DEMO_MODE) {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { firebaseReady } = await import("../../src/services/firebase");
      await firebaseReady;
      // Production: add to Firestore
    }

    setFriends((prev) => [...prev, newFriend]);
    setSearchResult(null);
    setSearchPhone("");
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!DEMO_MODE) {
      const { doc, deleteDoc } = await import("firebase/firestore");
      const { firebaseReady } = await import("../../src/services/firebase");
      await firebaseReady;
      // Production: delete from Firestore
    }

    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchSection}>
        <TextInput
          mode="outlined"
          label="Add friend by phone"
          value={searchPhone}
          onChangeText={setSearchPhone}
          keyboardType="phone-pad"
          placeholder="+1 555-123-4567"
          style={styles.searchInput}
          right={
            <TextInput.Icon icon="magnify" onPress={searchUser} />
          }
        />

        {searchResult && (
          <Card style={styles.resultCard}>
            <Card.Content style={styles.resultContent}>
              <View>
                <Text style={styles.resultName}>{searchResult.displayName}</Text>
                <Text style={styles.resultPhone}>{searchResult.phone}</Text>
              </View>
              <Button mode="contained" onPress={() => addFriend(searchResult)} style={styles.addButton}>
                Add
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Friends list */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.friendUserId}
        renderItem={({ item }) => (
          <Card style={styles.friendCard}>
            <Card.Content style={styles.friendContent}>
              <View style={styles.friendInfo}>
                <Avatar.Text
                  size={40}
                  label={item.displayName.charAt(0).toUpperCase()}
                  style={styles.avatar}
                />
                <Text style={styles.friendName}>{item.displayName}</Text>
              </View>
              <IconButton
                icon="close"
                size={20}
                iconColor="#666"
                onPress={() => removeFriend(item.id)}
              />
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No friends added yet. Search by phone number above.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  center: { alignItems: "center", marginTop: 40 },
  searchSection: { padding: 16 },
  searchInput: { marginBottom: 8 },
  resultCard: { backgroundColor: "#0f3460", borderRadius: 12 },
  resultContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultName: { color: "#fff", fontWeight: "600" },
  resultPhone: { color: "#888" },
  addButton: { backgroundColor: "#e94560" },
  list: { padding: 16, paddingTop: 0 },
  friendCard: { marginBottom: 8, backgroundColor: "#16213e", borderRadius: 12 },
  friendContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  friendInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { backgroundColor: "#0f3460", marginRight: 12 },
  friendName: { color: "#fff", fontSize: 16 },
  emptyText: { color: "#666", textAlign: "center" },
});
