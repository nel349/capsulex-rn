// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User Types
export interface User {
  user_id: string;
  wallet_address: string;
  auth_type: 'wallet' | 'privy';
  email?: string;
  name?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Request Types
export interface CreateUserRequest {
  wallet_address: string;
  auth_type: 'wallet' | 'privy';
  privy_user_id?: string;
  email?: string;
  name?: string;
}

export interface CreateCapsuleRequest {
  content_encrypted: string;
  content_hash: string;
  has_media?: boolean;
  media_urls?: string[];
  reveal_date: string; // ISO string
  created_at?: string; // Frontend timestamp for consistency
  on_chain_tx?: string;
  sol_fee_amount?: number;
  is_gamified: boolean;
}

// Capsule Types
export interface Capsule {
  capsule_id: string;
  user_id: string;
  content_encrypted: string;
  content_hash: string;
  has_media: boolean;
  media_urls: string[];
  reveal_date: string;
  status: 'pending' | 'revealed' | 'failed';
  on_chain_tx?: string;
  sol_fee_amount?: number;
  created_at: string;
  social_post_id?: string;
  posted_to_social: boolean;
}

export interface UserInfo {
  email?: string;
  environmentId: string;
  lastVerifiedCredentialId: string;
  lists: any[]; // Adjust if you know the structure of lists
  metadata: {}; // Adjust if you know the structure of metadata
  missingFields: any[]; // Adjust if you know the structure of missingFields
  newUser: boolean;
  sessionId: string;
  userId: string;
  verifiedCredentials: Array<{
    address?: string;
    chain?: string;
    format: string;
    id: string;
    lastSelectedAt?: string;
    nameService?: any; // Adjust if you know the structure
    publicIdentifier: string;
    signInEnabled: boolean;
    walletName?: string;
    walletProperties?: any; // Adjust if you know the structure
    email?: string;
  }>;
}

// Game Types
export interface CapsuleGame {
  game_id: string;
  capsule_id: string;
  capsule_pda: string;
  creator: string;
  max_guesses: number;
  max_winners: number;
  current_guesses: number;
  winners_found: number;
  is_active: boolean;
  winner: string | null;
  total_participants: number;
  reveal_date: string;
  created_at: string;
  content_hint: string;
  is_revealed: boolean;
}

export interface Guess {
  guess_id: string;
  guesser: string | null; // null for anonymous guesses
  guess_content: string;
  is_anonymous: boolean;
  is_paid: boolean;
  is_correct: boolean;
  submitted_at: string;
}

export interface GuessesApiResponse {
  guesses: Guess[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    filtered_by_wallet: string | null;
  };
  game_info: {
    game_id: string;
    capsule_id: string;
    total_guesses: number;
    max_guesses: number;
    is_active: boolean;
  };
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    // eslint-disable-next-line no-unused-vars
    public statusCode?: number,
    // eslint-disable-next-line no-unused-vars
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
