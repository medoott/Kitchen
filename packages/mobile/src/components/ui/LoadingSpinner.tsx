import { ActivityIndicator, View } from 'react-native';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'large', color = '#EA580C', fullScreen }: Props) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return (
    <View className="py-8 items-center">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}
