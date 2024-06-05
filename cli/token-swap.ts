import {
  vault,
  wallet,
  connection,
  getAdressLookupTableAccounts,
  instructionDataToTransactionInstruction,
  execTx,
  program,
} from "./helper";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  SystemProgram,
  TransactionMessage,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";

const main = async () => {
  await initialize();
};

const initialize = async () => {
  const transaction = await program.methods
    .initialize()
    .accounts({
      admin: wallet.publicKey,
    })
    .transaction();

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
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300000,
  });

  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 2000,
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
          userTokenIn: new PublicKey(
            "Fnpkm1dQeu89SZHXAQz4BcJYben5ZuDLHB8KSFGAXhUG"
          ),
          userTokenOut: new PublicKey(
            "6yKa28HZZiSvr37kLiJAFWBp9kHHVXUqWRM8r1x2riWW"
          ),
          tokenXMint: new PublicKey(
            "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4"
          ),
          tokenYMint: new PublicKey(
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
          ),
          oracle: new PublicKey("2NBaawB9aeYocWvyiECcDxSSwcyJd1B8oaHzpyEFbapc"),
          meteoraProgram: new PublicKey(
            "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
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
