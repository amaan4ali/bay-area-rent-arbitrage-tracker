import { View, StyleSheet, Linking } from "react-native";
import { Text, Button, Card, Avatar, Divider } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { usePayment } from "../../src/hooks/usePayment";
import { signOut } from "../../src/services/firebase";

export default function ProfileScreen() {
  const { user } = useAuth();
  const { onboardForPayments } = usePayment();

  const handleLinkBank = async () => {
    if (!user) return;
    const onboardingUrl = await onboardForPayments(user.id);
    // Opens Stripe's hosted onboarding page
    Linking.openURL(onboardingUrl);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <View style={styles.container}>
      {/* User info */}
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.displayName?.charAt(0).toUpperCase() || "?"}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.displayName}
        </Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      {/* Payment setup */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Payment Setup
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.paymentRow}>
            <View>
              <Text style={styles.paymentLabel}>Bank Account</Text>
              <Text style={styles.paymentStatus}>
                {user?.stripeCustomerId
                  ? "Connected"
                  : "Not linked"}
              </Text>
            </View>
            <Button
              mode={user?.stripeCustomerId ? "outlined" : "contained"}
              onPress={handleLinkBank}
              style={styles.linkButton}
            >
              {user?.stripeCustomerId ? "Update" : "Link Bank"}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* App info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            App
          </Text>
          <Divider style={styles.divider} />
          <Text style={styles.infoText}>Version 1.0.0</Text>
        </Card.Content>
      </Card>

      {/* Sign out */}
      <Button
        mode="outlined"
        onPress={handleSignOut}
        textColor="#e94560"
        style={styles.signOutButton}
      >
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", padding: 16 },
  header: { alignItems: "center", paddingVertical: 24 },
  avatar: { backgroundColor: "#e94560" },
  name: { color: "#fff", marginTop: 12, fontWeight: "bold" },
  phone: { color: "#888", marginTop: 4 },
  card: { backgroundColor: "#16213e", borderRadius: 12, marginBottom: 16 },
  sectionTitle: { color: "#fff" },
  divider: { backgroundColor: "#0f3460", marginVertical: 12 },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: { color: "#ccc" },
  paymentStatus: { color: "#888", fontSize: 13 },
  linkButton: { borderColor: "#e94560" },
  infoText: { color: "#888" },
  signOutButton: { marginTop: 16, borderColor: "#e94560" },
});
