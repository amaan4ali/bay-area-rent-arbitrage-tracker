import { useState } from "react";
import { View, Image, StyleSheet, ScrollView } from "react-native";
import { Text, Button, Card, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { scanReceipt, imageUriToBase64 } from "../../src/services/ocr";
import { OCRResult } from "../../src/types";

export default function ScanReceiptScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState("");

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission is required to scan receipts");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!photo.canceled && photo.assets[0]) {
      setImageUri(photo.assets[0].uri);
      await processImage(photo.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const photo = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!photo.canceled && photo.assets[0]) {
      setImageUri(photo.assets[0].uri);
      await processImage(photo.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setScanning(true);
    setError("");
    try {
      const base64 = await imageUriToBase64(uri);
      const ocrResult = await scanReceipt(base64);
      setResult(ocrResult);
    } catch (err) {
      setError("Failed to scan receipt. Try again or enter manually.");
    } finally {
      setScanning(false);
    }
  };

  const useResults = () => {
    // Pass OCR results back to the meal creation flow
    // In production, use a global state or route params
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Camera/gallery options */}
      {!imageUri && (
        <View style={styles.captureSection}>
          <Text variant="headlineSmall" style={styles.title}>
            Scan Your Receipt
          </Text>
          <Text style={styles.subtitle}>
            Take a photo of the receipt and we'll extract the items automatically
          </Text>

          <Button
            mode="contained"
            icon="camera"
            onPress={takePhoto}
            style={styles.cameraButton}
          >
            Take Photo
          </Button>

          <Button
            mode="outlined"
            icon="image"
            onPress={pickFromGallery}
            textColor="#e94560"
            style={styles.galleryButton}
          >
            Pick from Gallery
          </Button>
        </View>
      )}

      {/* Image preview */}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      )}

      {/* Scanning indicator */}
      {scanning && (
        <View style={styles.scanningSection}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.scanningText}>Scanning receipt...</Text>
        </View>
      )}

      {/* OCR Results */}
      {result && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.resultTitle}>
              Found {result.items.length} items
            </Text>
            <Text style={styles.confidence}>
              Confidence: {Math.round(result.confidence * 100)}%
            </Text>

            {result.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              </View>
            ))}

            {result.subtotal !== undefined && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${result.subtotal.toFixed(2)}</Text>
              </View>
            )}
            {result.tax !== undefined && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>${result.tax.toFixed(2)}</Text>
              </View>
            )}
            {result.total !== undefined && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: "#e94560" }]}>
                  ${result.total.toFixed(2)}
                </Text>
              </View>
            )}

            <Button mode="contained" onPress={useResults} style={styles.useButton}>
              Use These Items
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Retake */}
      {imageUri && !scanning && (
        <Button
          mode="text"
          onPress={() => {
            setImageUri(null);
            setResult(null);
          }}
        >
          Retake Photo
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  content: { padding: 16 },
  captureSection: { alignItems: "center", paddingVertical: 40 },
  title: { color: "#fff", fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#888", textAlign: "center", marginBottom: 32 },
  cameraButton: { backgroundColor: "#e94560", width: "100%", marginBottom: 12, paddingVertical: 4 },
  galleryButton: { borderColor: "#e94560", width: "100%" },
  preview: { width: "100%", height: 300, borderRadius: 12, marginBottom: 16 },
  scanningSection: { alignItems: "center", padding: 20 },
  scanningText: { color: "#888", marginTop: 12 },
  resultCard: { backgroundColor: "#16213e", borderRadius: 12, marginBottom: 16 },
  resultTitle: { color: "#fff", marginBottom: 4 },
  confidence: { color: "#888", marginBottom: 16, fontSize: 13 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0f3460",
  },
  itemName: { color: "#ccc", flex: 1 },
  itemPrice: { color: "#fff", fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: { color: "#888" },
  totalValue: { color: "#fff", fontWeight: "600" },
  useButton: { backgroundColor: "#e94560", marginTop: 16 },
  error: { color: "#ff6b6b", textAlign: "center", marginTop: 12 },
});
