import type { CapsuleWithStatus } from '../../services/capsuleApi';

// Enhanced capsule type that merges blockchain and database data
export interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: {
    content_encrypted?: string;
    capsule_id?: string;
    status?: string;
    reveal_date?: string;
    created_at?: string;
    [key: string]: any;
  };
  account: CapsuleWithStatus['account'] & {
    contentStorage?: {
      text?: string | { content?: string; text?: string; [key: string]: any };
    };
  };
}

// Common props interface for capsule card components
export interface CapsuleCardBaseProps {
  capsule: EnhancedCapsule;
  type: 'ready' | 'pending' | 'revealed';
}
