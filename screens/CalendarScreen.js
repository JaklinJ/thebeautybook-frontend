import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Modal,
  TextInput, FlatList, ActivityIndicator, Dimensions, Platform, Alert,
  KeyboardAvoidingView, LayoutAnimation, UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../config/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD     = 20;
const CELL_SIZE = Math.floor((SCREEN_W - H_PAD * 2) / 7);

const START_HOUR    = 9;
const END_HOUR      = 19;
const HOUR_HEIGHT   = 60;
const TIMELINE_LEFT = 52;
const TOTAL_TL_H    = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const DAY_HEADERS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  bg: ['Пон', 'Вт',  'Ср',  'Чет', 'Пет', 'Съб', 'Нед'],
};

const DEFAULT_ZONE_DURATION = {
  zoneFace: 20, zoneUpperLip: 10, zoneChin: 10, zoneNeck: 15, zoneThroat: 15,
  zoneChest: 30, zoneBack: 40, zoneAbdomen: 25, zoneLowerBack: 20, zoneGlutes: 20,
  zoneArms: 30, zoneHalfArms: 20, zoneArmpits: 15,
  zoneLegs: 40, zoneHalfLegs: 25, zoneIntimate: 30, zoneBikiniLine: 20, zoneOther: 30,
};

const ZONE_GROUPS = [
  { titleKey: 'groupFaceNeck',  zones: ['zoneFace', 'zoneUpperLip', 'zoneChin', 'zoneNeck', 'zoneThroat'] },
  { titleKey: 'groupTorso',     zones: ['zoneChest', 'zoneBack', 'zoneAbdomen', 'zoneLowerBack', 'zoneGlutes'] },
  { titleKey: 'groupArms',      zones: ['zoneArms', 'zoneHalfArms', 'zoneArmpits'] },
  { titleKey: 'groupLowerBody', zones: ['zoneLegs', 'zoneHalfLegs', 'zoneIntimate', 'zoneBikiniLine', 'zoneOther'] },
];

// 5-min slots 09:00 → 18:55
const TIME_SLOTS = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  for (let m = 0; m < 60; m += 5) TIME_SLOTS.push({ h, m });
}

const fmtDate = (d) => {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmt24h = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const buildCalendarDays = (y, m) => {
  const firstDow    = new Date(y, m, 1).getDay();
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  const nextM = m === 11 ? 0  : m + 1;
  const nextY = m === 11 ? y + 1 : y;
  const pad   = (n) => String(n).padStart(2, '0');
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

const defaultTime = () => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; };

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t, language }   = useContext(LanguageContext);
  const { formatPrice }   = useCurrency();

  const today    = new Date();
  const todayStr = fmtDate(today);

  // Calendar
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [scheduleMap, setScheduleMap] = useState({});
  const [loading, setLoading]         = useState(false);

  // Detail sheet (tap existing block)
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Customer picker
  const [showPicker, setShowPicker]             = useState(false);
  const [customers, setCustomers]               = useState([]);
  const [customerSearch, setCustomerSearch]     = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [priceList, setPriceList]               = useState({});
  const [zoneDurations, setZoneDurations]       = useState({});

  // Schedule modal
  const [showSchedule, setShowSchedule]         = useState(false);
  const [scheduleCustomer, setScheduleCustomer] = useState(null);
  const [selectedZones, setSelectedZones]       = useState([]);
  const [scheduleTime, setScheduleTime]         = useState(defaultTime);
  const [expandedHour, setExpandedHour]         = useState(null);
  const [saving, setSaving]                     = useState(false);
  const [editingEntryId, setEditingEntryId]     = useState(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(year, month, 1).toISOString();
      const to   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res  = await api.get('/schedule/range', { params: { from, to } });
      const map  = {};
      res.data.forEach(entry => {
        const key = fmtDate(new Date(entry.date));
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      });
      setScheduleMap(map);
    } catch (e) {
      console.error('Calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);
  useFocusEffect(useCallback(() => { fetchMonth(); }, [fetchMonth]));

  // ── Month nav ─────────────────────────────────────────────────────────────
  const goPrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  };

  // ── Customer picker ───────────────────────────────────────────────────────
  const openPicker = async (preTime) => {
    if (preTime) setScheduleTime(preTime);
    setShowPicker(true);
    setCustomerSearch('');
    setLoadingCustomers(true);
    try {
      const [cusRes, plRes, zdRes] = await Promise.all([
        api.get('/customers'),
        api.get('/pricelists'),
        api.get('/zonedurations'),
      ]);
      setCustomers(cusRes.data);
      setPriceList(plRes.data.prices || {});
      setZoneDurations(zdRes.data.durations || {});
    } catch (e) {
      console.error('Load customers error:', e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setShowPicker(false);
    setScheduleCustomer(customer);
    setSelectedZones([]);
    setExpandedHour(scheduleTime.getHours());
    setShowSchedule(true);
  };

  // ── Zone toggle ───────────────────────────────────────────────────────────
  const toggleZone = (zoneKey) =>
    setSelectedZones(prev => prev.includes(zoneKey) ? prev.filter(z => z !== zoneKey) : [...prev, zoneKey]);

  // ── Timeline tap ──────────────────────────────────────────────────────────
  const handleTimelineTap = (locationY) => {
    const totalMin = (locationY / HOUR_HEIGHT) * 60;
    const snapped  = Math.round(totalMin / 5) * 5;
    const clamped  = Math.max(0, Math.min(snapped, (END_HOUR - START_HOUR) * 60 - 5));
    const h = START_HOUR + Math.floor(clamped / 60);
    const m = clamped % 60;
    const preTime = new Date(); preTime.setHours(h, m, 0, 0);
    openPicker(preTime);
  };

  // ── Close schedule modal ─────────────────────────────────────────────────
  const closeScheduleModal = () => { setShowSchedule(false); setEditingEntryId(null); };

  // ── Save / update schedule entry ──────────────────────────────────────────
  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const [yr, mo, dy] = selectedDate.split('-').map(Number);
      const entryDate = new Date(yr, mo - 1, dy, scheduleTime.getHours(), scheduleTime.getMinutes(), 0);
      const totalDur  = selectedZones.reduce((s, k) => s + getDur(k), 0);
      const price = selectedZones.reduce((s, k) => s + (priceList[k] || 0), 0);
      const payload = {
        customerId: scheduleCustomer._id,
        date:       entryDate.toISOString(),
        zones:      selectedZones,
        duration:   totalDur || null,
        totalPrice: price > 0 ? price : null,
      };
      if (editingEntryId) {
        await api.put(`/schedule/${editingEntryId}`, payload);
      } else {
        await api.post('/schedule', payload);
      }
      closeScheduleModal();
      await fetchMonth();
    } catch (e) {
      Alert.alert(t('error'), e.response?.data?.message || t('failedToAddAppointment'));
    } finally {
      setSaving(false);
    }
  };

  // ── Open edit mode ────────────────────────────────────────────────────────
  const handleOpenEdit = async () => {
    const entry = selectedEntry;
    setSelectedEntry(null);
    setScheduleCustomer(entry.customerId);
    setSelectedZones(entry.zones || []);
    const entryTime = new Date(entry.date);
    setScheduleTime(entryTime);
    setExpandedHour(entryTime.getHours());
    setEditingEntryId(entry._id);
    if (!customers.length) {
      setLoadingCustomers(true);
      try {
        const [cusRes, plRes, zdRes] = await Promise.all([
          api.get('/customers'),
          api.get('/pricelists'),
          api.get('/zonedurations'),
        ]);
        setCustomers(cusRes.data);
        setPriceList(plRes.data.prices || {});
        setZoneDurations(zdRes.data.durations || {});
      } catch (e) {
        console.error('Load edit data error:', e);
      } finally {
        setLoadingCustomers(false);
      }
    }
    setShowSchedule(true);
  };

  // ── Delete schedule entry ─────────────────────────────────────────────────
  const handleDeleteEntry = async (entryId) => {
    try {
      await api.delete(`/schedule/${entryId}`);
      setSelectedEntry(null);
      await fetchMonth();
    } catch (e) {
      Alert.alert(t('error'), e.response?.data?.message || t('error'));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const calDays = buildCalendarDays(year, month);
  const weeks   = [];
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7));

  const monthLabel = new Date(year, month, 1).toLocaleString(
    language === 'bg' ? 'bg-BG' : 'en-US', { month: 'long', year: 'numeric' }
  );
  const dayHeaders     = DAY_HEADERS[language] || DAY_HEADERS.en;
  const selectedEntries = scheduleMap[selectedDate] || [];
  const getDur = (k) => zoneDurations[k] || DEFAULT_ZONE_DURATION[k] || 30;
  const totalDuration  = selectedZones.reduce((s, k) => s + getDur(k), 0);
  const totalPrice     = selectedZones.reduce((s, k) => s + (priceList[k] || 0), 0);

  const nowH = today.getHours(), nowM = today.getMinutes();
  const nowY = (selectedDate === todayStr && nowH >= START_HOUR && nowH < END_HOUR)
    ? ((nowH - START_HOUR) * 60 + nowM) / 60 * HOUR_HEIGHT : null;

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={theme.gradientBackground} style={styles.container}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.orb, styles.orbTL, { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBR, { backgroundColor: theme.orbPrimary }]} />

      {/* Header */}
      <LinearGradient colors={theme.gradientHeader}
        style={[styles.header, { borderBottomColor: theme.headerBorder, shadowColor: isDark ? '#7C3AED' : '#F59E0B' }]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('calendar')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Month nav */}
        <View style={[styles.monthNav, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}>
          <TouchableOpacity onPress={goPrev} hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={goNext} hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={[styles.calCard, {
          backgroundColor: isDark ? 'rgba(21,27,43,0.97)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}>
          <View style={styles.weekRow}>
            {dayHeaders.map(d => (
              <View key={d} style={[styles.cell, styles.headerCell]}>
                <Text style={[styles.headerCellText, { color: theme.textTertiary }]}>{d}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map(cell => {
                const count = scheduleMap[cell.dateStr]?.length || 0;
                const isSelected = cell.dateStr === selectedDate;
                const isToday    = cell.dateStr === todayStr;
                return (
                  <TouchableOpacity key={cell.dateStr}
                    style={[styles.cell, isSelected && { backgroundColor: theme.primary, borderRadius: CELL_SIZE / 2 }]}
                    onPress={() => setSelectedDate(cell.dateStr)} activeOpacity={0.7}>
                    <View style={[styles.dayInner, isToday && !isSelected && {
                      borderWidth: 1.5, borderColor: theme.primary, borderRadius: CELL_SIZE / 2,
                    }]}>
                      <Text style={[
                        styles.dayNum, { color: cell.current ? theme.textPrimary : theme.textTertiary },
                        isSelected && { color: isDark ? '#111' : '#fff', fontWeight: '800' },
                        isToday && !isSelected && { color: theme.primary, fontWeight: '800' },
                      ]}>{cell.day}</Text>
                    </View>
                    {count > 0 && (
                      <View style={styles.dotsRow}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <View key={i} style={[styles.dot, {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.75)')
                              : theme.primary,
                          }]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Day header */}
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

        {/* Timeline */}
        <View style={[styles.timelineCard, {
          backgroundColor: isDark ? 'rgba(21,27,43,0.97)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={{ height: TOTAL_TL_H }}>
              {/* Hour lines */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {hours.map((h, i) => (
                  <View key={h} style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}>
                    <Text style={[styles.hourLabel, { color: theme.textTertiary }]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                    <View style={[styles.hourLine, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }]} />
                  </View>
                ))}
              </View>

              {/* Tap-to-schedule overlay */}
              <TouchableOpacity
                activeOpacity={1}
                style={[StyleSheet.absoluteFill, { left: TIMELINE_LEFT }]}
                onPress={evt => handleTimelineTap(evt.nativeEvent.locationY)}
              />

              {/* Now line */}
              {nowY !== null && (
                <View pointerEvents="none" style={[styles.nowLine, { top: nowY, backgroundColor: theme.primary }]}>
                  <View style={[styles.nowDot, { backgroundColor: theme.primary }]} />
                </View>
              )}

              {/* Schedule entry blocks */}
              {selectedEntries.map(entry => {
                const ad = new Date(entry.date);
                const h  = ad.getHours(), m = ad.getMinutes();
                if (h < START_HOUR || h >= END_HOUR) return null;
                const top    = ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT;
                const blockH = Math.max(36, ((entry.duration || 60) / 60) * HOUR_HEIGHT - 3);
                const durStr = entry.duration
                  ? (entry.duration < 60
                      ? `${entry.duration} ${t('minShort')}`
                      : `${Math.floor(entry.duration / 60)}h${entry.duration % 60 ? ` ${entry.duration % 60}m` : ''}`)
                  : null;
                return (
                  <TouchableOpacity key={entry._id}
                    style={[styles.apptBlock, {
                      top, height: blockH, left: TIMELINE_LEFT + 4,
                      backgroundColor: theme.primary + '12',
                      borderLeftColor: theme.primary,
                      borderStyle: 'dashed',
                    }]}
                    onPress={() => setSelectedEntry(entry)}
                    activeOpacity={0.75}>
                    <Text style={[styles.apptBlockName, { color: theme.primary }]} numberOfLines={1}>
                      {entry.customerId?.name || '—'}
                    </Text>
                    {blockH > 42 && (
                      <Text style={[styles.apptBlockMeta, { color: theme.primary + 'BB' }]} numberOfLines={1}>
                        {fmt24h(ad)}{durStr ? `  ·  ${durStr}` : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Empty state */}
              {selectedEntries.length === 0 && !loading && (
                <View pointerEvents="none" style={styles.emptyTimeline}>
                  <Ionicons name="calendar-outline" size={32} color={theme.textTertiary} />
                  <Text style={[styles.emptyTimelineText, { color: theme.textTertiary }]}>
                    {t('noAppointmentsDay')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.timelineHint, { color: theme.textTertiary }]}>{t('tapSlotToAdd')}</Text>
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { shadowColor: theme.primary }]}
        onPress={() => openPicker()} activeOpacity={0.85}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.fabGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="add" size={30} color={isDark ? '#111' : '#fff'} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Detail sheet (tap existing block) ───────────────────────────── */}
      <Modal visible={!!selectedEntry} animationType="slide" transparent
        onRequestClose={() => setSelectedEntry(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setSelectedEntry(null)}
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
          {selectedEntry && (
            <View style={[styles.detailSheet, {
              backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : theme.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
            }]}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
              <View style={styles.detailClientRow}>
                <LinearGradient colors={theme.gradientPrimary} style={styles.detailAvatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.detailAvatarText, { color: isDark ? '#111' : '#fff' }]}>
                    {selectedEntry.customerId?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailName, { color: theme.textPrimary }]}>
                    {selectedEntry.customerId?.name || '—'}
                  </Text>
                  {selectedEntry.customerId?.phone
                    ? <Text style={[styles.detailPhone, { color: theme.textTertiary }]}>{selectedEntry.customerId.phone}</Text>
                    : null}
                </View>
                <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.detailInfoCard, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.inputBackground,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
              }]}>
                <View style={styles.detailInfoRow}>
                  <Ionicons name="time-outline" size={16} color={theme.primary} />
                  <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>
                    {fmt24h(new Date(selectedEntry.date))}
                    {selectedEntry.duration
                      ? `  ·  ${selectedEntry.duration < 60
                          ? `${selectedEntry.duration} ${t('minShort')}`
                          : `${Math.floor(selectedEntry.duration / 60)}h${selectedEntry.duration % 60 ? ` ${selectedEntry.duration % 60}m` : ''}`}`
                      : ''}
                  </Text>
                </View>
                {selectedEntry.zones?.length > 0 && (
                  <View style={[styles.detailInfoRow, {
                    borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : theme.border,
                  }]}>
                    <Ionicons name="body-outline" size={16} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary, flex: 1 }]}>
                      {selectedEntry.zones.map(z => t(z)).join(', ')}
                    </Text>
                  </View>
                )}
                {selectedEntry.totalPrice > 0 && (
                  <View style={[styles.detailInfoRow, {
                    borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : theme.border,
                  }]}>
                    <Ionicons name="cash-outline" size={16} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>
                      {formatPrice(selectedEntry.totalPrice)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.detailActions}>
                {selectedEntry.customerId && (
                  <TouchableOpacity
                    style={[styles.profileBtn, { flex: 1, shadowColor: theme.primary }]}
                    onPress={() => {
                      setSelectedEntry(null);
                      navigation.navigate('CustomerProfile', { customer: selectedEntry.customerId });
                    }}
                    activeOpacity={0.85}>
                    <LinearGradient colors={theme.gradientPrimary} style={styles.profileBtnGradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.profileBtnText, { color: isDark ? '#111' : '#fff' }]}>{t('viewProfile')}</Text>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? '#111' : '#fff'} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: theme.primary }]}
                  onPress={handleOpenEdit}
                  activeOpacity={0.75}>
                  <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
                  onPress={() => {
                    Alert.alert(
                      t('deleteEntry') || 'Delete Entry',
                      t('deleteEntryConfirm') || 'Remove this entry from the schedule?',
                      [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('delete'), style: 'destructive', onPress: () => handleDeleteEntry(selectedEntry._id) },
                      ]
                    );
                  }}
                  activeOpacity={0.75}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <View style={{ height: Platform.OS === 'ios' ? 20 : 4 }} />
            </View>
          )}
        </View>
      </Modal>

      {/* ── Customer picker ──────────────────────────────────────────────── */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowPicker(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavWrapper} pointerEvents="box-none">
          <View style={[styles.sheet, {
            backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : theme.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
          }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{t('selectClient')}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={26} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchRow, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
              borderColor: theme.border,
            }]}>
              <Ionicons name="search-outline" size={18} color={theme.textTertiary} style={{ marginRight: 8 }} />
              <TextInput style={[styles.searchInput, { color: theme.textPrimary }]}
                value={customerSearch} onChangeText={setCustomerSearch}
                placeholder={t('searchPlaceholder')} placeholderTextColor={theme.textTertiary} />
            </View>
            {loadingCustomers ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))}
                keyExtractor={item => item._id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleSelectCustomer(item)} activeOpacity={0.7}>
                    <View style={[styles.pickerAvatar, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.pickerAvatarText, { color: theme.primary }]}>
                        {item.name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, { color: theme.textPrimary }]}>{item.name}</Text>
                      {item.phone ? <Text style={[styles.pickerItemSub, { color: theme.textTertiary }]}>{item.phone}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Schedule modal ───────────────────────────────────────────────── */}
      <Modal visible={showSchedule} animationType="slide" transparent onRequestClose={closeScheduleModal}>
        <TouchableOpacity activeOpacity={1} onPress={closeScheduleModal}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <View style={[styles.scheduleSheet, {
          backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : theme.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
        }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                {editingEntryId ? t('editEntry') : t('scheduleFor')}
              </Text>
              <Text style={[styles.scheduleCustomerName, { color: theme.primary }]}>{scheduleCustomer?.name}</Text>
            </View>
            <TouchableOpacity onPress={closeScheduleModal}>
              <Ionicons name="close" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Zones */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('selectZones')}</Text>
            {ZONE_GROUPS.map(group => (
              <View key={group.titleKey} style={styles.zoneGroup}>
                <Text style={[styles.groupLabel, { color: theme.textTertiary }]}>{t(group.titleKey)}</Text>
                {group.zones.map(zoneKey => {
                  const dur = getDur(zoneKey);
                  const price = priceList[zoneKey];
                  const label = t(zoneKey);
                  const selected = selectedZones.includes(zoneKey);
                  return (
                    <TouchableOpacity key={zoneKey} onPress={() => toggleZone(zoneKey)}
                      style={[styles.zoneRow, {
                        backgroundColor: selected ? (isDark ? theme.primary + '18' : theme.primary + '0E') : 'transparent',
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : theme.border,
                      }]} activeOpacity={0.7}>
                      <View style={[styles.zoneCheckbox, {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.primary : 'transparent',
                      }]}>
                        {selected && <Ionicons name="checkmark" size={12} color={isDark ? '#111' : '#fff'} />}
                      </View>
                      <Text style={[styles.zoneRowName, { color: selected ? theme.primary : theme.textPrimary }]} numberOfLines={1}>
                        {label}
                      </Text>
                      <View style={styles.zoneRowRight}>
                        <Text style={[styles.zoneMetaDur, { color: theme.textTertiary }]}>{dur} {t('minShort')}</Text>
                        {!!price && <Text style={[styles.zoneMetaPrice, { color: theme.textSecondary }]}>{formatPrice(price)}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Time — expandable by hour */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('appointmentTime')}</Text>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(hour => {
              const isOpen = expandedHour === hour;
              const hourSlots = TIME_SLOTS.filter(s => s.h === hour);
              const hasSelectedInHour = scheduleTime.getHours() === hour;
              const availableSlots = hourSlots.filter(({ h, m }) => {
                const slotStart = h * 60 + m;
                const slotEnd   = slotStart + (totalDuration || 5);
                return !selectedEntries.filter(e => e._id !== editingEntryId).some(entry => {
                  const ad = new Date(entry.date);
                  const entryStart = ad.getHours() * 60 + ad.getMinutes();
                  return slotStart < entryStart + (entry.duration || 60) && slotEnd > entryStart;
                });
              });
              if (availableSlots.length === 0) return null;
              return (
                <View key={hour} style={[styles.hourGroup, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isOpen ? theme.primary + '55' : (isDark ? 'rgba(255,255,255,0.08)' : theme.border),
                }]}>
                  <TouchableOpacity style={styles.hourGroupHeader}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedHour(prev => prev === hour ? null : hour);
                    }} activeOpacity={0.7}>
                    <Text style={[styles.hourGroupLabel, { color: isOpen ? theme.primary : theme.textPrimary }]}>
                      {String(hour).padStart(2, '0')}:00
                    </Text>
                    {!isOpen && hasSelectedInHour && (
                      <View style={[styles.selectedBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '40' }]}>
                        <Text style={[styles.selectedBadgeText, { color: theme.primary }]}>{fmt24h(scheduleTime)}</Text>
                      </View>
                    )}
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16}
                      color={isOpen ? theme.primary : theme.textTertiary} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.slotsWrap}>
                      {availableSlots.map(({ h, m }) => {
                        const label      = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        const isSelected = scheduleTime.getHours() === h && scheduleTime.getMinutes() === m;
                        return (
                          <TouchableOpacity key={label}
                            onPress={() => { const u = new Date(scheduleTime); u.setHours(h, m, 0, 0); setScheduleTime(u); }}
                            style={[styles.slotChip, {
                              backgroundColor: isSelected ? theme.primary : (isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground),
                              borderColor: isSelected ? theme.primary : theme.border,
                            }]} activeOpacity={0.75}>
                            <Text style={[styles.slotChipText, {
                              color: isSelected ? (isDark ? '#111' : '#fff') : theme.textSecondary,
                            }]}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Live summary */}
            {selectedZones.length > 0 && (
              <View style={[styles.summaryBar, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '30' }]}>
                <Ionicons name="time-outline" size={16} color={theme.primary} />
                <Text style={[styles.summaryText, { color: theme.primary }]}>{'  '}{totalDuration} {t('minShort')}</Text>
                {totalPrice > 0 && (
                  <>
                    <Text style={[styles.summaryText, { color: theme.primary }]}>{'  ·  '}</Text>
                    <Ionicons name="cash-outline" size={16} color={theme.primary} />
                    <Text style={[styles.summaryText, { color: theme.primary }]}>{'  '}{formatPrice(totalPrice)}</Text>
                  </>
                )}
              </View>
            )}

            {/* Save */}
            <TouchableOpacity style={[styles.saveBtn, { shadowColor: theme.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSaveSchedule} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradientPrimary} style={styles.saveBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {saving
                  ? <ActivityIndicator size="small" color={isDark ? '#111' : '#fff'} />
                  : <Text style={[styles.saveBtnText, { color: isDark ? '#111' : '#fff' }]}>{t('saveEntry')}</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 20 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
  },
  monthLabel: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  calCard: {
    borderRadius: 20, borderWidth: 1, paddingVertical: 8, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  weekRow: { flexDirection: 'row' },
  headerCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  headerCellText: { fontSize: 11, fontWeight: '700' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: CELL_SIZE - 6, height: CELL_SIZE - 6, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  daySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  daySectionTitle: { fontSize: 15, fontWeight: '700' },
  todayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  todayBadgeText: { fontSize: 12, fontWeight: '700' },
  timelineCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', height: HOUR_HEIGHT },
  hourLabel: { width: TIMELINE_LEFT, fontSize: 11, fontWeight: '600', textAlign: 'right', paddingRight: 10, paddingTop: 2 },
  hourLine: { flex: 1, height: 1, marginTop: 7 },
  nowLine: { position: 'absolute', left: TIMELINE_LEFT, right: 0, height: 1.5 },
  nowDot: { position: 'absolute', left: -4, top: -3, width: 7, height: 7, borderRadius: 3.5 },
  apptBlock: { position: 'absolute', right: 4, borderRadius: 8, borderLeftWidth: 3, paddingHorizontal: 8, paddingVertical: 4 },
  apptBlockName: { fontSize: 12, fontWeight: '700' },
  apptBlockMeta: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  emptyTimeline: { position: 'absolute', top: 0, bottom: 0, left: TIMELINE_LEFT, right: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTimelineText: { fontSize: 13, fontWeight: '500' },
  timelineHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 6, marginBottom: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, borderRadius: 28, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  kavWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, maxHeight: '75%' },
  scheduleSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, maxHeight: '92%' },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  scheduleCustomerName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  pickerAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { fontSize: 17, fontWeight: '800' },
  pickerItemName: { fontSize: 15, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 10 },
  zoneGroup: { marginBottom: 6 },
  groupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2, marginTop: 8 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1, borderRadius: 6 },
  zoneCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  zoneRowName: { flex: 1, fontSize: 14, fontWeight: '600' },
  zoneRowRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  zoneMetaDur: { fontSize: 12, fontWeight: '500' },
  zoneMetaPrice: { fontSize: 12, fontWeight: '700' },
  hourGroup: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  hourGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  hourGroupLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  selectedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  selectedBadgeText: { fontSize: 12, fontWeight: '700' },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  slotChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  slotChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  summaryBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  summaryText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { marginTop: 20, borderRadius: 16, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5 },
  saveBtnGradient: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },
  detailSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  detailClientRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  detailAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { fontSize: 20, fontWeight: '800' },
  detailName: { fontSize: 17, fontWeight: '800' },
  detailPhone: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  detailInfoCard: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  detailInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  detailInfoLabel: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  detailActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  profileBtn: { borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  profileBtnGradient: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  profileBtnText: { fontSize: 16, fontWeight: '800' },
  deleteBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
