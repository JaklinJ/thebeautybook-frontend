import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function LanguageSelector() {
  const { language, changeLanguage, t } = useContext(LanguageContext);
  const { theme, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flagCode: 'EN' },
    { code: 'bg', name: 'Български', flagCode: 'БГ' },
  ];

  const handleLanguageSelect = async (langCode) => {
    setShowModal(false);
    await changeLanguage(langCode);
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, {
          borderColor: theme.primary + '60',
          backgroundColor: theme.primary + '10',
        }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.65}
      >
        <Text style={[styles.flagText, { color: theme.primary }]}>
          {currentLanguage?.flagCode || '?'}
        </Text>
        <Ionicons name="chevron-down" size={10} color={theme.primary} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, {
            backgroundColor: isDark ? '#1A1815' : theme.surface,
            borderColor: isDark ? '#2E2A26' : theme.border,
          }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t('selectLanguage')}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageOption, {
                  backgroundColor: language === lang.code ? theme.primary + '12' : 'transparent',
                  borderColor: language === lang.code ? theme.primary + '50' : theme.border,
                }]}
                onPress={() => handleLanguageSelect(lang.code)}
                activeOpacity={0.7}
              >
                <View style={[styles.flagBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
                  <Text style={[styles.modalFlagText, { color: theme.primary }]}>{lang.flagCode}</Text>
                </View>
                <Text style={[
                  styles.languageOptionText,
                  { color: language === lang.code ? theme.primary : theme.textSecondary },
                  language === lang.code && { fontWeight: '700' },
                ]}>
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  flagBadge: {
    width: 30,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFlagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
