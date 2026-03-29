import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { LanguageContext } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import api from "../config/api";
import LanguageSelector from "../components/LanguageSelector";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { theme, isDark } = useTheme();

  const isNetworkError = (error) => {
    return (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("network") ||
      !error.response
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      await signIn(response.data.token, response.data.salon);
    } catch (error) {
      console.error("Login error:", error);
      if (isNetworkError(error)) {
        Alert.alert(t("connectionError"), t("connectionErrorMsg"));
      } else {
        Alert.alert(
          t("loginFailed"),
          error.response?.data?.message || t("invalidCredentials")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.gradientBackground}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Decorative orbs */}
      <View style={[styles.orb, styles.orbTopRight,  { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBottomLeft, { backgroundColor: theme.orbPrimary }]} />
      <View style={[styles.orb, styles.orbMid,       { backgroundColor: theme.orbSecondary }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Controls */}
          <View style={styles.topControls}>
            <LanguageSelector />
            <View style={styles.controlSpacer} />
            <ThemeToggle />
          </View>

          {/* Logo and Title */}
          <View style={styles.header}>
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flower-outline" size={38} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brandName, { color: theme.textPrimary }]}>
              {t("appName")}
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>
              {t("loginWelcome")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t("pleaseContinue")}
            </Text>
          </View>

          {/* Glass Form Card */}
          <View style={[
            styles.formCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.95)',
            }
          ]}>
            {/* Email Input */}
            <View style={[styles.inputContainer, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
              borderColor: theme.border,
            }]}>
              <Ionicons name="mail-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder={t("customerEmail")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
              borderColor: theme.border,
            }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={theme.textTertiary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Gradient Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.loginButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.loginButtonText, { color: isDark ? '#111' : '#fff' }]}>
                  {loading ? t("loggingIn") : t("login")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            {/* Sign Up Link */}
            <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.signUpButton}>
              <Text style={[styles.signUpText, { color: theme.textSecondary }]}>
                {t("noAccount")}{" "}
                <Text style={[styles.signUpLink, { color: theme.primary }]}>
                  {t("signUp")}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopRight: {
    width: 320,
    height: 320,
    top: -90,
    right: -100,
  },
  orbBottomLeft: {
    width: 260,
    height: 260,
    bottom: 40,
    left: -100,
  },
  orbMid: {
    width: 160,
    height: 160,
    top: '45%',
    right: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 40,
  },
  controlSpacer: {
    width: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  formCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  eyeIcon: {
    padding: 4,
  },
  buttonWrapper: {
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  signUpButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  signUpText: {
    fontSize: 15,
    fontWeight: "500",
  },
  signUpLink: {
    fontWeight: "800",
  },
});
