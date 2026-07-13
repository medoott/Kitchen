import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  const baseClass = 'py-3.5 px-6 rounded-xl items-center justify-center flex-row';
  const variantClass =
    variant === 'primary'
      ? 'bg-primary-600'
      : variant === 'secondary'
        ? 'bg-gray-100'
        : 'border-2 border-gray-300 bg-transparent';
  const disabledClass = isDisabled ? 'opacity-50' : '';

  const textClass =
    variant === 'primary'
      ? 'text-white font-semibold text-base'
      : variant === 'secondary'
        ? 'text-gray-900 font-semibold text-base'
        : 'text-gray-700 font-semibold text-base';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseClass} ${variantClass} ${disabledClass}`}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : '#EA580C'}
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={textClass}>{title}</Text>
    </Pressable>
  );
}
