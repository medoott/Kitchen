import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/formatters';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-gray-500 text-center mb-4">
          {t('account.pleaseLogin')} {t('account.loginToView')} {t('account.toViewAccount')}
        </Text>
        <Pressable onPress={() => router.push('/(auth)/login')} className="bg-primary-600 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold">{t('nav.login')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
      {/* Profile card */}
      <View className="bg-white rounded-xl p-5 border border-gray-100 mb-4">
        <Text className="text-xl font-bold text-gray-900 mb-1">{user.name}</Text>
        <View className="mt-3">
          <InfoRow label={t('account.emailLabel')} value={user.email} />
          <InfoRow label={t('account.phoneLabel')} value={user.phone || t('account.notProvided')} />
          {user.loyaltyPoints !== undefined && (
            <InfoRow label="Loyalty Points" value={String(user.loyaltyPoints)} />
          )}
        </View>
      </View>

      {/* Actions */}
      <View className="bg-white rounded-xl border border-gray-100 mb-4">
        <MenuItem label={t('account.orderHistory')} onPress={() => router.push('/(tabs)/orders')} />
        <View className="h-px bg-gray-100" />
        <MenuItem label={t('reservations.title')} onPress={() => router.push('/reservations')} />
      </View>

      {/* Language */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-500 mb-2">Language</Text>
        <LanguageSwitcher />
      </View>

      {/* Logout */}
      <Pressable
        onPress={async () => {
          await logout();
          router.replace('/(tabs)');
        }}
        className="bg-red-50 rounded-xl p-4 items-center mt-2"
      >
        <Text className="text-red-600 font-semibold">{t('nav.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-50">
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className="text-gray-900 text-sm font-medium">{value}</Text>
    </View>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between p-4">
      <Text className="text-gray-900 text-base">{label}</Text>
      <Text className="text-gray-400 text-lg">{'\u203A'}</Text>
    </Pressable>
  );
}
