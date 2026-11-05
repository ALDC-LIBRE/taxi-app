import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("pasajero"); // "pasajero" o "conductor"
  const [tipoVehiculo, setTipoVehiculo] = useState("");

  const handleRegister = async () => {
    try {
      const response = await axios.post("http://192.168.1.100:8000/register", {
        nombre,
        telefono,
        password,
        rol,
        tipo_vehiculo: rol === "conductor" ? tipoVehiculo : null,
      });
      console.log("Registro exitoso:", response.data);

      Alert.alert("¡Éxito!", "Cuenta creada correctamente.");
      router.replace("/login" as any);
    } catch (error: any) {
      console.error(error);
      const mensajeError =
        error.response?.data?.detail || "No se pudo conectar con el servidor";
      Alert.alert("Error de registro", mensajeError);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crear Cuenta - Taxi App</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#888"
        value={nombre}
        onChangeText={setNombre}
      />
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

      {/* Selector de Rol */}
      <Text style={styles.label}>Selecciona tu rol:</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, rol === "pasajero" && styles.roleSelected]}
          onPress={() => setRol("pasajero")}
        >
          <Text
            style={[
              styles.roleText,
              rol === "pasajero" && styles.roleTextSelected,
            ]}
          >
            Pasajero
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            rol === "conductor" && styles.vehicleSelected,
          ]}
          onPress={() => setRol("conductor")}
        >
          <Text
            style={[
              styles.roleText,
              rol === "conductor" && styles.vehicleSection,
            ]}
          >
            Conductor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Si el rol es conductor, se despliega el selector de vehículo */}
      {rol === "conductor" && (
        <View style={styles.vehicleSection}>
          <Text style={styles.label}>Tipo de Vehículo:</Text>
          <View style={styles.vehicleContainer}>
            {["carro", "combi", "bus", "triciclo"].map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.vehicleButton,
                  tipoVehiculo === tipo && styles.vehicleSelected,
                ]}
                onPress={() => setTipoVehiculo(tipo)}
              >
                <Text
                  style={[
                    styles.vehicleText,
                    tipoVehiculo === tipo && styles.vehicleTextSelected,
                  ]}
                >
                  {tipo.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Botón principal de registro */}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>

      {/* ENLACE PARA IR AL LOGIN SI YA TIENE CUENTA */}
      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => router.push("/login" as any)}
      >
        <Text style={styles.linkText}>
          ¿Ya tienes una cuenta?{" "}
          <Text style={styles.linkBold}>Inicia sesión aquí</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#111",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
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
  roleContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  roleSelected: {
    backgroundColor: "#007AFF",
  },
  roleText: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  roleTextSelected: {
    color: "#fff",
  },
  vehicleSection: {
    marginBottom: 16,
  },
  vehicleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 6,
  },
  vehicleSelected: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  vehicleText: {
    color: "#666",
    fontWeight: "600",
  },
  vehicleTextSelected: {
    color: "#fff",
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
  linkContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: "#666",
    fontSize: 14,
  },
  linkBold: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});
