import { useEffect } from "react";
import { Stack } from "expo-router";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { StripeProvider } from "@stripe/stripe-react-native";
import { StatusBar } from "react-native";

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#e94560",
    secondary: "#0f3460",
    background: "#1a1a2e",
    surface: "#16213e",
    surfaceVariant: "#1a1a2e",
    onSurface: "#eee",
    onBackground: "#eee",
  },
};

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}>
      <PaperProvider theme={theme}>
        <StatusBar barStyle="light-content" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1a1a2e" },
            headerTintColor: "#fff",
            contentStyle: { backgroundColor: "#1a1a2e" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: "Sign In", headerShown: false }} />
          <Stack.Screen name="meal/create" options={{ title: "New Meal" }} />
          <Stack.Screen name="meal/[id]" options={{ title: "Meal Details" }} />
          <Stack.Screen name="meal/scan" options={{ title: "Scan Receipt" }} />
        </Stack>
      </PaperProvider>
    </StripeProvider>
  );
}
