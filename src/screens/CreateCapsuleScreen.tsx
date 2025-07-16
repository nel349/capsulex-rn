import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Portal,
  Modal,
} from 'react-native-paper';

import { useAuthorization } from '../utils/useAuthorization';

interface SOLBalance {
  balance: number;
  sufficient: boolean;
  required: number;
}

export function CreateCapsuleScreen() {
  const { selectedAccount } = useAuthorization();
  const [content, setContent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<
    'twitter' | 'instagram'
  >('twitter');
  const [revealDate, setRevealDate] = useState('');
  const [revealTime, setRevealTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSOLModal, setShowSOLModal] = useState(false);
  const [solBalance, setSolBalance] = useState<SOLBalance>({
    balance: 0.0124,
    sufficient: true,
    required: 0.00005,
  });

  const platforms = [
    { key: 'twitter', label: 'Twitter', icon: '🐦' },
    { key: 'instagram', label: 'Instagram', icon: '📷' },
  ];

  // Check SOL balance on mount
  useEffect(() => {
    checkSOLBalance();
  }, []);

  const checkSOLBalance = async () => {
    // TODO: Implement actual SOL balance check
    // For now, simulate the check
    const mockBalance = Math.random() * 0.01; // Random balance between 0-0.01 SOL
    const required = 0.00005;

    setSolBalance({
      balance: mockBalance,
      sufficient: mockBalance >= required,
      required,
    });
  };

  const handleCreateCapsule = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter content for your capsule');
      return;
    }

    if (!revealDate || !revealTime) {
      Alert.alert('Error', 'Please select a reveal date and time');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    // Check SOL balance before creating
    if (!solBalance.sufficient) {
      setShowSOLModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement capsule creation logic
      // This would involve:
      // 1. Creating the capsule on Solana program
      // 2. Storing content and reveal date
      // 3. Paying the transaction fee

      // Simulate creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Success!',
        'Your time capsule has been created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Navigate back to hub
              setContent('');
              setRevealDate('');
              setRevealTime('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating capsule:', error);
      Alert.alert('Error', 'Failed to create capsule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuySOL = () => {
    setShowSOLModal(false);
    // TODO: Open SOL onramp modal
    Alert.alert('Buy SOL', 'This will open the SOL onramp modal');
  };

  if (!selectedAccount) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.connectPrompt}>
          <Text variant="headlineMedium" style={styles.title}>
            Connect Your Wallet
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            You need to connect your wallet to create time capsules
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Create Time Capsule
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Schedule your content for future reveal
          </Text>
        </View>

        {/* SOL Balance Card */}
        <Card
          style={[
            styles.balanceCard,
            !solBalance.sufficient && styles.insufficientBalance,
          ]}
        >
          <Card.Content>
            <View style={styles.balanceHeader}>
              <Text variant="titleMedium">SOL Balance</Text>
              <Text variant="bodyMedium" style={styles.balanceAmount}>
                {solBalance.balance.toFixed(6)} SOL
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.balanceInfo}>
              {solBalance.sufficient
                ? '✅ Sufficient balance for capsule creation'
                : '⚠️ Insufficient balance. You need at least 0.00005 SOL'}
            </Text>
          </Card.Content>
        </Card>

        {/* Platform Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Choose Platform
          </Text>
          <View style={styles.platformContainer}>
            {platforms.map(platform => (
              <Chip
                key={platform.key}
                mode={selectedPlatform === platform.key ? 'flat' : 'outlined'}
                selected={selectedPlatform === platform.key}
                onPress={() =>
                  setSelectedPlatform(platform.key as 'twitter' | 'instagram')
                }
                style={styles.platformChip}
              >
                {platform.icon} {platform.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Content Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your Message
          </Text>
          <TextInput
            mode="outlined"
            placeholder="What would you like to share in the future?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            style={styles.contentInput}
          />
          <Text variant="bodySmall" style={styles.characterCount}>
            {content.length}/280 characters
          </Text>
        </View>

        {/* Reveal Date & Time */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            When to Reveal
          </Text>
          <View style={styles.dateTimeContainer}>
            <TextInput
              mode="outlined"
              placeholder="YYYY-MM-DD"
              value={revealDate}
              onChangeText={setRevealDate}
              style={styles.dateInput}
              label="Date"
            />
            <TextInput
              mode="outlined"
              placeholder="HH:MM"
              value={revealTime}
              onChangeText={setRevealTime}
              style={styles.timeInput}
              label="Time"
            />
          </View>
        </View>

        {/* Cost Breakdown */}
        <Card style={styles.costCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.costTitle}>
              Transaction Cost
            </Text>
            <View style={styles.costRow}>
              <Text variant="bodyMedium">Capsule Creation</Text>
              <Text variant="bodyMedium">~0.00005 SOL</Text>
            </View>
            <View style={styles.costRow}>
              <Text variant="bodyMedium">Network Fee</Text>
              <Text variant="bodyMedium">~0.000005 SOL</Text>
            </View>
            <View style={[styles.costRow, styles.totalRow]}>
              <Text variant="titleMedium">Total</Text>
              <Text variant="titleMedium">~0.000055 SOL</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Create Button */}
        <Button
          mode="contained"
          onPress={handleCreateCapsule}
          loading={isLoading}
          disabled={isLoading || !content.trim() || !revealDate || !revealTime}
          style={styles.createButton}
        >
          {isLoading ? 'Creating Capsule...' : 'Create Time Capsule'}
        </Button>
      </ScrollView>

      {/* SOL Insufficient Modal */}
      <Portal>
        <Modal
          visible={showSOLModal}
          onDismiss={() => setShowSOLModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="headlineMedium" style={styles.modalTitle}>
              Insufficient SOL Balance
            </Text>
            <Text variant="bodyMedium" style={styles.modalDescription}>
              You need at least {solBalance.required} SOL to create a time
              capsule. Your current balance is {solBalance.balance.toFixed(6)}{' '}
              SOL.
            </Text>
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowSOLModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleBuySOL}
                style={styles.modalButton}
              >
                Buy SOL
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  connectPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  balanceCard: {
    margin: 16,
    marginBottom: 8,
  },
  insufficientBalance: {
    borderColor: '#FF5722',
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceAmount: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  balanceInfo: {
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  platformContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChip: {
    marginRight: 8,
  },
  contentInput: {
    marginBottom: 8,
  },
  characterCount: {
    textAlign: 'right',
    color: '#666',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  costCard: {
    margin: 16,
  },
  costTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  createButton: {
    margin: 16,
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
