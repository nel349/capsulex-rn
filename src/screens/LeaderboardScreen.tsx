import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Avatar,
  Divider,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';

import { useDualAuth } from '../providers';
import { apiService } from '../services/api';
import { colors, typography, spacing, layout, shadows } from '../theme';
import type { ApiResponse } from '../types/api';

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  display_name?: string;
  total_points: number;
  games_won: number;
  games_participated: number;
  win_rate: number;
  badge_count: number;
  is_current_user?: boolean;
}

interface UserStats {
  wallet_address: string;
  total_points: number;
  global_rank: number;
  games_won: number;
  games_participated: number;
  win_rate: number;
  badge_count: number;
  recent_achievements: Array<{
    type: 'win' | 'participation' | 'badge';
    game_id: string;
    points_earned: number;
    timestamp: string;
  }>;
}

interface LeaderboardAPIResponse extends ApiResponse {
  data: LeaderboardEntry[];
}

interface UserStatsAPIResponse extends ApiResponse<UserStats> {
  data: UserStats;
}

type TimeFrame = 'all-time' | 'weekly' | 'monthly';

export function LeaderboardScreen() {
  const { isAuthenticated, walletAddress } = useDualAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all-time');

  // React Query for leaderboard data
  const {
    data: leaderboard = [],
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
    isFetching: leaderboardFetching,
  } = useQuery({
    queryKey: ['leaderboard', timeFrame],
    queryFn: async () => {
      const response = (await apiService.get(
        `/leaderboard/global?timeframe=${timeFrame}&limit=50`
      )) as LeaderboardAPIResponse;
      return response.success ? response.data || [] : [];
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    retry: 1,
  });

  // React Query for user stats
  const {
    data: userStats = null,
    isLoading: userStatsLoading,
    refetch: refetchUserStats,
    isFetching: userStatsFetching,
  } = useQuery({
    queryKey: ['userStats', walletAddress, isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated || !walletAddress) return null;
      const response = (await apiService.get(
        `/leaderboard/user/${walletAddress}`
      )) as UserStatsAPIResponse;
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated && !!walletAddress,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    retry: 1,
  });

  const loading = leaderboardLoading || userStatsLoading;
  const refreshing = leaderboardFetching || userStatsFetching;

  // Handle refresh
  const onRefresh = async () => {
    await Promise.all([refetchLeaderboard(), refetchUserStats()]);
  };

  // Get rank icon and color
  const getRankIcon = (rank: number) => {
    if (rank === 1) return { name: 'trophy', color: '#FFD700' };
    if (rank === 2) return { name: 'medal', color: '#C0C0C0' };
    if (rank === 3) return { name: 'medal-outline', color: '#CD7F32' };
    return {
      name: 'numeric-' + Math.min(rank, 9),
      color: colors.textSecondary,
    };
  };

  // Render hero content
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="trophy"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Leaderboard</Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.highlightText}>{leaderboard.length}</Text>
          <Text style={styles.subtitleText}> active players • </Text>
          <Text style={styles.highlightText}>
            {userStats?.global_rank || 'N/A'}
          </Text>
          <Text style={styles.subtitleText}> your rank</Text>
        </Text>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="account-group"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{leaderboard.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="star"
            size={28}
            color={colors.premiumOrange}
          />
          <Text style={styles.statValue}>{userStats?.total_points || 0}</Text>
          <Text style={styles.statLabel}>Your Points</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="gamepad-variant"
            size={28}
            color={colors.success}
          />
          <Text style={styles.statValue}>{userStats?.games_won || 0}</Text>
          <Text style={styles.statLabel}>Your Wins</Text>
        </View>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

        {/* Time Frame Selector */}
        <Card style={styles.timeFrameCard}>
          <Card.Content>
            <SegmentedButtons
              value={timeFrame}
              onValueChange={value => setTimeFrame(value as TimeFrame)}
              buttons={[
                { value: 'all-time', label: 'All Time' },
                { value: 'weekly', label: 'This Week' },
                { value: 'monthly', label: 'This Month' },
              ]}
              style={styles.timeFrameButtons}
            />
          </Card.Content>
        </Card>

        {/* User Stats Card (if authenticated) */}
        {isAuthenticated && userStats && (
          <Card style={styles.userStatsCard}>
            <Card.Content>
              <View style={styles.userStatsHeader}>
                <Avatar.Text
                  size={50}
                  label={walletAddress?.slice(0, 2).toUpperCase() || 'ME'}
                  style={styles.userAvatar}
                />
                <View style={styles.userStatsInfo}>
                  <Text variant="titleMedium" style={styles.userStatsTitle}>
                    Your Stats
                  </Text>
                  <Text style={styles.userStatsSubtitle}>
                    Rank #{userStats.global_rank} • {userStats.total_points}{' '}
                    points
                  </Text>
                </View>
              </View>

              <View style={styles.userStatsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userStats.games_won}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {userStats.games_participated}
                  </Text>
                  <Text style={styles.statLabel}>Games</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Math.round(userStats.win_rate * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userStats.badge_count}</Text>
                  <Text style={styles.statLabel}>Badges</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

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
                  Connect your wallet to see your stats and compete!
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <Card style={styles.podiumCard}>
            <Card.Content>
              <View style={styles.podiumTitleContainer}>
                <MaterialCommunityIcon
                  name="trophy"
                  size={24}
                  color={colors.primary}
                  style={styles.podiumTitleIcon}
                />
                <Text variant="titleLarge" style={styles.podiumTitle}>
                  Top Champions
                </Text>
              </View>

              <View style={styles.podium}>
                {/* Second Place */}
                <View style={[styles.podiumPosition, styles.secondPlace]}>
                  <MaterialCommunityIcon
                    name="medal"
                    size={32}
                    color="#C0C0C0"
                    style={styles.podiumIcon}
                  />
                  <Avatar.Text
                    size={40}
                    label={leaderboard[1]?.wallet_address
                      .slice(0, 2)
                      .toUpperCase()}
                    style={[
                      styles.podiumAvatar,
                      { backgroundColor: '#C0C0C0' },
                    ]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[1]?.display_name ||
                      `${leaderboard[1]?.wallet_address.slice(0, 4)}...${leaderboard[1]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>
                    {leaderboard[1]?.total_points} pts
                  </Text>
                </View>

                {/* First Place */}
                <View style={[styles.podiumPosition, styles.firstPlace]}>
                  <MaterialCommunityIcon
                    name="trophy"
                    size={40}
                    color="#FFD700"
                    style={styles.podiumIcon}
                  />
                  <Avatar.Text
                    size={50}
                    label={leaderboard[0]?.wallet_address
                      .slice(0, 2)
                      .toUpperCase()}
                    style={[
                      styles.podiumAvatar,
                      { backgroundColor: '#FFD700' },
                    ]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[0]?.display_name ||
                      `${leaderboard[0]?.wallet_address.slice(0, 4)}...${leaderboard[0]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>
                    {leaderboard[0]?.total_points} pts
                  </Text>
                </View>

                {/* Third Place */}
                <View style={[styles.podiumPosition, styles.thirdPlace]}>
                  <MaterialCommunityIcon
                    name="medal-outline"
                    size={32}
                    color="#CD7F32"
                    style={styles.podiumIcon}
                  />
                  <Avatar.Text
                    size={40}
                    label={leaderboard[2]?.wallet_address
                      .slice(0, 2)
                      .toUpperCase()}
                    style={[
                      styles.podiumAvatar,
                      { backgroundColor: '#CD7F32' },
                    ]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[2]?.display_name ||
                      `${leaderboard[2]?.wallet_address.slice(0, 4)}...${leaderboard[2]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>
                    {leaderboard[2]?.total_points} pts
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card style={styles.leaderboardCard}>
          <Card.Content>
            <View style={styles.leaderboardTitleContainer}>
              <MaterialCommunityIcon
                name="format-list-numbered"
                size={20}
                color={colors.primary}
                style={styles.leaderboardTitleIcon}
              />
              <Text variant="titleMedium" style={styles.leaderboardTitle}>
                Full Rankings
              </Text>
            </View>

            {leaderboard.map((entry, index) => (
              <View key={entry.wallet_address}>
                <View
                  style={[
                    styles.leaderboardEntry,
                    entry.is_current_user && styles.currentUserEntry,
                  ]}
                >
                  <View style={styles.entryLeft}>
                    <View style={styles.rankContainer}>
                      <MaterialCommunityIcon
                        name={getRankIcon(entry.rank).name as any}
                        size={20}
                        color={getRankIcon(entry.rank).color}
                      />
                      <Text
                        style={[
                          styles.rankText,
                          { color: getRankIcon(entry.rank).color },
                        ]}
                      >
                        {entry.rank <= 3 ? '' : `#${entry.rank}`}
                      </Text>
                    </View>
                    <Avatar.Text
                      size={36}
                      label={entry.wallet_address.slice(0, 2).toUpperCase()}
                      style={styles.entryAvatar}
                    />
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>
                        {entry.display_name ||
                          `${entry.wallet_address.slice(0, 4)}...${entry.wallet_address.slice(-4)}`}
                      </Text>
                      <View style={styles.entryStats}>
                        <Chip mode="outlined" compact style={styles.statChip}>
                          {entry.games_won}W
                        </Chip>
                        <Chip mode="outlined" compact style={styles.statChip}>
                          {Math.round(entry.win_rate * 100)}%
                        </Chip>
                        {entry.badge_count > 0 && (
                          <Chip
                            mode="outlined"
                            compact
                            style={styles.statChip}
                            icon={() => (
                              <MaterialCommunityIcon
                                name="trophy"
                                size={12}
                                color={colors.premiumOrange}
                              />
                            )}
                          >
                            {entry.badge_count}
                          </Chip>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.entryRight}>
                    <Text style={styles.pointsText}>{entry.total_points}</Text>
                    <Text style={styles.pointsLabel}>points</Text>
                  </View>
                </View>

                {index < leaderboard.length - 1 && (
                  <Divider style={styles.entryDivider} />
                )}
              </View>
            ))}

            {leaderboard.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcon
                  name="target"
                  size={48}
                  color={colors.textSecondary}
                  style={styles.emptyStateIcon}
                />
                <Text style={styles.emptyStateText}>
                  No rankings yet. Start playing games to earn points!
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Recent Achievements (if user authenticated) */}
        {isAuthenticated &&
          userStats &&
          userStats.recent_achievements.length > 0 && (
            <Card style={styles.achievementsCard}>
              <Card.Content>
                <View style={styles.achievementsTitleContainer}>
                  <MaterialCommunityIcon
                    name="star-circle"
                    size={20}
                    color={colors.primary}
                    style={styles.achievementsTitleIcon}
                  />
                  <Text variant="titleMedium" style={styles.achievementsTitle}>
                    Recent Achievements
                  </Text>
                </View>

                {userStats.recent_achievements
                  .slice(0, 5)
                  .map((achievement, index) => (
                    <View key={index} style={styles.achievementItem}>
                      <MaterialCommunityIcon
                        name={
                          achievement.type === 'win'
                            ? 'trophy'
                            : achievement.type === 'badge'
                              ? 'medal'
                              : 'target'
                        }
                        size={24}
                        color={
                          achievement.type === 'win'
                            ? colors.success
                            : achievement.type === 'badge'
                              ? colors.premiumOrange
                              : colors.primary
                        }
                        style={styles.achievementIcon}
                      />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementText}>
                          {achievement.type === 'win'
                            ? 'Won a game!'
                            : achievement.type === 'badge'
                              ? 'Earned a badge!'
                              : 'Participated in a game'}
                        </Text>
                        <Text style={styles.achievementDate}>
                          +{achievement.points_earned} points •{' '}
                          {new Date(achievement.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))}
              </Card.Content>
            </Card>
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screenContainer,
  },
  centerContainer: {
    ...layout.centered,
    padding: spacing.sectionPadding,
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

  // Modern Hero Section (from HubScreen pattern)
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

  // Time Frame Card
  timeFrameCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  timeFrameButtons: {
    backgroundColor: 'transparent',
  },

  // User Stats Card
  userStatsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  userStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userAvatar: {
    backgroundColor: colors.success,
    marginRight: spacing.md,
  },
  userStatsInfo: {
    flex: 1,
  },
  userStatsTitle: {
    ...typography.titleMedium,
    color: colors.success,
    fontWeight: 'bold',
  },
  userStatsSubtitle: {
    ...typography.bodyMedium,
    color: colors.success,
    opacity: 0.8,
  },
  userStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userStatItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.titleLarge,
    color: colors.success,
    fontWeight: 'bold',
  },
  userStatLabel: {
    ...typography.bodySmall,
    color: colors.success,
    opacity: 0.7,
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
  },
  authIcon: {
    marginRight: spacing.sm,
  },
  authText: {
    ...typography.bodyMedium,
    color: colors.warning,
    flex: 1,
  },

  // Podium Card
  podiumCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
  },
  podiumTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  podiumTitleIcon: {
    marginRight: spacing.sm,
  },
  podiumTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: 'bold',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 160,
  },
  podiumPosition: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    flex: 1,
  },
  firstPlace: {
    marginBottom: 0,
  },
  secondPlace: {
    marginBottom: 20,
  },
  thirdPlace: {
    marginBottom: 40,
  },
  podiumIcon: {
    marginBottom: spacing.sm,
  },
  podiumAvatar: {
    marginBottom: spacing.sm,
  },
  podiumName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  podiumPoints: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Leaderboard Card
  leaderboardCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  leaderboardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  leaderboardTitleIcon: {
    marginRight: spacing.sm,
  },
  leaderboardTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  currentUserEntry: {
    backgroundColor: colors.success + '20',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    minWidth: 40,
  },
  rankText: {
    ...typography.bodyLarge,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  entryAvatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  entryStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statChip: {
    height: 24,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  pointsText: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  pointsLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  entryDivider: {
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },

  // Empty State
  emptyState: {
    ...layout.premiumSpacing,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: spacing.md,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Achievements Card
  achievementsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.premiumOrange,
  },
  achievementsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  achievementsTitleIcon: {
    marginRight: spacing.sm,
  },
  achievementsTitle: {
    ...typography.titleMedium,
    color: colors.premiumOrange,
    fontWeight: 'bold',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  achievementIcon: {
    marginRight: spacing.sm,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  achievementDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
