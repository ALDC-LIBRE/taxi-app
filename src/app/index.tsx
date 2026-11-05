import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Taxi App</Text>
      <Text style={styles.subtitle}>Tu viaje seguro y rápido</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/register")}
      >
        <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
