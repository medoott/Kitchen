import { View, Text } from 'react-native';

interface Props {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  primary: 'bg-primary-100 text-primary-700',
};

export default function Badge({ label, variant = 'default' }: Props) {
  const styles = variantStyles[variant];
  return (
    <View className={`px-2.5 py-1 rounded-full self-start ${styles.split(' ')[0]}`}>
      <Text className={`text-xs font-medium ${styles.split(' ')[1]}`}>{label}</Text>
    </View>
  );
}
