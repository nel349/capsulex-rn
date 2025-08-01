import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Avatar,
  IconButton,
  Searchbar,
  ActivityIndicator,
} from 'react-native-paper';

import type { EnhancedCapsule } from '../components/capsules/types';
import { discoverService } from '../services/discoverService';
import { colors, typography, spacing, layout, shadows } from '../theme';

// Navigation types
type RootStackParamList = {
  CapsuleDetails: {
    capsule: EnhancedCapsule;
  };
  Game: {
    capsule_id: string;
    action?: 'view' | 'guess';
  };
};

type DiscoverScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type TabType = 'feed' | 'games' | 'leaderboard';

export function DiscoverScreen() {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'revealed'>('all');

  // React Query hooks with optimized caching and minimal requests
  const {
    data: revealedCapsules = [],
    isLoading: revealedLoading,
    refetch: refetchRevealed,
    isFetching: revealedFetching,
  } = useQuery({
    queryKey: ['discover', 'revealedCapsules'],
    queryFn: () => discoverService.getRevealedCapsules(50),
    staleTime: 60 * 1000, // 1 minute - data is fresh for 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch when app comes back to foreground
    refetchOnMount: 'always', // Always fetch on first mount
    refetchOnReconnect: false, // Don't refetch on network reconnection
    refetchInterval: false, // No automatic interval refetching
    retry: 1, // Only retry once on failure
  });

  const {
    data: activeGames = [],
    isLoading: gamesLoading,
    refetch: refetchGames,
    isFetching: gamesFetching,
  } = useQuery({
    queryKey: ['discover', 'activeGames'],
    queryFn: () => discoverService.getActiveGames(20),
    staleTime: 60 * 1000, // 1 minute - data is fresh for 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch on first mount
    refetchOnReconnect: false,
    refetchInterval: false, // No automatic interval refetching
    retry: 1, // Only retry once on failure
  });

  const {
    data: leaderboard = [],
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
    isFetching: leaderboardFetching,
  } = useQuery({
    queryKey: ['discover', 'globalLeaderboard'],
    queryFn: () => discoverService.getGlobalLeaderboard('all_time', 10),
    staleTime: 60 * 1000, // 1 minute - data is fresh for 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch on first mount
    refetchOnReconnect: false,
    refetchInterval: false, // No automatic interval refetching
    retry: 1, // Only retry once on failure
  });

  // Combined loading state
  const loading = revealedLoading || gamesLoading || leaderboardLoading;

  // Combined refreshing state (only when manually triggered)
  const refreshing = revealedFetching || gamesFetching || leaderboardFetching;

  // Manual refresh function - only refetch active tab data
  const onRefresh = async () => {
    if (activeTab === 'feed') {
      await refetchRevealed();
    } else if (activeTab === 'games') {
      await refetchGames();
    } else if (activeTab === 'leaderboard') {
      await refetchLeaderboard();
    }
  };

  const filteredCapsules = revealedCapsules.filter(capsule => {
    const matchesSearch =
      capsule.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      capsule.creator_display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'revealed' && capsule.revealed) ||
      (filter === 'pending' && !capsule.revealed);
    return matchesSearch && matchesFilter;
  });

  const filteredGames = activeGames.filter(game => {
    return (
      game.creator_display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) || searchQuery === ''
    );
  });

  const filteredLeaderboard = leaderboard.filter(entry => {
    return (
      entry.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === ''
    );
  });

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatCountdown = (timestamp: number) => {
    const target = new Date(timestamp * 1000);
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return 'Ready to reveal!';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Render hero content (shared between iOS gradient and Android fallback)
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="compass"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Discover</Text>
      </View>
      <View style={styles.subtitleContainer}>
        {activeGames.length > 0 ? (
          <Text style={styles.heroSubtitle}>
            <Text style={styles.highlightText}>{activeGames.length}</Text>
            <Text style={styles.subtitleText}> active games • </Text>
            <Text style={styles.highlightText}>{revealedCapsules.length}</Text>
            <Text style={styles.subtitleText}> revealed capsules</Text>
          </Text>
        ) : (
          <Text style={styles.heroSubtitle}>
            <Text style={styles.highlightText}>{revealedCapsules.length}</Text>
            <Text style={styles.subtitleText}> public capsules • </Text>
            <Text style={styles.highlightText}>{leaderboard.length}</Text>
            <Text style={styles.subtitleText}> community leaders</Text>
          </Text>
        )}
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon name="star" size={28} color={colors.primary} />
          <Text style={styles.statValue}>{revealedCapsules.length}</Text>
          <Text style={styles.statLabel}>Revealed</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="gamepad-variant"
            size={28}
            color={colors.premiumOrange}
          />
          <Text style={styles.statValue}>{activeGames.length}</Text>
          <Text style={styles.statLabel}>Active Games</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="trophy"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{leaderboard.length}</Text>
          <Text style={styles.statLabel}>Leaders</Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Unified Hero Section with Gradient Background */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[
            colors.surface,
            Platform.OS === 'android'
              ? `rgba(29, 161, 242, 0.50)` // Much more visible on Android to match iOS
              : `rgba(29, 161, 242, 0.08)`, // Subtle on iOS
            colors.surface,
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'feed', label: 'Recent Reveals', icon: 'star' },
            { key: 'games', label: 'Active Games', icon: 'gamepad-variant' },
            { key: 'leaderboard', label: 'Leaders', icon: 'trophy' },
          ].map(tab => (
            <Chip
              key={tab.key}
              mode={activeTab === tab.key ? 'flat' : 'outlined'}
              selected={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key as TabType)}
              style={styles.tabChip}
              icon={() => (
                <MaterialCommunityIcon
                  name={tab.icon as any}
                  size={18}
                  color={
                    activeTab === tab.key
                      ? colors.primary
                      : colors.primaryVariant
                  }
                />
              )}
            >
              <Text
                style={{
                  color:
                    activeTab === tab.key ? colors.text : colors.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search capsules..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Filters - only show for feed tab */}
      {activeTab === 'feed' && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All' },
              { key: 'revealed', label: 'Revealed' },
              { key: 'pending', label: 'Pending' },
            ].map(filterOption => (
              <Chip
                key={filterOption.key}
                mode={filter === filterOption.key ? 'flat' : 'outlined'}
                selected={filter === filterOption.key}
                onPress={() =>
                  setFilter(filterOption.key as 'all' | 'pending' | 'revealed')
                }
                style={styles.filterChip}
              >
                {filterOption.label}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading discover content...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'feed' && (
            <>
              {filteredCapsules.map(capsule => (
                <TouchableOpacity
                  key={capsule.id}
                  onPress={() => {
                    // Navigate to CapsuleDetails with enhanced data structure
                    navigation.navigate('CapsuleDetails', {
                      capsule: {
                        publicKey: capsule.on_chain_id || '',
                        account: {
                          creator: '',
                          nftMint: '',
                          revealDate: capsule.reveal_date_timestamp,
                          createdAt: capsule.reveal_date_timestamp,
                          encryptedContent: '',
                          contentStorage: {},
                          contentIntegrityHash: capsule.content_hash,
                          isGamified: false,
                          isRevealed: capsule.revealed,
                          isActive: true,
                          bump: 0,
                        },
                        status: capsule.revealed ? 'revealed' : 'pending',
                        databaseData: {
                          capsule_id: capsule.id,
                          user_id: '',
                          content_encrypted: '',
                          content_hash: capsule.content_hash,
                          has_media: false,
                          media_urls: [],
                          reveal_date: capsule.revealed
                            ? new Date(
                                capsule.reveal_date_timestamp * 1000
                              ).toISOString()
                            : new Date(
                                capsule.reveal_date_timestamp * 1000
                              ).toISOString(),
                          created_at: new Date(
                            capsule.reveal_date_timestamp * 1000
                          ).toISOString(),
                          on_chain_tx: capsule.on_chain_id || '',
                          sol_fee_amount: 0,
                          status: capsule.revealed ? 'revealed' : 'pending',
                          social_post_id: undefined,
                          posted_to_social: capsule.is_public,
                        },
                      },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Card style={styles.capsuleCard}>
                    <Card.Content>
                      {/* Author Header */}
                      <View style={styles.authorHeader}>
                        <Avatar.Text
                          size={40}
                          label={
                            capsule.creator_display_name?.charAt(0) ||
                            capsule.creator.slice(0, 1).toUpperCase()
                          }
                          style={styles.avatar}
                        />
                        <View style={styles.authorInfo}>
                          <Text variant="bodyMedium" style={styles.authorName}>
                            {capsule.creator_display_name || 'Anonymous'}
                          </Text>
                          <Text variant="bodySmall" style={styles.authorWallet}>
                            {formatWalletAddress(capsule.creator)}
                          </Text>
                        </View>
                        <View style={styles.headerRight}>
                          {capsule.twitter_username && (
                            <View style={styles.platformContainer}>
                              <MaterialCommunityIcon
                                name="twitter"
                                size={14}
                                color={colors.primary}
                                style={styles.platformIcon}
                              />
                              <Text variant="bodySmall" style={styles.platform}>
                                @{capsule.twitter_username}
                              </Text>
                            </View>
                          )}
                          <IconButton
                            icon="arrow-right"
                            size={16}
                            onPress={e => {
                              e.stopPropagation();
                              navigation.navigate('CapsuleDetails', {
                                capsule: {
                                  publicKey: capsule.on_chain_id || '',
                                  account: {
                                    creator: '',
                                    nftMint: '',
                                    revealDate: capsule.reveal_date_timestamp,
                                    createdAt: capsule.reveal_date_timestamp,
                                    encryptedContent: '',
                                    contentStorage: {},
                                    contentIntegrityHash: capsule.content_hash,
                                    isGamified: false,
                                    isRevealed: capsule.revealed,
                                    isActive: true,
                                    bump: 0,
                                  },
                                  status: capsule.revealed
                                    ? 'revealed'
                                    : 'pending',
                                  databaseData: {
                                    capsule_id: capsule.id,
                                    user_id: '',
                                    content_encrypted: '',
                                    content_hash: capsule.content_hash,
                                    has_media: false,
                                    media_urls: [],
                                    reveal_date: new Date(
                                      capsule.reveal_date_timestamp * 1000
                                    ).toISOString(),
                                    created_at: new Date(
                                      capsule.reveal_date_timestamp * 1000
                                    ).toISOString(),
                                    on_chain_tx: capsule.on_chain_id || '',
                                    sol_fee_amount: 0,
                                    status: capsule.revealed
                                      ? 'revealed'
                                      : 'pending',
                                    social_post_id: undefined,
                                    posted_to_social: capsule.is_public,
                                  },
                                },
                              });
                            }}
                          />
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View style={styles.statusContainer}>
                        <Chip
                          mode="outlined"
                          style={[
                            styles.statusChip,
                            capsule.revealed
                              ? styles.revealedChip
                              : styles.pendingChip,
                          ]}
                          icon={() => (
                            <MaterialCommunityIcon
                              name={
                                capsule.revealed
                                  ? 'check-circle'
                                  : 'clock-outline'
                              }
                              size={16}
                              color={
                                capsule.revealed
                                  ? colors.success
                                  : colors.warning
                              }
                            />
                          )}
                        >
                          {capsule.revealed
                            ? `Revealed ${formatTimestamp(capsule.reveal_date_timestamp)}`
                            : `Reveals in ${formatCountdown(capsule.reveal_date_timestamp)}`}
                        </Chip>
                      </View>

                      {/* Content */}
                      <Text variant="bodyMedium" style={styles.content}>
                        {capsule.content}
                      </Text>

                      {/* Game Badge */}
                      {capsule.is_game && (
                        <TouchableOpacity
                          onPress={e => {
                            e.stopPropagation();
                            navigation.navigate('Game', {
                              capsule_id: capsule.id,
                              action: 'view',
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <Chip
                            icon="gamepad-variant"
                            mode="outlined"
                            style={styles.gameChip}
                          >
                            Game Capsule - Tap to Play
                          </Chip>
                        </TouchableOpacity>
                      )}

                      {/* Footer */}
                      <View style={styles.footer}>
                        <Text variant="bodySmall" style={styles.timestamp}>
                          {capsule.reveal_date_timestamp
                            ? formatTimestamp(capsule.reveal_date_timestamp)
                            : ''}
                        </Text>
                        <View style={styles.actions}>
                          <IconButton
                            icon="information-outline"
                            size={20}
                            onPress={e => {
                              e.stopPropagation();
                              navigation.navigate('CapsuleDetails', {
                                capsule: {
                                  publicKey: capsule.on_chain_id || '',
                                  account: {
                                    creator: '',
                                    nftMint: '',
                                    revealDate: capsule.reveal_date_timestamp,
                                    createdAt: capsule.reveal_date_timestamp,
                                    encryptedContent: '',
                                    contentStorage: {},
                                    contentIntegrityHash: capsule.content_hash,
                                    isGamified: false,
                                    isRevealed: capsule.revealed,
                                    isActive: true,
                                    bump: 0,
                                  },
                                  status: capsule.revealed
                                    ? 'revealed'
                                    : 'pending',
                                  databaseData: {
                                    capsule_id: capsule.id,
                                    user_id: '',
                                    content_encrypted: '',
                                    content_hash: capsule.content_hash,
                                    has_media: false,
                                    media_urls: [],
                                    reveal_date: new Date(
                                      capsule.reveal_date_timestamp * 1000
                                    ).toISOString(),
                                    created_at: new Date(
                                      capsule.reveal_date_timestamp * 1000
                                    ).toISOString(),
                                    on_chain_tx: capsule.on_chain_id || '',
                                    sol_fee_amount: 0,
                                    status: capsule.revealed
                                      ? 'revealed'
                                      : 'pending',
                                    social_post_id: undefined,
                                    posted_to_social: capsule.is_public,
                                  },
                                },
                              });
                            }}
                          />
                          <IconButton
                            icon="share-variant"
                            size={20}
                            onPress={() => {
                              // TODO: Implement share functionality
                            }}
                          />
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))}

              {/* Empty State */}
              {filteredCapsules.length === 0 && (
                <View style={styles.emptyState}>
                  <Text variant="headlineSmall" style={styles.emptyTitle}>
                    No capsules found
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Be the first to create a public time capsule!'}
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'games' && (
            <>
              {filteredGames.map(game => (
                <TouchableOpacity
                  key={game.game_id}
                  onPress={() => {
                    navigation.navigate('Game', {
                      capsule_id: game.capsule_id,
                      action: 'view',
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Card style={styles.capsuleCard}>
                    <Card.Content>
                      {/* Game Header */}
                      <View style={styles.authorHeader}>
                        <Avatar.Text
                          size={40}
                          label={
                            game.creator_display_name?.charAt(0) ||
                            game.creator.slice(0, 1).toUpperCase()
                          }
                          style={[styles.avatar, styles.gameAvatar]}
                        />
                        <View style={styles.authorInfo}>
                          <Text variant="bodyMedium" style={styles.authorName}>
                            {game.creator_display_name || 'Anonymous'}
                          </Text>
                          <Text variant="bodySmall" style={styles.authorWallet}>
                            {formatWalletAddress(game.creator)}
                          </Text>
                        </View>
                        <View style={styles.headerRight}>
                          <View style={styles.gameStatsHeader}>
                            <MaterialCommunityIcon
                              name="account-group"
                              size={14}
                              color={colors.textSecondary}
                              style={styles.statsIcon}
                            />
                            <Text variant="bodySmall" style={styles.gameStats}>
                              {game.total_participants} players
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Game Content Hint */}
                      <View style={styles.contentHintContainer}>
                        <MaterialCommunityIcon
                          name="lightbulb-outline"
                          size={16}
                          color={colors.primary}
                          style={styles.hintIcon}
                        />
                        <Text variant="bodyMedium" style={styles.content}>
                          {game.content_hint}
                        </Text>
                      </View>

                      {/* Game Stats */}
                      <View style={styles.gameStatsContainer}>
                        <Chip
                          mode="outlined"
                          style={styles.statChip}
                          icon={() => (
                            <MaterialCommunityIcon
                              name="pencil"
                              size={16}
                              color={colors.textSecondary}
                            />
                          )}
                        >
                          {game.current_guesses}/{game.max_guesses} guesses
                        </Chip>
                        <Chip
                          mode="outlined"
                          style={styles.statChip}
                          icon={() => (
                            <MaterialCommunityIcon
                              name="trophy"
                              size={16}
                              color={colors.premiumOrange}
                            />
                          )}
                        >
                          {game.winners_found}/{game.max_winners} winners
                        </Chip>
                        <Chip
                          mode="outlined"
                          style={[
                            styles.statChip,
                            game.is_active
                              ? styles.activeChip
                              : styles.inactiveChip,
                          ]}
                          icon={() => (
                            <MaterialCommunityIcon
                              name={
                                game.is_active ? 'check-circle' : 'close-circle'
                              }
                              size={16}
                              color={
                                game.is_active ? colors.success : colors.error
                              }
                            />
                          )}
                        >
                          {game.is_active ? 'Active' : 'Ended'}
                        </Chip>
                      </View>

                      {/* Game Timer */}
                      <View style={styles.statusContainer}>
                        <Chip
                          mode="outlined"
                          style={[styles.statusChip, styles.gameChip]}
                          icon={() => (
                            <MaterialCommunityIcon
                              name={
                                game.time_until_reveal > 0
                                  ? 'clock-outline'
                                  : 'check-circle'
                              }
                              size={16}
                              color={
                                game.time_until_reveal > 0
                                  ? colors.warning
                                  : colors.success
                              }
                            />
                          )}
                        >
                          {game.time_until_reveal > 0
                            ? `Reveals in ${Math.floor(game.time_until_reveal / 3600)}h ${Math.floor((game.time_until_reveal % 3600) / 60)}m`
                            : 'Ready to reveal!'}
                        </Chip>
                      </View>

                      {/* Footer */}
                      <View style={styles.footer}>
                        <Text variant="bodySmall" style={styles.timestamp}>
                          Created{' '}
                          {formatTimestamp(
                            new Date(game.created_at).getTime() / 1000
                          )}
                        </Text>
                        <View style={styles.actions}>
                          <IconButton
                            icon="play"
                            size={20}
                            onPress={e => {
                              e.stopPropagation();
                              navigation.navigate('Game', {
                                capsule_id: game.capsule_id,
                                action: 'guess',
                              });
                            }}
                          />
                          <IconButton
                            icon="share-variant"
                            size={20}
                            onPress={() => {
                              // TODO: Share game
                            }}
                          />
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))}

              {/* Empty State */}
              {filteredGames.length === 0 && (
                <View style={styles.emptyState}>
                  <Text variant="headlineSmall" style={styles.emptyTitle}>
                    No active games
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptySubtitle}>
                    Check back later for new games to join!
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'leaderboard' && (
            <>
              {filteredLeaderboard.map((entry, index) => (
                <Card key={entry.wallet_address} style={styles.capsuleCard}>
                  <Card.Content>
                    <View style={styles.leaderboardEntry}>
                      <View style={styles.rankContainer}>
                        <Text variant="headlineSmall" style={styles.rank}>
                          #{entry.global_rank || index + 1}
                        </Text>
                      </View>
                      <Avatar.Text
                        size={50}
                        label={
                          entry.display_name?.charAt(0) ||
                          entry.wallet_address.slice(0, 1).toUpperCase()
                        }
                        style={[
                          styles.avatar,
                          index === 0 && styles.goldAvatar,
                          index === 1 && styles.silverAvatar,
                          index === 2 && styles.bronzeAvatar,
                        ]}
                      />
                      <View style={styles.leaderboardInfo}>
                        <Text
                          variant="bodyLarge"
                          style={styles.leaderboardName}
                        >
                          {entry.display_name || 'Anonymous'}
                        </Text>
                        <Text variant="bodySmall" style={styles.authorWallet}>
                          {formatWalletAddress(entry.wallet_address)}
                        </Text>
                        {entry.twitter_username && (
                          <View style={styles.twitterContainer}>
                            <MaterialCommunityIcon
                              name="twitter"
                              size={12}
                              color={colors.primary}
                              style={styles.twitterIcon}
                            />
                            <Text
                              variant="bodySmall"
                              style={styles.twitterHandle}
                            >
                              @{entry.twitter_username}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.leaderboardStats}>
                        <Text variant="bodyLarge" style={styles.points}>
                          {entry.total_points} pts
                        </Text>
                        <Text variant="bodySmall" style={styles.statText}>
                          {entry.games_won}/{entry.games_participated} wins
                        </Text>
                        <Text variant="bodySmall" style={styles.statText}>
                          {entry.capsules_created} capsules
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))}

              {/* Empty State */}
              {filteredLeaderboard.length === 0 && (
                <View style={styles.emptyState}>
                  <Text variant="headlineSmall" style={styles.emptyTitle}>
                    No leaderboard data
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptySubtitle}>
                    Start playing games to appear on the leaderboard!
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    ...layout.screenContainer,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  tabContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabChip: {
    marginRight: 8,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.surface,
  },
  searchBar: {
    elevation: 0,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  capsuleCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  gameAvatar: {
    backgroundColor: '#9C27B0',
  },
  goldAvatar: {
    backgroundColor: '#FFD700',
  },
  silverAvatar: {
    backgroundColor: '#C0C0C0',
  },
  bronzeAvatar: {
    backgroundColor: '#CD7F32',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontWeight: 'bold',
    color: colors.text,
  },
  authorWallet: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  platformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  platformIcon: {
    marginRight: 4,
  },
  platform: {
    color: colors.primary,
  },
  gameStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsIcon: {
    marginRight: 4,
  },
  gameStats: {
    color: colors.textSecondary,
  },
  twitterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  twitterIcon: {
    marginRight: 2,
  },
  twitterHandle: {
    color: colors.primary,
    fontSize: 12,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
  },
  revealedChip: {
    backgroundColor: '#E8F5E8',
  },
  gameChip: {
    backgroundColor: '#F3E5F5',
    marginTop: 8,
  },
  activeChip: {
    backgroundColor: '#E8F5E8',
  },
  inactiveChip: {
    backgroundColor: '#FFEBEE',
  },
  gameStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  contentHintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  hintIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  content: {
    flex: 1,
    lineHeight: 20,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  timestamp: {
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontWeight: 'bold',
    color: '#666',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontWeight: 'bold',
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  points: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statText: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
  },

  // Modern Hero Section (from HubScreen)
  heroContainer: {
    minHeight: 200, //fit content
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
    overflow: 'hidden', // Ensures gradient respects border radius
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
    minHeight: 200, // Ensure minimum height for gradient to render
  },
  // Android gradient enhancement - match iOS visual impact
  androidGradientEnhancement: {
    borderWidth: 1,
    borderColor: colors.primary + '30', // More visible border
    elevation: 6, // Higher elevation for more shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, // More visible shadow
    shadowRadius: 10,
    // Add a subtle overlay effect
    backgroundColor: 'rgba(29, 161, 242, 0.02)', // Very subtle base tint
  },
});
