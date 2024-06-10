import 'dotenv/config'
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { DLMM } from "./dlmm";
import BN from "bn.js";
import fs from 'fs';

const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PRIVATE_KEY || '', 'utf-8'))),
  { skipValidation: true });

const RPC = process.env.RPC || "https://api.devnet.solana.com";
const connection = new Connection(RPC, "finalized");

console.log("using RPC: ", RPC);
console.log("wallet: ", walletKeypair.publicKey.toBase58());

const mainnetPool = new PublicKey(
  "5cuy7pMhTPhVZN9xuhgSbykRb986siGJb6vnEtkuBrSU"
);

/** Utils */
export interface ParsedClockState {
  info: {
    epoch: number;
    epochStartTimestamp: number;
    leaderScheduleEpoch: number;
    slot: number;
    unixTimestamp: number;
  };
  type: string;
  program: string;
  space: number;
}

async function swap(dlmmPool: DLMM) {
  const swapAmount = new BN(1_000_000);
  // Swap quote
  const swapYtoX = false;
  const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);

  const swapQuote = await dlmmPool.swapQuote(swapAmount, swapYtoX, new BN(10), binArrays);
  
  console.log("🚀 ~ swapQuote:", swapQuote);

  console.log("inToken: ", dlmmPool.tokenX.publicKey.toBase58());
  console.log("outToken: ", dlmmPool.tokenY.publicKey.toBase58());
  
  // Swap
  
  const transaction = new Transaction();

  
  const computeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000
  });

  const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100_000
  });

  transaction.add(priorityFee);
  transaction.add(computeUnits);

  const swapTx = await dlmmPool.swap({
    inToken: dlmmPool.tokenX.publicKey,
    binArraysPubkey: swapQuote.binArraysPubkey,
    inAmount: swapAmount,
    lbPair: dlmmPool.pubkey,
    user: walletKeypair.publicKey,
    minOutAmount: swapQuote.minOutAmount,
    outToken: dlmmPool.tokenY.publicKey,
  });

  transaction.add(swapTx.instructions[1])

  try {
    const swapTxHash = await sendAndConfirmTransaction(connection, transaction, [
      walletKeypair,
    ]);
    console.log("🚀 ~ swapTxHash:", swapTxHash);
  } catch (error) {
    console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
    console.log(error);
  }
}

async function main() {
  const dlmmPool = await DLMM.create(connection, mainnetPool, {
    cluster: "mainnet-beta",
  });
  
  await swap(dlmmPool);
}

main();
