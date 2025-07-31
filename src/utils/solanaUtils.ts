import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export const CAPSULEX_PROGRAM_ID =
  'J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH';

/**
 * Derive capsule PDA from creator and reveal date
 * @param creator - Wallet address of the capsule creator
 * @param revealDate - Reveal date as Unix timestamp (seconds) or anchor.BN
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns Capsule PDA
 */
export function getCapsulePda(
  creator: PublicKey,
  revealDate: number | anchor.BN,
  programId?: PublicKey
): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);
  const revealDateBN =
    typeof revealDate === 'number' ? new anchor.BN(revealDate) : revealDate;

  const [capsulePDA] = PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode('capsule'),
      creator.toBuffer(),
      revealDateBN.toArrayLike(Buffer, 'le', 8), // i64 is 8 bytes, little-endian
    ],
    pid
  );

  return capsulePDA;
}

/**
 * Derive game PDA from capsule PDA
 * @param capsulePDA - The capsule PDA
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns Game PDA
 */
export function getGamePda(
  capsulePDA: PublicKey,
  programId?: PublicKey
): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);

  const [gamePDA] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode('game'), capsulePDA.toBuffer()],
    pid
  );

  return gamePDA;
}

/**
 * Derive guess PDA from game PDA, guesser, and guess count
 * @param gamePDA - The game PDA
 * @param guesser - Wallet address of the guesser
 * @param currentGuesses - Current guess count
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns Guess PDA
 */
export function getGuessPda(
  gamePDA: PublicKey,
  guesser: PublicKey,
  currentGuesses: number,
  programId?: PublicKey
): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);
  const currentGuessesBuffer = Buffer.from(
    new Uint32Array([currentGuesses]).buffer
  );

  const [guessPDA] = PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode('guess'),
      gamePDA.toBuffer(),
      guesser.toBuffer(),
      currentGuessesBuffer,
    ],
    pid
  );

  return guessPDA;
}

/**
 * Derive NFT mint PDA from capsule PDA
 * @param capsulePDA - The capsule PDA
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns NFT mint PDA
 */
export function getNftMintPda(
  capsulePDA: PublicKey,
  programId?: PublicKey
): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);

  const [nftMintPDA] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode('capsule_mint'), capsulePDA.toBuffer()],
    pid
  );

  return nftMintPDA;
}

/**
 * Derive vault PDA
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns Vault PDA
 */
export function getVaultPda(programId?: PublicKey): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode('vault')],
    pid
  );

  return vaultPDA;
}

/**
 * Derive leaderboard PDA from authority
 * @param authority - Authority wallet address
 * @param programId - Optional program ID, defaults to CAPSULEX_PROGRAM_ID
 * @returns Leaderboard PDA
 */
export function getLeaderboardPda(
  authority: PublicKey,
  programId?: PublicKey
): PublicKey {
  const pid = programId || new PublicKey(CAPSULEX_PROGRAM_ID);

  const [leaderboardPDA] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode('leaderboard'), authority.toBuffer()],
    pid
  );

  return leaderboardPDA;
}

/**
 * Helper function to validate base58 strings before creating PublicKey
 * @param str - String to validate
 * @returns true if valid base58, false otherwise
 */
export function isValidBase58(str: string): boolean {
  try {
    new PublicKey(str);
    return true;
  } catch (e) {
    return false;
  }
}
