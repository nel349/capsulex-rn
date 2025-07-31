import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  List,
  Switch,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDualAuth } from '../providers';
import { apiService } from '../services/api';
import { VaultKeyManager } from '../utils/vaultKey';
import {
  colors,
  typography,
  spacing,
  layout,
  shadows,
  components,
} from '../theme';

interface PendingGuess {
  guess_pda: string;
  guesser: string;
  guess_content: string;
  timestamp: number;
  is_anonymous: boolean;
}

interface PendingValidation {
  capsule_id: string;
  reveal_date: string;
  content_encrypted: string;
  estimated_validation_cost: number;
}

interface GameGuesses {
  game_pda: string;
  pending_guesses: PendingGuess[];
  total_guesses: number;
  estimated_validation_cost: number;
}

interface ValidationSummary {
  pending_validations: PendingValidation[];
  total_capsules: number;
  total_guesses: number;
  estimated_total_cost: number;
}

export function CreatorValidationScreen() {
  const { walletAddress } = useDualAuth();
  const { snackbar, showError, showSuccess, showInfo, hideSnackbar } = useSnackbar();

  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<PendingValidation | null>(null);
  const [gameGuesses, setGameGuesses] = useState<GameGuesses | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [isDecryptingContent, setIsDecryptingContent] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingGuesses, setIsLoadingGuesses] = useState(false);
  const [validationSelections, setValidationSelections] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (walletAddress) {
      loadPendingValidations();
    }
  }, [walletAddress]);

  const loadPendingValidations = async () => {
    if (!walletAddress) return;

    try {
      setIsLoading(true);
      
      const response = await apiService.get<ValidationSummary>(
        `/games/creator/${walletAddress}/pending-validations`
      );

      if (response.success && response.data) {
        console.log('📱 Mobile received validation summary:', response.data);
        setValidationSummary(response.data);
      } else {
        console.error('📱 Mobile failed to load validations:', response.error);
        showError(response.error || 'Failed to load pending validations');
      }
    } catch (error) {
      console.error('Error loading pending validations:', error);
      showError('Failed to load pending validations');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingValidations();
    setRefreshing(false);
  };

  const handleValidateCapsule = async (capsule: PendingValidation) => {
    if (!capsule.content_encrypted) {
      showError('No encrypted content found for this capsule');
      return;
    }

    setSelectedCapsule(capsule);
    setDecryptedContent('');
    setValidationSelections({});
    setGameGuesses(null);
    
    setShowValidationModal(true);

    // First decrypt content, then load guesses
    await decryptCapsuleContent(capsule);
    await loadGameGuesses(capsule.capsule_id);
  };

  const loadGameGuesses = async (capsuleId: string) => {
    if (!walletAddress) return;

    try {
      setIsLoadingGuesses(true);
      showInfo('Loading guesses for validation...');
      
      // Use the backend endpoint that derives game PDA and fetches guesses
      const response = await apiService.get<GameGuesses>(
        `/games/capsule/${capsuleId}/pending-guesses`
      );

      if (response.success && response.data) {
        setGameGuesses(response.data);
        
        // Pre-select all guesses for validation
        const initialSelections: { [key: string]: boolean } = {};
        response.data.pending_guesses.forEach(guess => {
          initialSelections[guess.guess_pda] = true;
        });
        setValidationSelections(initialSelections);
        
        showSuccess(`Loaded ${response.data.total_guesses} pending guesses`);
      } else {
        showError(response.error || 'Failed to load guesses');
        setGameGuesses({
          game_pda: '',
          pending_guesses: [],
          total_guesses: 0,
          estimated_validation_cost: 0,
        });
      }
      
    } catch (error) {
      console.error('Error loading game guesses:', error);
      showError('Failed to load guesses for validation');
      setGameGuesses({
        game_pda: '',
        pending_guesses: [],
        total_guesses: 0,
        estimated_validation_cost: 0,
      });
    } finally {
      setIsLoadingGuesses(false);
    }
  };

  const decryptCapsuleContent = async (capsule: PendingValidation) => {
    if (!walletAddress || !capsule.content_encrypted) return;

    try {
      setIsDecryptingContent(true);
      
      // Get vault key for decryption
      const hasKey = await VaultKeyManager.hasVaultKey(walletAddress);
      if (!hasKey) {
        showError('Vault key not found. Cannot decrypt content.');
        return;
      }

      // Parse the encrypted content from JSON and decrypt
      const encryptedContentObj = JSON.parse(capsule.content_encrypted);
      const decrypted = await VaultKeyManager.decryptContent(encryptedContentObj);

      setDecryptedContent(decrypted);
      showSuccess('Content decrypted successfully');
    } catch (error) {
      console.error('Error decrypting content:', error);
      showError('Failed to decrypt content. Please try again.');
    } finally {
      setIsDecryptingContent(false);
    }
  };

  const handleSubmitValidation = async () => {
    if (!selectedCapsule || !decryptedContent.trim() || !gameGuesses) {
      showError('Please decrypt the content and wait for guesses to load');
      return;
    }

    // Get selected guesses
    const selectedGuesses = gameGuesses.pending_guesses.filter(
      guess => validationSelections[guess.guess_pda]
    );

    if (selectedGuesses.length === 0) {
      showError('Please select at least one guess to validate');
      return;
    }

    const estimatedCost = selectedGuesses.length * 0.003;
    
    Alert.alert(
      'Confirm Validation',
      `This will validate ${selectedGuesses.length} guesses.\n\nEstimated cost: $${estimatedCost.toFixed(3)}\n\nYou will be charged for semantic validation services.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Validate',
          onPress: () => processValidation(selectedGuesses),
        },
      ]
    );
  };

  const processValidation = async (selectedGuesses: PendingGuess[]) => {
    if (!selectedCapsule || !walletAddress) return;

    try {
      setIsValidating(true);

      const validationPayload = {
        creator_wallet: walletAddress,
        capsule_id: selectedCapsule.capsule_id,
        decrypted_content: decryptedContent.trim(),
        validations: selectedGuesses.map(guess => ({
          guess_pda: guess.guess_pda,
          guess_content: guess.guess_content,
          guesser: guess.guesser,
        })),
      };

      const response = await apiService.post<any>(
        '/games/creator/validate-batch',
        validationPayload
      );

      if (response.success && response.data) {
        const { summary } = response.data;
        
        showSuccess(
          `Validation completed! ${summary.successful} guesses processed successfully. Cost: $${summary.validation_cost_usd.toFixed(3)}`
        );

        // Close modal and refresh data
        setShowValidationModal(false);
        await loadPendingValidations();

        // Show detailed results
        setTimeout(() => {
          Alert.alert(
            'Validation Results',
            `Total processed: ${summary.total_processed}\nSuccessful: ${summary.successful}\nFailed: ${summary.failed}\n\nTotal cost: $${summary.validation_cost_usd.toFixed(3)}`,
            [{ text: 'OK' }]
          );
        }, 1000);
      } else {
        showError(response.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Error processing validation:', error);
      showError('Failed to process validation');
    } finally {
      setIsValidating(false);
    }
  };

  const toggleGuessSelection = (guessPda: string) => {
    setValidationSelections(prev => ({
      ...prev,
      [guessPda]: !prev[guessPda],
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading pending validations...</Text>
      </View>
    );
  }

  if (!validationSummary || validationSummary.total_capsules === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcon
          name="check-circle-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No Pending Validations
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          All your gamified capsules have been validated or don't have any guesses yet.
        </Text>
        <Button mode="outlined" onPress={onRefresh} style={styles.refreshButton}>
          Refresh
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.summaryTitle}>
              Validation Summary
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="headlineSmall" style={styles.summaryNumber}>
                  {validationSummary.total_capsules}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Capsules
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineSmall" style={styles.summaryNumber}>
                  ?
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Total Guesses
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineSmall" style={styles.summaryNumber}>
                  TBD
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Est. Cost
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Pending Validations */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Pending Validations
        </Text>

        {validationSummary.pending_validations.map((validation, index) => (
          <Card key={validation.capsule_id} style={styles.validationCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <Text variant="titleMedium">
                    Capsule {validation.capsule_id.slice(0, 8)}...
                  </Text>
                  <Text variant="bodySmall" style={styles.revealDate}>
                    Revealed: {new Date(validation.reveal_date).toLocaleDateString()}
                  </Text>
                </View>
                <Chip
                  mode="outlined"
                  textStyle={styles.chipText}
                  style={styles.guessChip}
                >
                  Needs validation
                </Chip>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.costInfo}>
                <Text variant="bodyMedium">
                  <Text style={styles.costLabel}>Validation cost: </Text>
                  <Text style={styles.costAmount}>
                    TBD (loaded when selected)
                  </Text>
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={() => handleValidateCapsule(validation)}
                style={styles.validateButton}
                contentStyle={styles.validateButtonContent}
              >
                Validate Guesses
              </Button>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Validation Modal */}
      <Portal>
        <Modal
          visible={showValidationModal}
          onDismiss={() => setShowValidationModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalScroll}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Validate Guesses
            </Text>
            
            {selectedCapsule && (
              <>
                <Text variant="bodyMedium" style={styles.modalSubtitle}>
                  Capsule: {selectedCapsule.capsule_id.slice(0, 16)}...
                </Text>

                {/* Content Decryption */}
                <Card style={styles.contentCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.contentTitle}>
                      Decrypted Content
                    </Text>
                    {isDecryptingContent ? (
                      <View style={styles.decryptingContainer}>
                        <ActivityIndicator size="small" />
                        <Text style={styles.decryptingText}>Decrypting...</Text>
                      </View>
                    ) : (
                      <TextInput
                        value={decryptedContent}
                        onChangeText={setDecryptedContent}
                        placeholder="Decrypted content will appear here..."
                        multiline
                        numberOfLines={3}
                        style={styles.contentInput}
                        mode="outlined"
                      />
                    )}
                  </Card.Content>
                </Card>

                {/* Guesses List */}
                <Text variant="titleMedium" style={styles.guessesTitle}>
                  Select Guesses to Validate
                </Text>

                {isLoadingGuesses ? (
                  <View style={styles.decryptingContainer}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.decryptingText}>Loading guesses...</Text>
                  </View>
                ) : gameGuesses ? (
                  gameGuesses.pending_guesses.map((guess, index) => (
                    <Card key={guess.guess_pda} style={styles.guessCard}>
                      <Card.Content>
                        <View style={styles.guessHeader}>
                          <View style={styles.guessInfo}>
                            <Text variant="bodyMedium" style={styles.guessContent}>
                              "{guess.guess_content}"
                            </Text>
                            <Text variant="bodySmall" style={styles.guessMetadata}>
                              By: {formatWalletAddress(guess.guesser)} • {formatTimestamp(guess.timestamp)}
                              {guess.is_anonymous && ' • Anonymous'}
                            </Text>
                          </View>
                          <Switch
                            value={validationSelections[guess.guess_pda] || false}
                            onValueChange={() => toggleGuessSelection(guess.guess_pda)}
                          />
                        </View>
                      </Card.Content>
                    </Card>
                  ))
                ) : (
                  <Text variant="bodyMedium" style={styles.decryptingText}>
                    No guesses found for validation.
                  </Text>
                )}

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowValidationModal(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmitValidation}
                    loading={isValidating}
                    disabled={!decryptedContent.trim() || isValidating}
                    style={styles.submitButton}
                  >
                    {isValidating ? 'Processing...' : 'Submit Validation'}
                  </Button>
                </View>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      <AppSnackbar {...snackbar} onDismiss={hideSnackbar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
    color: colors.text,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  refreshButton: {
    marginTop: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  summaryTitle: {
    marginBottom: spacing.md,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.text,
  },
  validationCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitle: {
    flex: 1,
  },
  revealDate: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  guessChip: {
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.primary,
    fontSize: 12,
  },
  divider: {
    marginVertical: spacing.md,
  },
  costInfo: {
    marginBottom: spacing.md,
  },
  costLabel: {
    color: colors.textSecondary,
  },
  costAmount: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  validateButton: {
    marginTop: spacing.sm,
  },
  validateButtonContent: {
    paddingVertical: spacing.xs,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalTitle: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    color: colors.text,
  },
  modalSubtitle: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    color: colors.textSecondary,
  },
  contentCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  contentTitle: {
    marginBottom: spacing.md,
    color: colors.text,
  },
  decryptingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  decryptingText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  contentInput: {
    backgroundColor: colors.surface,
  },
  guessesTitle: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    color: colors.text,
  },
  guessCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  guessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  guessContent: {
    fontStyle: 'italic',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  guessMetadata: {
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});