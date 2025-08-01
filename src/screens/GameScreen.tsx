import * as anchor from '@coral-xyz/anchor';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Switch,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDualAuth } from '../providers';
import { apiService } from '../services/api';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import {
  colors,
  typography,
  spacing,
  layout,
  shadows,
  components,
} from '../theme';
import type { CapsuleGame, Guess, GuessesApiResponse } from '../types/api';

// Base URL for Blink service (contains deep link handler)
const BASE_BLINK_URL = 'https://capsulex-blink-production.up.railway.app';

// Helper function to shorten a URL using is.gd API
const shortenUrl = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(
      `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`
    );
    if (response.data.shorturl) {
      return response.data.shorturl;
    }
    console.error('Failed to shorten URL, response:', response.data);
    return url; // Fallback to original URL if shortening fails
  } catch (error) {
    console.error('Error shortening URL:', error);
    return url; // Fallback to original URL if shortening fails
  }
};

type RootStackParamList = {
  Game: {
    capsule_id: string;
    action?: 'view' | 'guess';
  };
};

type GameScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ route }: GameScreenProps) {
  const { capsule_id, action = 'view' } = route.params;
  const { isAuthenticated, walletAddress, connectWallet } = useDualAuth();
  const { submitGuess } = useCapsulexProgram();
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
  const { snackbar, showError, showInfo, hideSnackbar } = useSnackbar();

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

  // Check and maintain wallet connection
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (!isAuthenticated) {
        console.log('🔍 Wallet not authenticated, attempting reconnection...');
        try {
          await connectWallet();
          if (walletAddress) {
            console.log('✅ Wallet reconnected successfully');
            // Reload game data after successful reconnection
            await loadGameData();
          } else {
            console.log('❌ Wallet reconnection failed');
          }
        } catch (error) {
          console.error('Error during wallet reconnection:', error);
        }
      }
    };

    checkWalletConnection();
  }, [isAuthenticated, connectWallet, loadGameData]);

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

    if (!game) {
      showError('Game data not loaded');
      return;
    }

    setIsSubmitting(true);

    try {
      showInfo('Validating wallet connection...');

      // Double-check wallet connection before transaction
      if (!isAuthenticated) {
        showInfo('Reconnecting wallet...');
        await connectWallet();
        if (!walletAddress) {
          showError('Failed to reconnect wallet. Please try again.');
          return;
        }
      }

      // Note: Wallet session validation is now handled in useCapsulexProgram hook
      // This provides better separation of concerns and more robust validation

      showInfo('Creating transaction... Please approve in your wallet');

      // Derive game PDA from capsule PDA
      const gamePDA = new anchor.web3.PublicKey(game.game_id);

      // Submit guess using the Solana program
      const txSignature = await submitGuess.mutateAsync({
        gamePDA,
        guessContent: myGuess.trim(),
        isAnonymous,
      });

      console.log('✅ Guess submitted successfully:', txSignature);

      // Now register the guess in the backend database
      try {
        const CAPSULEX_PROGRAM_ID =
          'J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH';
        const programId = new anchor.web3.PublicKey(CAPSULEX_PROGRAM_ID);

        // Derive guess PDA for backend registration (using current_guesses count before submission)
        const currentGuessesBuffer = Buffer.from(
          new Uint32Array([game.current_guesses]).buffer
        );

        const [guessPDA] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            anchor.utils.bytes.utf8.encode('guess'),
            gamePDA.toBuffer(),
            new anchor.web3.PublicKey(walletAddress!).toBuffer(),
            currentGuessesBuffer,
          ],
          programId
        );

        const backendResponse = await apiService.post(
          `/games/${capsule_id}/guess`,
          {
            transaction_signature: txSignature,
            guesser_wallet: walletAddress,
            guess_content: myGuess.trim(),
            is_anonymous: isAnonymous,
            guess_pda: guessPDA.toBase58(),
            game_pda: gamePDA.toBase58(),
          }
        );

        if (backendResponse.success) {
          console.log('✅ Guess registered in database:', backendResponse.data);
          showInfo('🎯 Guess submitted successfully!');

          // Clear the input and refresh data
          setMyGuess('');
          setIsAnonymous(false);

          // Reload game data to show the new guess
          loadGameData();
        } else {
          console.warn(
            '⚠️ Backend registration failed:',
            backendResponse.error
          );
          showInfo(
            '🎯 Guess submitted on blockchain, but database sync failed. Your guess is still valid!'
          );
        }
      } catch (backendError) {
        console.warn('⚠️ Backend registration error:', backendError);
        showInfo(
          '🎯 Guess submitted on blockchain, but database sync failed. Your guess is still valid!'
        );
      }
    } catch (error) {
      console.error('Error submitting guess:', error);

      // Handle specific wallet connection errors with automatic retry
      if (
        error instanceof Error &&
        error.message.includes('wallet connection has expired')
      ) {
        showInfo('Wallet connection expired. Attempting to reconnect...');

        try {
          await connectWallet();
          if (walletAddress) {
            showInfo(
              'Wallet reconnected. Please try submitting your guess again.'
            );
          } else {
            showError(
              'Failed to reconnect wallet. Please reconnect manually and try again.'
            );
          }
        } catch (reconnectError) {
          console.error('Reconnection attempt failed:', reconnectError);
          showError(
            'Your wallet connection has expired. Please reconnect and try again.'
          );
        }
      } else {
        showError('Failed to submit guess. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share game function
  const handleShareGame = async () => {
    if (!game) return;

    try {
      const timeUntilReveal = game.reveal_date
        ? Math.max(0, new Date(game.reveal_date).getTime() - Date.now())
        : 0;
      const hoursLeft = Math.floor(timeUntilReveal / (1000 * 60 * 60));
      const timeText =
        timeUntilReveal > 0
          ? `⏰ ${hoursLeft}h left to guess!`
          : '🎉 Revealed!';

      const link = `${BASE_BLINK_URL}/game/${game.capsule_id}`;
      const shortLink = await shortenUrl(link);

      const shareText = `🎮 Join this CapsuleX Game!\n\n🎯 ${game.current_guesses}/${game.max_guesses} guesses\n👥 ${game.total_participants} players\n${timeText}\n\n${game.content_hint}\n\nCan you guess what's in this time capsule?\nCheck it out: ${shortLink}\n\n#CapsuleX #TimeCapsulesGame #CryptoGaming`;

      const result = await Share.share({
        message: shareText,
        title: 'Join my CapsuleX Game!',
      });

      if (result.action === Share.sharedAction) {
        showInfo('Game shared successfully! 🚀');
      }
    } catch (error) {
      console.error('Error sharing game:', error);
      showError('Failed to share game');
    }
  };

  // Share guess function
  const handleShareGuess = async (guess: Guess) => {
    try {
      const statusEmoji = guess.is_correct ? '✅' : guess.is_paid ? '💰' : '📝';
      const statusText = guess.is_correct
        ? 'Correct'
        : guess.is_paid
          ? 'Paid'
          : 'Submitted';

      const shareText = `🎯 My CapsuleX Guess ${statusEmoji}\n\n"${guess.guess_content}"\n\nStatus: ${statusText}\nDate: ${new Date(guess.submitted_at).toLocaleDateString()}\n\n#CapsuleX #CryptoGuess`;

      const result = await Share.share({
        message: shareText,
        title: 'My CapsuleX Guess',
      });

      if (result.action === Share.sharedAction) {
        showInfo('Guess shared successfully! 🚀');
      }
    } catch (error) {
      console.error('Error sharing guess:', error);
      showError('Failed to share guess');
    }
  };

  // Render hero content
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="gamepad-variant"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Game Arena</Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.highlightText}>{game?.current_guesses || 0}</Text>
          <Text style={styles.subtitleText}> guesses • </Text>
          <Text style={styles.highlightText}>
            {game?.total_participants || 0}
          </Text>
          <Text style={styles.subtitleText}> players</Text>
        </Text>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="target"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{game?.current_guesses || 0}</Text>
          <Text style={styles.statLabel}>Guesses</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="account-group"
            size={28}
            color={colors.premiumOrange}
          />
          <Text style={styles.statValue}>{game?.total_participants || 0}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={game?.is_revealed ? 'lock-open' : 'lock'}
            size={28}
            color={game?.is_revealed ? colors.success : colors.warning}
          />
          <Text style={styles.statValue}>
            {game?.is_revealed ? 'Open' : 'Locked'}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcon
          name="gamepad-variant-outline"
          size={64}
          color={colors.error}
          style={styles.errorIcon}
        />
        <Text style={styles.errorText}>Game not found</Text>
        <Button
          mode="contained"
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
        {/* Modern Hero Section with Gradient Background */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={[
              colors.surfaceVariant,
              Platform.OS === 'android'
                ? `rgba(29, 161, 242, 0.50)` // Much more visible on Android to match iOS
                : `rgba(29, 161, 242, 0.08)`, // Subtle on iOS
              colors.surfaceVariant,
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={[
              styles.gradient,
              styles.gradientFix, // Force proper dimensions
              Platform.OS === 'android' && styles.androidGradientEnhancement,
            ]}
          >
            {renderHeroContent()}
          </LinearGradient>
        </View>

        {/* Share Game Button */}
        <View style={styles.shareButtonContainer}>
          <Button
            mode="outlined"
            onPress={handleShareGame}
            style={styles.shareButton}
            contentStyle={styles.shareButtonContent}
            icon={() => (
              <MaterialCommunityIcon
                name="share-variant"
                size={20}
                color={colors.primary}
              />
            )}
          >
            Share Game
          </Button>
        </View>

        {/* Game Header */}
        <Card style={styles.gameCard}>
          <Card.Content>
            <View style={styles.gameHeader}>
              <View style={styles.gameTitleContainer}>
                <MaterialCommunityIcon
                  name="trophy"
                  size={24}
                  color={colors.primary}
                  style={styles.gameTitleIcon}
                />
                <Text variant="headlineSmall" style={styles.gameTitle}>
                  Time Capsule Game
                </Text>
              </View>
              <Chip
                mode={isGameRevealed ? 'flat' : 'outlined'}
                style={[
                  styles.statusChip,
                  isGameRevealed ? styles.revealedChip : styles.activeChip,
                ]}
                icon={() => (
                  <MaterialCommunityIcon
                    name={isGameRevealed ? 'lock-open' : 'lock'}
                    size={16}
                    color={isGameRevealed ? colors.success : colors.warning}
                  />
                )}
              >
                {isGameRevealed ? 'Revealed' : 'Active'}
              </Chip>
            </View>

            <View style={styles.gameInfoContainer}>
              <View style={styles.gameInfoItem}>
                <MaterialCommunityIcon
                  name="identifier"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.gameInfoIcon}
                />
                <Text style={styles.gameId}>
                  Game ID: {capsule_id.slice(0, 8)}...
                </Text>
              </View>

              <View style={styles.gameInfoItem}>
                <MaterialCommunityIcon
                  name="calendar-clock"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.gameInfoIcon}
                />
                <Text style={styles.revealDate}>
                  {new Date(game.reveal_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.gameStatsContainer}>
                <Chip
                  mode="outlined"
                  style={styles.statChip}
                  icon={() => (
                    <MaterialCommunityIcon
                      name="account-group"
                      size={16}
                      color={colors.textSecondary}
                    />
                  )}
                >
                  {game.total_participants} player
                  {game.total_participants !== 1 ? 's' : ''}
                </Chip>
                <Chip
                  mode="outlined"
                  style={styles.statChip}
                  icon={() => (
                    <MaterialCommunityIcon
                      name="target"
                      size={16}
                      color={colors.textSecondary}
                    />
                  )}
                >
                  {game.current_guesses}/{game.max_guesses} guesses
                </Chip>
              </View>
            </View>

            <View style={styles.hintContainer}>
              <View style={styles.hintLabelContainer}>
                <MaterialCommunityIcon
                  name="lightbulb-outline"
                  size={16}
                  color={colors.primary}
                  style={styles.hintIcon}
                />
                <Text style={styles.hintLabel}>Content Hint:</Text>
              </View>
              <Text style={styles.hintText}>{game.content_hint}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Authentication Message */}
        {!isAuthenticated && (
          <Card style={styles.authCard}>
            <Card.Content>
              <View style={styles.authContainer}>
                <MaterialCommunityIcon
                  name="wallet-outline"
                  size={20}
                  color={colors.warning}
                  style={styles.authIcon}
                />
                <Text style={styles.authText}>
                  Connect your wallet to participate in this game
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Existing Guess */}
        {myExistingGuess && (
          <Card style={styles.existingGuessCard}>
            <Card.Content>
              <View style={styles.existingGuessHeader}>
                <View style={styles.existingGuessTitleContainer}>
                  <MaterialCommunityIcon
                    name="check-circle"
                    size={20}
                    color={colors.success}
                    style={styles.existingGuessIcon}
                  />
                  <Text style={styles.existingGuessTitle}>Your Guess</Text>
                </View>
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcon
                      name="share-variant"
                      size={20}
                      color={colors.success}
                    />
                  )}
                  onPress={() => handleShareGuess(myExistingGuess)}
                  style={styles.guessShareButton}
                />
              </View>
              <Text style={styles.existingGuessContent}>
                "{myExistingGuess.guess_content}"
              </Text>
              <View style={styles.guesseMeta}>
                <Chip
                  mode="outlined"
                  style={[
                    styles.guessStatusChip,
                    myExistingGuess.is_correct
                      ? styles.correctChip
                      : myExistingGuess.is_paid
                        ? styles.paidChip
                        : styles.submittedChip,
                  ]}
                  icon={() => (
                    <MaterialCommunityIcon
                      name={
                        myExistingGuess.is_correct
                          ? 'check-circle'
                          : myExistingGuess.is_paid
                            ? 'currency-usd'
                            : 'pencil'
                      }
                      size={16}
                      color={
                        myExistingGuess.is_correct
                          ? colors.success
                          : myExistingGuess.is_paid
                            ? colors.premiumOrange
                            : colors.primary
                      }
                    />
                  )}
                >
                  {myExistingGuess.is_correct
                    ? 'Correct'
                    : myExistingGuess.is_paid
                      ? 'Paid'
                      : 'Submitted'}
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
              <View style={styles.guessTitleContainer}>
                <MaterialCommunityIcon
                  name="pencil-outline"
                  size={20}
                  color={colors.primary}
                  style={styles.guessTitleIcon}
                />
                <Text variant="titleMedium" style={styles.guessTitle}>
                  Submit Your Guess
                </Text>
              </View>

              <TextInput
                ref={guessInputRef}
                mode="outlined"
                placeholder="What do you think is in this time capsule?"
                value={myGuess}
                textColor={colors.text}
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
                loading={isSubmitting || submitGuess.isPending}
                disabled={
                  isSubmitting || submitGuess.isPending || !myGuess.trim()
                }
                style={styles.submitButton}
              >
                {isSubmitting || submitGuess.isPending
                  ? 'Submitting...'
                  : 'Submit Guess'}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Game Instructions */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <View style={styles.instructionsTitleContainer}>
              <MaterialCommunityIcon
                name="information-outline"
                size={20}
                color={colors.primary}
                style={styles.instructionsTitleIcon}
              />
              <Text variant="titleMedium" style={styles.instructionsTitle}>
                How to Play
              </Text>
            </View>
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
              <View style={styles.guessesTitleContainer}>
                <MaterialCommunityIcon
                  name="format-list-bulleted"
                  size={20}
                  color={colors.primary}
                  style={styles.guessesTitleIcon}
                />
                <Text variant="titleMedium" style={styles.guessesTitle}>
                  Recent Guesses ({guesses.length})
                </Text>
              </View>

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
    ...layout.screenContainer,
  },
  centerContainer: {
    ...layout.centered,
    ...layout.premiumSpacing,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.headlineSmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    ...components.primaryButton,
    marginTop: spacing.md,
  },

  // Modern Hero Section (from established pattern)
  heroContainer: {
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titleIcon: {
    marginRight: spacing.sm,
  },
  heroTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontWeight: 'bold',
    textShadowColor: colors.primary + '20',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  highlightText: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: 'bold',
  },
  subtitleText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    ...typography.headlineMedium,
    color: colors.text,
  },
  statLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  // Fix for LinearGradient rendering issues
  gradientFix: {
    flex: 1,
    width: '100%',
    minHeight: 200,
  },
  // Android gradient enhancement
  androidGradientEnhancement: {
    borderWidth: 1,
    borderColor: colors.primary + '30',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: 'rgba(29, 161, 242, 0.02)',
  },

  // Share Button Styles
  shareButtonContainer: {
    paddingHorizontal: spacing.md,
    marginTop: -spacing.sm, // Slight overlap with hero section
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  shareButton: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 25,
    minWidth: 160,
    backgroundColor: colors.surface + '90', // Semi-transparent background
  },
  shareButtonContent: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  // Game Header Styles
  gameCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gameTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameTitleIcon: {
    marginRight: spacing.sm,
  },
  gameTitle: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
  },
  statusChip: {
    borderRadius: 12,
  },
  revealedChip: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  activeChip: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  gameInfoContainer: {
    gap: spacing.sm,
  },
  gameInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gameInfoIcon: {
    marginRight: spacing.sm,
  },
  gameId: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  revealDate: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  gameStatsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statChip: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  hintContainer: {
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  hintLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  hintIcon: {
    marginRight: spacing.sm,
  },
  hintLabel: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  hintText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Auth Card
  authCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  authContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIcon: {
    marginRight: spacing.sm,
  },
  authText: {
    ...typography.bodyMedium,
    color: colors.warning,
    textAlign: 'center',
  },

  // Existing Guess
  existingGuessCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.success + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  existingGuessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  existingGuessTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  existingGuessIcon: {
    marginRight: spacing.sm,
  },
  existingGuessTitle: {
    ...typography.titleMedium,
    color: colors.success,
    fontWeight: 'bold',
  },
  guessShareButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  existingGuessContent: {
    ...typography.bodyLarge,
    color: colors.text,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  guesseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessStatusChip: {
    borderRadius: 12,
  },
  correctChip: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  paidChip: {
    backgroundColor: colors.premiumOrange + '20',
    borderColor: colors.premiumOrange,
  },
  submittedChip: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  guessDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Guess Form
  guessCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  guessTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  guessTitleIcon: {
    marginRight: spacing.sm,
  },
  guessTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  guessInput: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  characterCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  anonymousToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submitButton: {
    ...components.primaryButton,
    marginTop: spacing.sm,
  },

  // Instructions
  instructionsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  instructionsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  instructionsTitleIcon: {
    marginRight: spacing.sm,
  },
  instructionsTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  instructionsText: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
  },

  // Guesses List
  guessesCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  guessesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  guessesTitleIcon: {
    marginRight: spacing.sm,
  },
  guessesTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  guessItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  guessItemContent: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  guessItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessItemWallet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  guessItemDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  moreGuessesText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});
