import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import api from '../config/api';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const CELL_SIZE = Math.floor((SCREEN_W - H_PAD * 2) / 7);

const DAY_HEADERS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  bg: ['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'],
};

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildCalendarDays = (y, m) => {
  const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  const nextM = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;

  const pad = (n) => String(n).padStart(2, '0');
  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({ day: d, dateStr: `${prevY}-${pad(prevM + 1)}-${pad(d)}`, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, current: true });
  }
  const tail = 7 - (cells.length % 7);
  if (tail < 7) {
    for (let d = 1; d <= tail; d++) {
      cells.push({ day: d, dateStr: `${nextY}-${pad(nextM + 1)}-${pad(d)}`, current: false });
    }
  }
  return cells;
};

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t, language } = useContext(LanguageContext);

  const today = new Date();
  const todayStr = fmtDate(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [apptMap, setApptMap] = useState({});
  const [loading, setLoading] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await api.get('/appointments/range', { params: { from, to } });
      const map = {};
      res.data.forEach(appt => {
        const key = fmtDate(new Date(appt.date));
        if (!map[key]) map[key] = [];
        map[key].push(appt);
      });
      setApptMap(map);
    } catch (e) {
      console.error('Calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);
  useFocusEffect(useCallback(() => { fetchMonth(); }, [fetchMonth]));

  const goPrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const openPicker = async () => {
    setShowPicker(true);
    setCustomerSearch('');
    setLoadingCustomers(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (e) {
      console.error('Load customers error:', e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setShowPicker(false);
    navigation.navigate('AddAppointment', {
      customer,
      appointment: null,
      isEditing: false,
      prefillDate: selectedDate,
    });
  };

  const calDays = buildCalendarDays(year, month);
  const weeks = [];
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7));

  const monthLabel = new Date(year, month, 1).toLocaleString(
    language === 'bg' ? 'bg-BG' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const dayHeaders = DAY_HEADERS[language] || DAY_HEADERS.en;
  const selectedAppts = apptMap[selectedDate] || [];

  return (
    <LinearGradient colors={theme.gradientBackground} style={styles.container}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent" translucent />

      <View style={[styles.orb, styles.orbTL, { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBR, { backgroundColor: theme.orbPrimary }]} />

      {/* Header */}
      <LinearGradient colors={theme.gradientHeader}
        style={[styles.header, { borderBottomColor: theme.headerBorder, shadowColor: isDark ? '#7C3AED' : '#F59E0B' }]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('calendar')}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigation */}
        <View style={[styles.monthNav, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}>
          <TouchableOpacity onPress={goPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={goNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar card */}
        <View style={[styles.calCard, {
          backgroundColor: isDark ? 'rgba(21,27,43,0.97)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {dayHeaders.map(d => (
              <View key={d} style={[styles.cell, styles.headerCell]}>
                <Text style={[styles.headerCellText, { color: theme.textTertiary }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map(cell => {
                const count = apptMap[cell.dateStr]?.length || 0;
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;

                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    style={[
                      styles.cell,
                      isSelected && { backgroundColor: theme.primary, borderRadius: CELL_SIZE / 2 },
                    ]}
                    onPress={() => setSelectedDate(cell.dateStr)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.dayInner,
                      isToday && !isSelected && {
                        borderWidth: 1.5,
                        borderColor: theme.primary,
                        borderRadius: CELL_SIZE / 2,
                      },
                    ]}>
                      <Text style={[
                        styles.dayNum,
                        { color: cell.current ? theme.textPrimary : theme.textTertiary },
                        isSelected && { color: isDark ? '#111' : '#fff', fontWeight: '800' },
                        isToday && !isSelected && { color: theme.primary, fontWeight: '800' },
                      ]}>
                        {cell.day}
                      </Text>
                    </View>
                    {count > 0 && (
                      <View style={styles.dotsRow}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <View key={i} style={[
                            styles.dot,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.75)')
                                : theme.primary,
                            },
                          ]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected day */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <Text style={[styles.daySectionTitle, { color: theme.textPrimary }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                language === 'bg' ? 'bg-BG' : 'en-US',
                { weekday: 'long', day: 'numeric', month: 'long' }
              )}
            </Text>
            {selectedDate === todayStr && (
              <View style={[styles.todayBadge, { backgroundColor: theme.primary + '22' }]}>
                <Text style={[styles.todayBadgeText, { color: theme.primary }]}>{t('today')}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
          ) : selectedAppts.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-outline" size={38} color={theme.textTertiary} />
              <Text style={[styles.emptyDayText, { color: theme.textTertiary }]}>{t('noAppointmentsDay')}</Text>
            </View>
          ) : (
            selectedAppts.map(appt => (
              <TouchableOpacity
                key={appt._id}
                style={[styles.apptCard, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                  shadowColor: isDark ? '#7C3AED' : '#F59E0B',
                }]}
                onPress={() => navigation.navigate('CustomerProfile', { customer: appt.customerId })}
                activeOpacity={0.75}
              >
                <LinearGradient colors={theme.gradientPrimary} style={styles.apptAvatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.apptAvatarText, { color: isDark ? '#111' : '#fff' }]}>
                    {appt.customerId?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View style={styles.apptInfo}>
                  <Text style={[styles.apptName, { color: theme.textPrimary }]}>
                    {appt.customerId?.name || '—'}
                  </Text>
                  <Text style={[styles.apptZones, { color: theme.textTertiary }]} numberOfLines={1}>
                    {appt.treatments.map(tr => tr.zone).join(', ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { shadowColor: theme.primary }]}
        onPress={openPicker}
        activeOpacity={0.85}
      >
        <LinearGradient colors={theme.gradientPrimary} style={styles.fabGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="add" size={30} color={isDark ? '#111' : '#fff'} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Customer picker modal */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
        />
        <View style={[styles.pickerSheet, {
          backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : theme.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
        }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>{t('selectClient')}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.pickerSearch, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
            borderColor: theme.border,
          }]}>
            <Ionicons name="search-outline" size={18} color={theme.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.pickerSearchInput, { color: theme.textPrimary }]}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
          </View>

          {loadingCustomers ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={customers.filter(c =>
                c.name.toLowerCase().includes(customerSearch.toLowerCase())
              )}
              keyExtractor={item => item._id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleSelectCustomer(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.pickerAvatarText, { color: theme.primary }]}>
                      {item.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemName, { color: theme.textPrimary }]}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={[styles.pickerItemSub, { color: theme.textTertiary }]}>{item.phone}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTL: { width: 260, height: 260, top: -60, left: -80 },
  orbBR: { width: 200, height: 200, bottom: 60, right: -60 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 20 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  monthLabel: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  calCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  weekRow: { flexDirection: 'row' },
  headerCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  headerCellText: { fontSize: 11, fontWeight: '700' },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 4,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },

  daySection: { width: '100%' },
  daySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  daySectionTitle: { fontSize: 15, fontWeight: '700' },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  todayBadgeText: { fontSize: 12, fontWeight: '700' },

  emptyDay: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyDayText: { fontSize: 14, fontWeight: '500' },

  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
  },
  apptAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptAvatarText: { fontSize: 18, fontWeight: '800' },
  apptInfo: { flex: 1 },
  apptName: { fontSize: 15, fontWeight: '700' },
  apptZones: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 18, fontWeight: '800' },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  pickerSearchInput: { flex: 1, fontSize: 15 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  pickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAvatarText: { fontSize: 17, fontWeight: '800' },
  pickerItemName: { fontSize: 15, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});
