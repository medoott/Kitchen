import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settings.store';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const { primary600, primary100 } = useThemeColors();

  const hero = settings.heroSection;
  const features = settings.featuresSection;
  const cta = settings.ctaSection;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Hero */}
      <View style={{ backgroundColor: primary600 }} className="px-6 pt-12 pb-16">
        <Text className="text-white text-3xl font-bold mb-3">
          {hero?.title || t('home.heroTitle')}
        </Text>
        <Text style={{ color: primary100 }} className="text-base leading-6 mb-8">
          {hero?.subtitle || t('home.heroDescription')}
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push('/(tabs)/menu')}
            className="bg-white px-6 py-3 rounded-xl"
          >
            <Text style={{ color: primary600 }} className="font-semibold text-base">
              {hero?.ctaPrimaryText || t('home.viewMenu')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/locations')}
            className="border-2 border-white px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold text-base">
              {hero?.ctaSecondaryText || t('home.findLocation')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Features */}
      <View className="px-6 -mt-8">
        {features && features.length > 0 ? (
          features.map((feature, i) => (
            <FeatureCard
              key={i}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))
        ) : (
          <>
            <FeatureCard
              title={t('home.fastDelivery')}
              description={t('home.fastDeliveryDesc')}
              icon="fast"
            />
            <FeatureCard
              title={t('home.easyOrdering')}
              description={t('home.easyOrderingDesc')}
              icon="easy"
            />
            <FeatureCard
              title={t('home.tableReservations')}
              description={t('home.tableReservationsDesc')}
              icon="table"
            />
          </>
        )}
      </View>

      {/* CTA */}
      <View className="px-6 py-8 items-center">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          {cta?.title || t('home.readyToOrder')}
        </Text>
        <Text className="text-gray-500 text-center text-sm mb-4">
          {cta?.description || t('home.readyToOrderDesc')}
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          style={{ backgroundColor: primary600 }}
          className="px-8 py-3.5 rounded-xl"
        >
          <Text className="text-white font-semibold text-base">
            {cta?.buttonText || t('home.createAccount')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  const defaultIcons: Record<string, string> = { fast: '\u26A1', easy: '\u2714', table: '\u{1F37D}' };
  const displayIcon = defaultIcons[icon] || icon;

  return (
    <View className="bg-white rounded-xl p-5 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-3">{displayIcon}</Text>
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      </View>
      <Text className="text-gray-500 text-sm leading-5">{description}</Text>
    </View>
  );
}
