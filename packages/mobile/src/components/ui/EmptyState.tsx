import { View, Text, Pressable } from 'react-native';

interface Props {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-gray-900 text-lg font-semibold mb-2">{title}</Text>
      {message && <Text className="text-gray-500 text-sm text-center mb-4">{message}</Text>}
      {actionLabel && onAction && (
        <Pressable onPress={onAction} className="bg-primary-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
