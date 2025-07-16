import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Avatar,
  IconButton,
  Searchbar,
} from 'react-native-paper';

interface PublicCapsule {
  id: string;
  content: string;
  revealDate: Date;
  status: 'pending' | 'revealed';
  platform: 'twitter' | 'instagram';
  createdAt: Date;
  author: {
    wallet: string;
    displayName?: string;
  };
  revealCountdown?: string;
}

export function DiscoverScreen() {
  const [publicCapsules, setPublicCapsules] = useState<PublicCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'revealed'>('all');

  // Mock data for public timeline
  useEffect(() => {
    const mockPublicCapsules: PublicCapsule[] = [
      {
        id: '1',
        content: "Can't wait to share my new project with the world! 🚀",
        revealDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        status: 'pending',
        platform: 'twitter',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        author: {
          wallet: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          displayName: 'CryptoBuilder',
        },
        revealCountdown: '12h 34m',
      },
      {
        id: '2',
        content: "Behind the scenes from today's amazing photoshoot! ✨📸",
        revealDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        status: 'pending',
        platform: 'instagram',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        author: {
          wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHRJ',
          displayName: 'PhotoArtist',
        },
        revealCountdown: '3d 2h',
      },
      {
        id: '3',
        content:
          'Just finished my first Web3 project! Learning so much in this space 🌐',
        revealDate: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'revealed',
        platform: 'twitter',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        author: {
          wallet: '4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy',
          displayName: 'Web3Learner',
        },
      },
      {
        id: '4',
        content: 'Reflecting on an incredible year of growth and learning 🙏',
        revealDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        status: 'pending',
        platform: 'twitter',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        author: {
          wallet: '8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR',
          displayName: 'Grateful',
        },
        revealCountdown: '7d 0h',
      },
    ];

    setPublicCapsules(mockPublicCapsules);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch real data from backend
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const filteredCapsules = publicCapsules.filter(capsule => {
    const matchesSearch =
      capsule.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      capsule.author.displayName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || capsule.status === filter;
    return matchesSearch && matchesFilter;
  });

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return '🐦';
      case 'instagram':
        return '📷';
      default:
        return '📱';
    }
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search capsules..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'revealed', label: 'Revealed' },
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

      {/* Capsules List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCapsules.map(capsule => (
          <Card key={capsule.id} style={styles.capsuleCard}>
            <Card.Content>
              {/* Author Header */}
              <View style={styles.authorHeader}>
                <Avatar.Text
                  size={40}
                  label={capsule.author.displayName?.charAt(0) || '?'}
                  style={styles.avatar}
                />
                <View style={styles.authorInfo}>
                  <Text variant="bodyMedium" style={styles.authorName}>
                    {capsule.author.displayName || 'Anonymous'}
                  </Text>
                  <Text variant="bodySmall" style={styles.authorWallet}>
                    {formatWalletAddress(capsule.author.wallet)}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <Text variant="bodySmall" style={styles.platform}>
                    {getPlatformIcon(capsule.platform)} {capsule.platform}
                  </Text>
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
                    capsule.status === 'pending'
                      ? styles.pendingChip
                      : styles.revealedChip,
                  ]}
                >
                  {capsule.status === 'pending'
                    ? `⏰ Reveals in ${capsule.revealCountdown}`
                    : '✅ Revealed'}
                </Chip>
              </View>

              {/* Content */}
              <Text variant="bodyMedium" style={styles.content}>
                {capsule.content}
              </Text>

              {/* Footer */}
              <View style={styles.footer}>
                <Text variant="bodySmall" style={styles.timestamp}>
                  Created {formatTimestamp(capsule.createdAt)}
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
      </ScrollView>
    </View>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
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
