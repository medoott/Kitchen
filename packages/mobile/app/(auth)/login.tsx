import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.dismiss();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">{t('auth.loginTitle')}</Text>
      <Text className="text-gray-500 text-base mb-8">{t('auth.loginSubtitle')}</Text>

      {error ? (
        <View className="bg-red-50 p-3 rounded-lg mb-4">
          <Text className="text-red-700 text-sm">{error}</Text>
        </View>
      ) : null}

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
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View className="mt-4">
        <Button title={loading ? t('auth.signingIn') : t('auth.signIn')} onPress={handleLogin} loading={loading} />
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-gray-500 text-sm">{t('auth.noAccount')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/register')}>
          <Text className="text-primary-600 text-sm font-semibold">{t('auth.registerLink')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
