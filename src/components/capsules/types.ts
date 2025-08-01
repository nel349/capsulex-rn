import type { CapsuleWithStatus } from '../../services/capsuleApi';
import type { Capsule } from '../../types/api';

// Enhanced capsule type that merges blockchain and database data
export interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: Capsule; // Additional database fields including content_encrypted
  blockchainData?: CapsuleWithStatus; // Blockchain data for reliable reveal status
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
