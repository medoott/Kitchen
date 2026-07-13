import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import '@/i18n';
import '../global.css';

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  usePushNotifications();

  useEffect(() => {
    restoreSession();
    fetchSettings();
  }, [restoreSession, fetchSettings]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="cart"
          options={{ presentation: 'modal', headerShown: true, title: 'Cart' }}
        />
        <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Order Confirmation' }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: true, title: 'Order Status' }} />
        <Stack.Screen name="menu/[itemId]" options={{ presentation: 'modal', headerShown: true, title: '' }} />
        <Stack.Screen name="locations" options={{ headerShown: true, title: 'Locations' }} />
        <Stack.Screen name="reservations" options={{ headerShown: true, title: 'Reservations' }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
