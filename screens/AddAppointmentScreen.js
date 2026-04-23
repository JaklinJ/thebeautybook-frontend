import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Modal,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LanguageContext } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import api from "../config/api";

const LASER_TYPES = ['Diode', 'Alexandrite'];

const COOLING_LEVELS = [
  { value: 'low', labelKey: 'coolingLow' },
  { value: 'medium', labelKey: 'coolingMedium' },
  { value: 'high', labelKey: 'coolingHigh' },
];

const SKIN_REACTIONS = [
  { value: 'none', labelKey: 'skinReactionNone', icon: 'checkmark-circle-outline' },
  { value: 'mild', labelKey: 'skinReactionMild', icon: 'sunny-outline' },
  { value: 'moderate', labelKey: 'skinReactionModerate', icon: 'warning-outline' },
  { value: 'severe', labelKey: 'skinReactionSevere', icon: 'alert-circle-outline' },
];

const SKIN_TYPES = [
  { type: 1, color: '#FDDCB5', descKey: 'skinType1' },
  { type: 2, color: '#E8B88A', descKey: 'skinType2' },
  { type: 3, color: '#C68642', descKey: 'skinType3' },
  { type: 4, color: '#8D5524', descKey: 'skinType4' },
  { type: 5, color: '#4A2410', descKey: 'skinType5' },
];

// Zone translation keys
const ZONE_KEYS = [
  "zoneFace",
  "zoneUpperLip",
  "zoneChin",
  "zoneNeck",
  "zoneThroat",
  "zoneChest",
  "zoneBack",
  "zoneArms",
  "zoneHalfArms",
  "zoneArmpits",
  "zoneAbdomen",
  "zoneIntimate",
  "zoneBikiniLine",
  "zoneLowerBack",
  "zoneLegs",
  "zoneHalfLegs",
  "zoneGlutes",
  "zoneOther",
];

export default function AddAppointmentScreen({ route, navigation }) {
  const { customer, appointment, isEditing, prefillDate } = route.params;
  const [date, setDate] = useState(
    isEditing ? new Date(appointment.date) :
    prefillDate ? new Date(prefillDate + 'T00:00:00') :
    new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputText, setDateInputText] = useState("");
  const [treatments, setTreatments] = useState(
    isEditing
      ? appointment.treatments.map(t => ({
          zone: t.zone,
          power: String(t.power),
          pulseWidth: t.pulseWidth != null ? String(t.pulseWidth) : "",
          frequency: t.frequency != null ? String(t.frequency) : "",
          price: t.price ? String(t.price) : "",
        }))
      : [{ zone: "", power: "", pulseWidth: "", frequency: "", price: "" }]
  );
  const [notes, setNotes] = useState(isEditing ? (appointment.notes || "") : "");
  const [skinType, setSkinType] = useState(isEditing ? (appointment.skinType || null) : null);
  const [laserType, setLaserType] = useState(isEditing ? (appointment.laserType || null) : null);
  const [cooling, setCooling] = useState(isEditing ? (appointment.cooling || null) : null);
  const [skinReaction, setSkinReaction] = useState(isEditing ? (appointment.skinReaction || null) : null);
  const [loading, setLoading] = useState(false);
  const [priceList, setPriceList] = useState({});
  const scrollViewRef = useRef(null);
  const hasMountedRef = useRef(false);
  const { t } = React.useContext(LanguageContext);
  const { theme, isDark } = useTheme();

  // Create translated zones array
  const COMMON_ZONES = ZONE_KEYS.map((key) => t(key));

  // Initialize date input text and load price list
  React.useEffect(() => {
    setDateInputText(formatDateForInput(date));
    api.get('/pricelists').then(res => setPriceList(res.data.prices || {})).catch(() => {});
  }, []);

  const formatDateForInput = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      setDateInputText(formatDateForInput(selectedDate));
    }
  };

  const handleDateInputChange = (text) => {
    setDateInputText(text);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(text)) {
      const newDate = new Date(text + "T00:00:00");
      if (!isNaN(newDate.getTime())) {
        setDate(newDate);
      }
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const addTreatment = () => {
    setTreatments((prev) => [...prev, { zone: "", power: "", pulseWidth: "", frequency: "", price: "" }]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeTreatment = (index) => {
    if (treatments.length > 1) {
      const newTreatments = treatments.filter((_, i) => i !== index);
      setTreatments(newTreatments);
    }
  };

  const updateTreatment = (index, field, value) => {
    const newTreatments = [...treatments];
    newTreatments[index][field] = value;
    // Auto-fill price when zone is selected
    if (field === 'zone') {
      const zoneKey = ZONE_KEYS.find(k => t(k) === value);
      if (zoneKey && priceList[zoneKey] !== undefined) {
        newTreatments[index].price = String(priceList[zoneKey]);
      }
    }
    setTreatments(newTreatments);
  };

  const parseNum = (val) => parseFloat(String(val).replace(',', '.'));

  const handleSubmit = async () => {
    const validTreatments = treatments.filter((t) => t.zone.trim() && t.power);

    if (validTreatments.length === 0) {
      Alert.alert(t("error"), t("enterZoneForAll"));
      return;
    }

    for (let i = 0; i < treatments.length; i++) {
      if (treatments[i].zone.trim() && !treatments[i].power) {
        Alert.alert(t("error"), t("enterPowerForAll"));
        return;
      }
      if (!treatments[i].zone.trim() && treatments[i].power) {
        Alert.alert(t("error"), t("enterZoneForAll"));
        return;
      }
    }

    const power = parseNum(validTreatments[0].power);
    if (isNaN(power) || power < 0) {
      Alert.alert(t("error"), t("enterValidPower"));
      return;
    }

    setLoading(true);
    try {
      const treatmentsData = validTreatments.map((t) => ({
        zone: t.zone.trim(),
        power: parseNum(t.power),
        pulseWidth: t.pulseWidth ? parseNum(t.pulseWidth) : null,
        frequency: t.frequency ? parseNum(t.frequency) : null,
        price: parseNum(t.price) || 0,
      }));

      if (isEditing) {
        await api.put(`/appointments/${appointment._id}`, {
          date: date.toISOString(),
          treatments: treatmentsData,
          skinType: skinType || undefined,
          laserType: laserType || undefined,
          cooling: cooling || undefined,
          skinReaction: skinReaction || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.post("/appointments", {
          customerId: customer._id,
          date: date.toISOString(),
          treatments: treatmentsData,
          skinType: skinType || undefined,
          laserType: laserType || undefined,
          cooling: cooling || undefined,
          skinReaction: skinReaction || undefined,
          notes: notes.trim() || undefined,
        });
      }

      Alert.alert(t("success"), isEditing ? t("appointmentUpdated") : t("appointmentAdded"), [
        {
          text: t("confirm"),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        t("error"),
        error.response?.data?.message || t("failedToAddAppointment"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.headerBackground}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {isEditing ? t("editAppointment") : t("newAppointment")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.customerInfo, { backgroundColor: theme.card }]}>
            <Text style={[styles.customerName, { color: theme.textPrimary }]}>
              {customer.name}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("date")}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateInputContainer,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.inputBackground,
                },
              ]}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.primary}
                style={styles.dateIcon}
              />
              <TextInput
                style={[styles.dateInputField, { color: theme.textPrimary }]}
                placeholder="YYYY-MM-DD"
                value={dateInputText}
                onChangeText={handleDateInputChange}
                placeholderTextColor={theme.textTertiary}
                editable={true}
                onFocus={openDatePicker}
              />
              <TouchableOpacity
                onPress={openDatePicker}
                style={styles.datePickerButton}
              >
                <Ionicons name="calendar" size={20} color={theme.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
            <Text
              style={[styles.dateDisplayText, { color: theme.textSecondary }]}
            >
              {date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {Platform.OS === "ios" && showDatePicker && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View
                  style={[
                    styles.modalOverlay,
                    { backgroundColor: theme.overlay },
                  ]}
                >
                  <View
                    style={[
                      styles.modalContent,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalHeader,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {t("cancel")}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.modalTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {t("date")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setDateInputText(formatDateForInput(date));
                          setShowDatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalButtonTextPrimary,
                            { color: theme.primary },
                          ]}
                        >
                          {t("confirm")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="inline"
                      onChange={handleDateChange}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === "android" && showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Skin Type */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("skinTypeOptional")}
            </Text>
            <View style={styles.skinRow}>
              {SKIN_TYPES.map((skin) => {
                const selected = skinType === skin.type;
                return (
                  <TouchableOpacity
                    key={skin.type}
                    onPress={() => setSkinType(selected ? null : skin.type)}
                    style={styles.skinItem}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.skinSwatch,
                      { backgroundColor: skin.color },
                      selected && { borderWidth: 3, borderColor: theme.primary },
                    ]} />
                    <Text style={[styles.skinLabel, { color: selected ? theme.primary : theme.textTertiary }]}>
                      {skin.type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {skinType && (
              <Text style={[styles.skinDescription, { color: theme.textSecondary }]}>
                {t(SKIN_TYPES[skinType - 1].descKey)}
              </Text>
            )}
          </View>

          {/* Laser Type */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("laserTypeOptional")}
            </Text>
            <View style={styles.laserRow}>
              {LASER_TYPES.map((laser) => {
                const selected = laserType === laser;
                return (
                  <TouchableOpacity
                    key={laser}
                    onPress={() => setLaserType(selected ? null : laser)}
                    style={[
                      styles.laserChip,
                      {
                        backgroundColor: selected ? theme.primary + '18' : theme.inputBackground,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={laser === 'Diode' ? 'flash' : 'planet-outline'}
                      size={18}
                      color={selected ? theme.primary : theme.textTertiary}
                    />
                    <Text style={[styles.laserChipText, { color: selected ? theme.primary : theme.textSecondary }]}>
                      {laser}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cooling */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("coolingOptional")}
            </Text>
            <View style={styles.laserRow}>
              {COOLING_LEVELS.map((level) => {
                const selected = cooling === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => setCooling(selected ? null : level.value)}
                    style={[
                      styles.laserChip,
                      {
                        backgroundColor: selected ? theme.primary + '18' : theme.inputBackground,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="snow-outline"
                      size={18}
                      color={selected ? theme.primary : theme.textTertiary}
                    />
                    <Text style={[styles.laserChipText, { color: selected ? theme.primary : theme.textSecondary }]}>
                      {t(level.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                {t("treatmentZones")}
              </Text>
            </View>

            {treatments.map((treatment, index) => (
              <View
                key={index}
                style={[
                  styles.treatmentRow,
                  {
                    backgroundColor: theme.surfaceSecondary,
                  },
                ]}
              >
                {/* Zone chips — full width */}
                <View style={styles.zoneContainer}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("zone")}
                  </Text>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.zoneScroll}
                    nestedScrollEnabled={true}
                  >
                    <View style={styles.zoneChipsContainer}>
                      {COMMON_ZONES.map((zone) => (
                        <TouchableOpacity
                          key={zone}
                          style={[
                            styles.zoneChip,
                            {
                              backgroundColor:
                                treatment.zone === zone
                                  ? theme.primary + "20"
                                  : theme.surfaceSecondary,
                              borderColor:
                                treatment.zone === zone
                                  ? theme.primary
                                  : theme.border,
                            },
                          ]}
                          onPress={() => updateTreatment(index, "zone", zone)}
                        >
                          <Text
                            style={[
                              styles.zoneChipText,
                              {
                                color:
                                  treatment.zone === zone
                                    ? theme.primary
                                    : theme.textSecondary,
                              },
                            ]}
                          >
                            {zone}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <TextInput
                    style={[
                      styles.customZoneInput,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.inputBackground,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder={t("customZonePlaceholder")}
                    value={treatment.zone}
                    onChangeText={(value) => updateTreatment(index, "zone", value)}
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                {/* Metrics row — below zones */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricField}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                      {t("power")}
                    </Text>
                    <TextInput
                      style={[styles.metricInput, { borderColor: treatment.power ? theme.primary : theme.border, backgroundColor: theme.inputBackground, color: theme.textPrimary }]}
                      placeholder={t("powerPlaceholder")}
                      value={treatment.power}
                      onChangeText={(value) => updateTreatment(index, "power", value)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
                  <View style={styles.metricField}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                      {t("pulseWidth")}
                    </Text>
                    <TextInput
                      style={[styles.metricInput, { borderColor: treatment.pulseWidth ? theme.primary : theme.border, backgroundColor: theme.inputBackground, color: theme.textPrimary }]}
                      placeholder="ms"
                      value={treatment.pulseWidth}
                      onChangeText={(value) => updateTreatment(index, "pulseWidth", value)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
                  <View style={styles.metricField}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                      {t("frequency")}
                    </Text>
                    <TextInput
                      style={[styles.metricInput, { borderColor: treatment.frequency ? theme.primary : theme.border, backgroundColor: theme.inputBackground, color: theme.textPrimary }]}
                      placeholder="Hz"
                      value={treatment.frequency}
                      onChangeText={(value) => updateTreatment(index, "frequency", value)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
                </View>

                {/* Price row — full width, below zones and power */}
                <View style={styles.priceRow}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("price")}
                  </Text>
                  <TextInput
                    style={[
                      styles.priceInput,
                      {
                        borderColor: treatment.price ? theme.primary : theme.border,
                        backgroundColor: theme.inputBackground,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder="0"
                    value={treatment.price}
                    onChangeText={(value) => updateTreatment(index, "price", value)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                {treatments.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeTreatment(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.error}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={addTreatment}
              style={[
                styles.addTreatmentButton,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.surface,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.addTreatmentText, { color: theme.primary }]}>
                {t("addZone")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skin Reaction */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("skinReactionOptional")}
            </Text>
            <View style={styles.reactionRow}>
              {SKIN_REACTIONS.map((reaction) => {
                const selected = skinReaction === reaction.value;
                return (
                  <TouchableOpacity
                    key={reaction.value}
                    onPress={() => setSkinReaction(selected ? null : reaction.value)}
                    style={[
                      styles.reactionChip,
                      {
                        backgroundColor: selected ? theme.primary + '18' : theme.inputBackground,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={reaction.icon}
                      size={16}
                      color={selected ? theme.primary : theme.textTertiary}
                    />
                    <Text style={[styles.reactionChipText, { color: selected ? theme.primary : theme.textSecondary }]}>
                      {t(reaction.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {t("notesOptional")}
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.inputBackground,
                  color: theme.textPrimary,
                },
              ]}
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.textTertiary}
              onFocus={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text
              style={[styles.submitButtonText, { color: theme.buttonText }]}
            >
              {loading ? t("saving") : isEditing ? t("updateAppointment") : t("saveAppointment")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  customerInfo: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
  },
  section: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateInputField: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  datePickerButton: {
    padding: 5,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalButtonText: {
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
  },
  dateDisplayText: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
  treatmentRow: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
  },
  zoneContainer: {
    marginBottom: 12,
  },
  zoneScroll: {
    maxHeight: 150,
    marginBottom: 10,
  },
  zoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 2,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customZoneInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 4,
  },
  metricField: {
    flex: 1,
  },
  metricInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  removeButton: {
    padding: 8,
    alignItems: "center",
    marginTop: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 100,
  },
  addTreatmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  addTreatmentText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  zoneChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap", // Wrap chips to next line
    gap: 8, // Space between chips
  },
  zoneChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  zoneChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  laserRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  laserChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  laserChipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  reactionChip: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  reactionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  skinItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  skinSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  skinLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  skinDescription: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
});
