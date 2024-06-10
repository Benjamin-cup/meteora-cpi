import BN from "bn.js";
import { DLMM } from "../lib/dlmm";
import {
  vault,
  wallet,
  connection,
  execTx,
  program,
  findAssociatedTokenAddress,
  JLP_USDC_POOL,
  METEORA_PROGRAM,
} from "./helper";
import {
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  AccountMeta,
} from "@solana/web3.js";

const main = async () => {
  // await initialize();
  await tokenSwap();
};

const initialize = async () => {
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 20000,
  });

  const transaction = new Transaction();

  transaction.add(addPriorityFee).add(
    await program.methods
      .initialize()
      .accounts({
        admin: wallet.publicKey,
      })
      .transaction()
  );

  const blockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.feePayer = wallet.publicKey;
  const signedTx = await wallet.signTransaction(transaction);

  try {
    await execTx(signedTx);
  } catch (e) {
    console.log(e);
  }
};

const tokenSwap = async () => {
  const dlmmPool = await DLMM.create(connection, JLP_USDC_POOL, {
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

  const { tokenXMint, tokenYMint, reserveX, reserveY, activeId, oracle } =
    await dlmmPool.fetchAccounts(JLP_USDC_POOL);

  const userTokenIn = findAssociatedTokenAddress(vault, tokenYMint);
  console.log("userTokenIn: ", userTokenIn.toBase58());

  const userTokenOut = findAssociatedTokenAddress(vault, tokenXMint);
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
          lbPair: JLP_USDC_POOL,
          reserveX,
          reserveY,
          userTokenIn,
          userTokenOut,
          tokenXMint,
          tokenYMint,
          oracle,
          meteoraProgram: METEORA_PROGRAM,
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
