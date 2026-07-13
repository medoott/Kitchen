import { View, ViewProps } from 'react-native';

interface Props extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, className = '', ...props }: Props & { className?: string }) {
  return (
    <View className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className}`} {...props}>
      {children}
    </View>
  );
}
