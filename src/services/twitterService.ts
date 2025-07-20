import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { apiService } from './api';

// Complete the auth session in React Native
WebBrowser.maybeCompleteAuthSession();

// Twitter OAuth 2.0 Configuration
const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID!;

// OAuth 2.0 Discovery document
const discovery = {
  authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
  revocationEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
};

export interface TwitterAuthResult {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  username: string;
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

class TwitterService {
  constructor() {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'capsulex' });
    console.log('🐦 Twitter Service initialized');
    console.log('🔑 Client ID present:', !!TWITTER_CLIENT_ID);
    console.log('📱 Redirect URI:', redirectUri);
    console.log('🌐 Expected redirect format: capsulex://');
  }

  /**
   * Start Twitter OAuth flow
   */
  async authenticate(): Promise<TwitterAuthResult> {
    try {
      console.log('🐦 Starting Twitter OAuth flow...');
      return await this.authenticateDirectly();
    } catch (error) {
      console.error('❌ Twitter authentication failed:', error);
      throw error;
    }
  }

  /**
   * Direct OAuth flow
   */
  private async authenticateDirectly(): Promise<TwitterAuthResult> {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'capsulex',
      path: 'oauth/twitter',
    });

    console.log('🔗 Using direct OAuth with redirect URI:', redirectUri);

    // Create a new auth request
    const request = new AuthSession.AuthRequest({
      clientId: TWITTER_CLIENT_ID,
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    });

    // Start the authorization flow
    const result = await request.promptAsync(discovery);

    console.log('🐦 OAuth result:', {
      type: result.type,
      hasParams: !!(result as any).params,
    });

    if (result.type !== 'success') {
      throw new Error(`OAuth flow failed: ${result.type}`);
    }

    const { params } = result as AuthSession.AuthSessionResult & {
      params: { code: string; error?: string; error_description?: string };
    };

    console.log('📝 OAuth params received:', {
      hasCode: !!params?.code,
      codeLength: params?.code?.length,
      codePreview: params?.code ? params.code.substring(0, 20) + '...' : 'none',
      hasError: !!params?.error,
      error: params?.error,
      allParams: Object.keys(params || {}),
    });

    if (!params.code) {
      throw new Error(
        params.error_description ||
          params.error ||
          'No authorization code received'
      );
    }

    // Send authorization code to backend for token exchange
    console.log('🔄 Sending auth code to backend for secure token exchange...');
    const backendResponse = await apiService.post(
      '/social/twitter/exchange-token',
      {
        code: params.code,
        codeVerifier: request.codeVerifier!,
        redirectUri: redirectUri,
      }
    );

    if (!backendResponse.success || !backendResponse.data) {
      throw new Error(backendResponse.error || 'Backend token exchange failed');
    }

    const { user, accessToken, refreshToken } = backendResponse.data as {
      user: { id: string; username: string; name: string };
      accessToken: string;
      refreshToken?: string;
    };
    console.log('✅ Backend token exchange successful:', user.username);

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      username: user.username,
    };
  }

  /**
   * Check if user has Twitter connected
   */
  async isTwitterConnected(): Promise<boolean> {
    try {
      const response = await apiService.get('/social/connections');

      if (!response.success) {
        return false;
      }

      const connections = response.data || [];
      return (
        Array.isArray(connections) &&
        connections.some(
          (conn: any) => conn.platform === 'twitter' && conn.is_active
        )
      );
    } catch (error) {
      console.error('❌ Failed to check Twitter connection:', error);
      return false;
    }
  }

  /**
   * Get Twitter connection info
   */
  async getTwitterConnection() {
    try {
      const response = await apiService.get('/social/connections');

      if (!response.success) {
        return null;
      }

      const connections = response.data || [];
      return Array.isArray(connections)
        ? connections.find(
            (conn: any) => conn.platform === 'twitter' && conn.is_active
          )
        : null;
    } catch (error) {
      console.error('❌ Failed to get Twitter connection:', error);
      return null;
    }
  }
}

export const twitterService = new TwitterService();
