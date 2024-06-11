import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { MeteoraCpi } from "../target/types/meteora_cpi";
import fs from "fs";
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  ConnectionConfig,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LBCLMM_PROGRAM_IDS } from "../lib/dlmm/constants";

require("dotenv").config();

const VAULT_SEED = "vault-authority";

export const JLP_ADDRESS = new PublicKey("27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4");
export const USDC_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const METEORA_PROGRAM = new PublicKey(LBCLMM_PROGRAM_IDS["mainnet-beta"]);

const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.PRIVATE_KEY || "", "utf-8"))
  ),
  { skipValidation: true }
);

export const wallet = new Wallet(walletKeypair);

const config: ConnectionConfig = {
  commitment: "confirmed",
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000,
};

export const connection = new Connection(process.env.RPC, config);
export const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);
export const program = anchor.workspace.MeteoraCpi as Program<MeteoraCpi>;

console.log("rpc: ", process.env.RPC);
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

export const findAssociatedTokenAddress = (
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const execTx = async (transaction: Transaction) => {
  // Execute the transaction

  const rawTransaction = transaction.serialize();

  const result = await connection.simulateTransaction(transaction as Transaction);
  console.log('simulate result');
  console.log(result);

  if (result.value.err) {
      console.log(result.value.err);
      console.log(result.value.returnData);
      return;
  }

  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 2,
    preflightCommitment: "processed",
  });
  console.log(`https://solscan.io/tx/${txid}`);

  const confirmed = await connection.confirmTransaction(txid, "confirmed");

  console.log("err ", confirmed.value.err);
};
