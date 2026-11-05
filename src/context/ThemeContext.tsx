import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

// Definición de las paletas de colores Brutalistas (Oscuro y Claro)
export const themes = {
  dark: {
    background: "#000000",
    card: "#0a0a0a",
    cardSecondary: "#121212",
    border: "#1a1a1a",
    borderLight: "#222222",
    textPrimary: "#FFFFFF",
    textSecondary: "#888888",
    textMuted: "#555555",
    primary: "#FF0033",
    accentBlue: "#00A2FF",
    accentGreen: "#00FF66",
    modalOverlay: "rgba(0,0,0,0.8)",
  },
  light: {
    background: "#F4F4F4",
    card: "#FFFFFF",
    cardSecondary: "#EAEAEA",
    border: "#DDDDDD",
    borderLight: "#CCCCCC",
    textPrimary: "#111111",
    textSecondary: "#555555",
    textMuted: "#888888",
    primary: "#FF0033",
    accentBlue: "#0066CC",
    accentGreen: "#008833",
    modalOverlay: "rgba(0,0,0,0.5)",
  },
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: (value: boolean) => void;
  colors: typeof themes.dark;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleDarkMode: () => {},
  colors: themes.dark,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Cargar preferencia guardada al iniciar
  useEffect(() => {
    const cargarTema = async () => {
      try {
        const datosUsuario = await AsyncStorage.getItem("usuario");
        if (datosUsuario) {
          const userObj = JSON.parse(datosUsuario);
          const id = userObj.id || userObj.telefono;
          const savedDark = await AsyncStorage.getItem(`config_darkMode_${id}`);
          if (savedDark !== null) {
            setIsDarkMode(JSON.parse(savedDark));
          }
        }
      } catch (e) {
        console.log("Error al cargar tema:", e);
      }
    };
    cargarTema();
  }, []);

  const toggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      const datosUsuario = await AsyncStorage.getItem("usuario");
      if (datosUsuario) {
        const userObj = JSON.parse(datosUsuario);
        const id = userObj.id || userObj.telefono;
        await AsyncStorage.setItem(
          `config_darkMode_${id}`,
          JSON.stringify(value),
        );
      }
    } catch (e) {
      console.log("Error al guardar tema:", e);
    }
  };

  const colors = isDarkMode ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
