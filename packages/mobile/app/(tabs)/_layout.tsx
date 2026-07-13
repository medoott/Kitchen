import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/store/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';

function CartTabBarButton() {
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <Pressable
      onPress={() => router.push('/cart')}
      className="relative"
      accessibilityLabel="Open cart"
    >
      <TabIcon name="cart" />
      {itemCount > 0 && (
        <View className="absolute -top-1 -right-2 bg-primary-600 rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-white text-xs font-bold">{itemCount > 9 ? '9+' : itemCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

function TabIcon({ name, focused, activeColor }: { name: string; focused?: boolean; activeColor?: string }) {
  const color = focused ? (activeColor || '#EA580C') : '#6B7280';
  // Simple text-based icons for now — can be replaced with @expo/vector-icons
  const icons: Record<string, string> = {
    home: '\u2302',
    menu: '\u2630',
    orders: '\u2751',
    account: '\u2709',
    cart: '\u1F6D2',
  };
  return (
    <Text style={{ fontSize: 22, color }}>{icons[name] || '\u25CF'}</Text>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { primary600 } = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primary600,
        tabBarInactiveTintColor: '#6B7280',
        headerRight: () => <CartTabBarButton />,
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} activeColor={primary600} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('nav.menu'),
          tabBarIcon: ({ focused }) => <TabIcon name="menu" focused={focused} activeColor={primary600} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders.title'),
          tabBarIcon: ({ focused }) => <TabIcon name="orders" focused={focused} activeColor={primary600} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ focused }) => <TabIcon name="account" focused={focused} activeColor={primary600} />,
        }}
      />
    </Tabs>
  );
}
