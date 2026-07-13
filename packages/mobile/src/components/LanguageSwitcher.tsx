import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  function handleSelect(code: LanguageCode) {
    i18n.changeLanguage(code);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        className="flex-row items-center bg-gray-100 px-4 py-2.5 rounded-lg"
        accessibilityLabel="Change language"
      >
        <Text className="text-gray-700 text-sm font-medium">{currentLang.name}</Text>
        <Text className="text-gray-400 ml-2">{'\u25BE'}</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setVisible(false)}>
          <View className="bg-white rounded-t-2xl px-4 py-6">
            <Text className="text-lg font-bold text-gray-900 mb-4 text-center">Select Language</Text>
            <FlatList
              data={SUPPORTED_LANGUAGES as unknown as typeof SUPPORTED_LANGUAGES[number][]}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item.code as LanguageCode)}
                  className={`flex-row items-center justify-between py-3.5 px-4 rounded-lg ${
                    item.code === i18n.language ? 'bg-primary-50' : ''
                  }`}
                >
                  <Text className={`text-base ${item.code === i18n.language ? 'text-primary-700 font-semibold' : 'text-gray-700'}`}>
                    {item.name}
                  </Text>
                  {item.code === i18n.language && (
                    <Text className="text-primary-600 font-bold">{'\u2713'}</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
