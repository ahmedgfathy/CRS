import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ContabooLogoProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const ContabooLogo: React.FC<ContabooLogoProps> = ({ 
  color = "white",
  size = "medium"
}) => {
  const sizeConfig = {
    small: { iconSize: 20, fontSize: 12, containerHeight: 24 },
    medium: { iconSize: 28, fontSize: 16, containerHeight: 32 },
    large: { iconSize: 36, fontSize: 20, containerHeight: 40 }
  };
  
  const config = sizeConfig[size];
  
  return (
    <View style={[styles.container, { height: config.containerHeight }]}>
      <MaterialIcons 
        name="domain" 
        size={config.iconSize} 
        color={color} 
        style={styles.icon}
      />
      <Text style={[styles.text, { color, fontSize: config.fontSize }]}>
        Contaboo
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
});

export default ContabooLogo;
