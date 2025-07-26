import * as anchor from '@coral-xyz/anchor';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useAuth } from '../contexts';
import { useSnackbar } from '../hooks/useSnackbar';
import { apiService } from '../services/api';
import type { CapsuleGame, Guess, GuessesApiResponse } from '../types/api';

type RootStackParamList = {
  Game: {
    capsule_id: string;
    action?: 'view' | 'guess';
  };
};

type GameScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;


export function GameScreen({ route }: GameScreenProps) {
  const { capsule_id, action = 'view' } = route.params;
  const { isAuthenticated, walletAddress } = useAuth();
  const [game, setGame] = useState<CapsuleGame | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [myGuess, setMyGuess] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldFocusGuessInput, setShouldFocusGuessInput] = useState(
    action === 'guess'
  );
  const guessInputRef = useRef<any>(null);
  const { snackbar, showError, showInfo, hideSnackbar } =
    useSnackbar();

  // Load game data
  const loadGameData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch game details
      const gameResponse = await apiService.get(`/games/${capsule_id}`);
      if (gameResponse.success) {
        setGame(gameResponse.data as CapsuleGame);
      } else {
        console.error('Failed to load game details');
        return;
      }

      // Fetch existing guesses
      const guessesResponse = await apiService.get(
        `/games/${capsule_id}/guesses`
      );
      if (guessesResponse.success && guessesResponse.data) {
        const guessesData = guessesResponse.data as GuessesApiResponse;
        setGuesses(guessesData.guesses || []);
      } else {
        setGuesses([]);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
      setGuesses([]);
    } finally {
      setIsLoading(false);
    }
  }, [capsule_id]);

  // Refresh game data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setIsLoading(true);

      // Fetch game details
      const gameResponse = await apiService.get(`/games/${capsule_id}`);
      if (gameResponse.success) {
        setGame(gameResponse.data as CapsuleGame);
      } else {
        console.error('Failed to load game details');
        return;
      }

      // Fetch existing guesses
      const guessesResponse = await apiService.get(
        `/games/${capsule_id}/guesses`
      );
      if (guessesResponse.success && guessesResponse.data) {
        const guessesData = guessesResponse.data as GuessesApiResponse;
        setGuesses(guessesData.guesses || []);
      } else {
        setGuesses([]);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
      setGuesses([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [capsule_id]);

  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadGameData();
    }, [loadGameData])
  );

  // Auto-focus guess input when action is 'guess'
  useEffect(() => {
    if (shouldFocusGuessInput && !isLoading && game && !game.is_revealed) {
      setTimeout(() => {
        guessInputRef.current?.focus();
        setShouldFocusGuessInput(false);
      }, 500);
    }
  }, [shouldFocusGuessInput, isLoading, game]);

  // Submit guess
  const handleSubmitGuess = async () => {
    if (!isAuthenticated) {
      showError('Please connect your wallet to submit a guess');
      return;
    }

    if (!myGuess.trim()) {
      showError('Please enter your guess');
      return;
    }

    if (myGuess.length > 280) {
      showError('Guess must be 280 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      showInfo('Creating transaction... Please approve in your wallet');


      // Derive guess PDA
      const CAPSULEX_PROGRAM_ID =
        'J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH';
      const programId = new anchor.web3.PublicKey(CAPSULEX_PROGRAM_ID);

      const [guessPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode('guess'),
          new anchor.web3.PublicKey(game!.capsule_pda).toBuffer(),
          new anchor.web3.PublicKey(walletAddress!).toBuffer(),
        ],
        programId
      );

      // For now, we'll show a message about using Blinks for submission
      // TODO: Implement direct Solana transaction submission in mobile app
      showInfo(
        'Please use the Blink link from Twitter or web to submit your guess with Solana transaction'
      );

      // Alternative: Open Blink URL
      // const blinkUrl = `https://capsulex-blink-production.up.railway.app/api/guess/${capsule_id}`;
      // Linking.openURL(blinkUrl);
    } catch (error) {
      console.error('Error submitting guess:', error);
      showError('Failed to submit guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Game not found</Text>
        <Button
          mode="outlined"
          onPress={loadGameData}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  const isGameRevealed = game.is_revealed;
  const canSubmitGuess = isAuthenticated && !isGameRevealed && game.is_active;
  const myExistingGuess = guesses?.find(g => g.guesser === walletAddress);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Game Header */}
        <Card style={styles.gameCard}>
          <Card.Content>
            <View style={styles.gameHeader}>
              <Text variant="headlineSmall" style={styles.gameTitle}>
                🎯 Time Capsule Game
              </Text>
              <Chip
                mode={isGameRevealed ? 'flat' : 'outlined'}
                textStyle={styles.statusChipText}
              >
                {isGameRevealed ? '🔓 Revealed' : '🔒 Active'}
              </Chip>
            </View>

            <Text style={styles.gameId}>
              Game ID: {capsule_id.slice(0, 8)}...
            </Text>

            <Text style={styles.revealDate}>
              Reveal Date:{' '}
              {new Date(game.reveal_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <Text style={styles.participantCount}>
              👥 {game.total_participants} participant
              {game.total_participants !== 1 ? 's' : ''}
            </Text>

            <Text style={styles.guessesCount}>
              🎯 {game.current_guesses}/{game.max_guesses} guesses
            </Text>

            <View style={styles.hintContainer}>
              <Text style={styles.hintLabel}>💡 Content Hint:</Text>
              <Text style={styles.hintText}>{game.content_hint}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Authentication Message */}
        {!isAuthenticated && (
          <Card style={styles.authCard}>
            <Card.Content>
              <Text style={styles.authText}>
                🔐 Connect your wallet to participate in this game
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Existing Guess */}
        {myExistingGuess && (
          <Card style={styles.existingGuessCard}>
            <Card.Content>
              <Text style={styles.existingGuessTitle}>Your Guess</Text>
              <Text style={styles.existingGuessContent}>
                "{myExistingGuess.guess_content}"
              </Text>
              <View style={styles.guesseMeta}>
                <Chip mode="outlined">
                  {myExistingGuess.is_correct ? '✅ Correct' : myExistingGuess.is_paid ? '💰 Paid' : '📝 Submitted'}
                </Chip>
                <Text style={styles.guessDate}>
                  {new Date(myExistingGuess.submitted_at).toLocaleDateString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Guess Submission Form */}
        {canSubmitGuess && !myExistingGuess && (
          <Card style={styles.guessCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.guessTitle}>
                Submit Your Guess
              </Text>

              <TextInput
                ref={guessInputRef}
                mode="outlined"
                placeholder="What do you think is in this time capsule?"
                value={myGuess}
                onChangeText={setMyGuess}
                multiline
                numberOfLines={3}
                style={styles.guessInput}
                maxLength={280}
              />

              <Text style={styles.characterCount}>
                {myGuess.length}/280 characters
              </Text>

              <View style={styles.anonymousToggle}>
                <Text>Submit anonymously</Text>
                <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
              </View>

              <Button
                mode="contained"
                onPress={handleSubmitGuess}
                loading={isSubmitting}
                disabled={isSubmitting || !myGuess.trim()}
                style={styles.submitButton}
              >
                Submit Guess
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Game Instructions */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.instructionsTitle}>
              🎮 How to Play
            </Text>
            <Text style={styles.instructionsText}>
              • Submit your guess about what's in this time capsule{'\n'}• Each
              guess requires a small SOL transaction{'\n'}• Winners earn points
              when the capsule is revealed{'\n'}• Use Solana Blinks for easy
              blockchain transactions
            </Text>
          </Card.Content>
        </Card>

        {/* Recent Guesses */}
        {guesses && guesses.length > 0 && (
          <Card style={styles.guessesCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.guessesTitle}>
                Recent Guesses ({guesses.length})
              </Text>

              {guesses.slice(0, 5).map(guess => (
                <View key={guess.guess_id} style={styles.guessItem}>
                  <Text style={styles.guessItemContent}>
                    "{guess.guess_content}"
                  </Text>
                  <View style={styles.guessItemMeta}>
                    <Text style={styles.guessItemWallet}>
                      {guess.is_anonymous || !guess.guesser
                        ? 'Anonymous'
                        : `${guess.guesser.slice(0, 4)}...${guess.guesser.slice(-4)}`}
                    </Text>
                    <Text style={styles.guessItemDate}>
                      {new Date(guess.submitted_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}

              {guesses.length > 5 && (
                <Text style={styles.moreGuessesText}>
                  +{guesses.length - 5} more guesses...
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#d32f2f',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },

  // Game Header Styles
  gameCard: {
    margin: 16,
    marginBottom: 8,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  statusChipText: {
    fontSize: 12,
  },
  gameId: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  revealDate: {
    fontWeight: '500',
    marginBottom: 8,
  },
  participantCount: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  guessesCount: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
    fontWeight: '500',
  },
  hintContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  hintLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1565C0',
  },
  hintText: {
    color: '#424242',
    fontStyle: 'italic',
  },

  // Auth Card
  authCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  authText: {
    color: '#E65100',
    textAlign: 'center',
  },

  // Existing Guess
  existingGuessCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  existingGuessTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2E7D32',
  },
  existingGuessContent: {
    fontSize: 16,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  guesseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessDate: {
    fontSize: 12,
    opacity: 0.7,
  },

  // Guess Form
  guessCard: {
    margin: 16,
    marginTop: 8,
  },
  guessTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  guessInput: {
    marginBottom: 8,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 16,
  },
  anonymousToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },

  // Instructions
  instructionsCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#F3E5F5',
  },
  instructionsTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  instructionsText: {
    lineHeight: 20,
    color: '#4A148C',
  },

  // Guesses List
  guessesCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  guessesTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  guessItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  guessItemContent: {
    fontSize: 14,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  guessItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessItemWallet: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  guessItemDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  moreGuessesText: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 8,
  },
});
