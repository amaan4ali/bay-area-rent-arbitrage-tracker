import { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface } from "react-native-paper";
import { router } from "expo-router";
import { auth } from "../../src/services/firebase";
import {
  signInWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
} from "firebase/auth";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendVerificationCode = async () => {
    setLoading(true);
    setError("");
    try {
      // In production, use Firebase Phone Auth with reCAPTCHA
      // For Expo, use expo-auth-session or a Cloud Function to send SMS
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/sendVerificationCode`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }
      );
      const { verificationId: vId } = await response.json();
      setVerificationId(vId);
    } catch (err) {
      setError("Failed to send code. Check your phone number.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) return;
    setLoading(true);
    setError("");
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>
          FoodSplitter
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Split bills. Pay instantly. No more IOUs.
        </Text>

        <Surface style={styles.card}>
          {!verificationId ? (
            <>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Enter your phone number
              </Text>
              <TextInput
                mode="outlined"
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 (555) 123-4567"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={sendVerificationCode}
                loading={loading}
                disabled={!phone || loading}
                style={styles.button}
              >
                Send Code
              </Button>
            </>
          ) : (
            <>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Enter verification code
              </Text>
              <TextInput
                mode="outlined"
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={verifyCode}
                loading={loading}
                disabled={code.length !== 6 || loading}
                style={styles.button}
              >
                Verify & Sign In
              </Button>
              <Button
                mode="text"
                onPress={() => setVerificationId(null)}
                style={styles.backButton}
              >
                Use different number
              </Button>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#e94560",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888",
    textAlign: "center",
    marginBottom: 40,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#16213e",
  },
  cardTitle: {
    color: "#fff",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#e94560",
  },
  backButton: {
    marginTop: 8,
  },
  error: {
    color: "#ff6b6b",
    marginTop: 12,
    textAlign: "center",
  },
});
