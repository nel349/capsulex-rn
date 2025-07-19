import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";

import { Capsulex as CapsulexProgramType } from "../../assets/capsulex"; // Renamed to avoid conflict
import idl from "../../assets/capsulex.json"; // Assuming this is the correct path
import { useConnection } from "../utils/ConnectionProvider";
import { useAnchorWallet } from "../utils/useAnchorWallet";
import { useMutation } from "@tanstack/react-query";
import { alertAndLog } from "../utils/alertAndLog";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const CAPSULEX_PROGRAM_ID = "J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH";

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
      preflightCommitment: "confirmed",
      commitment: "processed",
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
    mutationKey: ["capsule", "create"],
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
        throw Error("Capsulex program not instantiated or wallet not connected");
      }

      const creator = anchorWallet.publicKey;

      // Derive PDAs
      const [capsulePDA] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("capsule"),
          creator.toBuffer(),
          revealDate.toArrayLike(Buffer, "le", 8), // i64 is 8 bytes, little-endian
        ],
        capsulexProgramId
      );

      const [nftMintPDA] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("capsule_mint"),
          capsulePDA.toBuffer(),
        ],
        capsulexProgramId
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("vault")],
        capsulexProgramId
      );

      return await capsulexProgram.methods
        .createCapsule(
          encryptedContent,
          contentStorage,
          contentIntegrityHash,
          revealDate,
          isGamified
        )
        .accounts({
          creator: creator,
          capsule: capsulePDA,
          nftMint: nftMintPDA,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();
    },
    onSuccess: (signature: string) => {
      alertAndLog("Capsule Created!", `Transaction: ${signature}`);
      console.log("Capsule Created!", `Transaction: ${signature}`);
      // You might want to refetch a list of capsules here if you have one
    },
    onError: (error: any) => {
      console.error("Transaction failed:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      if (error.error && error.error.errorMessage) {
        console.error("Program error message:", error.error.errorMessage);
      }
      alertAndLog(error.name, error.message);
    },
  });

  return {
    capsulexProgram,
    capsulexProgramId,
    createCapsule,
    // Add other mutations/queries as needed for other instructions
  };
}
