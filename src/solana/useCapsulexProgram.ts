import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Capsulex as CapsulexProgramType } from '../../assets/capsulex'; // Renamed to avoid conflict
import idl from '../../assets/capsulex.json'; // Assuming this is the correct path
import { alertAndLog } from '../utils/alertAndLog';
import { useConnection } from '../utils/ConnectionProvider';
import { useAnchorWallet } from '../utils/useAnchorWallet';

const CAPSULEX_PROGRAM_ID = 'J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH';

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

      // Derive PDAs
      const [capsulePDA] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode('capsule'),
          creator.toBuffer(),
          revealDate.toArrayLike(Buffer, 'le', 8), // i64 is 8 bytes, little-endian
        ],
        capsulexProgramId
      );

      const [nftMintPDA] = PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode('capsule_mint'), capsulePDA.toBuffer()],
        capsulexProgramId
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode('vault')],
        capsulexProgramId
      );

      // Always derive the game PDA (required by program)
      const [gamePDA] = PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode('game'), capsulePDA.toBuffer()],
        capsulexProgramId
      );

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
      alertAndLog(error.name, error.message);
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

    // Derive PDAs
    const [capsulePDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode('capsule'),
        creator.toBuffer(),
        revealDate.toArrayLike(Buffer, 'le', 8), // i64 is 8 bytes, little-endian
      ],
      capsulexProgramId
    );

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

      // Derive capsule PDA
      const [capsulePDA] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode('capsule'),
          capsuleCreator.toBuffer(),
          revealDate.toArrayLike(Buffer, 'le', 8), // i64 is 8 bytes, little-endian
        ],
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
      alertAndLog(
        '🎉 Capsule Revealed!',
        `Transaction confirmed: ${signature.slice(0, 8)}...`
      );
    },
    onError: (error: any) => {
      console.error('Reveal transaction failed:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      if (error.error?.errorMessage) {
        console.error('Program error message:', error.error.errorMessage);
      }
      alertAndLog('❌ Reveal Failed', error.message || 'Transaction failed');
    },
  });

  return {
    capsulexProgram,
    capsulexProgramId,
    createCapsule,
    revealCapsule,
    fetchCapsule,
    // Add other mutations/queries as needed for other instructions
  };
}
