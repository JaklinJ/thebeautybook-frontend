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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useCurrency } from "../context/CurrencyContext";
import api from "../config/api";

export default function CustomerProfileScreen({ route, navigation }) {
  const { customer: initialCustomer } = route.params;
  const [customerData, setCustomerData] = useState(initialCustomer);
  const [appointments, setAppointments] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'progress' | 'map'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editGender, setEditGender] = useState('woman');
  const [saving, setSaving] = useState(false);

  const { t } = React.useContext(LanguageContext);
  const { theme, isDark } = useTheme();
  const { formatPrice } = useCurrency();

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
      const response = await api.get(`/appointments/customer/${customerData._id}`);
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
        `/appointments/customer/${customerData._id}/progress`
      );
      setProgress(response.data);
    } catch (error) {
      console.error("Load progress error:", error);
    }
  };

  const handleAddAppointment = () => {
    const lastAppointment = appointments.length > 0
      ? appointments.reduce((latest, a) => new Date(a.date) > new Date(latest.date) ? a : latest)
      : null;
    navigation.navigate("AddAppointment", { customer: customerData, lastAppointment });
  };

  const handleEditAppointment = (appointment) => {
    navigation.navigate("AddAppointment", { customer: customerData, appointment, isEditing: true });
  };

  const handleOpenEdit = () => {
    setEditName(customerData.name || '');
    setEditPhone(customerData.phone || '');
    setEditEmail(customerData.email || '');
    setEditNotes(customerData.notes || '');
    setEditGender(customerData.gender || 'woman');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert(t("error"), t("enterCustomerName"));
      return;
    }
    setSaving(true);
    try {
      const response = await api.put(`/customers/${customerData._id}`, {
        name:  editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        notes: editNotes.trim(),
        gender: editGender,
      });
      setCustomerData(response.data);
      setShowEditModal(false);
    } catch (error) {
      console.error("Update customer error:", error);
      Alert.alert(t("error"), t("editCustomerFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = (appointment) => {
    Alert.alert(
      t("deleteAppointment"),
      t("deleteAppointmentConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            setDeletingAppointmentId(appointment._id);
            try {
              await api.delete(`/appointments/${appointment._id}`);
              await loadAppointments();
              await loadProgress();
            } catch (error) {
              Alert.alert(t("error"), t("deleteAppointmentFailed"));
            } finally {
              setDeletingAppointmentId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCustomer = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteCustomer = async () => {
    try {
      await api.delete(`/customers/${customerData._id}`);
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
        <View style={styles.appointmentActions}>
          <TouchableOpacity
            onPress={() => handleEditAppointment(item)}
            style={[styles.appointmentActionBtn, { backgroundColor: theme.primary + '18' }]}
          >
            <Ionicons name="create-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteAppointment(item)}
            style={[styles.appointmentActionBtn, { backgroundColor: theme.error + '18' }]}
            disabled={deletingAppointmentId === item._id}
          >
            {deletingAppointmentId === item._id
              ? <ActivityIndicator size="small" color={theme.error} />
              : <Ionicons name="trash-outline" size={16} color={theme.error} />
            }
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.treatmentsContainer}>
        {item.treatments.map((treatment, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.treatmentItem, { backgroundColor: theme.surfaceSecondary }]}
            onPress={() => setSelectedTreatment({ ...treatment, skinType: item.skinType, laserType: item.laserType, notes: item.notes })}
            activeOpacity={0.75}
          >
            <Text style={[styles.zoneText, { color: theme.textPrimary }]}>
              {t(treatment.zone)}
            </Text>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
          </TouchableOpacity>
        ))}
      </View>

      {item.notes && (
        <Text style={[styles.notesText, { color: theme.textSecondary }]}>
          {item.notes}
        </Text>
      )}
    </View>
  );

  const renderProgressItem = (item) => {
    const treatments = item.treatments ?? [];
    const last = treatments[treatments.length - 1];

    const pwValues = treatments.map(t => t.pulseWidth).filter(v => v != null);
    const freqValues = treatments.map(t => t.frequency).filter(v => v != null);

    const hasPw = pwValues.length > 0;
    const hasFreq = freqValues.length > 0;

    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const cols = [
      { key: 'fluence', label: 'Fluence', unit: 'J', color: theme.primary,
        min: item.minPower, max: item.maxPower, avgVal: item.averagePower, last: item.lastPower },
      ...(hasPw ? [{ key: 'pw', label: 'Pulse W.', unit: 'ms', color: isDark ? '#34D399' : '#059669',
        min: Math.min(...pwValues), max: Math.max(...pwValues), avgVal: avg(pwValues), last: last?.pulseWidth }] : []),
      ...(hasFreq ? [{ key: 'freq', label: 'Freq.', unit: 'Hz', color: isDark ? '#818CF8' : '#6366F1',
        min: Math.min(...freqValues), max: Math.max(...freqValues), avgVal: avg(freqValues), last: last?.frequency }] : []),
    ];

    const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    return (
      <View key={item.zone} style={[styles.progressCard, {
        backgroundColor: theme.glassCard,
        borderColor: theme.glassCardBorder,
        shadowColor: isDark ? '#7C3AED' : '#F59E0B',
      }]}>
        {/* Zone name + visits */}
        <View style={styles.progressCardHeader}>
          <Text style={[styles.progressZone, { color: theme.textPrimary }]}>{t(item.zone)}</Text>
          <View style={[styles.visitsBadge, { backgroundColor: theme.primary + '18' }]}>
            <Text style={[styles.visitsBadgeText, { color: theme.primary }]}>
              {item.totalVisits} {t('visits')}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={[styles.statsTable, { borderColor: borderCol }]}>
          {/* Header row */}
          <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: borderCol, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.tableRowLabel} />
            {cols.map(col => (
              <Text key={col.key} style={[styles.tableColHeader, { color: col.color, flex: 1 }]}>
                {col.label}
              </Text>
            ))}
          </View>

          {/* Last row */}
          {[
            { rowLabel: t('rowLast'), getValue: col => col.last },
            { rowLabel: t('rowAvg'),  getValue: col => col.avgVal },
            { rowLabel: t('rowMax'),  getValue: col => col.max },
            { rowLabel: t('rowMin'),  getValue: col => col.min },
          ].map(({ rowLabel, getValue }, ri) => (
            <View key={ri} style={[styles.tableRow, {
              borderBottomColor: borderCol,
              borderBottomWidth: ri < 3 ? 1 : 0,
            }]}>
              <Text style={[styles.tableRowLabel, { color: theme.textTertiary }]}>{rowLabel}</Text>
              {cols.map(col => {
                const val = getValue(col);
                return (
                  <Text key={col.key} style={[styles.tableCell, { color: col.color, flex: 1 }]}>
                    {val != null ? `${Number(val).toFixed(1)} ${col.unit}` : '—'}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
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
        {/* Top row: back + edit + delete */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={[styles.headerIconBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerRightBtns}>
            <TouchableOpacity onPress={handleOpenEdit}>
              <View style={[styles.headerIconBtn, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }]}>
                <Ionicons name="create-outline" size={20} color={theme.textPrimary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteCustomer}>
              <View style={[styles.headerIconBtn, { backgroundColor: theme.error + '1A' }]}>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </View>
            </TouchableOpacity>
          </View>
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
              {customerData.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
          <Text style={[styles.customerName, { color: theme.textPrimary }]}>
            {customerData.name}
          </Text>
          {customerData.phone && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={() => Linking.openURL(`tel:${customerData.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={13} color={theme.primary} />
              <Text style={[styles.customerPhone, { color: theme.primary }]}>
                {customerData.phone}
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
                navigation.navigate('BodyMap', { customer: customerData, progress });
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

      {/* Treatment Info Modal */}
      <Modal
        visible={!!selectedTreatment}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedTreatment(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedTreatment(null)}
          style={[styles.deleteModalOverlay, { backgroundColor: theme.overlay }]}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.infoModalCard, {
              backgroundColor: isDark ? 'rgba(21,27,43,0.98)' : 'rgba(255,255,255,0.98)',
              borderColor: isDark ? theme.glassCardBorder : theme.border,
            }]}>
              <View style={[styles.infoModalIconBadge, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="body-outline" size={30} color={theme.primary} />
              </View>
              <Text style={[styles.infoModalZone, { color: theme.textPrimary }]}>
                {t(selectedTreatment?.zone)}
              </Text>

              <View style={styles.infoModalRows}>
                <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("power")}</Text>
                  <Text style={[styles.infoModalRowValue, { color: theme.primary }]}>{selectedTreatment?.power}</Text>
                </View>
                {selectedTreatment?.pulseWidth != null && (
                  <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("pulseWidth")}</Text>
                    <Text style={[styles.infoModalRowValue, { color: theme.textPrimary }]}>{selectedTreatment.pulseWidth}</Text>
                  </View>
                )}
                {selectedTreatment?.frequency != null && (
                  <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("frequency")}</Text>
                    <Text style={[styles.infoModalRowValue, { color: theme.textPrimary }]}>{selectedTreatment.frequency}</Text>
                  </View>
                )}
                {selectedTreatment?.price > 0 && (
                  <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("price")}</Text>
                    <Text style={[styles.infoModalRowValue, { color: theme.success }]}>{formatPrice(selectedTreatment.price)}</Text>
                  </View>
                )}
                {selectedTreatment?.skinType != null && (
                  <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("skinType")}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        marginRight: 8,
                        backgroundColor: ['#FDDCB5','#E8B88A','#C68642','#8D5524','#4A2410'][selectedTreatment.skinType - 1],
                        borderWidth: 1,
                        borderColor: 'rgba(0,0,0,0.12)',
                      }} />
                      <Text style={[styles.infoModalRowValue, { color: theme.textPrimary }]}>
                        {`Type ${selectedTreatment.skinType}`}
                      </Text>
                    </View>
                  </View>
                )}
                {selectedTreatment?.laserType && (
                  <View style={[styles.infoModalRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoModalRowLabel, { color: theme.textTertiary }]}>{t("laserType")}</Text>
                    <Text style={[styles.infoModalRowValue, { color: theme.textPrimary }]}>{selectedTreatment.laserType}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.infoModalCloseBtn, { backgroundColor: theme.primary }]}
                onPress={() => setSelectedTreatment(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.infoModalCloseText}>{t("close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
                  {customerData.name}
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
      {/* Edit Customer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowEditModal(false)}
            style={[styles.deleteModalOverlay, { backgroundColor: theme.overlay }]}
          >
            <View
              style={[styles.editModalCard, {
                backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : 'rgba(255,255,255,0.99)',
                borderColor: isDark ? theme.glassCardBorder : theme.border,
              }]}
              onStartShouldSetResponder={() => true}
            >
                {/* Icon + title */}
                <View style={[styles.deleteModalIconBadge, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="person-outline" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.deleteModalTitle, { color: theme.textPrimary }]}>
                  {t('editCustomer')}
                </Text>

                {/* Fields */}
                <View style={styles.editFields}>
                  <View style={[styles.editField, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.inputBackground,
                    borderColor: theme.border,
                  }]}>
                    <Ionicons name="person-outline" size={16} color={theme.textTertiary} style={styles.editFieldIcon} />
                    <TextInput
                      style={[styles.editInput, { color: theme.textPrimary }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder={t('customerName')}
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>

                  <View style={[styles.editField, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.inputBackground,
                    borderColor: theme.border,
                  }]}>
                    <Ionicons name="call-outline" size={16} color={theme.textTertiary} style={styles.editFieldIcon} />
                    <TextInput
                      style={[styles.editInput, { color: theme.textPrimary }]}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder={t('customerPhone')}
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={[styles.editField, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.inputBackground,
                    borderColor: theme.border,
                  }]}>
                    <Ionicons name="mail-outline" size={16} color={theme.textTertiary} style={styles.editFieldIcon} />
                    <TextInput
                      style={[styles.editInput, { color: theme.textPrimary }]}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder={t('customerEmail')}
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={[styles.editField, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.inputBackground,
                    borderColor: theme.border,
                    alignItems: 'flex-start',
                    height: 80,
                  }]}>
                    <Ionicons name="document-text-outline" size={16} color={theme.textTertiary} style={[styles.editFieldIcon, { marginTop: 14 }]} />
                    <TextInput
                      style={[styles.editInput, { color: theme.textPrimary, paddingTop: 12 }]}
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder={t('customerNotes')}
                      placeholderTextColor={theme.textTertiary}
                      multiline
                    />
                  </View>

                  <View style={styles.editGenderToggle}>
                    {['woman', 'man'].map((g) => {
                      const active = editGender === g;
                      const color = g === 'woman' ? theme.pink : theme.blue;
                      return (
                        <TouchableOpacity
                          key={g}
                          style={[styles.editGenderBtn, {
                            backgroundColor: active ? color + '22' : isDark ? 'rgba(255,255,255,0.06)' : theme.inputBackground,
                            borderColor: active ? color : theme.border,
                          }]}
                          onPress={() => setEditGender(g)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.editGenderBtnText, { color: active ? color : theme.textSecondary }]}>
                            {g === 'woman' ? `♀ ${t('genderWoman')}` : `♂ ${t('genderMan')}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={[styles.deleteModalCancelBtn, {
                      borderColor: theme.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }]}
                    onPress={() => setShowEditModal(false)}
                    activeOpacity={0.7}
                    disabled={saving}
                  >
                    <Text style={[styles.deleteModalCancelText, { color: theme.textSecondary }]}>
                      {t('cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editSaveBtn, { backgroundColor: theme.primary, shadowColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                    onPress={handleSaveEdit}
                    activeOpacity={0.85}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color={isDark ? '#111' : '#fff'} />
                      : <>
                          <Ionicons name="checkmark" size={18} color={isDark ? '#111' : '#fff'} />
                          <Text style={[styles.deleteModalDeleteText, { color: isDark ? '#111' : '#fff' }]}>
                            {t('saveChanges')}
                          </Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
          </TouchableOpacity>
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
  headerRightBtns: { flexDirection: 'row', gap: 10 },
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
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 28,
    letterSpacing: 0.3,
    lineHeight: 34,
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
  appointmentActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  appointmentActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  treatmentItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  infoModalCard: {
    width: 300,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 16,
  },
  infoModalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  infoModalZone: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 20,
    textAlign: "center",
  },
  infoModalRows: {
    width: "100%",
    marginBottom: 20,
  },
  infoModalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoModalRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoModalRowValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  infoModalNotesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoModalSkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoModalSkinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  infoModalCloseBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  infoModalCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  treatmentMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  metricPill: {
    alignItems: "center",
    minWidth: 70,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
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
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  visitsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  visitsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsTable: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  tableHeaderRow: {
    paddingVertical: 7,
  },
  tableRowLabel: {
    width: 52,
    fontSize: 10,
    fontWeight: '600',
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  tableCell: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
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
  editModalCard: {
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
  editFields: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  editFieldIcon: {
    marginRight: 10,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  editGenderToggle: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  editGenderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editGenderBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  editSaveBtn: {
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
});