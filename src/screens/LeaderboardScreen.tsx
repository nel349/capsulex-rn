import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Avatar,
  IconButton,
  Divider,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';

import { useAuth } from '../contexts';
import { apiService } from '../services/api';
import { ApiResponse } from '../types/api';

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
  const { isAuthenticated, walletAddress } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all-time');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load leaderboard data
  const fetchLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch global leaderboard
      const leaderboardResponse = (await apiService.get(
        `/leaderboard/global?timeframe=${timeFrame}&limit=50`
      )) as LeaderboardAPIResponse;
      
      if (leaderboardResponse.success) {
        setLeaderboard(leaderboardResponse.data || []);
      }

      // Fetch user stats if authenticated
      if (isAuthenticated && walletAddress) {
        const userStatsResponse = (await apiService.get(
          `/leaderboard/user/${walletAddress}`
        )) as UserStatsAPIResponse;
        
        if (userStatsResponse.success) {
          setUserStats(userStatsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeFrame, isAuthenticated, walletAddress]);

  // Load data on mount and timeframe change
  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboardData();
    setRefreshing(false);
  }, [fetchLeaderboardData]);

  // Get rank color
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666666';
  };

  // Get rank emoji
  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
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
        {/* Time Frame Selector */}
        <Card style={styles.timeFrameCard}>
          <Card.Content>
            <SegmentedButtons
              value={timeFrame}
              onValueChange={(value) => setTimeFrame(value as TimeFrame)}
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
                    Rank #{userStats.global_rank} • {userStats.total_points} points
                  </Text>
                </View>
              </View>
              
              <View style={styles.userStatsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userStats.games_won}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userStats.games_participated}</Text>
                  <Text style={styles.statLabel}>Games</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{Math.round(userStats.win_rate * 100)}%</Text>
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
              <Text style={styles.authText}>
                🔐 Connect your wallet to see your stats and compete!
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <Card style={styles.podiumCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.podiumTitle}>
                🏆 Top Champions
              </Text>
              
              <View style={styles.podium}>
                {/* Second Place */}
                <View style={[styles.podiumPosition, styles.secondPlace]}>
                  <Text style={styles.podiumEmoji}>🥈</Text>
                  <Avatar.Text
                    size={40}
                    label={leaderboard[1]?.wallet_address.slice(0, 2).toUpperCase()}
                    style={[styles.podiumAvatar, { backgroundColor: '#C0C0C0' }]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[1]?.display_name || 
                     `${leaderboard[1]?.wallet_address.slice(0, 4)}...${leaderboard[1]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>{leaderboard[1]?.total_points} pts</Text>
                </View>

                {/* First Place */}
                <View style={[styles.podiumPosition, styles.firstPlace]}>
                  <Text style={styles.podiumEmoji}>🥇</Text>
                  <Avatar.Text
                    size={50}
                    label={leaderboard[0]?.wallet_address.slice(0, 2).toUpperCase()}
                    style={[styles.podiumAvatar, { backgroundColor: '#FFD700' }]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[0]?.display_name || 
                     `${leaderboard[0]?.wallet_address.slice(0, 4)}...${leaderboard[0]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>{leaderboard[0]?.total_points} pts</Text>
                </View>

                {/* Third Place */}
                <View style={[styles.podiumPosition, styles.thirdPlace]}>
                  <Text style={styles.podiumEmoji}>🥉</Text>
                  <Avatar.Text
                    size={40}
                    label={leaderboard[2]?.wallet_address.slice(0, 2).toUpperCase()}
                    style={[styles.podiumAvatar, { backgroundColor: '#CD7F32' }]}
                  />
                  <Text style={styles.podiumName}>
                    {leaderboard[2]?.display_name || 
                     `${leaderboard[2]?.wallet_address.slice(0, 4)}...${leaderboard[2]?.wallet_address.slice(-4)}`}
                  </Text>
                  <Text style={styles.podiumPoints}>{leaderboard[2]?.total_points} pts</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card style={styles.leaderboardCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.leaderboardTitle}>
              📊 Full Rankings
            </Text>
            
            {leaderboard.map((entry, index) => (
              <View key={entry.wallet_address}>
                <View style={[
                  styles.leaderboardEntry,
                  entry.is_current_user && styles.currentUserEntry
                ]}>
                  <View style={styles.entryLeft}>
                    <Text style={[
                      styles.rankText,
                      { color: getRankColor(entry.rank) }
                    ]}>
                      {getRankEmoji(entry.rank)}
                    </Text>
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
                          <Chip mode="outlined" compact style={styles.statChip}>
                            🏆{entry.badge_count}
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
                
                {index < leaderboard.length - 1 && <Divider style={styles.entryDivider} />}
              </View>
            ))}

            {leaderboard.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  🎯 No rankings yet. Start playing games to earn points!
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Recent Achievements (if user authenticated) */}
        {isAuthenticated && userStats && userStats.recent_achievements.length > 0 && (
          <Card style={styles.achievementsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.achievementsTitle}>
                🎉 Recent Achievements
              </Text>
              
              {userStats.recent_achievements.slice(0, 5).map((achievement, index) => (
                <View key={index} style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>
                    {achievement.type === 'win' ? '🏆' : 
                     achievement.type === 'badge' ? '🏅' : '🎯'}
                  </Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementText}>
                      {achievement.type === 'win' ? 'Won a game!' :
                       achievement.type === 'badge' ? 'Earned a badge!' :
                       'Participated in a game'}
                    </Text>
                    <Text style={styles.achievementDate}>
                      +{achievement.points_earned} points • {new Date(achievement.timestamp).toLocaleDateString()}
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

  // Time Frame Card
  timeFrameCard: {
    margin: 16,
    marginBottom: 8,
  },
  timeFrameButtons: {
    backgroundColor: 'transparent',
  },

  // User Stats Card
  userStatsCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  userStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  userStatsInfo: {
    flex: 1,
  },
  userStatsTitle: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  userStatsSubtitle: {
    color: '#2E7D32',
    opacity: 0.8,
  },
  userStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    color: '#2E7D32',
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

  // Podium Card
  podiumCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#F3E5F5',
  },
  podiumTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 160,
  },
  podiumPosition: {
    alignItems: 'center',
    marginHorizontal: 8,
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
  podiumEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  podiumAvatar: {
    marginBottom: 8,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumPoints: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'center',
  },

  // Leaderboard Card
  leaderboardCard: {
    margin: 16,
    marginTop: 8,
  },
  leaderboardTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  currentUserEntry: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 32,
  },
  entryAvatar: {
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  entryStats: {
    flexDirection: 'row',
    gap: 4,
  },
  statChip: {
    height: 24,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  pointsLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  entryDivider: {
    marginVertical: 4,
  },

  // Empty State
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },

  // Achievements Card
  achievementsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  achievementsTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  achievementEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '500',
  },
  achievementDate: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});