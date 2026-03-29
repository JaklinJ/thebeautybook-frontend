import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import api from "../config/api";

export default function CustomerProfileScreen({ route, navigation }) {
  const { customer } = route.params;
  const [appointments, setAppointments] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'progress' | 'map'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { t } = React.useContext(LanguageContext);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadAppointments();
      loadProgress();
    });

    return unsubscribe;
  }, [navigation]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments/customer/${customer._id}`);
      setAppointments(response.data);
    } catch (error) {
      Alert.alert(t("error"), t("failedToLoadAppointments"));
      console.error("Load appointments error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await api.get(
        `/appointments/customer/${customer._id}/progress`
      );
      setProgress(response.data);
    } catch (error) {
      console.error("Load progress error:", error);
    }
  };

  const handleAddAppointment = () => {
    navigation.navigate("AddAppointment", {
      customer,
    });
  };

  const handleDeleteCustomer = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteCustomer = async () => {
    try {
      await api.delete(`/customers/${customer._id}`);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      console.error("Delete customer error:", error);
      setShowDeleteModal(false);
      Alert.alert(t("error"), t("deleteCustomerFailed"));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderAppointment = ({ item }) => (
    <View style={[styles.appointmentCard, {
      backgroundColor: theme.glassCard,
      borderColor: theme.glassCardBorder,
      shadowColor: isDark ? '#7C3AED' : '#F59E0B',
    }]}>
      <View style={styles.appointmentHeader}>
        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        <Text style={[styles.appointmentDate, { color: theme.textPrimary }]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <View style={styles.treatmentsContainer}>
        {item.treatments.map((treatment, index) => (
          <View key={index} style={[styles.treatmentItem, { 
            backgroundColor: theme.surfaceSecondary 
          }]}>
            <View style={styles.treatmentInfo}>
              <Text style={[styles.zoneText, { color: theme.textPrimary }]}>
                {treatment.zone}
              </Text>
              <Text style={[styles.powerText, { color: theme.primary }]}>
                {t("power")}: {treatment.power}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {item.notes && (
        <Text style={[styles.notesText, { color: theme.textSecondary }]}>
          {item.notes}
        </Text>
      )}
    </View>
  );

  const renderProgressItem = (item) => (
    <View key={item.zone} style={[styles.progressCard, {
      backgroundColor: theme.glassCard,
      borderColor: theme.glassCardBorder,
      shadowColor: isDark ? '#7C3AED' : '#F59E0B',
    }]}>
      <Text style={[styles.progressZone, { color: theme.textPrimary }]}>
        {item.zone}
      </Text>
      <View style={[styles.lastPowerRow, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
        <Text style={[styles.lastPowerLabel, { color: theme.primary }]}>
          {t("lastPower")}
        </Text>
        <Text style={[styles.lastPowerValue, { color: theme.primary }]}>
          {item.lastPower}
        </Text>
      </View>
      <View style={styles.progressStats}>
        <View style={[styles.statItem, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t("totalVisits")}
          </Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {item.totalVisits}
          </Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t("avgPower")}
          </Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {item.averagePower.toFixed(1)}
          </Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t("maxPower")}
          </Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {item.maxPower}
          </Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t("minPower")}
          </Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {item.minPower}
          </Text>
        </View>
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
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Decorative background orbs */}
      <View style={[styles.orb, styles.orbTopLeft,    { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBottomRight, { backgroundColor: theme.orbPrimary }]} />
      <View style={[styles.orb, styles.orbMidRight,   { backgroundColor: theme.orbSecondary }]} />

      <LinearGradient
        colors={theme.gradientHeader}
        style={[styles.header, { borderBottomColor: theme.headerBorder, shadowColor: isDark ? '#7C3AED' : '#F59E0B' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Top row: back + delete */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={[styles.headerIconBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteCustomer} style={styles.deleteButton}>
            <View style={[styles.headerIconBtn, { backgroundColor: theme.error + '1A' }]}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Centered profile */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={theme.gradientPrimary}
            style={styles.profileAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.profileAvatarText}>
              {customer.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
          <Text style={[styles.customerName, { color: theme.textPrimary }]}>
            {customer.name}
          </Text>
          {customer.phone && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={13} color={theme.primary} />
              <Text style={[styles.customerPhone, { color: theme.primary }]}>
                {customer.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(12,8,26,0.85)' : 'rgba(255,255,255,0.88)', borderBottomColor: theme.headerBorder }]}>
        {['visits', 'progress', 'map'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.primary }]}
            onPress={() => {
              if (tab === 'map') {
                navigation.navigate('BodyMap', { customer, progress });
              } else {
                setActiveTab(tab);
              }
            }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.textTertiary }]}>
              {tab === 'visits' ? t('visits') : tab === 'progress' ? t('progress') : t('bodyMap')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activeTab === 'progress' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {progress && progress.zoneProgress && progress.zoneProgress.length > 0 ? (
            <>
              <View style={[styles.progressHeader, { backgroundColor: theme.card }]}>
                <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>
                  {t("treatmentProgress")}
                </Text>
                <Text style={[styles.progressSubtitle, { color: theme.textSecondary }]}>
                  {t("totalVisits")}: {progress.totalAppointments}
                </Text>
              </View>
              {progress.zoneProgress.map(renderProgressItem)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <Ionicons name="stats-chart-outline" size={48} color={theme.textTertiary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {t("noProgressData")}
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          <FlatList
            data={appointments}
            renderItem={renderAppointment}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                  <Ionicons name="calendar-outline" size={48} color={theme.textTertiary} />
                </View>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {t("noAppointments")}
                </Text>
              </View>
            }
          />
          <TouchableOpacity
            style={[styles.addButton, { shadowColor: theme.primary }]}
            onPress={handleAddAppointment}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={28} color={isDark ? '#111' : '#fff'} />
              <Text style={[styles.addButtonText, { color: isDark ? '#111' : '#fff' }]}>
                {t("addAppointment")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {/* Delete Customer Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
          style={[styles.deleteModalOverlay, { backgroundColor: theme.overlay }]}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.deleteModalCard, {
              backgroundColor: isDark ? 'rgba(21,27,43,0.98)' : 'rgba(255,255,255,0.98)',
              borderColor: isDark ? theme.glassCardBorder : theme.border,
            }]}>
              {/* Icon badge */}
              <View style={[styles.deleteModalIconBadge, { backgroundColor: theme.error + '18' }]}>
                <Ionicons name="person-remove-outline" size={34} color={theme.error} />
              </View>

              {/* Title */}
              <Text style={[styles.deleteModalTitle, { color: theme.textPrimary }]}>
                {t("deleteCustomer")}
              </Text>

              {/* Customer name chip */}
              <View style={[styles.deleteModalNameChip, {
                backgroundColor: theme.error + '12',
                borderColor: theme.error + '35',
              }]}>
                <Text style={[styles.deleteModalName, { color: theme.error }]}>
                  {customer.name}
                </Text>
              </View>

              {/* Body */}
              <Text style={[styles.deleteModalBody, { color: theme.textSecondary }]}>
                {t("deleteCustomerConfirm")}
              </Text>

              {/* Buttons */}
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalCancelBtn, {
                    borderColor: theme.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}
                  onPress={() => setShowDeleteModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.deleteModalCancelText, { color: theme.textSecondary }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteModalDeleteBtn, { backgroundColor: theme.error, shadowColor: theme.error }]}
                  onPress={confirmDeleteCustomer}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.deleteModalDeleteText}>
                    {t("delete")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  orbTopLeft: {
    width: 300,
    height: 300,
    top: -80,
    left: -100,
  },
  orbMidRight: {
    width: 240,
    height: 240,
    top: '40%',
    right: -100,
  },
  orbBottomRight: {
    width: 180,
    height: 180,
    bottom: 60,
    right: -60,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {},
  deleteButton: {},
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    gap: 6,
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 10,
  },
  profileAvatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
  },
  customerName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  customerPhone: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  appointmentCard: {
    padding: 18,
    marginBottom: 15,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  treatmentsContainer: {
    marginTop: 8,
  },
  treatmentItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  treatmentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneText: {
    fontSize: 15,
    fontWeight: "600",
  },
  powerText: {
    fontSize: 14,
    fontWeight: "700",
  },
  notesText: {
    fontSize: 14,
    marginTop: 12,
    fontStyle: "italic",
    lineHeight: 20,
  },
  addButton: {
    margin: 15,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
  },
  progressHeader: {
    padding: 20,
    marginBottom: 15,
    borderRadius: 16,
    marginHorizontal: 15,
    marginTop: 15,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  progressSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressCard: {
    padding: 18,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  progressZone: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  lastPowerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  lastPowerLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  lastPowerValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  progressStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  deleteModalCard: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 16,
  },
  deleteModalIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  deleteModalNameChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    marginBottom: 16,
  },
  deleteModalName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deleteModalBody: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteModalDeleteBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  deleteModalDeleteText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});