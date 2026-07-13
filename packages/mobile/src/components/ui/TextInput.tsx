import { View, Text, TextInput as RNTextInput, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export default function TextInput({ label, error, ...props }: Props) {
  return (
    <View className="mb-3">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <RNTextInput
        className={`border rounded-lg px-4 py-3 text-base text-gray-900 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
