import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Text, Chip, Button } from 'react-native-paper';

import { colors, spacing } from '../../theme';

export type Platform = 'twitter' | 'farcaster';

interface PlatformOption {
  key: Platform;
  label: string;
  icon: string;
  customIcon?: any;
}

interface PlatformSelectionStepProps {
  selectedPlatform: Platform;
  onPlatformChange: (selectedPlatform: Platform) => void;
  onContinue: () => void;
}

const platforms: PlatformOption[] = [
  {
    key: 'twitter',
    label: 'X',
    icon: 'custom-x',
    customIcon: require('../../../assets/icons8-x-30.png'),
  },
  {
    key: 'farcaster',
    label: 'Farcaster',
    icon: 'custom-farcaster',
    customIcon: require('../../../assets/farcaster-transparent-purple.png'),
  },
];

export const PlatformSelectionStep: React.FC<PlatformSelectionStepProps> = ({
  selectedPlatform,
  onPlatformChange,
  onContinue,
}) => {
  console.log('PlatformSelectionStep render - selectedPlatform:', selectedPlatform);
  return (
    <View>
      <View style={styles.platformContainer}>
        {platforms.map(platform => (
          <Pressable
            key={platform.key}
            onPress={() => {
              console.log('Platform pressed:', platform.key);
              onPlatformChange(platform.key);
            }}
          >
            <Chip
              mode={selectedPlatform === platform.key ? 'flat' : 'outlined'}
              selected={selectedPlatform === platform.key}
              style={[
                styles.platformChip,
                selectedPlatform === platform.key && styles.selectedChip
              ]}
              icon={() =>
                platform.customIcon ? (
                  <Image
                    source={platform.customIcon}
                    style={{
                      width: 16,
                      height: 16,
                    }}
                  />
                ) : (
                  <MaterialCommunityIcon
                    name={platform.icon as any}
                    size={16}
                    color={
                      selectedPlatform === platform.key
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                )
              }
            >
              <Text 
                style={{ 
                  color: selectedPlatform === platform.key ? colors.primary : colors.text,
                  fontWeight: selectedPlatform === platform.key ? 'bold' : 'normal'
                }}
              >
                {platform.label}
              </Text>
            </Chip>
          </Pressable>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={onContinue}
        style={styles.continueButton}
      >
        Continue
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  platformContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  platformChip: {
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  continueButton: {
    marginTop: spacing.md,
  },
});
