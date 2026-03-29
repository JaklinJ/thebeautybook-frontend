import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function LanguageSelector() {
  const { language, changeLanguage, t } = useContext(LanguageContext);
  const { theme } = useTheme();
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
        style={[styles.selectorButton, { borderColor: theme.border }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.6}
      >
        <View style={styles.flagBadge}>
          <Text style={styles.flagText}>{currentLanguage?.flagCode || '?'}</Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t('selectLanguage')}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  { 
                    backgroundColor: language === lang.code ? theme.primary + '15' : theme.surfaceSecondary,
                    borderColor: language === lang.code ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
                activeOpacity={0.7}
              >
                <View style={styles.flagBadge}>
                  <Text style={styles.flagText}>{lang.flagCode}</Text>
                </View>
                <Text
                  style={[
                    styles.languageOptionText,
                    { color: theme.textPrimary },
                    language === lang.code && styles.languageOptionTextActive,
                  ]}
                >
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 52,
    height: 40,
    backgroundColor: 'transparent',
  },
  flagBadge: {
    width: 28,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  flagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  languageOptionTextActive: {
    fontWeight: '700',
  },
});

