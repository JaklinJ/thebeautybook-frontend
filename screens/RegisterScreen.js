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
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { LanguageContext } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import api from "../config/api";
import LanguageSelector from "../components/LanguageSelector";
import ThemeToggle from "../components/ThemeToggle";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const { signIn } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { theme, isDark } = useTheme();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t("error"), t("passwordTooShort"));
      return;
    }
    if (!agreedToPrivacy) {
      Alert.alert(t("error"), t("mustAgreeToPrivacy"));
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/register", { name, email, password, phone, address });
      await signIn(response.data.token, response.data.salon);
    } catch (error) {
      Alert.alert(
        t("registrationFailed"),
        error.response?.data?.message || t("couldNotCreateAccount")
      );
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
      <View style={[styles.orb, styles.orbTopLeft,     { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBottomRight, { backgroundColor: theme.orbPrimary }]} />
      <View style={[styles.orb, styles.orbMid,         { backgroundColor: theme.orbSecondary }]} />

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
              <Ionicons name="flower-outline" size={34} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brandName, { color: theme.textPrimary }]}>
              {t("appName")}
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>
              {t("registerSalon")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t("registerWelcome")}
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
            {[
              { icon: "business-outline", placeholder: t("salonName"), value: name, setter: setName, keyboard: "default" },
              { icon: "mail-outline", placeholder: t("email") + " *", value: email, setter: setEmail, keyboard: "email-address", autoCapitalize: "none" },
            ].map((field, i) => (
              <View key={i} style={[styles.inputContainer, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.border,
              }]}>
                <Ionicons name={field.icon} size={20} color={theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboard}
                  autoCapitalize={field.autoCapitalize || "words"}
                  autoCorrect={false}
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            ))}

            {/* Password */}
            <View style={[styles.inputContainer, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
              borderColor: theme.border,
            }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder={t("passwordMin")}
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

            {/* Phone */}
            <View style={[styles.inputContainer, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
              borderColor: theme.border,
            }]}>
              <Ionicons name="call-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            {/* Address */}
            <View style={[styles.inputContainer, styles.textAreaContainer, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
              borderColor: theme.border,
            }]}>
              <Ionicons name="location-outline" size={20} color={theme.textTertiary} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.textPrimary }]}
                placeholder={t("address")}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            {/* Privacy Policy Checkbox */}
            <TouchableOpacity
              style={styles.privacyRow}
              onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.primary },
                agreedToPrivacy && { backgroundColor: theme.primary },
              ]}>
                {agreedToPrivacy && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
                {t("agreeToPrivacy")}
                <Text
                  style={[styles.privacyLink, { color: theme.primary }]}
                  onPress={() => Linking.openURL("https://beauty-book-backend.onrender.com/privacy")}
                >
                  {t("privacyPolicy")}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Gradient Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.registerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.registerButtonText, { color: isDark ? '#111' : '#fff' }]}>
                  {loading ? t("registering") : t("register")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            {/* Login Link */}
            <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
              <Text style={[styles.loginText, { color: theme.textSecondary }]}>
                {t("hasAccount")}{" "}
                <Text style={[styles.loginLinkText, { color: theme.primary }]}>
                  {t("logInIt")}
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
  orbTopLeft: {
    width: 300,
    height: 300,
    top: -80,
    left: -100,
  },
  orbBottomRight: {
    width: 240,
    height: 240,
    bottom: 30,
    right: -90,
  },
  orbMid: {
    width: 150,
    height: 150,
    top: '40%',
    left: 30,
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
    marginBottom: 32,
  },
  controlSpacer: {
    width: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 18,
  },
  brandName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
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
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  textAreaContainer: {
    height: 90,
    alignItems: "flex-start",
    paddingTop: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  textArea: {
    textAlignVertical: "top",
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
  registerButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  privacyLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 15,
    fontWeight: "500",
  },
  loginLinkText: {
    fontWeight: "800",
  },
});
