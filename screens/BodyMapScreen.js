import React, { useState, useMemo, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import api from '../config/api';

const SESSIONS_GOAL = 6;

// ── Zone definitions ─────────────────────────────────────────────────────────
const ZONE_CONFIG = [
  {
    id: 'face', label: 'Face', zoneKey: 'zoneFace', front: true,
    shapes: [{ type: 'circle', cx: 100, cy: 30, r: 24 }],
    keywords: ['face', 'лице', 'upper lip', 'горна устна', 'chin', 'брада', 'forehead', 'cheek', 'eyebrow', 'facial'],
  },
  {
    id: 'neck', label: 'Neck', zoneKey: 'zoneNeck', front: true,
    shapes: [{ type: 'rect', x: 88, y: 55, width: 24, height: 16, rx: 7 }],
    keywords: ['neck', 'врат', 'throat', 'шия'],
  },
  {
    id: 'armpits', label: 'Armpits', zoneKey: 'zoneArmpits', front: true,
    shapes: [
      { type: 'circle', cx: 61, cy: 85, r: 8 },
      { type: 'circle', cx: 139, cy: 85, r: 8 },
    ],
    keywords: ['armpit', 'armpits', 'подмишниц', 'underarm'],
  },
  {
    id: 'arms', label: 'Arms', zoneKey: 'zoneArms', front: true, back: true,
    shapes: [
      { type: 'rect', x: 36, y: 80, width: 23, height: 62, rx: 11 },
      { type: 'rect', x: 141, y: 80, width: 23, height: 62, rx: 11 },
    ],
    keywords: ['arms', 'ръце', 'arm', 'upper arm', 'whole arm', 'full arm'],
  },
  {
    id: 'half_arms', label: 'Half Arms', zoneKey: 'zoneHalfArms', front: true, back: true,
    shapes: [
      { type: 'rect', x: 36, y: 144, width: 23, height: 64, rx: 11 },
      { type: 'rect', x: 141, y: 144, width: 23, height: 64, rx: 11 },
    ],
    keywords: ['half arms', 'половин ръце', 'forearm', 'lower arm', 'half arm'],
  },
  {
    id: 'chest', label: 'Chest', zoneKey: 'zoneChest', front: true,
    shapes: [{ type: 'rect', x: 67, y: 73, width: 66, height: 52, rx: 12 }],
    keywords: ['chest', 'гърди', 'breast', 'decolletage'],
  },
  {
    id: 'abdomen', label: 'Abdomen', zoneKey: 'zoneAbdomen', front: true,
    shapes: [{ type: 'rect', x: 69, y: 127, width: 62, height: 46, rx: 12 }],
    keywords: ['abdomen', 'корем', 'stomach', 'belly', 'abs'],
  },
  {
    id: 'bikini', label: 'Bikini / Intimate', zoneKey: 'zoneIntimate', front: true,
    shapes: [{ type: 'rect', x: 81, y: 175, width: 38, height: 22, rx: 11 }],
    keywords: ['intimat', 'интим', 'bikini', 'бикини', 'brazilian', 'pubic'],
  },
  {
    id: 'legs', label: 'Legs', zoneKey: 'zoneLegs', front: true, back: true,
    shapes: [
      { type: 'rect', x: 73, y: 199, width: 25, height: 80, rx: 12 },
      { type: 'rect', x: 102, y: 199, width: 25, height: 80, rx: 12 },
    ],
    keywords: ['legs', 'крака', 'leg', 'thigh', 'whole leg', 'full leg'],
  },
  {
    id: 'half_legs', label: 'Half Legs', zoneKey: 'zoneHalfLegs', front: true, back: true,
    shapes: [
      { type: 'rect', x: 73, y: 283, width: 24, height: 168, rx: 12 },
      { type: 'rect', x: 103, y: 283, width: 24, height: 168, rx: 12 },
    ],
    keywords: ['half legs', 'половин крака', 'half leg', 'calf', 'calves', 'shin', 'lower leg'],
  },
  {
    id: 'back', label: 'Back', zoneKey: 'zoneBack', back: true,
    shapes: [{ type: 'rect', x: 67, y: 73, width: 66, height: 54, rx: 12 }],
    keywords: ['back', 'гръб', 'upper back'],
  },
  {
    id: 'lower_back', label: 'Lower Back', zoneKey: 'zoneLowerBack', back: true,
    shapes: [{ type: 'rect', x: 69, y: 129, width: 62, height: 44, rx: 12 }],
    keywords: ['lower back', 'кръст', 'lumbar'],
  },
  {
    id: 'glutes', label: 'Glutes', zoneKey: 'zoneGlutes', back: true,
    shapes: [{ type: 'rect', x: 73, y: 175, width: 54, height: 22, rx: 11 }],
    keywords: ['glute', 'седалищ', 'дупе', 'buttock', 'butt'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const matchZoneId = (zoneName) => {
  const lower = zoneName.toLowerCase().trim();
  for (const z of ZONE_CONFIG) {
    if (z.keywords.includes(lower)) return z.id;
  }
  for (const z of ZONE_CONFIG) {
    if (z.keywords.some(kw => lower.includes(kw))) return z.id;
  }
  return null;
};

const aggregateForZone = (zoneId, zoneProgress) => {
  if (!zoneProgress?.length) return null;
  const matches = zoneProgress.filter(zp => matchZoneId(zp.zone) === zoneId);
  if (!matches.length) return null;

  const totalVisits = matches.reduce((s, m) => s + m.totalVisits, 0);
  const allTreatments = matches
    .flatMap(m => m.treatments || [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastPower = matches[matches.length - 1]?.lastPower ?? 0;
  const avgPower = allTreatments.length
    ? allTreatments.reduce((s, t) => s + t.power, 0) / allTreatments.length : 0;
  const maxPower = Math.max(...matches.map(m => m.maxPower), 0);
  const rawMin = Math.min(...matches.filter(m => m.minPower > 0).map(m => m.minPower));
  const minPower = isFinite(rawMin) ? rawMin : 0;
  const zoneNames = [...new Set(matches.map(m => m.zone))];

  return {
    totalVisits, lastPower,
    avgPower: parseFloat(avgPower.toFixed(1)),
    maxPower, minPower, zoneNames,
    treatments: allTreatments,
  };
};

const formatDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BodyMapScreen({ route, navigation }) {
  const { customer, progress: initialProgress } = route.params;
  const { theme, isDark } = useTheme();
  const { t } = useContext(LanguageContext);

  const [localProgress, setLocalProgress] = useState(initialProgress);
  const [isFront, setIsFront] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // ── Add-treatment modal state ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [dateText, setDateText] = useState(formatDateInput(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newZone, setNewZone] = useState('');
  const [newPower, setNewPower] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reloadProgress = async () => {
    try {
      const res = await api.get(`/appointments/customer/${customer._id}/progress`);
      setLocalProgress(res.data);
    } catch (e) {
      console.error('Reload progress error:', e);
    }
  };

  const openAddModal = () => {
    const zone = selectedId ? ZONE_CONFIG.find(z => z.id === selectedId) : null;
    const data = selectedId ? zoneDataMap[selectedId] : null;
    setNewZone(zone ? t(zone.zoneKey) : '');
    setNewPower(data?.lastPower ? String(data.lastPower) : '');
    setNewDate(new Date());
    setDateText(formatDateInput(new Date()));
    setNewNotes('');
    setShowAddModal(true);
  };

  const handleDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected && selected <= new Date()) {
      setNewDate(selected);
      setDateText(formatDateInput(selected));
    }
  };

  const handleDateTextChange = (text) => {
    setDateText(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const d = new Date(text + 'T00:00:00');
      if (!isNaN(d.getTime()) && d <= new Date()) setNewDate(d);
    }
  };

  const handleSaveTreatment = async () => {
    const power = parseFloat(newPower);
    if (!newZone.trim()) {
      Alert.alert(t('error'), t('enterZoneForAll'));
      return;
    }
    if (!newPower || isNaN(power) || power <= 0) {
      Alert.alert(t('error'), t('enterValidPower'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/appointments', {
        customerId: customer._id,
        date: newDate.toISOString(),
        treatments: [{ zone: newZone.trim(), power }],
        notes: newNotes.trim() || undefined,
      });
      setShowAddModal(false);
      await reloadProgress();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || t('failedToAddAppointment'));
    } finally {
      setSaving(false);
    }
  };

  // ── Zone data ──
  const zoneDataMap = useMemo(() => {
    const map = {};
    ZONE_CONFIG.forEach(z => {
      map[z.id] = aggregateForZone(z.id, localProgress?.zoneProgress);
    });
    return map;
  }, [localProgress]);

  const treatedZones = useMemo(
    () => ZONE_CONFIG.filter(z => zoneDataMap[z.id] !== null),
    [zoneDataMap]
  );

  const activeZones = ZONE_CONFIG.filter(z => isFront ? z.front : z.back);
  const selectedZone = selectedId ? ZONE_CONFIG.find(z => z.id === selectedId) : null;
  const selectedData = selectedId ? zoneDataMap[selectedId] : null;

  const getFill = (zoneId) => {
    const data = zoneDataMap[zoneId];
    if (zoneId === selectedId) return isDark ? 'rgba(129,140,248,0.80)' : 'rgba(99,102,241,0.70)';
    if (!data) return isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const pct = Math.min(data.totalVisits / SESSIONS_GOAL, 1);
    const opacity = 0.22 + pct * 0.63;
    const rgb = isDark ? '252,211,77' : '245,158,11';
    return `rgba(${rgb},${opacity.toFixed(2)})`;
  };

  const getStroke = (zoneId) => {
    const data = zoneDataMap[zoneId];
    if (zoneId === selectedId) return isDark ? '#818CF8' : '#6366F1';
    if (!data) return isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.11)';
    return isDark ? 'rgba(252,211,77,0.55)' : 'rgba(245,158,11,0.55)';
  };

  const renderShape = (shape, zoneId, si) => {
    const fill = getFill(zoneId);
    const stroke = getStroke(zoneId);
    const sw = zoneId === selectedId ? 2 : 1;
    const key = `${zoneId}-${si}`;
    const onPress = () => setSelectedId(prev => prev === zoneId ? null : zoneId);
    if (shape.type === 'circle') {
      return <Circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r}
        fill={fill} stroke={stroke} strokeWidth={sw} onPress={onPress} />;
    }
    return <Rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height}
      rx={shape.rx} ry={shape.rx}
      fill={fill} stroke={stroke} strokeWidth={sw} onPress={onPress} />;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const silBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const silStroke = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={[styles.headerIconBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('bodyMap')}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{customer.name}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Front / Back toggle */}
        <View style={[styles.toggle, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          borderColor: theme.border,
        }]}>
          {[true, false].map(front => (
            <TouchableOpacity key={String(front)}
              style={[styles.toggleBtn, (isFront === front) && { backgroundColor: theme.primary }]}
              onPress={() => { setIsFront(front); setSelectedId(null); }}>
              <Text style={[styles.toggleText, {
                color: (isFront === front) ? (isDark ? '#111' : '#fff') : theme.textSecondary,
              }]}>
                {front ? t('frontView') : t('backView')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem color={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'} label={t('untreated')} theme={theme} />
          <LegendItem color={isDark ? 'rgba(252,211,77,0.35)' : 'rgba(245,158,11,0.35)'} label="1–2" theme={theme} />
          <LegendItem color={isDark ? 'rgba(252,211,77,0.60)' : 'rgba(245,158,11,0.60)'} label="3–5" theme={theme} />
          <LegendItem color={isDark ? 'rgba(252,211,77,0.85)' : 'rgba(245,158,11,0.85)'} label={t('completedSessions')} theme={theme} />
        </View>

        {/* Body SVG */}
        <View style={styles.mapWrapper}>
          <Svg width={190} height={460} viewBox="0 0 200 465">
            <G>
              <Circle cx="100" cy="30" r="26" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="87" y="56" width="26" height="19" rx="9" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="35" y="78" width="27" height="131" rx="13" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="138" y="78" width="27" height="131" rx="13" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="63" y="72" width="74" height="130" rx="15" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="72" y="198" width="27" height="256" rx="13" fill={silBg} stroke={silStroke} strokeWidth="1" />
              <Rect x="101" y="198" width="27" height="256" rx="13" fill={silBg} stroke={silStroke} strokeWidth="1" />
            </G>
            {activeZones.map(zone =>
              zone.shapes.map((shape, si) => renderShape(shape, zone.id, si))
            )}
          </Svg>
        </View>

        {!selectedId && (
          <Text style={[styles.hint, { color: theme.textTertiary }]}>{t('tapZoneHint')}</Text>
        )}

        {/* Zone detail panel */}
        {selectedZone && (
          <View style={[styles.detailCard, {
            backgroundColor: isDark ? 'rgba(21,27,43,0.97)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
          }]}>
            <View style={styles.detailHeaderRow}>
              <View>
                <Text style={[styles.detailZoneName, { color: theme.textPrimary }]}>
                  {t(selectedZone.zoneKey)}
                </Text>
                {selectedData?.zoneNames?.length > 0 && (
                  <Text style={[styles.detailZoneSub, { color: theme.textTertiary }]}>
                    {selectedData.zoneNames.join(' · ')}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedId(null)}>
                <Ionicons name="close-circle" size={26} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>

            {selectedData ? (
              <>
                {/* Progress bar */}
                <View style={styles.progressBlock}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      {t('sessions')}: {selectedData.totalVisits} / {SESSIONS_GOAL}
                    </Text>
                    <Text style={[styles.progressRemaining, { color: theme.primary }]}>
                      {Math.max(0, SESSIONS_GOAL - selectedData.totalVisits)} {t('remaining')}
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                  }]}>
                    <LinearGradient colors={theme.gradientPrimary}
                      style={[styles.progressFill, {
                        width: `${Math.min((selectedData.totalVisits / SESSIONS_GOAL) * 100, 100)}%`,
                      }]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  </View>
                </View>

                {/* Stat chips */}
                <View style={styles.statsRow}>
                  <StatChip label={t('lastPower')} value={`${selectedData.lastPower}J`} theme={theme} isDark={isDark} highlight />
                  <StatChip label={t('avgPower')} value={`${selectedData.avgPower}J`} theme={theme} isDark={isDark} />
                  <StatChip label={t('maxPower')} value={`${selectedData.maxPower}J`} theme={theme} isDark={isDark} />
                </View>

                {/* Session history */}
                <Text style={[styles.historyTitle, { color: theme.textTertiary }]}>{t('sessionHistory')}</Text>
                {selectedData.treatments.slice(0, 10).map((tr, i) => (
                  <View key={i} style={[styles.historyRow, {
                    borderBottomColor: theme.divider,
                    backgroundColor: i % 2 === 0 ? 'transparent'
                      : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  }]}>
                    <View style={[styles.historyDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.historyDate, { color: theme.textSecondary }]}>{formatDate(tr.date)}</Text>
                    <View style={[styles.powerBadge, { backgroundColor: theme.primary + '22' }]}>
                      <Text style={[styles.powerBadgeText, { color: theme.primary }]}>{tr.power}J</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="leaf-outline" size={34} color={theme.textTertiary} />
                <Text style={[styles.noDataText, { color: theme.textTertiary }]}>{t('noTreatmentsZone')}</Text>
              </View>
            )}

            {/* Log Treatment button */}
            <TouchableOpacity
              style={[styles.logBtn, { shadowColor: theme.primary }]}
              onPress={openAddModal}
              activeOpacity={0.85}
            >
              <LinearGradient colors={theme.gradientPrimary} style={styles.logBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add-circle-outline" size={20} color={isDark ? '#111' : '#fff'} />
                <Text style={[styles.logBtnText, { color: isDark ? '#111' : '#fff' }]}>
                  {t('logTreatment')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Treated zones overview */}
        {!selectedId && treatedZones.length > 0 && (
          <View style={styles.overviewSection}>
            <Text style={[styles.overviewTitle, { color: theme.textTertiary }]}>{t('allZones')}</Text>
            {treatedZones.map(zone => {
              const d = zoneDataMap[zone.id];
              const pct = Math.min((d.totalVisits / SESSIONS_GOAL) * 100, 100);
              return (
                <TouchableOpacity key={zone.id}
                  style={[styles.overviewCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                    shadowColor: isDark ? '#7C3AED' : '#F59E0B',
                  }]}
                  onPress={() => { setSelectedId(zone.id); setIsFront(zone.front !== false); }}
                  activeOpacity={0.7}>
                  <View style={styles.overviewLeft}>
                    <Text style={[styles.overviewZoneName, { color: theme.textPrimary }]}>{t(zone.zoneKey)}</Text>
                    <View style={[styles.miniTrack, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                    }]}>
                      <LinearGradient colors={theme.gradientPrimary}
                        style={[styles.miniFill, { width: `${pct}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    </View>
                  </View>
                  <View style={styles.overviewRight}>
                    <Text style={[styles.overviewCount, { color: theme.primary }]}>{d.totalVisits}</Text>
                    <Text style={[styles.overviewCountLabel, { color: theme.textTertiary }]}>{t('visits')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!selectedId && treatedZones.length === 0 && (
          <View style={styles.emptyZones}>
            <Ionicons name="body-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyZonesText, { color: theme.textTertiary }]}>{t('noProgressData')}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Log Treatment Modal ─────────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSlide}
          pointerEvents="box-none"
        >
          <View style={[styles.modalCard, {
            backgroundColor: isDark ? 'rgba(21,27,43,0.99)' : theme.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.border,
          }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <LinearGradient colors={theme.gradientPrimary} style={styles.modalIconBadge}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="add-circle-outline" size={18} color={isDark ? '#111' : '#fff'} />
                </LinearGradient>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('logTreatment')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={26} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Zone field */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('zone')}</Text>
              <View style={[styles.fieldInput, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
                borderColor: theme.border,
              }]}>
                <Ionicons name="body-outline" size={18} color={theme.textTertiary} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.fieldTextInput, { color: theme.textPrimary }]}
                  value={newZone}
                  onChangeText={setNewZone}
                  placeholder={t('zone')}
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              {/* Date field */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('date')}</Text>
              <TouchableOpacity
                style={[styles.fieldInput, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
                  borderColor: theme.border,
                }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.primary} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.fieldTextInput, { color: theme.textPrimary }]}
                  value={dateText}
                  onChangeText={handleDateTextChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                  onFocus={() => setShowDatePicker(true)}
                />
                <Ionicons name="calendar" size={18} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.dateDisplay, { color: theme.textTertiary }]}>
                {newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>

              {/* iOS date picker modal */}
              {Platform.OS === 'ios' && showDatePicker && (
                <Modal transparent animationType="slide" visible={showDatePicker}
                  onRequestClose={() => setShowDatePicker(false)}>
                  <View style={[styles.datePickerOverlay, { backgroundColor: theme.overlay }]}>
                    <View style={[styles.datePickerSheet, { backgroundColor: theme.surface }]}>
                      <View style={[styles.datePickerHeader, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={[styles.datePickerBtn, { color: theme.textSecondary }]}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.datePickerTitle, { color: theme.textPrimary }]}>{t('date')}</Text>
                        <TouchableOpacity onPress={() => { setDateText(formatDateInput(newDate)); setShowDatePicker(false); }}>
                          <Text style={[styles.datePickerBtn, { color: theme.primary, fontWeight: '700' }]}>{t('confirm')}</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker value={newDate} mode="date" display="inline"
                        onChange={handleDateChange} maximumDate={new Date()} />
                    </View>
                  </View>
                </Modal>
              )}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker value={newDate} mode="date" display="default"
                  onChange={handleDateChange} maximumDate={new Date()} />
              )}

              {/* Power field */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('power')} (J)</Text>
              <View style={[styles.fieldInput, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
                borderColor: theme.border,
              }]}>
                <Ionicons name="flash-outline" size={18} color={theme.textTertiary} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.fieldTextInput, { color: theme.textPrimary }]}
                  value={newPower}
                  onChangeText={setNewPower}
                  placeholder={t('powerPlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Notes field */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('notesOptional')}</Text>
              <View style={[styles.fieldInput, styles.notesField, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.inputBackground,
                borderColor: theme.border,
              }]}>
                <TextInput
                  style={[styles.fieldTextInput, { color: theme.textPrimary }]}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  placeholder={t('notesPlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { shadowColor: theme.primary }, saving && { opacity: 0.6 }]}
                onPress={handleSaveTreatment}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={theme.gradientPrimary} style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {saving
                    ? <ActivityIndicator size="small" color={isDark ? '#111' : '#fff'} />
                    : <Text style={[styles.saveBtnText, { color: isDark ? '#111' : '#fff' }]}>
                        {t('saveAppointment')}
                      </Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function LegendItem({ color, label, theme }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.textTertiary }]}>{label}</Text>
    </View>
  );
}

function StatChip({ label, value, theme, isDark, highlight }) {
  return (
    <View style={[styles.statChip, {
      backgroundColor: highlight
        ? (isDark ? 'rgba(252,211,77,0.14)' : 'rgba(245,158,11,0.10)')
        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
      borderColor: highlight ? theme.primary + '45' : 'transparent',
    }]}>
      <Text style={[styles.statChipValue, { color: highlight ? theme.primary : theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statChipLabel, { color: theme.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTL: { width: 280, height: 280, top: -70, left: -90 },
  orbBR: { width: 220, height: 220, bottom: 60, right: -70 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  scrollContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 48, paddingTop: 20 },

  toggle: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 3, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: 11, fontWeight: '600' },

  mapWrapper: { alignItems: 'center', marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '500', marginBottom: 20 },

  detailCard: {
    width: '100%', borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12,
    shadowRadius: 24, elevation: 6,
  },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  detailZoneName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  detailZoneSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  progressBlock: { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressRemaining: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statChip: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1 },
  statChipValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  statChipLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  historyTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, gap: 10 },
  historyDot: { width: 6, height: 6, borderRadius: 3 },
  historyDate: { flex: 1, fontSize: 14, fontWeight: '500' },
  powerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  powerBadgeText: { fontSize: 13, fontWeight: '800' },

  noDataContainer: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  noDataText: { fontSize: 14, fontWeight: '500' },

  logBtn: {
    marginTop: 20, borderRadius: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5,
  },
  logBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 },
  logBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  overviewSection: { width: '100%' },
  overviewTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  overviewCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    borderWidth: 1, marginBottom: 8, gap: 12,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 3,
  },
  overviewLeft: { flex: 1, gap: 6 },
  overviewZoneName: { fontSize: 15, fontWeight: '700' },
  miniTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3 },
  overviewRight: { alignItems: 'center', minWidth: 36 },
  overviewCount: { fontSize: 18, fontWeight: '800' },
  overviewCountLabel: { fontSize: 10, fontWeight: '600' },

  emptyZones: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyZonesText: { fontSize: 15, fontWeight: '500' },

  // ── Modal ──
  modalSlide: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24,
    borderWidth: 1, maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, height: 50,
  },
  fieldIcon: { marginRight: 10 },
  fieldTextInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  notesField: { height: 80, alignItems: 'flex-start', paddingTop: 12 },
  dateDisplay: { fontSize: 12, fontWeight: '500', marginTop: 4, marginLeft: 2, marginBottom: 4 },

  datePickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  datePickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  datePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  datePickerTitle: { fontSize: 17, fontWeight: '600' },
  datePickerBtn: { fontSize: 16 },

  saveBtn: {
    marginTop: 20, marginBottom: 8, borderRadius: 16,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5,
  },
  saveBtnGradient: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },
});
