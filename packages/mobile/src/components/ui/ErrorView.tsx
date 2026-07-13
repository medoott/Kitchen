import { View, Text, Pressable } from 'react-native';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({ message = 'Something went wrong', onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-red-600 text-base text-center mb-4">{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} className="bg-primary-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
