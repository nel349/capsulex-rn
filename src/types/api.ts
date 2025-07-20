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
  on_chain_tx?: string;
  sol_fee_amount?: number;
  is_gamified?: boolean;
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
  revealed_at?: string;
  social_post_id?: string;
  posted_to_social: boolean;
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
