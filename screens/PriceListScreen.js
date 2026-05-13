import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import api from '../config/api';

const ZONE_GROUPS = [
  {
    titleKey: 'groupFaceNeck',
    groupIcon: 'happy-outline',
    zones: [
      { key: 'zoneFace', icon: 'happy-outline' },
      { key: 'zoneUpperLip', icon: 'happy-outline' },
      { key: 'zoneChin', icon: 'happy-outline' },
      { key: 'zoneNeck', icon: 'body-outline' },
      { key: 'zoneThroat', icon: 'body-outline' },
    ],
  },
  {
    titleKey: 'groupTorso',
    groupIcon: 'body-outline',
    zones: [
      { key: 'zoneChest', icon: 'body-outline' },
      { key: 'zoneBack', icon: 'body-outline' },
      { key: 'zoneAbdomen', icon: 'body-outline' },
      { key: 'zoneLowerBack', icon: 'body-outline' },
      { key: 'zoneGlutes', icon: 'body-outline' },
    ],
  },
  {
    titleKey: 'groupArms',
    groupIcon: 'hand-left-outline',
    zones: [
      { key: 'zoneArms', icon: 'hand-left-outline' },
      { key: 'zoneHalfArms', icon: 'hand-left-outline' },
      { key: 'zoneArmpits', icon: 'body-outline' },
    ],
  },
  {
    titleKey: 'groupLowerBody',
    groupIcon: 'footsteps-outline',
    zones: [
      { key: 'zoneLegs', icon: 'walk-outline' },
      { key: 'zoneHalfLegs', icon: 'walk-outline' },
      { key: 'zoneIntimate', icon: 'heart-outline' },
      { key: 'zoneBikiniLine', icon: 'cut-outline' },
      { key: 'zoneOther', icon: 'ellipsis-horizontal-circle-outline' },
    ],
  },
];

export default function PriceListScreen({ navigation }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, isDark } = useTheme();
  const { t } = useContext(LanguageContext);

  useEffect(() => {
    loadPriceList();
  }, []);

  const loadPriceList = async () => {
    try {
      const res = await api.get('/pricelists');
      setPrices(res.data.prices || {});
    } catch (error) {
      console.error('Load price list error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/pricelists', { prices });
      Alert.alert(t('success'), t('priceListSaved'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || t('failedToSavePriceList'));
    } finally {
      setSaving(false);
    }
  };

  const setPrice = (key, value) => {
    setPrices(prev => ({ ...prev, [key]: value }));
  };

  const allZoneKeys = ZONE_GROUPS.flatMap(g => g.zones.map(z => z.key));

  const setPricedCount = () =>
    allZoneKeys.filter(k => {
      const manKey = k + 'Man';
      return (prices[k] && Number(prices[k]) > 0) || (prices[manKey] && Number(prices[manKey]) > 0);
    }).length;

  return (
    <LinearGradient
      colors={theme.gradientBackground}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View style={[styles.orb, styles.orbTop, { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBottom, { backgroundColor: theme.orbPrimary }]} />

      {/* Header */}
      <LinearGradient
        colors={theme.gradientHeader}
        style={[styles.header, { borderBottomColor: theme.headerBorder }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {t('priceList')}
          </Text>
          {!loading && (
            <View style={[styles.headerBadge, { backgroundColor: theme.primary + '22' }]}>
              <Text style={[styles.headerBadgeText, { color: theme.primary }]}>
                {setPricedCount()} / {ZONE_GROUPS.reduce((n, g) => n + g.zones.length, 0)}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: theme.primary + '20' }]}
        >
          {saving
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Text style={[styles.saveBtnText, { color: theme.primary }]}>{t('save')}</Text>
          }
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {t('priceListHint')}
            </Text>

            {ZONE_GROUPS.map((group) => (
              <View key={group.titleKey} style={styles.groupWrapper}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                  <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name={group.groupIcon} size={14} color={theme.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    {t(group.titleKey)}
                  </Text>
                </View>

                {/* Section card */}
                <View style={[styles.card, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }]}>
                  {group.zones.map(({ key, icon }, index) => {
                    const manKey = key + 'Man';
                    const hasPrice =
                      (prices[key] && Number(prices[key]) > 0) ||
                      (prices[manKey] && Number(prices[manKey]) > 0);
                    return (
                      <View
                        key={key}
                        style={[
                          styles.row,
                          index < group.zones.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                        ]}
                      >
                        {/* Zone header */}
                        <View style={styles.rowHeader}>
                          <View style={[
                            styles.zoneIcon,
                            { backgroundColor: hasPrice ? theme.primary + '22' : theme.primary + '11' },
                          ]}>
                            <Ionicons name={icon} size={16} color={hasPrice ? theme.primary : theme.textTertiary} />
                          </View>
                          <View style={styles.zoneInfo}>
                            <Text style={[styles.zoneName, { color: theme.textPrimary }]}>{t(key)}</Text>
                            {hasPrice && (
                              <Text style={[styles.zoneSetLabel, { color: theme.primary }]}>✓ set</Text>
                            )}
                          </View>
                        </View>

                        {/* Dual price inputs */}
                        <View style={styles.dualPriceRow}>
                          {/* Woman */}
                          <View style={styles.genderPriceCol}>
                            <Text style={[styles.genderPriceLabel, { color: theme.pink }]}>
                              ♀ {t('genderWoman')}
                            </Text>
                            <View style={[styles.priceInputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                              <TextInput
                                style={[styles.priceInput, { color: theme.textPrimary }]}
                                value={prices[key] !== undefined ? String(prices[key]) : ''}
                                onChangeText={val => setPrice(key, val)}
                                keyboardType="decimal-pad"
                                placeholder="—"
                                placeholderTextColor={theme.textTertiary}
                              />
                            </View>
                          </View>

                          {/* Man */}
                          <View style={styles.genderPriceCol}>
                            <Text style={[styles.genderPriceLabel, { color: theme.blue }]}>
                              ♂ {t('genderMan')}
                            </Text>
                            <View style={[styles.priceInputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                              <TextInput
                                style={[styles.priceInput, { color: theme.textPrimary }]}
                                value={prices[manKey] !== undefined ? String(prices[manKey]) : ''}
                                onChangeText={val => setPrice(manKey, val)}
                                keyboardType="decimal-pad"
                                placeholder="—"
                                placeholderTextColor={theme.textTertiary}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={[styles.footerNote, { color: theme.textTertiary }]}>
              {t('priceListFooter')}
            </Text>

            <TouchableOpacity
              style={[styles.saveButton, { shadowColor: theme.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {saving
                  ? <ActivityIndicator size="small" color={isDark ? '#111' : '#fff'} />
                  : <Text style={[styles.saveButtonText, { color: isDark ? '#111' : '#fff' }]}>
                      {t('savePrices')}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: { width: 280, height: 280, top: -80, right: -100 },
  orbBottom: { width: 220, height: 220, bottom: 40, left: -80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 48 },
  hint: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  groupWrapper: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingLeft: 2,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 4,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: {
    flex: 1,
    gap: 2,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
  },
  zoneSetLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dualPriceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPriceCol: {
    flex: 1,
    gap: 4,
  },
  genderPriceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  priceInputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  priceInput: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  footerNote: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  saveButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 16,
  },
  saveButtonGradient: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
