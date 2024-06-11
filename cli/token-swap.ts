import BN from "bn.js";
import { DLMM } from "../lib/dlmm";
import {
  vault,
  wallet,
  connection,
  execTx,
  program,
  findAssociatedTokenAddress,
  METEORA_PROGRAM,
  JLP_ADDRESS,
  USDC_ADDRESS,
} from "./helper";
import {
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  AccountMeta,
} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { LbPairAccount } from "../lib/dlmm/types";
import { findProgramAddress } from "@raydium-io/raydium-sdk";

const main = async () => {

  const lbPairs = await DLMM.getLbPairsForTokens(connection, JLP_ADDRESS, USDC_ADDRESS);

  const tokenAmounts = await Promise.all(
    lbPairs.map(async (lbPair) => await connection.getTokenAccountBalance(lbPair.account.reserveX))
  );

  const maxIndex = tokenAmounts.reduce((maxIdx, current, idx, arr) => {
    const currentValue = current.value.uiAmount;
    const maxValue = arr[maxIdx].value.uiAmount;
    
    if (currentValue === null) return maxIdx;
    if (maxValue === null || currentValue > maxValue) return idx;
    
    return maxIdx;
  }, 0);

  await tokenSwap(lbPairs[maxIndex]);
};

const tokenSwap = async (lbPair: LbPairAccount) => {
  
  const dlmmPool = await DLMM.create(connection, lbPair.publicKey, {
    cluster: "mainnet-beta",
  });

  //  Swap quote
  const swapYtoX = true;
  const binArrayAccounts = await dlmmPool.getBinArrayForSwap(swapYtoX);

  const swapQuote = dlmmPool.swapQuote(
    new BN(1_000_000),
    swapYtoX,
    new BN(10),
    binArrayAccounts
  );

  const { tokenXMint, tokenYMint, reserveX, reserveY, oracle } = lbPair.account;

  const userTokenIn = findAssociatedTokenAddress(vault, tokenYMint);
  const userTokenOut = findAssociatedTokenAddress(vault, tokenXMint);
  const eventAuthority = findProgramAddress([Buffer.from("__event_authority")], METEORA_PROGRAM).publicKey;

  console.log("tokenIn: ", tokenYMint.toBase58());
  console.log("tokenOut: ", tokenXMint.toBase58());
  console.log("userTokenIn: ", userTokenIn.toBase58());
  console.log("userTokenOut: ", userTokenOut.toBase58());

  const binArrays: AccountMeta[] = swapQuote.binArraysPubkey.map((pubkey) => {
    return {
      isSigner: false,
      isWritable: true,
      pubkey,
    };
  });

  const transaction = new Transaction();

  transaction
    .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }))
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }))
    .add(
      await program.methods
        .tokenSwap()
        .accounts({
          lbPair: lbPair.publicKey,
          reserveX,
          reserveY,
          userTokenIn,
          userTokenOut,
          tokenXMint,
          tokenYMint,
          oracle,
          meteoraProgram: METEORA_PROGRAM,
          eventAuthority
        })
        .remainingAccounts(binArrays)
        .transaction()
    );

  const blockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.feePayer = wallet.publicKey;
  const signedTx = await wallet.signTransaction(transaction);

  try {
    //  send and confirm the transaction
    await execTx(signedTx);
  } catch (e) {
    console.log(e);
  }
};

main();
