import { useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Text, TextInput, Button, Card, Avatar, IconButton } from "react-native-paper";
import { db } from "../../src/services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../src/hooks/useAuth";
import { Friend, User } from "../../src/types";
import { useEffect } from "react";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<(Friend & { user?: User })[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Load friends list
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      const q = query(
        collection(db, "friends"),
        where("userId", "==", user.id)
      );
      const snapshot = await getDocs(q);
      setFriends(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Friend)
      );
    };

    loadFriends();
  }, [user]);

  // Search for user by phone
  const searchUser = async () => {
    setLoading(true);
    setSearchResult(null);
    try {
      const q = query(
        collection(db, "users"),
        where("phone", "==", searchPhone)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setSearchResult({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        } as User);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add friend
  const addFriend = async (friendUser: User) => {
    if (!user) return;

    await addDoc(collection(db, "friends"), {
      userId: user.id,
      friendUserId: friendUser.id,
      displayName: friendUser.displayName,
      addedAt: serverTimestamp(),
    });

    setFriends((prev) => [
      ...prev,
      {
        id: "",
        userId: user.id,
        friendUserId: friendUser.id,
        displayName: friendUser.displayName,
        addedAt: new Date(),
      },
    ]);
    setSearchResult(null);
    setSearchPhone("");
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    await deleteDoc(doc(db, "friends", friendId));
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
            <TextInput.Icon
              icon="magnify"
              onPress={searchUser}
            />
          }
        />

        {searchResult && (
          <Card style={styles.resultCard}>
            <Card.Content style={styles.resultContent}>
              <View>
                <Text style={styles.resultName}>
                  {searchResult.displayName}
                </Text>
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
  friendCard: {
    marginBottom: 8,
    backgroundColor: "#16213e",
    borderRadius: 12,
  },
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
