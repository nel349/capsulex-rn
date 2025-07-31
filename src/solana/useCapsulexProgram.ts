import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { TransactionInstruction } from '@solana/web3.js';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import type { Capsulex as CapsulexProgramType } from '../../assets/capsulex'; // Renamed to avoid conflict
import idl from '../../assets/capsulex.json'; // Assuming this is the correct path
import { dynamicClientService } from '../services/dynamicClientService';
import { useConnection } from '../utils/ConnectionProvider';
import {
  getCapsulePda,
  getGamePda,
  getGuessPda,
  getNftMintPda,
  getVaultPda,
  getLeaderboardPda,
  CAPSULEX_PROGRAM_ID,
} from '../utils/solanaUtils';
import { useAnchorWallet } from '../utils/useAnchorWallet';

export function useCapsulexProgram() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const capsulexProgramId = useMemo(() => {
    return new PublicKey(CAPSULEX_PROGRAM_ID);
  }, []);

  const provider = useMemo(() => {
    if (!anchorWallet) {
      return;
    }
    return new AnchorProvider(connection, anchorWallet, {
      preflightCommitment: 'confirmed',
      commitment: 'processed',
      skipPreflight: true,
    });
  }, [anchorWallet, connection]);

  const capsulexProgram = useMemo(() => {
    if (!provider) {
      return;
    }

    return new Program<CapsulexProgramType>(
      idl as CapsulexProgramType,
      provider
    );
  }, [capsulexProgramId, provider]);

  // Mutation for createCapsule instruction
  const createCapsule = useMutation({
    mutationKey: ['capsule', 'create'],
    mutationFn: async ({
      encryptedContent,
      contentStorage,
      contentIntegrityHash,
      revealDate,
      isGamified,
    }: {
      encryptedContent: string;
      contentStorage: any; // TODO: Define ContentStorage type properly based on your IDL
      contentIntegrityHash: string;
      revealDate: anchor.BN; // i64 in Anchor is BN in JS
      isGamified: boolean;
    }) => {
      if (!capsulexProgram || !anchorWallet?.publicKey) {
        throw new Error(
          'Your wallet connection has expired. Please reconnect your wallet to continue.'
        );
      }

      const creator = anchorWallet.publicKey;

      // Derive PDAs using utility functions
      const capsulePDA = getCapsulePda(creator, revealDate, capsulexProgramId);
      const nftMintPDA = getNftMintPda(capsulePDA, capsulexProgramId);
      const vaultPDA = getVaultPda(capsulexProgramId);
      const gamePDA = getGamePda(capsulePDA, capsulexProgramId);

      // Prepare accounts (game account is always required by the program)
      const accounts: any = {
        creator: creator,
        capsule: capsulePDA,
        nftMint: nftMintPDA,
        vault: vaultPDA,
        game: gamePDA, // Always include game account
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      };

      return await capsulexProgram.methods
        .createCapsule(
          encryptedContent,
          contentStorage,
          contentIntegrityHash,
          revealDate,
          isGamified
        )
        .accounts(accounts)
        .rpc();
    },
    onSuccess: (signature: string) => {
      // alertAndLog('Capsule Created!', `Transaction: ${signature}`);
      console.log(
        '✅ Capsule created successfully!',
        `Transaction: ${signature}`
      );
      // You might want to refetch a list of capsules here if you have one
    },
    onError: (error: any) => {
      console.error('Transaction failed:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      if (error.error?.errorMessage) {
        console.error('Program error message:', error.error.errorMessage);
      }
      console.error(error.name, error.message);
    },
  });

  // Fetch capsule on-chain
  const fetchCapsule = async (capsuleId: string, revealDate: anchor.BN) => {
    if (!capsulexProgram || !anchorWallet?.publicKey) {
      throw new Error(
        'Your wallet connection has expired. Please reconnect your wallet to continue.'
      );
    }

    const creator = anchorWallet.publicKey;

    // Derive capsule PDA using utility function
    const capsulePDA = getCapsulePda(creator, revealDate, capsulexProgramId);

    const capsule = await capsulexProgram.account.capsule.fetch(capsulePDA);

    console.log('Capsule', capsule);

    return capsule;
  };

  // Mutation for revealCapsule instruction
  const revealCapsule = useMutation({
    mutationKey: ['capsule', 'reveal'],
    mutationFn: async ({
      revealDate,
      creator,
    }: {
      revealDate: anchor.BN;
      creator?: PublicKey; // Optional, defaults to current wallet
    }) => {
      if (!capsulexProgram || !anchorWallet?.publicKey) {
        throw new Error(
          'Your wallet connection has expired. Please reconnect your wallet to continue.'
        );
      }

      const revealer = anchorWallet.publicKey;
      const capsuleCreator = creator || revealer; // Default to current wallet if not specified

      // Derive capsule PDA using utility function
      const capsulePDA = getCapsulePda(
        capsuleCreator,
        revealDate,
        capsulexProgramId
      );

      return await capsulexProgram.methods
        .revealCapsule(revealDate)
        .accounts({
          revealer: revealer,
          capsule: capsulePDA,
        } as any)
        .rpc({
          skipPreflight: true,
        });
    },
    onSuccess: (signature: string) => {
      console.log('Capsule Revealed!', `Transaction: ${signature}`);
    },
    onError: (error: any) => {
      console.error('Reveal transaction failed:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      if (error.error?.errorMessage) {
        console.error('Program error message:', error.error.errorMessage);
      }
      console.error('❌ Reveal Failed', error.message || 'Transaction failed');
    },
  });

  // Mutation for submitGuess instruction
  const submitGuess = useMutation({
    mutationKey: ['guess', 'submit'],
    mutationFn: async ({
      gamePDA,
      guessContent,
      isAnonymous,
    }: {
      gamePDA: PublicKey;
      guessContent: string;
      isAnonymous: boolean;
    }) => {
      if (!capsulexProgram || !anchorWallet?.publicKey) {
        throw new Error(
          'Your wallet connection has expired. Please reconnect your wallet to continue.'
        );
      }

      // For iOS, validate the wallet session is still active before transaction
      if (Platform.OS === 'ios') {
        console.log(
          '🔍 useCapsulexProgram - validating wallet session before transaction...'
        );

        try {
          // More robust validation: actually try to use the signer
          const signer = dynamicClientService.getSigner();
          const publicKey = signer.publicKey;

          // Verify the signer matches our expected wallet
          if (
            !publicKey ||
            publicKey.toBase58() !== anchorWallet.publicKey.toBase58()
          ) {
            throw new Error(
              'Wallet address mismatch - connection may have expired'
            );
          }

          // Test if we can actually access wallet properties (this will fail if WebView is unmounted)
          const client = dynamicClientService.getDynamicClient();
          const walletAddress = client?.wallets?.primary?.address;
          if (!walletAddress) {
            throw new Error('Cannot access wallet - WebView may be unmounted');
          }

          console.log(
            '✅ useCapsulexProgram - comprehensive wallet validation passed'
          );
        } catch (walletError) {
          console.error(
            '❌ useCapsulexProgram - wallet validation failed:',
            walletError
          );
          throw new Error(
            'Your wallet connection has expired. Please reconnect your wallet to continue.'
          );
        }
      }

      const guesser = anchorWallet.publicKey;

      // Fetch the game account to get current_guesses count
      const gameAccount = await capsulexProgram.account.game.fetch(gamePDA);

      // Derive PDAs using utility functions
      const guessPDA = getGuessPda(
        gamePDA,
        guesser,
        gameAccount.currentGuesses,
        capsulexProgramId
      );
      const vaultPDA = getVaultPda(capsulexProgramId);

      return await capsulexProgram.methods
        .submitGuess(guessContent, isAnonymous)
        .accounts({
          guesser: guesser,
          game: gamePDA,
          guess: guessPDA,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc({
          skipPreflight: false,
        });
    },
    onSuccess: (signature: string) => {
      console.log('Guess Submitted!', `Transaction: ${signature}`);
    },
    onError: (error: any) => {
      console.error('Submit guess transaction failed:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      if (error.error?.errorMessage) {
        console.error('Program error message:', error.error.errorMessage);
      }
    },
  });

  // Batch verify guesses with semantic validation results (single wallet approval)
  const verifyGuessesSemanticBatch = useMutation({
    mutationKey: ['guesses', 'verify', 'batch'],
    mutationFn: async ({
      capsulePDA,
      gamePDA,
      decryptedContent,
      validationResults,
    }: {
      capsulePDA: PublicKey;
      gamePDA: PublicKey;
      decryptedContent: string;
      validationResults: Array<{
        guess_pda: string;
        guesser?: string; // Add guesser field for leaderboard PDA derivation
        is_correct: boolean;
        oracle_timestamp?: number;
        oracle_nonce?: string;
        oracle_signature?: string;
        success: boolean;
      }>;
    }) => {
      if (!capsulexProgram || !anchorWallet?.publicKey || !provider) {
        throw new Error(
          'Your wallet connection has expired. Please reconnect your wallet to continue.'
        );
      }

      const authority = anchorWallet.publicKey;
      const successfulResults = validationResults.filter(r => r.success);

      if (successfulResults.length === 0) {
        throw new Error('No successful validation results to process');
      }

      // Warn user about multiple approvals if we can't batch
      console.log(
        `📝 Preparing to verify ${successfulResults.length} guesses in a single transaction`
      );

      // Build instructions for each successful validation
      const instructions: TransactionInstruction[] = [];
      const initializeInstructions: TransactionInstruction[] = [];
      const results = [];
      const processedGuessers = new Set<string>();

      for (const result of successfulResults) {
        try {
          const guessPDA = new PublicKey(result.guess_pda);

          // Fetch the guess account to get the guesser's address
          let guesser: PublicKey;
          if (result.guesser) {
            guesser = new PublicKey(result.guesser);
          } else {
            // Fallback: fetch guess account to get guesser
            const guessAccount =
              await capsulexProgram.account.guess.fetch(guessPDA);
            guesser = guessAccount.guesser;
          }

          // Derive leaderboard PDA for this guesser (not the authority)
          const leaderboardPDA = getLeaderboardPda(guesser, capsulexProgramId);

          // Check if we need to initialize the leaderboard for this guesser
          if (!processedGuessers.has(guesser.toBase58())) {
            processedGuessers.add(guesser.toBase58());

            try {
              // Check if leaderboard account exists
              const accountInfo =
                await connection.getAccountInfo(leaderboardPDA);
              if (accountInfo === null) {
                // Account doesn't exist, create initialization instruction
                console.log(
                  `Creating leaderboard for guesser: ${guesser.toBase58()}`
                );

                const initInstruction = await capsulexProgram.methods
                  .initializeLeaderboard(guesser)
                  .accounts({
                    authority: authority,
                    user: guesser,
                    leaderboard: leaderboardPDA,
                    systemProgram: SystemProgram.programId,
                  } as any)
                  .instruction();

                initializeInstructions.push(initInstruction);
              } else {
                console.log(
                  `Leaderboard exists for guesser: ${guesser.toBase58()}`
                );
              }
            } catch (accountError) {
              console.error(
                `Error checking leaderboard for ${guesser.toBase58()}:`,
                accountError
              );
              // Continue processing other guesses even if one fails
            }
          }

          // Create verifyGuess instruction (following semantic-integration-tests.ts pattern)
          const instruction = await capsulexProgram.methods
            .verifyGuess(
              decryptedContent.trim(),
              null, // verification_window_hours
              result.is_correct,
              new anchor.BN(
                result.oracle_timestamp || Math.floor(Date.now() / 1000)
              ),
              result.oracle_nonce || 'fallback_nonce',
              result.oracle_signature || ''
            )
            .accounts({
              authority: authority,
              guess: guessPDA,
              game: gamePDA,
              capsule: capsulePDA,
              leaderboard: leaderboardPDA, // Use guesser's leaderboard, not authority's
            } as any)
            .instruction();

          instructions.push(instruction);

          results.push({
            guess_pda: result.guess_pda,
            is_correct: result.is_correct,
            guesser: guesser.toBase58(),
          });
        } catch (error) {
          console.error(
            `Failed to create instruction for guess ${result.guess_pda}:`,
            error
          );
          // Skip this instruction but continue with others
        }
      }

      if (instructions.length === 0) {
        throw new Error('Failed to create any verification instructions');
      }

      // Combine initialization instructions with verification instructions
      const allInstructions = [...initializeInstructions, ...instructions];

      if (initializeInstructions.length > 0) {
        console.log(
          `📋 Added ${initializeInstructions.length} leaderboard initialization instructions`
        );
      }

      // Create versioned transaction with all instructions
      const { blockhash } = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: authority,
        recentBlockhash: blockhash,
        instructions: allInstructions,
      }).compileToV0Message();

      const versionedTransaction = new VersionedTransaction(messageV0);

      // Sign and send the batched transaction (single wallet approval!)
      const signature = await provider.sendAndConfirm(
        versionedTransaction,
        [],
        {
          skipPreflight: false,
          commitment: 'confirmed',
        }
      );

      console.log(
        `✅ Batch verification completed with signature: ${signature}`
      );

      return {
        results,
        transaction_signature: signature,
        summary: {
          total_processed: successfulResults.length,
          successful: instructions.length,
          failed: successfulResults.length - instructions.length,
        },
      };
    },
    onSuccess: data => {
      const { summary } = data;
      console.log('\ud83c\udf89 Batch verification completed:', summary);
    },
    onError: (error: any) => {
      console.error('Batch verification failed:', error);
    },
  });

  return {
    capsulexProgram,
    capsulexProgramId,
    createCapsule,
    revealCapsule,
    submitGuess,
    fetchCapsule,
    verifyGuessesSemanticBatch, // New batch verification function (single approval!)
    // Add other mutations/queries as needed for other instructions
  };
}
