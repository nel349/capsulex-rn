import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
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

import {
  discoverService,
  type RevealedCapsule,
  type ActiveGame,
  type LeaderboardEntry,
} from '../services/discoverService';

type TabType = 'feed' | 'games' | 'leaderboard';

export function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [revealedCapsules, setRevealedCapsules] = useState<RevealedCapsule[]>(
    []
  );
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'revealed'>('all');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadRevealedCapsules(),
      loadActiveGames(),
      loadLeaderboard(),
    ]);
    setLoading(false);
  };

  const loadRevealedCapsules = async () => {
    const capsules = await discoverService.getRevealedCapsules(50);
    setRevealedCapsules(capsules);
  };

  const loadActiveGames = async () => {
    const games = await discoverService.getActiveGames(20);
    setActiveGames(games);
  };

  const loadLeaderboard = async () => {
    const leaders = await discoverService.getGlobalLeaderboard(
      'all_time',
      10
    );
    setLeaderboard(leaders);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'feed') {
      await loadRevealedCapsules();
    } else if (activeTab === 'games') {
      await loadActiveGames();
    } else if (activeTab === 'leaderboard') {
      await loadLeaderboard();
    }
    setRefreshing(false);
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

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Discover
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Explore public time capsules from the community
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'feed', label: 'Recent Reveals', icon: '✨' },
            { key: 'games', label: 'Active Games', icon: '🎮' },
            { key: 'leaderboard', label: 'Leaders', icon: '🏆' },
          ].map(tab => (
            <Chip
              key={tab.key}
              mode={activeTab === tab.key ? 'flat' : 'outlined'}
              selected={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key as TabType)}
              style={styles.tabChip}
            >
              {tab.icon} {tab.label}
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
                <Card key={capsule.id} style={styles.capsuleCard}>
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
                          <Text variant="bodySmall" style={styles.platform}>
                            🐦 @{capsule.twitter_username}
                          </Text>
                        )}
                        <IconButton
                          icon="dots-vertical"
                          size={16}
                          onPress={() => {
                            // TODO: Show options menu
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
                      >
                        {capsule.revealed
                          ? `✅ Revealed ${capsule.revealed_at_timestamp ? formatTimestamp(capsule.revealed_at_timestamp) : ''}`
                          : `⏰ Reveals in ${formatCountdown(capsule.reveal_date_timestamp)}`}
                      </Chip>
                    </View>

                    {/* Content */}
                    <Text variant="bodyMedium" style={styles.content}>
                      {capsule.content}
                    </Text>

                    {/* Game Badge */}
                    {capsule.is_game && (
                      <Chip
                        icon="gamepad-variant"
                        mode="outlined"
                        style={styles.gameChip}
                      >
                        Game Capsule
                      </Chip>
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
                          icon="heart-outline"
                          size={20}
                          onPress={() => {
                            // TODO: Implement like functionality
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
                <Card key={game.game_id} style={styles.capsuleCard}>
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
                        <Text variant="bodySmall" style={styles.gameStats}>
                          🎮 {game.total_participants} players
                        </Text>
                      </View>
                    </View>

                    {/* Game Content Hint */}
                    <Text variant="bodyMedium" style={styles.content}>
                      💡 {game.content_hint}
                    </Text>

                    {/* Game Stats */}
                    <View style={styles.gameStatsContainer}>
                      <Chip mode="outlined" style={styles.statChip}>
                        📝 {game.current_guesses}/{game.max_guesses} guesses
                      </Chip>
                      <Chip mode="outlined" style={styles.statChip}>
                        🏆 {game.winners_found}/{game.max_winners} winners
                      </Chip>
                      <Chip mode="outlined" style={[styles.statChip, game.is_active ? styles.activeChip : styles.inactiveChip]}>
                        {game.is_active ? '🟢 Active' : '🔴 Ended'}
                      </Chip>
                    </View>

                    {/* Game Timer */}
                    <View style={styles.statusContainer}>
                      <Chip
                        mode="outlined"
                        style={[styles.statusChip, styles.gameChip]}
                      >
                        {game.time_until_reveal > 0 ? (
                          `⏰ Reveals in ${Math.floor(game.time_until_reveal / 3600)}h ${Math.floor((game.time_until_reveal % 3600) / 60)}m`
                        ) : (
                          '✅ Ready to reveal!'
                        )}
                      </Chip>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                      <Text variant="bodySmall" style={styles.timestamp}>
                        Created {formatTimestamp(new Date(game.created_at).getTime() / 1000)}
                      </Text>
                      <View style={styles.actions}>
                        <IconButton
                          icon="play"
                          size={20}
                          onPress={() => {
                            // TODO: Navigate to game
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
                          <Text
                            variant="bodySmall"
                            style={styles.twitterHandle}
                          >
                            🐦 @{entry.twitter_username}
                          </Text>
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
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  tabContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabChip: {
    marginRight: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  searchBar: {
    elevation: 0,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'white',
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
  },
  authorWallet: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  platform: {
    color: '#666',
    marginBottom: 4,
  },
  gameStats: {
    color: '#666',
    marginBottom: 4,
  },
  twitterHandle: {
    color: '#1DA1F2',
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
  content: {
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
  },
});
