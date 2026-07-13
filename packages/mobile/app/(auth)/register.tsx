import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      router.dismiss();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">{t('auth.registerTitle')}</Text>
      <Text className="text-gray-500 text-base mb-8">{t('auth.registerSubtitle')}</Text>

      {error ? (
        <View className="bg-red-50 p-3 rounded-lg mb-4">
          <Text className="text-red-700 text-sm">{error}</Text>
        </View>
      ) : null}

      <TextInput label={t('auth.name')} placeholder="John Doe" value={name} onChangeText={setName} />
      <TextInput
        label={t('auth.email')}
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        label={t('auth.password')}
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        label={t('auth.phone')}
        placeholder="(555) 123-4567"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <View className="mt-4">
        <Button
          title={loading ? t('auth.creating') : t('auth.createAccount')}
          onPress={handleRegister}
          loading={loading}
        />
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-gray-500 text-sm">{t('auth.hasAccount')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text className="text-primary-600 text-sm font-semibold">{t('auth.loginLink')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
