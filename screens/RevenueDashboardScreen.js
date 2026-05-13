import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../config/api';

const PERIODS = ['day', 'week', 'month', 'year'];

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};
const getWeekEnd = (date) => {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const SCREEN_W = Dimensions.get('window').width;
const DAY_LABELS = {
  en: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  bg: ['Пон','Вт','Ср','Чет','Пет','Съб','Нед'],
};
const MONTH_LABELS = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  bg: ['Яну','Фев','Мар','Апр','Май','Юни','Юли','Авг','Сеп','Окт','Ное','Дек'],
};

const niceMax = (val) => {
  if (val <= 0)    return 100;
  if (val <= 100)  return 100;
  if (val <= 250)  return 250;
  if (val <= 500)  return 500;
  if (val <= 1000) return 1000;
  if (val <= 2000) return 2000;
  if (val <= 5000) return 5000;
  return Math.ceil(val / 1000) * 1000;
};

const fmtY = (val) => val >= 1000 ? `${val / 1000}k` : String(val);

const getXLabel = (label, period, index, lang) => {
  if (period === 'week')  return (DAY_LABELS[lang] || DAY_LABELS.en)[index] || '';
  if (period === 'year')  return (MONTH_LABELS[lang] || MONTH_LABELS.en)[index] || '';
  if (period === 'month') {
    const day = parseInt(label.split('-')[2]);
    return (day === 1 || day % 5 === 0) ? String(day) : '';
  }
  return '';
};

function RevenueChart({ timeSeries, period, isDark, language }) {
  if (!timeSeries || timeSeries.length === 0) return null;

  const padL = 36, padR = 8, padT = 10, padB = 28;
  const totalW = SCREEN_W - 40;
  const totalH = 190;
  const plotW  = totalW - padL - padR;
  const plotH  = totalH - padT - padB;

  const maxVal = Math.max(...timeSeries.map(d => d.revenue));
  const yMax   = niceMax(maxVal);
  const n      = timeSeries.length;
  const gap    = n > 20 ? 1 : n > 10 ? 2 : 3;
  const barW   = Math.max(2, (plotW - gap * (n - 1)) / n);

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#7A7068' : '#9E9690';

  return (
    <Svg width={totalW} height={totalH}>
      {/* Horizontal grid lines + Y labels */}
      {gridLevels.map((pct, i) => {
        const y = padT + plotH * (1 - pct);
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={totalW - padR} y2={y}
              stroke={gridColor} strokeWidth={1}
              strokeDasharray={pct > 0 ? '3,3' : undefined} />
            <SvgText x={padL - 4} y={y + 3.5} textAnchor="end"
              fontSize={9} fill={labelColor}>
              {fmtY(Math.round(yMax * pct))}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {timeSeries.map((item, i) => {
        const barH = item.revenue > 0
          ? Math.max(2, (item.revenue / yMax) * plotH) : 0;
        const x = padL + i * (barW + gap);
        const y = padT + plotH - barH;
        return (
          <Rect key={i} x={x} y={y} width={barW} height={barH}
            fill="#C8922A" rx={Math.min(3, barW / 2)} />
        );
      })}

      {/* X-axis labels */}
      {timeSeries.map((item, i) => {
        const label = getXLabel(item.label, period, i, language);
        if (!label) return null;
        const x = padL + i * (barW + gap) + barW / 2;
        return (
          <SvgText key={i} x={x} y={totalH - 6} textAnchor="middle"
            fontSize={9} fill={labelColor}>
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export default function RevenueDashboardScreen({ navigation }) {
  const now = new Date();
  const [period, setPeriod]           = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedZone, setSelectedZone] = useState(null);
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState(false);
  const [timeSeries, setTimeSeries]   = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const { theme, isDark } = useTheme();
  const { t, language } = useContext(LanguageContext);
  const { currency, formatPrice } = useCurrency();

  useEffect(() => { loadRevenue(); }, [period, selectedDate, selectedZone]);
  useEffect(() => {
    if (period === 'day') { setTimeSeries([]); return; }
    loadTimeSeries();
  }, [period, selectedDate]);

  const getDateRange = () => {
    const d = new Date(selectedDate);
    switch (period) {
      case 'day': {
        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
        return { from: s.toISOString(), to: e.toISOString() };
      }
      case 'week': {
        const s = getWeekStart(d);
        const e = new Date(getWeekEnd(d).getTime() + 1);
        return { from: s.toISOString(), to: e.toISOString() };
      }
      case 'month': {
        const s = new Date(d.getFullYear(), d.getMonth(), 1);
        const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return { from: s.toISOString(), to: e.toISOString() };
      }
      case 'year': {
        const s = new Date(d.getFullYear(), 0, 1);
        const e = new Date(d.getFullYear() + 1, 0, 1);
        return { from: s.toISOString(), to: e.toISOString() };
      }
    }
  };

  const loadRevenue = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const params = { from, to };
      if (selectedZone) params.zone = selectedZone;
      const res = await api.get('/revenue', { params });
      setData(res.data);
    } catch (error) {
      console.error('Revenue load error:', error);
      Alert.alert(t('error'), error.response?.data?.message || t('failedToLoadRevenue'));
    } finally {
      setLoading(false);
    }
  };

  const buildTimeSlots = () => {
    const slots = [];
    const d = new Date(selectedDate);
    const pad = (n) => String(n).padStart(2, '0');
    if (period === 'week') {
      const start = getWeekStart(d);
      for (let i = 0; i < 7; i++) {
        const day  = new Date(start); day.setDate(day.getDate() + i);
        const next = new Date(day);   next.setDate(next.getDate() + 1);
        slots.push({
          from:  day.toISOString(),
          to:    next.toISOString(),
          label: `${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}`,
        });
      }
    } else if (period === 'month') {
      const cur = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      while (cur < end) {
        const next = new Date(cur); next.setDate(next.getDate() + 1);
        slots.push({
          from:  cur.toISOString(),
          to:    next.toISOString(),
          label: `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`,
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (period === 'year') {
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(d.getFullYear(), m, 1);
        const mEnd   = new Date(d.getFullYear(), m + 1, 1);
        slots.push({
          from:  mStart.toISOString(),
          to:    mEnd.toISOString(),
          label: `${d.getFullYear()}-${pad(m + 1)}`,
        });
      }
    }
    return slots;
  };

  const loadTimeSeries = async () => {
    setChartLoading(true);
    setTimeSeries([]);
    try {
      const slots = buildTimeSlots();
      const results = await Promise.allSettled(
        slots.map(slot =>
          api.get('/revenue', { params: { from: slot.from, to: slot.to } })
             .then(r => ({ label: slot.label, revenue: r.data.totalRevenue || 0 }))
        )
      );
      setTimeSeries(results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { label: slots[i].label, revenue: 0 }
      ));
    } catch (e) {
      console.error('Chart load error:', e);
    } finally {
      setChartLoading(false);
    }
  };

  const navigate = (dir) => {
    const d = new Date(selectedDate);
    if (period === 'day')   d.setDate(d.getDate() + dir);
    if (period === 'week')  d.setDate(d.getDate() + dir * 7);
    if (period === 'month') d.setMonth(d.getMonth() + dir);
    if (period === 'year')  d.setFullYear(d.getFullYear() + dir);
    setSelectedDate(d);
    setSelectedZone(null);
  };

  const isLatestPeriod = () => {
    const d = selectedDate;
    if (period === 'day')   return d.toDateString() === now.toDateString();
    if (period === 'week')  return getWeekStart(d).getTime() === getWeekStart(now).getTime();
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === 'year')  return d.getFullYear() === now.getFullYear();
  };

  const getPeriodLabel = () => {
    const locale = language === 'bg' ? 'bg-BG' : 'en-US';
    const d = selectedDate;
    if (period === 'day') {
      return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (period === 'week') {
      const ws = getWeekStart(d);
      const we = getWeekEnd(d);
      const fmt = (dt) => dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      return `${fmt(ws)} – ${fmt(we)}, ${ws.getFullYear()}`;
    }
    if (period === 'month') {
      return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    if (period === 'year') {
      return String(d.getFullYear());
    }
  };

  const formatMoney = (n) => `${Number(n || 0).toFixed(2)} ${currency}`;
  const periodLabel = getPeriodLabel();

  // --- Export PDF ---
  const exportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const rows = (data.byZone || []).map(z =>
        `<tr><td>${z.zone}</td><td style="text-align:center">${z.sessions}</td><td style="text-align:right">${formatMoney(z.revenue)}</td></tr>`
      ).join('');

      const html = `
        <html><head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 26px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 28px; }
          .total-card { background: #fef3c7; border-radius: 12px; padding: 20px 28px; margin-bottom: 28px; }
          .total-label { font-size: 13px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .total-value { font-size: 40px; font-weight: 800; color: #78350f; margin: 4px 0; }
          .meta { font-size: 13px; color: #92400e; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; padding: 10px 14px; text-align: left; font-size: 13px; color: #374151; }
          td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; }
        </style></head>
        <body>
          <h1>Revenue Report</h1>
          <div class="subtitle">Generated by Laseria · ${new Date().toLocaleDateString()}</div>
          <div class="total-card">
            <div class="total-label">Total Revenue · ${periodLabel}</div>
            <div class="total-value">${formatMoney(data.totalRevenue)}</div>
            <div class="meta">${data.appointmentCount} appointments · ${data.totalSessions} sessions</div>
          </div>
          <table>
            <tr><th>Zone</th><th style="text-align:center">Sessions</th><th style="text-align:right">Revenue</th></tr>
            ${rows || '<tr><td colspan="3" style="text-align:center;color:#9ca3af">No data</td></tr>'}
          </table>
          <div class="footer">Laseria · laseriaapp@gmail.com</div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Revenue ${periodLabel}` });
    } catch (err) {
      Alert.alert(t('error'), err.message || t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  // --- Export Excel (CSV — opens natively in Excel/Sheets) ---
  const exportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const rows = [
        [`Revenue Report — ${periodLabel}`],
        [],
        ['Total Revenue', formatMoney(data.totalRevenue)],
        ['Total Appointments', data.appointmentCount],
        ['Total Sessions', data.totalSessions],
        [],
        ['Zone', 'Sessions', 'Revenue'],
        ...(data.byZone || []).map(z => [z.zone, z.sessions, formatMoney(z.revenue)]),
      ];

      const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      await Share.share({
        message: csv,
        title: `Revenue ${periodLabel}`,
      });
    } catch (err) {
      Alert.alert(t('error'), err.message || t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradientBackground} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('revenue')}</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Period pills */}
      <View style={styles.pillsRow}>
        {PERIODS.map(p => {
          const active = period === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => { setPeriod(p); setSelectedZone(null); }}
              style={[styles.pill, {
                backgroundColor: active ? theme.primary : 'transparent',
                borderColor: active ? theme.primary : theme.border,
              }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: active ? '#fff' : theme.textSecondary }]}>
                {t(p) || p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Period navigator */}
      <View style={[styles.periodNav, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }]}>
        <TouchableOpacity onPress={() => navigate(-1)} style={styles.periodNavBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.periodNavLabel, { color: theme.textPrimary }]}>{periodLabel}</Text>
        <TouchableOpacity
          onPress={() => navigate(1)}
          style={[styles.periodNavBtn, isLatestPeriod() && { opacity: 0.3 }]}
          disabled={isLatestPeriod()}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('loading')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Total Revenue Card */}
          <LinearGradient colors={theme.gradientPrimary} style={styles.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[styles.totalLabel, { color: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }]}>
              {t('totalRevenue')} · {selectedZone ? t(selectedZone) : t('allZones')}
            </Text>
            <Text style={[styles.totalAmount, { color: isDark ? '#111' : '#fff' }]}>
              {formatMoney(data?.totalRevenue)}
            </Text>
            <View style={styles.totalMeta}>
              <View style={styles.totalMetaItem}>
                <Ionicons name="calendar-outline" size={14} color={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.75)'} />
                <Text style={[styles.totalMetaText, { color: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}>
                  {data?.appointmentCount} {t('appointments').toLowerCase()}
                </Text>
              </View>
              <View style={styles.totalMetaItem}>
                <Ionicons name="flash-outline" size={14} color={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.75)'} />
                <Text style={[styles.totalMetaText, { color: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}>
                  {data?.totalSessions} {t('sessions').toLowerCase()}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Revenue Chart */}
          {period !== 'day' && (
            <View style={[styles.chartCard, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }]}>
              {chartLoading ? (
                <View style={styles.chartLoader}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <RevenueChart
                  timeSeries={timeSeries}
                  period={period}
                  isDark={isDark}
                  language={language}
                />
              )}
            </View>
          )}

          {/* Zone Filter */}
          {data?.byZone?.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('filterByZone')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.chip, { borderColor: theme.primary, backgroundColor: !selectedZone ? theme.primary + '20' : 'transparent' }]}
                  onPress={() => setSelectedZone(null)}
                >
                  <Text style={[styles.chipText, { color: theme.primary }]}>{t('allZones')}</Text>
                </TouchableOpacity>
                {data.byZone.map(z => (
                  <TouchableOpacity
                    key={z.zone}
                    style={[styles.chip, { borderColor: theme.primary, backgroundColor: selectedZone === z.zone ? theme.primary + '20' : 'transparent' }]}
                    onPress={() => setSelectedZone(z.zone)}
                  >
                    <Text style={[styles.chipText, { color: theme.primary }]}>{t(z.zone)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Zone Breakdown */}
          {data?.byZone?.length > 0 ? (
            <View style={[styles.breakdownCard, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>
                {t('revenueByZone')}
              </Text>
              {data.byZone.map((z, i) => {
                const pct = data.totalRevenue > 0 ? (z.revenue / data.totalRevenue) * 100 : 0;
                return (
                  <View key={z.zone} style={[styles.zoneRow, i < data.byZone.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={styles.zoneRowLeft}>
                      <Text style={[styles.zoneName, { color: theme.textPrimary }]}>{t(z.zone)}</Text>
                      <Text style={[styles.zoneSessions, { color: theme.textTertiary }]}>
                        {z.sessions} {t('sessions').toLowerCase()}
                      </Text>
                      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
                      </View>
                    </View>
                    <Text style={[styles.zoneRevenue, { color: theme.textPrimary }]}>
                      {formatMoney(z.revenue)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }]}>
              <Ionicons name="bar-chart-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noRevenueData')}</Text>
            </View>
          )}

          {/* Export Buttons */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 12 }]}>{t('exportRevenue')}</Text>
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }, exporting && { opacity: 0.6 }]}
              onPress={exportPDF}
              disabled={exporting}
              activeOpacity={0.8}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Ionicons name="document-text-outline" size={22} color="#EF4444" />
              }
              <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>{t('exportPDF')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: theme.glassCard, borderColor: theme.glassCardBorder }, exporting && { opacity: 0.6 }]}
              onPress={exportExcel}
              disabled={exporting}
              activeOpacity={0.8}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#10B981" />
                : <Ionicons name="grid-outline" size={22} color="#10B981" />
              }
              <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>{t('exportExcel')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: { width: 300, height: 300, top: -80, right: -100 },
  orbBottom: { width: 240, height: 240, bottom: 40, left: -90 },
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
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  pillsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  periodNavBtn: { padding: 10 },
  periodNavLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartLoader: {
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '600' },
  scrollContent: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  totalCard: {
    borderRadius: 22,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  totalAmount: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 56,
    letterSpacing: -1,
    lineHeight: 60,
    marginBottom: 14,
  },
  totalMeta: { flexDirection: 'row', gap: 20 },
  totalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totalMetaText: { fontSize: 13, fontWeight: '600' },
  filterSection: { marginBottom: 16 },
  filterChips: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  breakdownCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  zoneRowLeft: { flex: 1 },
  zoneName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  zoneSessions: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  zoneRevenue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  exportRow: { flexDirection: 'row', gap: 12 },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  exportBtnText: { fontSize: 14, fontWeight: '700' },
});
