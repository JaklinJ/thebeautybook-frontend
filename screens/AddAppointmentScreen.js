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
  const { customer, onGoBack } = route.params;
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputText, setDateInputText] = useState("");
  const [treatments, setTreatments] = useState([{ zone: "", power: "" }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const hasMountedRef = useRef(false);
  const { t } = React.useContext(LanguageContext);
  const { theme, isDark } = useTheme();

  // Create translated zones array
  const COMMON_ZONES = ZONE_KEYS.map((key) => t(key));

  // Initialize date input text
  React.useEffect(() => {
    setDateInputText(formatDateForInput(date));
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
    if (selectedDate && selectedDate <= new Date()) {
      setDate(selectedDate);
      setDateInputText(formatDateForInput(selectedDate));
    }
  };

  const handleDateInputChange = (text) => {
    setDateInputText(text);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(text)) {
      const newDate = new Date(text + "T00:00:00");
      if (!isNaN(newDate.getTime()) && newDate <= new Date()) {
        setDate(newDate);
      } else {
        Alert.alert(t("error"), t("enterValidPower"));
      }
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const addTreatment = () => {
    setTreatments((prev) => [...prev, { zone: "", power: "" }]);
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
    setTreatments(newTreatments);
  };

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

    const power = parseFloat(validTreatments[0].power);
    if (isNaN(power) || power < 0) {
      Alert.alert(t("error"), t("enterValidPower"));
      return;
    }

    setLoading(true);
    try {
      const treatmentsData = validTreatments.map((t) => ({
        zone: t.zone.trim(),
        power: parseFloat(t.power),
      }));

      await api.post("/appointments", {
        customerId: customer._id,
        date: date.toISOString(),
        treatments: treatmentsData,
        notes: notes.trim() || undefined,
      });

      Alert.alert(t("success"), t("appointmentAdded"), [
        {
          text: t("confirm"),
          onPress: () => {
            navigation.goBack();
          },
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
            {t("newAppointment")}
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
                      maximumDate={new Date()}
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
                <View style={styles.treatmentInputs}>
                  <View style={styles.zoneContainer}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
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
                      onChangeText={(value) =>
                        updateTreatment(index, "zone", value)
                      }
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>

                  <View style={styles.powerContainer}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("power")}
                    </Text>
                    <TextInput
                      style={[
                        styles.powerInput,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.inputBackground,
                          color: theme.textPrimary,
                        },
                      ]}
                      placeholder={t("powerPlaceholder")}
                      value={treatment.power}
                      onChangeText={(value) =>
                        updateTreatment(index, "power", value)
                      }
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
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
              {loading ? t("saving") : t("saveAppointment")}
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
  treatmentInputs: {
    flexDirection: "row",
  },
  zoneContainer: {
    flex: 2,
    marginRight: 10,
  },
  zoneScroll: {
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
  powerContainer: {
    flex: 1,
  },
  powerInput: {
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
  zoneContainer: {
    flex: 2,
    marginRight: 10,
  },
  zoneScroll: {
    maxHeight: 150, // Limit height to make it scrollable
    marginBottom: 10,
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
});
