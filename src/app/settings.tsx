import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext"; // 👈 Importar el hook de tema

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, colors } = useTheme(); // 👈 Usar el contexto

  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [language, setLanguage] = useState("Español");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const cargarConfiguraciones = async () => {
      try {
        const datosUsuario = await AsyncStorage.getItem("usuario");
        if (datosUsuario) {
          const userObj = JSON.parse(datosUsuario);
          const id = userObj.id || userObj.telefono;
          setUserId(id);

          const savedData = await AsyncStorage.getItem(
            `config_dataSaver_${id}`,
          );
          const savedNotif = await AsyncStorage.getItem(
            `config_notifications_${id}`,
          );
          const savedHaptics = await AsyncStorage.getItem(
            `config_haptics_${id}`,
          );
          const savedLang = await AsyncStorage.getItem(`config_language_${id}`);

          if (savedData !== null) setDataSaver(JSON.parse(savedData));
          if (savedNotif !== null) setNotifications(JSON.parse(savedNotif));
          if (savedHaptics !== null) setHaptics(JSON.parse(savedHaptics));
          if (savedLang) setLanguage(savedLang);
        }
      } catch (e) {
        console.log("Error al cargar configuraciones:", e);
      }
    };
    cargarConfiguraciones();
  }, []);

  const triggerHaptic = async () => {
    if (haptics) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
  };

  const manejarCambioSwitch = async (
    clave: string,
    valor: boolean,
    setEstado: Function,
  ) => {
    setEstado(valor);
    await triggerHaptic();
    try {
      if (userId) {
        await AsyncStorage.setItem(
          `config_${clave}_${userId}`,
          JSON.stringify(valor),
        );
      }
    } catch (e) {
      console.log(`Error al guardar ${clave}:`, e);
    }
  };

  const cambiarIdioma = async (nuevoIdioma: string) => {
    await triggerHaptic();
    setLanguage(nuevoIdioma);
    try {
      if (userId) {
        await AsyncStorage.setItem(`config_language_${userId}`, nuevoIdioma);
      }
    } catch (e) {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabecera Dinámica */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: colors.borderLight,
            },
          ]}
          onPress={async () => {
            await triggerHaptic();
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          CONFIGURACIÓN DE LA APP
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          APARIENCIA
        </Text>
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <Ionicons name="moon-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Modo Oscuro (Brutalista)
            </Text>
            <Switch
              value={isDarkMode}
              onValueChange={async (val) => {
                await triggerHaptic();
                toggleDarkMode(val);
              }}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          RED Y DATOS
        </Text>
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Ionicons
              name="cellular-outline"
              size={20}
              color={colors.accentBlue}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>
                Modo Ahorro de Datos
              </Text>
              <Text
                style={[styles.menuSubText, { color: colors.textSecondary }]}
              >
                Optimiza llamadas de red y GPS
              </Text>
            </View>
            <Switch
              value={dataSaver}
              onValueChange={(val) =>
                manejarCambioSwitch("dataSaver", val, setDataSaver)
              }
              trackColor={{
                false: colors.borderLight,
                true: colors.accentBlue,
              }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          NOTIFICACIONES Y TÁCTIL
        </Text>
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFB800" />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Notificaciones Push
            </Text>
            <Switch
              value={notifications}
              onValueChange={(val) =>
                manejarCambioSwitch("notifications", val, setNotifications)
              }
              trackColor={{ false: colors.borderLight, true: "#FFB800" }}
              thumbColor="#FFF"
            />
          </View>

          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={colors.textPrimary}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Respuesta Háptica (Vibración)
            </Text>
            <Switch
              value={haptics}
              onValueChange={(val) =>
                manejarCambioSwitch("haptics", val, setHaptics)
              }
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          IDIOMA / LANGUAGE
        </Text>
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.menuItem,
              language === "Español" && {
                backgroundColor: colors.cardSecondary,
              },
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => cambiarIdioma("Español")}
          >
            <Ionicons
              name="language-outline"
              size={20}
              color={colors.textPrimary}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Español
            </Text>
            {language === "Español" && (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              { borderBottomWidth: 0 },
              language === "English" && {
                backgroundColor: colors.cardSecondary,
              },
            ]}
            onPress={() => cambiarIdioma("English")}
          >
            <Ionicons
              name="language-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              English
            </Text>
            {language === "English" && (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  content: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 16,
  },
  menuGroup: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
    fontWeight: "600",
  },
  menuSubText: {
    fontSize: 10,
    marginTop: 2,
  },
});
