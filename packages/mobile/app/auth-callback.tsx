import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  useEffect(() => {
    if (params.token) {
      loginWithToken(params.token).then(() => {
        router.replace('/(tabs)');
      });
    } else {
      router.replace('/(auth)/login');
    }
  }, [params.token, loginWithToken, router]);

  return <LoadingSpinner fullScreen />;
}
