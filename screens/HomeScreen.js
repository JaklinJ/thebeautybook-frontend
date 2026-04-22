import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
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
import { useSubscription, FREE_TIER_CLIENT_LIMIT } from "../context/SubscriptionContext";

export default function HomeScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [editProfile, setEditProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { signOut, salon, updateSalon } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { theme, isDark } = useTheme();
  const { isPro } = useSubscription();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadCustomers();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter((customer) => {
      const nameMatch = customer.name?.toLowerCase().includes(query);
      const phoneMatch = customer.phone?.toLowerCase().includes(query);
      return nameMatch || phoneMatch;
    });

    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  useEffect(() => {
    if (salon) {
      setEditProfile({
        name: salon.name || "",
        email: salon.email || "",
        phone: salon.phone || "",
        address: salon.address || "",
      });
    }
  }, [salon]);

  const handleCustomerPress = (customer) => {
    navigation.navigate("CustomerProfile", { customer });
  };

  const isNetworkError = (error) => {
    return (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("network") ||
      !error.response
    );
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/customers");
      setCustomers([...response.data]);
      setFilteredCustomers([...response.data]);
    } catch (error) {
      console.error("Load customers error:", error);
      if (isNetworkError(error)) {
        Alert.alert(t("connectionError"), t("connectionErrorMsg"));
      } else {
        Alert.alert(
          t("error"),
          error.response?.data?.message || t("failedToLoadCustomers")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    signOut();
  };

  const handleEditProfile = () => {
    setShowProfileMenu(false);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editProfile.name.trim()) {
      Alert.alert(t("error"), "Salon name is required");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.put("/salons/profile", editProfile);
      await updateSalon(editProfile);
      Alert.alert(t("success"), "Profile updated successfully");
      setShowEditModal(false);
    } catch (error) {
      Alert.alert(
        t("error"),
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowProfileMenu(false);
    setShowDeleteModal(true);
  };

  const handlePrivacySettings = () => {
    setShowProfileMenu(false);
    setShowPrivacyModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete("/salons/account");
      setShowDeleteModal(false);
      Alert.alert(
        "Account Deleted",
        "Your salon account and all associated data have been permanently deleted.",
        [{ text: "OK", onPress: signOut }]
      );
    } catch (error) {
      Alert.alert(
        t("error"),
        error.response?.data?.message || "Failed to delete account"
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert(t("error"), t("enterCustomerName"));
      return;
    }

    setAddingCustomer(true);
    try {
      await api.post("/customers", newCustomer);
      setShowAddModal(false);
      setNewCustomer({ name: "", phone: "", email: "", notes: "" });
      await loadCustomers();
      Alert.alert(t("success"), t("customerAdded"));
    } catch (error) {
      Alert.alert(
        t("error"),
        error.response?.data?.message || t("failedToAddCustomer")
      );
      console.error("Add customer error:", error);
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewCustomer({ name: "", phone: "", email: "", notes: "" });
  };

  const renderCustomer = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.customerCard,
        {
          backgroundColor: theme.glassCard,
          borderColor: theme.glassCardBorder,
          shadowColor: isDark ? '#7C3AED' : '#F59E0B',
        }
      ]}
      onPress={() => handleCustomerPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.customerAvatar, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.customerInitial, { color: theme.primary }]}>
          {item.name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={[styles.customerName, { color: theme.textPrimary }]}>
          {item.name}
        </Text>
        {item.phone && (
          <View style={styles.phoneContainer}>
            <Ionicons name="call-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.customerPhone, { color: theme.textSecondary }]}>
              {item.phone}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder, shadowColor: isDark ? '#7C3AED' : '#F59E0B' }]}>
        <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="people" size={24} color={theme.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Clients
          </Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {customers.length}
            {!isPro && (
              <Text style={[styles.statLimit, { color: theme.textTertiary }]}>
                {' '}/ {FREE_TIER_CLIENT_LIMIT}
              </Text>
            )}
          </Text>
        </View>
        {/* !isPro && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Paywall')}
            style={[styles.upgradeChip, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '35' }]}
          >
            <Ionicons name="star-outline" size={13} color={theme.primary} />
            <Text style={[styles.upgradeChipText, { color: theme.primary }]}>Pro</Text>
          </TouchableOpacity>
        ) */}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={theme.gradientBackground}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Decorative background orbs */}
      <View style={[styles.orb, styles.orbTopRight,  { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbMidLeft,   { backgroundColor: theme.orbPrimary }]} />
      <View style={[styles.orb, styles.orbBottomRight,{ backgroundColor: theme.orbSecondary }]} />

      {/* Sleek Modern Header */}
      <LinearGradient
        colors={theme.gradientHeader}
        style={[styles.header, { borderBottomColor: theme.headerBorder, shadowColor: isDark ? '#7C3AED' : '#F59E0B' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Row 1: controls */}
        <View style={styles.headerControlsRow}>
          <Text style={[styles.greeting, { color: theme.textTertiary }]}>
            {t("welcomeBack")}
          </Text>
          <View style={styles.headerActions}>
            <LanguageSelector />
            <View style={styles.actionsSpacer} />
            <ThemeToggle />
            <View style={styles.actionsSpacer} />
            <TouchableOpacity
              onPress={() => setShowProfileMenu(true)}
              style={[styles.actionButton, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                borderColor: theme.headerBorder,
              }]}
              activeOpacity={0.6}
            >
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: salon identity */}
        <View style={styles.headerIdentityRow}>
          <LinearGradient
            colors={theme.gradientPrimary}
            style={styles.headerAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerAvatarText}>
              {salon?.name?.[0]?.toUpperCase() || 'S'}
            </Text>
          </LinearGradient>
          <Text style={[styles.salonName, { color: theme.textPrimary }]}>
            {salon?.name || "Salon"}
          </Text>
        </View>

        {/* Row 3: search */}
        <View style={[styles.searchBar, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)',
        }]}>
          <Ionicons name="search-outline" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <>
        <TouchableOpacity
          style={styles.menuBackdrop}
          onPress={() => setShowProfileMenu(false)}
          activeOpacity={1}
        />
        <View style={[styles.dropdownMenu, {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}>
          {isPro ? (
            <View style={[styles.dropdownItem, { borderBottomColor: theme.border }]}>
              <Ionicons name="star" size={20} color={theme.primary} />
              <Text style={[styles.dropdownText, { color: theme.primary }]}>
                {t('proActive')}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
            onPress={() => { setShowProfileMenu(false); navigation.navigate('PriceList'); }}
          >
            <Ionicons name="pricetag-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.dropdownText, { color: theme.textPrimary }]}>
              {t('priceList')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('RevenueDashboard');
            }}
          >
            <Ionicons name="bar-chart-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.dropdownText, { color: theme.textPrimary }]}>
              {t('revenue')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
            onPress={handleEditProfile}
          >
            <Ionicons name="create-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.dropdownText, { color: theme.textPrimary }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.dropdownText, { color: theme.textPrimary }]}>
              {t("logout")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
            onPress={handlePrivacySettings}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.info} />
            <Text style={[styles.dropdownText, { color: theme.info }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
            <Text style={[styles.dropdownText, { color: theme.error }]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      {/* Customer List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t("loading")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <Ionicons name="people-outline" size={56} color={theme.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {searchQuery ? t("noCustomersFound") : t("noCustomersYet")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {searchQuery ? "Try a different search" : t("addNewCustomer")}
              </Text>
            </View>
          }
        />
      )}

      {/* Elegant FAB */}
      <TouchableOpacity
        style={[styles.fab, { shadowColor: theme.primary }]}
        onPress={() => {
          // if (!isPro && customers.length >= FREE_TIER_CLIENT_LIMIT) {
          //   navigation.navigate('Paywall', { fromLimit: true });
          // } else {
            setShowAddModal(true);
          // }
        }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={theme.gradientPrimary}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color={isDark ? '#111' : '#fff'} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => setShowEditModal(false)} style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Salon Name *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder="Salon Name"
                    value={editProfile.name}
                    onChangeText={(text) =>
                      setEditProfile({ ...editProfile, name: text })
                    }
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Email
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder="Email"
                    value={editProfile.email}
                    onChangeText={(text) =>
                      setEditProfile({ ...editProfile, email: text })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Phone
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder="Phone"
                    value={editProfile.phone}
                    onChangeText={(text) =>
                      setEditProfile({ ...editProfile, phone: text })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Address
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder="Address"
                    value={editProfile.address}
                    onChangeText={(text) =>
                      setEditProfile({ ...editProfile, address: text })
                    }
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                    savingProfile && styles.buttonDisabled,
                  ]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color={theme.buttonText} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
                      {t("save")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLogoutModal(false)} style={[styles.confirmOverlay, { backgroundColor: theme.overlay }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.confirmDialog, { backgroundColor: theme.surface }]}>
            <View style={[styles.confirmIconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="log-out-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>
              {t("logoutConfirm")}
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              {t("logoutConfirmMsg")}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.confirmButtonText, { color: theme.textSecondary }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={confirmLogout}
              >
                <Text style={[styles.confirmButtonText, { color: theme.buttonText }]}>
                  {t("logout")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => setShowDeleteModal(false)} style={[styles.confirmOverlay, { backgroundColor: theme.overlay }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.confirmDialog, { backgroundColor: theme.surface }]}>
            <View style={[styles.confirmIconContainer, { backgroundColor: theme.error + '20' }]}>
              <Ionicons name="warning-outline" size={32} color={theme.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.error }]}>
              Delete Account?
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              This will permanently delete your salon account, all customers, and all appointments. This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.confirmButtonText, { color: theme.textSecondary }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton, 
                  { backgroundColor: theme.error },
                  deletingAccount && styles.buttonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                    {t("delete")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
        />
        <View style={styles.privacyModalSlide}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '92%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            <View style={styles.modalHeader}>
              <View style={styles.privacyTitleRow}>
                <View style={[styles.privacyIconBadge, { backgroundColor: theme.info + '20' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.info} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Privacy Policy
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={26} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.privacyLastUpdated, { color: theme.textTertiary }]}>
                Last updated: March 2026
              </Text>

              <Text style={[styles.privacyIntro, { color: theme.textSecondary }]}>
                This Privacy Policy explains how Laseria ("we", "our", or "us") collects, uses, and protects your information when you use our mobile application. By using the app, you agree to the practices described in this policy.
              </Text>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  1. Information We Collect
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Account Information:{'\n'}</Text>
                  When you register, we collect your salon name, email address, phone number, and business address.{'\n\n'}
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Customer Data:{'\n'}</Text>
                  You may enter customer names, phone numbers, email addresses, and notes. This data belongs to you and is stored securely on our servers.{'\n\n'}
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Appointment Data:{'\n'}</Text>
                  We store appointment records you create, including dates, services, and associated customer information.{'\n\n'}
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Usage Data:{'\n'}</Text>
                  We may collect anonymous technical data such as device type, operating system version, and app usage patterns to improve performance.{'\n\n'}
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Device Features:{'\n'}</Text>
                  When you tap a customer's phone number, the app uses your device's native dialer to initiate the call. We do not collect, transmit, or store any call data, call history, or phone numbers beyond what you have already entered into the app.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  2. How We Use Your Information
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  • Provide and operate the app and its features{'\n'}
                  • Authenticate your account and keep it secure{'\n'}
                  • Store and retrieve your salon and customer records{'\n'}
                  • Respond to support requests{'\n'}
                  • Improve and maintain the application{'\n'}
                  • Comply with legal obligations
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  3. Data Sharing & Disclosure
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  We do <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>not</Text> sell, rent, or trade your personal data to third parties.{'\n\n'}
                  We may share data only in these limited cases:{'\n'}
                  • With service providers who help us operate the app (e.g., cloud hosting), under strict confidentiality agreements{'\n'}
                  • When required by law, court order, or governmental authority{'\n'}
                  • To protect the rights, safety, or property of our users or the public
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  4. Data Retention & Deletion
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  We retain your data for as long as your account is active.{'\n\n'}
                  You can permanently delete your account and all associated data at any time via <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Profile → Delete Account</Text>. Deletion is immediate and irreversible — all salon data, customer records, and appointments are permanently removed from our servers.{'\n\n'}
                  Anonymous usage analytics, if collected, are retained for up to 12 months.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  5. Your Rights
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  Depending on your location, you may have the right to:{'\n'}
                  • <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Access</Text> the personal data we hold about you{'\n'}
                  • <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Correct</Text> inaccurate information via Edit Profile{'\n'}
                  • <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Delete</Text> your account and all associated data{'\n'}
                  • <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Export</Text> your data upon request{'\n'}
                  • <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>Object</Text> to certain processing of your information{'\n\n'}
                  To exercise any of these rights, contact us at the address below.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  6. Security
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  We use industry-standard security measures to protect your data, including:{'\n'}
                  • Encrypted data transmission (HTTPS/TLS){'\n'}
                  • Secure password hashing (bcrypt){'\n'}
                  • Token-based authentication (JWT){'\n'}
                  • Access controls limiting who can view your data{'\n\n'}
                  No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  7. Children's Privacy
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  This app is intended for business use by adults. We do not knowingly collect personal information from anyone under the age of 13 (or 16 in the EU). If you believe a minor has provided us with personal data, please contact us and we will delete it promptly.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  8. Changes to This Policy
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top. Continued use of the app after changes constitutes acceptance of the revised policy. We encourage you to review this policy periodically.
                </Text>
              </View>

              <View style={[styles.privacySection, { borderLeftColor: theme.info }]}>
                <Text style={[styles.privacySectionTitle, { color: theme.textPrimary }]}>
                  9. Contact Us
                </Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
                  If you have any questions, requests, or concerns about this Privacy Policy or your data, please contact us:{'\n\n'}
                  <Text style={[styles.privacyBold, { color: theme.textPrimary }]}>LASERIA{'\n'}</Text>
                  <Text style={[styles.privacyLink, { color: theme.info }]}>laseriaapp@gmail.com</Text>
                </Text>
              </View>

              <View style={styles.privacyFooter}>
                <Ionicons name="shield-checkmark" size={16} color={theme.textTertiary} />
                <Text style={[styles.privacyFooterText, { color: theme.textTertiary }]}>
                  Compliant with Apple App Store & Google Play Store privacy requirements
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.info }]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={[styles.saveButtonText, { color: '#fff' }]}>
                  Got It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal (existing) */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelAdd}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCancelAdd}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          pointerEvents="box-none"
        >
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {t("addNewCustomer")}
                </Text>
                <TouchableOpacity onPress={handleCancelAdd} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("customerName")}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder={t("customerName")}
                    value={newCustomer.name}
                    onChangeText={(text) =>
                      setNewCustomer({ ...newCustomer, name: text })
                    }
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("customerPhone")}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder={t("customerPhone")}
                    value={newCustomer.phone}
                    onChangeText={(text) =>
                      setNewCustomer({ ...newCustomer, phone: text })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("customerEmail")}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder={t("customerEmail")}
                    value={newCustomer.email}
                    onChangeText={(text) =>
                      setNewCustomer({ ...newCustomer, email: text })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("customerNotes")}
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.textPrimary, 
                      borderColor: theme.border 
                    }]}
                    placeholder={t("customerNotes")}
                    value={newCustomer.notes}
                    onChangeText={(text) =>
                      setNewCustomer({ ...newCustomer, notes: text })
                    }
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={handleCancelAdd}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                    addingCustomer && styles.buttonDisabled,
                  ]}
                  onPress={handleAddCustomer}
                  disabled={addingCustomer}
                >
                  {addingCustomer ? (
                    <ActivityIndicator size="small" color={theme.buttonText} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
                      {t("add")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
        </KeyboardAvoidingView>

      </Modal>
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
    width: 340,
    height: 340,
    top: -100,
    right: -120,
  },
  orbMidLeft: {
    width: 260,
    height: 260,
    top: '38%',
    left: -110,
  },
  orbBottomRight: {
    width: 200,
    height: 200,
    bottom: 40,
    right: -80,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  headerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  salonName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionsSpacer: {
    width: 10,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 90,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    minWidth: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  statsContainer: {
    paddingBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statLimit: {
    fontSize: 18,
    fontWeight: '500',
  },
  upgradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  upgradeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -1,
  },
  listContent: {
    padding: 20,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  customerInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerPhone: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  privacyModalSlide: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  textInput: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmDialog: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyLastUpdated: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  privacyIntro: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 20,
  },
  privacySection: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    marginBottom: 24,
  },
  privacySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  privacyBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  privacyBold: {
    fontWeight: '700',
  },
  privacyLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  privacyFooterText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
});
