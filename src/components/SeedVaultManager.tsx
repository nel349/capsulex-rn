import {
  SeedVault,
  useSeedVault,
  type Seed,
  type SeedVaultEvent,
  type SeedVaultContentChange,
} from '@solana-mobile/seed-vault-lib';
import React, { useEffect, useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';

export default function SeedVaultManager() {
  const [authorizedSeeds, setAuthorizedSeeds] = useState<Seed[]>([]);
  const [hasUnauthorizedSeeds, setHasUnauthorizedSeeds] = useState(false);

  const handleSeedVaultEvent = (event: SeedVaultEvent) => {
    console.log('SeedVault event:', event);
  };

  const handleContentChange = (event: SeedVaultContentChange) => {
    console.log('SeedVault content change:', event);
  };

  useSeedVault(handleSeedVaultEvent, handleContentChange);

  const checkSeeds = async () => {
    try {
      const unauthorized = await SeedVault.hasUnauthorizedSeeds();
      setHasUnauthorizedSeeds(unauthorized);

      const seeds = await SeedVault.getAuthorizedSeeds();
      setAuthorizedSeeds(seeds);
    } catch (error) {
      console.error('Failed to check seeds:', error);
    }
  };

  useEffect(() => {
    checkSeeds();
  }, []);

  const authorizeSeed = async () => {
    try {
      if (hasUnauthorizedSeeds) {
        const token = await SeedVault.authorizeNewSeed();
        Alert.alert('Success', `Seed authorized: ${token.authToken}`);
        checkSeeds();
      } else {
        Alert.alert('Info', 'No unauthorized seeds available');
      }
    } catch (error) {
      console.error('Seed authorization failed:', error);
    }
  };

  return (
    <View>
      <Text>Seed Vault Manager</Text>
      <Text>Authorized Seeds: {authorizedSeeds.length}</Text>
      <Button title="Authorize Seed" onPress={authorizeSeed} />
    </View>
  );
}
