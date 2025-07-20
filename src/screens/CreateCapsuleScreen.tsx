import * as anchor from '@coral-xyz/anchor';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Address } from '@solana/kit';
import * as Crypto from 'expo-crypto';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Portal,
  Modal,
  Snackbar,
} from 'react-native-paper';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { useCapsuleService } from '../services/capsuleService';
import { useSolanaService } from '../services/solana';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import { useAuthorization } from '../utils/useAuthorization';

interface SOLBalance {
  balance: number;
  sufficient: boolean;
  required: number;
}

export function CreateCapsuleScreen() {
  const { selectedAccount } = useAuthorization();
  const { createCapsule } = useCapsulexProgram();
  const { createCapsule: createCapsuleInDB } = useCapsuleService();
  const [content, setContent] = useState('something:for testing');
  const [selectedPlatform, setSelectedPlatform] = useState<
    'twitter' | 'instagram'
  >('twitter');
  const [revealDateTime, setRevealDateTime] = useState(new Date()); // Combined Date and Time
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSOLModal, setShowSOLModal] = useState(false);
  const [solBalance, setSolBalance] = useState<SOLBalance>({
    balance: 0,
    sufficient: true,
    required: 0.00005,
  });
  const { snackbar, showError, showSuccess, showInfo, hideSnackbar } =
    useSnackbar();
  const { getBalance } = useSolanaService();

  const platforms = [
    { key: 'twitter', label: 'Twitter', icon: '🐦' },
    { key: 'instagram', label: 'Instagram', icon: '📷' },
  ];

  useEffect(() => {
    checkSOLBalance();
  }, [getBalance, selectedAccount]);

  const checkSOLBalance = async () => {
    const balance = await getBalance(
      selectedAccount?.publicKey.toString() as Address
    );
    const required = 0.00005;

    setSolBalance({
      balance: balance,
      sufficient: balance >= required,
      required,
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || revealDateTime;
    setShowDatePicker(Platform.OS === 'ios');
    setRevealDateTime(currentDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || revealDateTime;
    setShowTimePicker(Platform.OS === 'ios');
    setRevealDateTime(currentTime);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const showTimepicker = () => {
    setShowTimePicker(true);
  };

  const handleCreateCapsule = async () => {
    if (!content.trim()) {
      showError('Please enter content for your capsule');
      return;
    }

    if (!revealDateTime) {
      showError('Please select a reveal date and time');
      return;
    }

    if (!selectedAccount) {
      showError('Please connect your wallet first');
      return;
    }

    if (!solBalance.sufficient) {
      setShowSOLModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // Convert to Unix timestamp (seconds) and then to Anchor BN
      const revealDateBN = new anchor.BN(
        Math.floor(revealDateTime.getTime() / 1000)
      );

      const contentStorage = { text: {} };
      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
      );

      // Step 1: Create capsule on-chain
      const txResult = await createCapsule.mutateAsync({
        encryptedContent: content,
        contentStorage: contentStorage,
        contentIntegrityHash: contentHash,
        revealDate: revealDateBN,
        isGamified: false,
      });

      console.log('✅ Capsule created on-chain:', txResult);

      // Step 2: Save capsule to Supabase database
      try {
        const capsuleData = await createCapsuleInDB({
          content_encrypted: content,
          content_hash: contentHash,
          has_media: false,
          media_urls: [],
          reveal_date: revealDateTime.toISOString(),
          on_chain_tx:
            typeof txResult === 'string'
              ? txResult
              : (txResult as any)?.signature || JSON.stringify(txResult),
          sol_fee_amount: solBalance.required,
          is_gamified: false,
        });

        console.log('✅ Capsule saved to database:', capsuleData);

        showSuccess(
          '🎉 Time capsule created successfully and saved to blockchain!'
        );

        // Reset form after short delay
        setTimeout(() => {
          setContent('');
          setRevealDateTime(new Date());
        }, 2000);
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        showError(
          '⚠️ Capsule created on blockchain but database save failed. Please contact support.'
        );

        setTimeout(() => {
          setContent('');
          setRevealDateTime(new Date());
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error creating capsule:', error);
      showError(
        `Failed to create capsule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuySOL = () => {
    setShowSOLModal(false);
    showInfo('SOL onramp feature coming soon!');
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
            <Pressable onPress={showDatepicker} style={styles.dateInput}>
              <TextInput
                mode="outlined"
                label="Date"
                value={revealDateTime.toLocaleDateString()}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>
            <Pressable onPress={showTimepicker} style={styles.timeInput}>
              <TextInput
                mode="outlined"
                label="Time"
                value={revealDateTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={revealDateTime}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={revealDateTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}
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
          loading={isLoading || createCapsule.isPending}
          disabled={
            isLoading ||
            createCapsule.isPending ||
            !content.trim() ||
            !revealDateTime
          }
          style={styles.createButton}
        >
          {isLoading || createCapsule.isPending
            ? 'Creating Capsule...'
            : 'Create Time Capsule'}
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

      {/* Snackbar for notifications */}
      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onDismiss={hideSnackbar}
      />
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
