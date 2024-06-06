import {
  vault,
  wallet,
  connection,
  execTx,
  program,
  findAssociatedTokenAddress,
  USDC_ADDRESS,
  JLP_ADDRESS,
} from "./helper";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
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
  const userTokenIn = findAssociatedTokenAddress(vault, USDC_ADDRESS);
  console.log("userTokenIn: ", userTokenIn.toBase58());

  const userTokenOut = findAssociatedTokenAddress(vault, JLP_ADDRESS);
  console.log("userTokenOut: ", userTokenOut.toBase58());

  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 100000,
  });

  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1000000,
  });

  const transaction = new Transaction();

  transaction
    .add(addPriorityFee)
    .add(modifyComputeUnits)
    .add(
      await program.methods
        .tokenSwap()
        .accounts({
          lbPair: new PublicKey("5cuy7pMhTPhVZN9xuhgSbykRb986siGJb6vnEtkuBrSU"),
          reserveX: new PublicKey(
            "9wbTcHco8daQYxVPWn1eqDQe2YPY3ak3gPfQuYAcZ4PJ"
          ),
          reserveY: new PublicKey(
            "Cpwo6h4koL8pC87R17g1dX8zfEQ6Pnv3AHXGPpNJqBuf"
          ),
          userTokenIn,
          userTokenOut,
          tokenXMint: JLP_ADDRESS,
          tokenYMint: USDC_ADDRESS,
          oracle: new PublicKey("2NBaawB9aeYocWvyiECcDxSSwcyJd1B8oaHzpyEFbapc"),
          meteoraProgram: new PublicKey(
            "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
          ),
          eventAuthority: new PublicKey(
            "D1ZN9Wj1fRSUQfCjhvnu1hqDMT7hzjzBBpi12nVniYD6"
          ),
          account: new PublicKey(
            "6z44Pf3zvHtebfdKnFrj9PsLSe42WfzNpXr7v1GqS6u"
          ),
        })
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
