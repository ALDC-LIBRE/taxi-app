import AsyncStorage from "@react-native-async-storage/async-storage"; // 👈 1. Importamos AsyncStorage
import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!telefono || !password) {
      Alert.alert("Error", "Por favor ingresa tu teléfono y contraseña.");
      return;
    }

    try {
      const response = await axios.post("http://192.168.1.100:8000/login", {
        telefono,
        password,
      });

      // 👈 2. Guardamos el objeto usuario completo en la memoria local del teléfono
      await AsyncStorage.setItem(
        "usuario",
        JSON.stringify(response.data.usuario),
      );

      // 👈 3. Corregido: accedemos a response.data.usuario.nombre (en minúscula)
      const nombreUsuario = response.data.usuario.nombre;

      Alert.alert(
        "¡Bienvenido!",
        `Inicio de sesión exitoso. Hola, ${nombreUsuario}`,
        [
          {
            text: "Aceptar",
            onPress: () => {
              router.replace("/passenger");
            },
          },
        ],
      );
    } catch (error: any) {
      console.log("Detalle del error:", error);
      const mensajeReal =
        error.response?.data?.detail || "No se pudo conectar con el servidor.";
      Alert.alert("Error de acceso", mensajeReal);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={setTelefono}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#111",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
