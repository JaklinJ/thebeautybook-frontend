import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSubscription, FREE_TIER_CLIENT_LIMIT } from '../context/SubscriptionContext';
import { LanguageContext } from '../context/LanguageContext';

const PRO_FEATURES = [
  { icon: 'infinite-outline', text: 'Unlimited clients', highlight: true },
  { icon: 'calendar-outline', text: 'Appointment tracking' },
  { icon: 'body-outline', text: 'Body map visualization' },
  { icon: 'trending-up-outline', text: 'Treatment progress tracking' },
  { icon: 'notifications-outline', text: 'Appointment reminders', badge: 'Soon' },
  { icon: 'camera-outline', text: 'Before/after photos', badge: 'Soon' },
  { icon: 'bar-chart-outline', text: 'Revenue analytics', badge: 'Soon' },
  { icon: 'headset-outline', text: 'Priority support' },
];

export default function PaywallScreen({ navigation, route }) {
  const fromLimit = route.params?.fromLimit ?? false;
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { theme, isDark } = useTheme();
  const { offerings, purchasePackage, restorePurchases } = useSubscription();
  const { t } = useContext(LanguageContext);

  const monthlyPackage = offerings?.current?.monthly;
  const yearlyPackage = offerings?.current?.annual;

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '$9.99';
  const yearlyPrice = yearlyPackage?.product?.priceString ?? '$79.99';
  const yearlyPerMonth = yearlyPackage
    ? `$${(yearlyPackage.product.price / 12).toFixed(2)}`
    : '$6.67';

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'monthly' ? monthlyPackage : yearlyPackage;
    if (!pkg) {
      Alert.alert(
        t('paywallNotAvailable'),
        t('paywallNotAvailableMsg')
      );
      return;
    }
    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.notConfigured) {
        Alert.alert('Setup Required', 'RevenueCat is not configured yet. Add your API keys in SubscriptionContext.js.');
        return;
      }
      if (result.success) {
        Alert.alert(t('paywallWelcomePro'), t('paywallWelcomeProMsg'), [
          { text: t('paywallLetsGo'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('paywallPurchaseFailed'));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert(t('paywallRestored'), t('paywallRestoredMsg'), [
          { text: t('paywallLetsGo'), onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(t('paywallNothingToRestore'), t('paywallNothingToRestoreMsg'));
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('paywallRestoreFailed'));
    } finally {
      setRestoring(false);
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
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <View style={[styles.orb, styles.orbTopRight, { backgroundColor: theme.orbAccent }]} />
      <View style={[styles.orb, styles.orbBottomLeft, { backgroundColor: theme.orbPrimary }]} />

      <TouchableOpacity
        style={[styles.closeBtn, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
        }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={22} color={theme.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={theme.gradientPrimary}
          style={styles.crownBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="star" size={34} color={isDark ? '#111' : '#fff'} />
        </LinearGradient>

        <Text style={[styles.proTitle, { color: theme.textPrimary }]}>
          Laseria Pro
        </Text>
        <Text style={[styles.proSubtitle, { color: theme.textSecondary }]}>
          {t('paywallSubtitle')}
        </Text>

        {/* Free tier limit notice — only shown when triggered by client limit */}
        {fromLimit && (
          <View style={[styles.limitBanner, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
            <Ionicons name="people-outline" size={18} color={theme.primary} />
            <Text style={[styles.limitBannerText, { color: theme.primary }]}>
              {t('paywallLimitReached', { limit: FREE_TIER_CLIENT_LIMIT })}
            </Text>
          </View>
        )}

        {/* Plan Toggle */}
        <View style={[styles.planToggle, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        }]}>
          {/* sliding active pill */}
          <View
            style={[
              styles.planActivePill,
              { backgroundColor: theme.surface, left: selectedPlan === 'monthly' ? 4 : '50%' },
            ]}
            pointerEvents="none"
          />

          <TouchableOpacity style={styles.planOption} onPress={() => setSelectedPlan('monthly')}>
            <Text style={[styles.planOptionText, { color: selectedPlan === 'monthly' ? theme.textPrimary : theme.textTertiary }]}>
              {t('paywallMonthly')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.planOption} onPress={() => setSelectedPlan('yearly')}>
            <View style={styles.planOptionInner}>
              <Text style={[styles.planOptionText, { color: selectedPlan === 'yearly' ? theme.textPrimary : theme.textTertiary }]}>
                {t('paywallYearly')}
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>{t('paywallSave33')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceMain, { color: theme.textPrimary }]}>
            {selectedPlan === 'monthly' ? monthlyPrice : yearlyPerMonth}
          </Text>
          <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>
            /{t('paywallMonth')}
          </Text>
        </View>
        {selectedPlan === 'yearly' && (
          <Text style={[styles.priceBilled, { color: theme.textTertiary }]}>
            {t('paywallBilledYearly', { price: yearlyPrice })}
          </Text>
        )}

        {/* Features Card */}
        <View style={[styles.featuresCard, {
          backgroundColor: theme.glassCard,
          borderColor: theme.glassCardBorder,
        }]}>
          <Text style={[styles.featuresTitle, { color: theme.textPrimary }]}>
            {t('paywallEverythingIncluded')}
          </Text>
          {PRO_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, {
                backgroundColor: feature.highlight ? theme.primary + '28' : theme.primary + '16',
              }]}>
                <Ionicons name={feature.icon} size={18} color={theme.primary} />
              </View>
              <Text style={[
                styles.featureText,
                { color: theme.textPrimary },
                feature.highlight && { fontWeight: '700' },
              ]}>
                {feature.text}
              </Text>
              {feature.badge ? (
                <View style={[styles.soonBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.soonText, { color: theme.primary }]}>{feature.badge}</Text>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              )}
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}
          style={[styles.ctaWrapper, { shadowColor: theme.primary }]}
        >
          <LinearGradient
            colors={theme.gradientPrimary}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color={isDark ? '#111' : '#fff'} />
            ) : (
              <Text style={[styles.ctaText, { color: isDark ? '#111' : '#fff' }]}>
                {selectedPlan === 'monthly'
                  ? t('paywallSubscribeMonthly', { price: monthlyPrice })
                  : t('paywallSubscribeYearly', { price: yearlyPrice })}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          {restoring ? (
            <ActivityIndicator size="small" color={theme.textTertiary} />
          ) : (
            <Text style={[styles.restoreText, { color: theme.textTertiary }]}>
              {t('paywallRestore')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.termsText, { color: theme.textTertiary }]}>
          {t('paywallTerms')}
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTopRight: { width: 320, height: 320, top: -90, right: -110 },
  orbBottomLeft: { width: 260, height: 260, bottom: 50, left: -100 },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 86 : 66,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  crownBadge: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
  proTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 10,
    textAlign: 'center',
  },
  proSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
  },
  limitBannerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  planToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
    width: '100%',
  },
  planActivePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  planOption: {
    width: '50%',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 6,
  },
  planOptionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 4,
  },
  priceMain: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 50,
  },
  pricePeriod: {
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 6,
  },
  priceBilled: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 22,
    textAlign: 'center',
  },
  featuresCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginTop: 10,
    marginBottom: 24,
    gap: 14,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  soonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ctaWrapper: {
    width: '100%',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaButton: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  restoreBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
