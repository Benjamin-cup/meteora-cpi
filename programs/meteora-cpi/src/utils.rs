use anchor_lang::prelude::*;

pub const METEORA_PROGRAM_KEY: &str = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

#[derive(AnchorSerialize, AnchorDeserialize)]
struct CpiArgs {
    amount_in: u64,
    min_amount_out: u64
}

pub fn get_ix_data(amount_in: u64, min_amount_out: u64) -> Vec<u8> {
    let hash = get_function_hash("global", "swap");
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = CpiArgs { amount_in, min_amount_out };
    args.serialize(&mut buf).unwrap();
    buf
}

fn get_function_hash(namespace: &str, name: &str) -> [u8; 8] {
    let preimage = format!("{}:{}", namespace, name);
    let mut sighash = [0u8; 8];
    sighash.copy_from_slice(
        &anchor_lang::solana_program::hash::hash(preimage.as_bytes()).to_bytes()
            [..8],
    );
    sighash
}