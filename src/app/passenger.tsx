import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTheme } from "../context/ThemeContext";

interface Coords {
  latitude: number;
  longitude: number;
}

const API_URL = "http://192.168.1.100:8000";

const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1d1d1d" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];

const lightMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }],
  },
];

const getStatusConfig = (estado: string) => {
  switch (estado.toLowerCase()) {
    case "solicitado":
      return {
        label: "SOLICITADO",
        color: "#FFB800",
        icon: "hand-left",
        animated: false,
      };
    case "proceso":
      return {
        label: "EN PROCESO",
        color: "#00A2FF",
        icon: "sync",
        animated: true,
      };
    case "viajando":
      return {
        label: "VIAJANDO",
        color: "#FF0033",
        icon: "car-sport",
        animated: false,
      };
    case "completado":
      return {
        label: "COMPLETADO",
        color: "#FF0033",
        icon: "checkmark-circle",
        animated: false,
      };
    default:
      return {
        label: estado.toUpperCase(),
        color: "#888",
        icon: "ellipse",
        animated: false,
      };
  }
};

export default function PassengerScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { colors, isDarkMode } = useTheme();

  const [region, setRegion] = useState({
    latitude: 23.1136,
    longitude: -82.3666,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [origenCoords, setOrigenCoords] = useState<Coords | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<Coords | null>(null);

  // ⚡ Referencias para sincronización inmediata sin retraso de estado
  const origenRef = useRef<Coords | null>(null);
  const destinoRef = useRef<Coords | null>(null);

  const updateOrigen = (coords: Coords | null) => {
    setOrigenCoords(coords);
    origenRef.current = coords;
  };

  const updateDestino = (coords: Coords | null) => {
    setDestinoCoords(coords);
    destinoRef.current = coords;
  };

  const [origenTexto, setOrigenTexto] = useState("");
  const [destinoTexto, setDestinoTexto] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("carro");
  const [activeTab, setActiveTab] = useState("mapa");
  const [isExpanded, setIsExpanded] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [historialViajes, setHistorialViajes] = useState<any[]>([]);

  // Estado para el Ahorro de Datos
  const [dataSaverActive, setDataSaverActive] = useState(false);

  const [rutaCoordenadas, setRutaCoordenadas] = useState<Coords[]>([]);

  const [infoViajePreview, setInfoViajePreview] = useState<{
    distancia: number;
    tarifa_cup: number;
    tarifa_usd: number;
    tarifa_eur: number;
  } | null>(null);

  const [metodoPago, setMetodoPago] = useState("Efectivo (CUP)");
  const [modalPagoVisible, setModalPagoVisible] = useState(false);

  // Estados para el Módulo de Seguridad y Verificación
  const [modalSeguridadVisible, setModalSeguridadVisible] = useState(false);
  const [pinSeguridad, setPinSeguridad] = useState("4821");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [tempContacto, setTempContacto] = useState("");

  const [usuario, setUsuario] = useState({
    nombre: "Cargando...",
    telefono: "Cargando...",
  });

  // 🚗 Detectar si hay un viaje activo en curso ("proceso" o "viajando")
  const viajeActivo = historialViajes.find(
    (v) =>
      v.estado &&
      (v.estado.toLowerCase() === "proceso" ||
        v.estado.toLowerCase() === "viajando"),
  );

  useEffect(() => {
    const obtenerDatosLocales = async () => {
      try {
        const datosGuardados = await AsyncStorage.getItem("usuario");
        if (datosGuardados) {
          const userObj = JSON.parse(datosGuardados);
          setUsuario(userObj);

          const id = userObj.id || userObj.telefono;
          const savedData = await AsyncStorage.getItem(
            `config_dataSaver_${id}`,
          );
          if (savedData !== null) {
            setDataSaverActive(JSON.parse(savedData));
          }
        } else {
          setUsuario({
            nombre: "Pasajero No Registrado",
            telefono: "Sin teléfono",
          });
        }

        const pagoGuardado = await AsyncStorage.getItem("metodoPago");
        if (pagoGuardado) {
          setMetodoPago(pagoGuardado);
        }

        const pinGuardado = await AsyncStorage.getItem("pinSeguridad");
        if (pinGuardado) {
          setPinSeguridad(pinGuardado);
        } else {
          const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
          setPinSeguridad(randomPin);
          await AsyncStorage.setItem("pinSeguridad", randomPin);
        }

        const contactoGuardado =
          await AsyncStorage.getItem("contactoEmergencia");
        if (contactoGuardado) {
          setContactoEmergencia(contactoGuardado);
          setTempContacto(contactoGuardado);
        }
      } catch (e) {
        console.log("Error al leer datos locales:", e);
      }
    };
    obtenerDatosLocales();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const verificarAhorroDatos = async () => {
        try {
          const datosUsuario = await AsyncStorage.getItem("usuario");
          if (datosUsuario) {
            const userObj = JSON.parse(datosUsuario);
            const id = userObj.id || userObj.telefono;
            const savedData = await AsyncStorage.getItem(
              `config_dataSaver_${id}`,
            );
            if (savedData !== null) {
              setDataSaverActive(JSON.parse(savedData));
            } else {
              setDataSaverActive(false);
            }
          }
        } catch (e) {
          console.log("Error leyendo ahorro de datos:", e);
        }
      };
      verificarAhorroDatos();
    }, []),
  );

  const seleccionarMetodoPago = async (metodo: string) => {
    setMetodoPago(metodo);
    setModalPagoVisible(false);
    try {
      await AsyncStorage.setItem("metodoPago", metodo);
    } catch (e) {
      console.log("Error al guardar método de pago:", e);
    }
  };

  const guardarContactoEmergencia = async () => {
    try {
      await AsyncStorage.setItem("contactoEmergencia", tempContacto);
      setContactoEmergencia(tempContacto);
      Alert.alert("Éxito", "Contacto de emergencia guardado correctamente.");
    } catch (e) {
      console.log("Error al guardar contacto:", e);
    }
  };

  const panY = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fetchHistorialViajes = async () => {
    try {
      const res = await axios.get(`${API_URL}/historial-viajes`);
      if (res.data && res.data.viajes) {
        setHistorialViajes(res.data.viajes);
      }
    } catch (e) {
      console.log("Error cargando historial de viajes:", e);
    }
  };

  const intervaloTiempo = dataSaverActive ? 10000 : 3000;

  useEffect(() => {
    fetchHistorialViajes();

    const intervalo = setInterval(() => {
      fetchHistorialViajes();
    }, intervaloTiempo);

    return () => clearInterval(intervalo);
  }, [dataSaverActive, intervaloTiempo]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsExpanded(true);
      },
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 60 || gestureState.vy > 0.4) {
          Keyboard.dismiss();
          Animated.timing(panY, {
            toValue: 310,
            duration: 250,
            useNativeDriver: false,
          }).start(() => setIsExpanded(false));
        } else {
          Animated.timing(panY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  const abrirPanel = () => {
    setIsExpanded(true);
    panY.setValue(310);
    Animated.timing(panY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se necesita acceso al GPS para ubicarte.",
        );
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setRegion((prev) => ({
        ...prev,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
      }));
      updateOrigen(currentCoords);
      setOrigenTexto("Mi ubicación actual (GPS)");
    })();
  }, []);

  const centrarEnMiUbicacion = async () => {
    let location = await Location.getCurrentPositionAsync({});
    const currentCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    mapRef.current?.animateToRegion(
      {
        ...currentCoords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000,
    );
  };

  const calcularRutaAutomatica = async (origen: Coords, destino: Coords) => {
    try {
      const response = await axios.post(`${API_URL}/calcular-viaje`, {
        lat_origen: origen.latitude,
        lon_origen: origen.longitude,
        lat_destino: destino.latitude,
        lon_destino: destino.longitude,
      });

      // 🔍 MIRA ESTO EN TU CONSOLA DE EXPO:
      console.log(
        "DATOS RECIBIDOS DEL BACKEND:",
        response.data.ruta_coordenadas,
      );

      const {
        distancia_km,
        tarifa_total_cup,
        tarifa_total_usd,
        tarifa_total_eur,
        ruta_coordenadas,
      } = response.data;

      if (ruta_coordenadas) {
        setRutaCoordenadas(ruta_coordenadas);
      }

      setInfoViajePreview({
        distancia: distancia_km,
        tarifa_cup: tarifa_total_cup,
        tarifa_usd: tarifa_total_usd,
        tarifa_eur: tarifa_total_eur,
      });
    } catch (error) {
      console.log("Error calculando ruta previa:", error);
    }
  };

  async function handleMapPress(e: any) {
    const coords = e.nativeEvent.coordinate;
    const tempText = `Lat: ${coords.latitude.toFixed(4)}, Lon: ${coords.longitude.toFixed(4)}`;

    const targetIsOrigen =
      !origenRef.current || (origenRef.current && destinoRef.current);

    if (targetIsOrigen) {
      updateOrigen(coords);
      setOrigenTexto(tempText);
      updateDestino(null);
      setDestinoTexto("");
      setRutaCoordenadas([]);
      setInfoViajePreview(null);
    } else {
      updateDestino(coords);
      setDestinoTexto(tempText);

      if (origenRef.current) {
        calcularRutaAutomatica(origenRef.current, coords);
      }
    }

    // 🟢 CONSULTAR LA DIRECCIÓN EN TEXTO A TU BACKEND DE FASTAPI
    try {
      const response = await axios.get(`${API_URL}/streets/lookup`, {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
        },
      });

      if (response.data && response.data.direccion) {
        const realText = response.data.direccion;
        if (targetIsOrigen) {
          setOrigenTexto(realText);
        } else {
          setDestinoTexto(realText);
        }
      }
    } catch (error) {
      console.log("Error al obtener la dirección del backend:", error);
    }
  }

  const handleSolicitarViaje = async () => {
    Keyboard.dismiss();
    if (!origenCoords || !destinoCoords || !infoViajePreview) {
      Alert.alert(
        "Faltan datos",
        "Por favor define el origen y el destino en el mapa.",
      );
      return;
    }

    let tarifaTextoFinal = `${infoViajePreview.tarifa_cup} CUP (${metodoPago})`;
    if (metodoPago === "Efectivo (USD)") {
      tarifaTextoFinal = `${infoViajePreview.tarifa_usd} USD (~${infoViajePreview.tarifa_cup} CUP)`;
    } else if (metodoPago === "Efectivo (EUR)") {
      tarifaTextoFinal = `${infoViajePreview.tarifa_eur} EUR (~${infoViajePreview.tarifa_cup} CUP)`;
    }

    try {
      await axios.post(`${API_URL}/crear-viaje`, {
        origen: origenTexto,
        destino: destinoTexto,
        tarifa: tarifaTextoFinal,
      });

      fetchHistorialViajes();

      Alert.alert(
        "¡VIAJE CONFIRMADO!",
        `Distancia: ${infoViajePreview.distancia} km\nTotal: ${tarifaTextoFinal}\nPIN de Abordaje: ${pinSeguridad}\nVehículo: ${tipoVehiculo.toUpperCase()}`,
        [
          {
            text: "Ver en Viajes",
            onPress: () => setActiveTab("viajes"),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo conectar con el servidor para registrar el viaje.",
      );
    }
  };

  const obtenerPrecioVisual = () => {
    if (!infoViajePreview) return "0.00";
    if (metodoPago === "Efectivo (USD)")
      return `${infoViajePreview.tarifa_usd} USD`;
    if (metodoPago === "Efectivo (EUR)")
      return `${infoViajePreview.tarifa_eur} EUR`;
    return `${infoViajePreview.tarifa_cup} CUP`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activeTab === "mapa" && (
        <>
          {/* MAPA DINÁMICO */}
          <MapView
            key={isDarkMode ? "dark" : "light"}
            ref={mapRef}
            style={[StyleSheet.absoluteFill, { marginBottom: 65 }]}
            region={region}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
            customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
          >
            {origenCoords && (
              <Marker
                coordinate={origenCoords}
                title="Origen"
                pinColor={colors.primary}
              />
            )}
            {destinoCoords && (
              <Marker
                coordinate={destinoCoords}
                title="Destino"
                pinColor={colors.textPrimary}
              />
            )}
            {rutaCoordenadas.length > 0 && (
              <Polyline
                coordinates={rutaCoordenadas}
                strokeColor={colors.primary}
                strokeWidth={4}
              />
            )}
          </MapView>

          {/* Botón de GPS limpio */}
          <TouchableOpacity
            style={[
              styles.gpsButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={centrarEnMiUbicacion}
          >
            <Ionicons
              name="locate"
              size={20}
              color={dataSaverActive ? colors.accentBlue : colors.primary}
            />
          </TouchableOpacity>

          {/* 🚗 PANEL CONDICIONAL DE VIAJE ACTIVO */}
          {viajeActivo ? (
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.primary,
                  bottom: 65,
                  padding: 20,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="car-sport" size={20} color={colors.primary} />
                </Animated.View>
                <Text
                  style={[styles.panelTitleText, { color: colors.primary }]}
                >
                  VIAJE EN CURSO ({viajeActivo.estado.toUpperCase()})
                </Text>
              </View>

              <View
                style={[
                  styles.activeRideBox,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.activeRideText, { color: colors.textPrimary }]}
                >
                  📍 <Text style={{ fontWeight: "700" }}>Origen:</Text>{" "}
                  {viajeActivo.origen}
                </Text>
                <Text
                  style={[
                    styles.activeRideText,
                    { color: colors.textPrimary, marginTop: 4 },
                  ]}
                >
                  🏁 <Text style={{ fontWeight: "700" }}>Destino:</Text>{" "}
                  {viajeActivo.destino}
                </Text>
                <Text
                  style={[
                    styles.activeRideText,
                    { color: colors.primary, marginTop: 6, fontWeight: "bold" },
                  ]}
                >
                  💰 Tarifa: {viajeActivo.tarifa}
                </Text>
              </View>

              {/* 🔘 BOTONES SEPARADOS: PIN, LLAMAR CONDUCTOR Y SOS */}
              <View style={styles.activeRideActions}>
                {/* 1. VER PIN */}
                <TouchableOpacity
                  style={[
                    styles.activeRideBtn,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      "PIN de Abordaje",
                      `Tu PIN de seguridad es: ${pinSeguridad}`,
                    )
                  }
                >
                  <Ionicons
                    name="key-outline"
                    size={14}
                    color={colors.accentGreen}
                  />
                  <Text
                    style={[
                      styles.activeRideBtnText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    PIN
                  </Text>
                </TouchableOpacity>

                {/* 2. LLAMAR CONDUCTOR */}
                <TouchableOpacity
                  style={[
                    styles.activeRideBtn,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    const telConductor =
                      viajeActivo.telefono_conductor ||
                      viajeActivo.conductor_telefono;
                    if (telConductor) {
                      Linking.openURL(`tel:${telConductor}`);
                    } else {
                      Alert.alert(
                        "Llamar Conductor",
                        "El teléfono del conductor no está disponible todavía.",
                      );
                    }
                  }}
                >
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={colors.accentBlue}
                  />
                  <Text
                    style={[
                      styles.activeRideBtnText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    CONDUCTOR
                  </Text>
                </TouchableOpacity>

                {/* 3. SOS / EMERGENCIA */}
                <TouchableOpacity
                  style={[
                    styles.activeRideBtn,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      "Emergencia (SOS)",
                      contactoEmergencia
                        ? `¿Deseas llamar a tu contacto de emergencia (${contactoEmergencia})?`
                        : "No tienes un contacto de emergencia configurado. Configúralo en tu perfil.",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Llamar",
                          onPress: () => {
                            if (contactoEmergencia) {
                              Linking.openURL(`tel:${contactoEmergencia}`);
                            }
                          },
                        },
                      ],
                    )
                  }
                >
                  <Ionicons name="shield-outline" size={14} color="#FFF" />
                  <Text style={[styles.activeRideBtnText, { color: "#FFF" }]}>
                    SOS
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {!isExpanded && keyboardHeight === 0 && (
                <TouchableOpacity
                  style={[
                    styles.floatingOpenBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={abrirPanel}
                >
                  <View
                    style={[
                      styles.dragIndicator,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text
                    style={[styles.floatingOpenText, { color: colors.primary }]}
                  >
                    ▲ SOLICITAR TAXI
                  </Text>
                </TouchableOpacity>
              )}

              {isExpanded && (
                <Animated.View
                  style={[
                    styles.panel,
                    {
                      backgroundColor: colors.card,
                      borderTopColor: colors.primary,
                      bottom: keyboardHeight > 0 ? keyboardHeight : 65,
                      transform: [{ translateY: panY }],
                    },
                  ]}
                >
                  <View
                    {...panResponder.panHandlers}
                    style={[
                      styles.dragHandleContainer,
                      { backgroundColor: colors.cardSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.dragIndicator,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.panelTitleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      SOLICITAR TAXI
                    </Text>
                  </View>

                  <ScrollView
                    style={styles.panelContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      ORIGEN
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      placeholder="Calle principal / Dirección"
                      placeholderTextColor={colors.textMuted}
                      value={origenTexto}
                      onChangeText={setOrigenTexto}
                    />

                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      DESTINO
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      placeholder="Punto de llegada"
                      placeholderTextColor={colors.textMuted}
                      value={destinoTexto}
                      onChangeText={setDestinoTexto}
                    />

                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      TIPO DE VEHÍCULO
                    </Text>
                    <View style={styles.vehicleContainer}>
                      {["carro", "combi", "bus", "triciclo"].map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          style={[
                            styles.vehicleButton,
                            {
                              backgroundColor: colors.cardSecondary,
                              borderColor: colors.border,
                            },
                            tipoVehiculo === tipo && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={() => setTipoVehiculo(tipo)}
                        >
                          <Text
                            style={[
                              styles.vehicleText,
                              { color: colors.textSecondary },
                              tipoVehiculo === tipo &&
                                styles.vehicleTextSelected,
                            ]}
                          >
                            {tipo.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {infoViajePreview && (
                      <View
                        style={[
                          styles.previewBox,
                          {
                            backgroundColor: colors.cardSecondary,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.previewItem}>
                          <Text
                            style={[
                              styles.previewLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Distancia:
                          </Text>
                          <Text
                            style={[
                              styles.previewValue,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {infoViajePreview.distancia} km
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.previewItemInteractive,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.borderLight,
                            },
                          ]}
                          onPress={() => setModalPagoVisible(true)}
                        >
                          <Text
                            style={[
                              styles.previewLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Pago (Cambiar):
                          </Text>
                          <View style={styles.pagoRow}>
                            <Text
                              style={[
                                styles.previewValuePago,
                                { color: colors.accentBlue },
                              ]}
                            >
                              {metodoPago.replace("Efectivo ", "")}
                            </Text>
                            <Ionicons
                              name="swap-vertical"
                              size={12}
                              color={colors.accentBlue}
                              style={{ marginLeft: 2 }}
                            />
                          </View>
                        </TouchableOpacity>

                        <View style={styles.previewItem}>
                          <Text
                            style={[
                              styles.previewLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Total Est.:
                          </Text>
                          <Text
                            style={[
                              styles.previewValueTarifa,
                              { color: colors.primary },
                            ]}
                          >
                            {obtenerPrecioVisual()}
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary },
                        !infoViajePreview && {
                          backgroundColor: colors.borderLight,
                        },
                      ]}
                      onPress={handleSolicitarViaje}
                    >
                      <Text style={styles.buttonText}>CONFIRMAR VIAJE</Text>
                    </TouchableOpacity>

                    <View style={{ height: 20 }} />
                  </ScrollView>
                </Animated.View>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "viajes" && (
        <View
          style={[styles.tabContainer, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            HISTORIAL DE VIAJES
          </Text>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            {historialViajes.map((viaje) => {
              const config = getStatusConfig(viaje.estado);
              return (
                <View
                  key={viaje.id}
                  style={[
                    styles.cardItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    {config.animated ? (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons
                          name={config.icon as any}
                          size={18}
                          color={config.color}
                        />
                      </Animated.View>
                    ) : (
                      <Ionicons
                        name={config.icon as any}
                        size={18}
                        color={config.color}
                      />
                    )}
                    <Text
                      style={[styles.cardDate, { color: colors.textSecondary }]}
                    >
                      {viaje.fecha}
                    </Text>
                    <Text style={[styles.cardStatus, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.cardRoute, { color: colors.textPrimary }]}
                  >
                    📍 {viaje.origen}
                  </Text>
                  <Text
                    style={[styles.cardRoute, { color: colors.textPrimary }]}
                  >
                    🏁 {viaje.destino}
                  </Text>
                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: colors.borderLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardPriceLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Total:
                    </Text>
                    <Text
                      style={[
                        styles.cardPriceValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {viaje.tarifa}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {activeTab === "perfil" && (
        <View
          style={[styles.tabContainer, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            MI PERFIL
          </Text>
          <View
            style={[
              styles.profileHeaderCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {usuario.nombre}
            </Text>
            <Text
              style={[styles.profilePhone, { color: colors.textSecondary }]}
            >
              {usuario.telefono}
            </Text>
          </View>

          <View
            style={[
              styles.menuGroup,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: colors.borderLight },
              ]}
              onPress={() => setModalPagoVisible(true)}
            >
              <Ionicons name="cash-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>
                Método de Pago
              </Text>
              <Text
                style={[styles.menuSubText, { color: colors.textSecondary }]}
              >
                {metodoPago}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: colors.borderLight },
              ]}
              onPress={() => setModalSeguridadVisible(true)}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.accentGreen}
              />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>
                Seguridad y Verificación
              </Text>
              <Text
                style={[styles.menuSubText, { color: colors.textSecondary }]}
              >
                PIN y SOS
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: colors.borderLight },
              ]}
              onPress={() => router.push("/settings")}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>
                Configuración de la App
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                Alert.alert(
                  "Cerrar Sesión",
                  "¿Estás seguro de que deseas salir?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Salir",
                      style: "destructive",
                      onPress: async () => {
                        await AsyncStorage.removeItem("usuario");
                        router.replace("/");
                      },
                    },
                  ],
                );
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.menuText, { color: colors.primary }]}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL DE SELECCIÓN DE PAGO */}
      <Modal
        visible={modalPagoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalPagoVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.modalOverlay },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              SELECCIONAR MONEDA DE PAGO
            </Text>

            {["Efectivo (CUP)", "Efectivo (USD)", "Efectivo (EUR)"].map(
              (metodo) => (
                <TouchableOpacity
                  key={metodo}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                    },
                    metodoPago === metodo && {
                      borderColor: colors.primary,
                      backgroundColor: colors.cardSecondary,
                    },
                  ]}
                  onPress={() => seleccionarMetodoPago(metodo)}
                >
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={
                      metodoPago === metodo
                        ? colors.textPrimary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.textSecondary },
                      metodoPago === metodo && [
                        styles.modalOptionTextSelected,
                        { color: colors.textPrimary },
                      ],
                    ]}
                  >
                    {metodo}
                  </Text>
                  {metodoPago === metodo && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ),
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalPagoVisible(false)}
            >
              <Text
                style={[styles.modalCloseText, { color: colors.textSecondary }]}
              >
                CANCELAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SEGURIDAD Y VERIFICACIÓN */}
      <Modal
        visible={modalSeguridadVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSeguridadVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.modalOverlay },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              SEGURIDAD Y VERIFICACIÓN
            </Text>

            <View
              style={[
                styles.secSection,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.secRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.accentGreen}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={[styles.secTitle, { color: colors.textPrimary }]}
                  >
                    Cuenta Verificada
                  </Text>
                  <Text
                    style={[styles.secSubText, { color: colors.textSecondary }]}
                  >
                    Tu identidad está vinculada a tu número.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.secSection,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                PIN DE SEGURIDAD PARA ABORDAR
              </Text>
              <Text
                style={[styles.secSubText, { color: colors.textSecondary }]}
              >
                Dale este código al conductor al subir para confirmar tu viaje:
              </Text>
              <View
                style={[
                  styles.pinContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.pinText, { color: colors.accentGreen }]}>
                  {pinSeguridad}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.secSection,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                CONTACTO DE EMERGENCIA
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Teléfono de familiar o amigo"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={tempContacto}
                onChangeText={setTempContacto}
              />
              <TouchableOpacity
                style={[styles.miniButton, { backgroundColor: colors.primary }]}
                onPress={guardarContactoEmergencia}
              >
                <Text style={styles.miniButtonText}>GUARDAR CONTACTO</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalSeguridadVisible(false)}
            >
              <Text
                style={[styles.modalCloseText, { color: colors.textSecondary }]}
              >
                CERRAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        {[
          { id: "mapa", label: "Mapa", iconName: "map" },
          { id: "viajes", label: "Viajes", iconName: "car" },
          { id: "perfil", label: "Perfil", iconName: "person" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.navItem,
                isActive && [
                  styles.navItemActive,
                  { borderTopColor: colors.primary },
                ],
              ]}
              onPress={() => {
                setActiveTab(tab.id);
                if (tab.id === "viajes") {
                  fetchHistorialViajes();
                }
              }}
            >
              <Ionicons
                name={tab.iconName as any}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.navText,
                  { color: colors.textMuted },
                  isActive && [styles.navTextActive, { color: colors.primary }],
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gpsButton: {
    position: "absolute",
    top: 50,
    right: 20,
    borderWidth: 1,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  floatingOpenBtn: {
    position: "absolute",
    bottom: 75,
    alignSelf: "center",
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
    zIndex: 30,
  },
  floatingOpenText: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    maxHeight: 380,
    borderTopWidth: 1.5,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 25,
    zIndex: 20,
  },
  dragHandleContainer: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 4,
  },
  panelTitleText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  panelContent: { paddingHorizontal: 20, paddingTop: 4 },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  input: {
    height: 38,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    fontSize: 12,
  },
  vehicleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vehicleButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 2,
  },
  vehicleText: { fontSize: 9, fontWeight: "bold" },
  vehicleTextSelected: { color: "#FFF" },
  previewBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  previewItem: { alignItems: "center" },
  previewItemInteractive: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pagoRow: { flexDirection: "row", alignItems: "center" },
  previewLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 2,
  },
  previewValue: { fontSize: 12, fontWeight: "bold" },
  previewValuePago: { fontSize: 11, fontWeight: "bold" },
  previewValueTarifa: { fontSize: 12, fontWeight: "bold" },
  button: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  activeRideBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  activeRideText: {
    fontSize: 11,
  },
  activeRideActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  activeRideBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 3,
  },
  activeRideBtnText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  tabContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 65,
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardDate: {
    fontSize: 10,
    marginLeft: 8,
    flex: 1,
    fontWeight: "600",
  },
  cardStatus: { fontSize: 10, fontWeight: "bold" },
  cardRoute: { fontSize: 11, marginBottom: 4 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  cardPriceLabel: { fontSize: 10, marginRight: 6 },
  cardPriceValue: { fontSize: 13, fontWeight: "bold" },
  profileHeaderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profilePhone: { fontSize: 11 },
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
  menuSubText: { fontSize: 11, marginRight: 8 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalOptionSelected: {},
  modalOptionText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  modalOptionTextSelected: { fontWeight: "bold" },
  modalCloseButton: { marginTop: 10, padding: 12, alignItems: "center" },
  modalCloseText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  secSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  secRow: { flexDirection: "row", alignItems: "center" },
  secTitle: { fontSize: 12, fontWeight: "bold" },
  secSubText: { fontSize: 10, marginTop: 2 },
  pinContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginTop: 8,
  },
  pinText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
  },
  miniButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  miniButtonText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    borderWidth: 1,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 6,
    zIndex: 40,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  navItemActive: { borderTopWidth: 2 },
  navText: { fontSize: 10, fontWeight: "600", marginTop: 3 },
  navTextActive: { fontWeight: "bold" },

  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#000",
  },
});
