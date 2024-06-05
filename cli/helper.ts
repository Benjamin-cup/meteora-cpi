import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { MeteoraCpi } from "../target/types/meteora_cpi";
import fs from "fs";
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  VersionedTransaction,
  AddressLookupTableAccount,
  TransactionInstruction,
  ConnectionConfig,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

require("dotenv").config();

const VAULT_SEED = "vault-authority";

const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.KEYPAIR || "", "utf-8"))
  ),
  { skipValidation: true }
);

export const wallet = new Wallet(walletKeypair);

const config: ConnectionConfig = {
  commitment: "confirmed",
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000,
};

export const connection = new Connection(process.env.RPC_URL, config);
export const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);
export const program = anchor.workspace.Genius as Program<MeteoraCpi>;

console.log("rpc: ", process.env.RPC_URL);
console.log("user: ", wallet.publicKey.toBase58());
console.log("program: ", program.programId.toBase58());

const findVault = (): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    program.programId
  )[0];
};
export const vault = findVault();
console.log("vault: ", vault.toBase58());

export const findAssociatedTokenAddress = ({
  walletAddress,
  tokenMintAddress,
}: {
  walletAddress: PublicKey;
  tokenMintAddress: PublicKey;
}): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const getAdressLookupTableAccounts = async (
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};

export const instructionDataToTransactionInstruction = (
  instructionPayload: any
) => {
  if (instructionPayload === null) {
    return null;
  }

  return new TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instructionPayload.data, "base64"),
  });
};

export const execTx = async (transaction: Transaction) => {
  // Execute the transaction

  const rawTransaction = transaction.serialize();

  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 2,
    preflightCommitment: "processed",
  });
  console.log(`https://solscan.io/tx/${txid}`);

  const confirmed = await connection.confirmTransaction(txid, "confirmed");

  console.log("err ", confirmed.value.err);
};
