use anchor_lang::{
    prelude::*,
    solana_program::{
        instruction::Instruction,
        program::invoke_signed
    }
};
use anchor_spl::token::Token;
use std::str::FromStr;

pub mod utils;
use utils::*;

declare_id!("43cXKeawG2C13yMH4NzgfXPMaRVPEggQm1aqsKxoSJia");

pub const VAULT_SEED: &[u8] = b"vault-authority";

const AMOUNT_IN: u64 = 100_000;
const MIN_AMOUNT_OUT: u64 = 0;

#[program]
pub mod meteora_cpi {

    use super::*;

    pub fn token_swap<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, TokenSwap<'info>>) -> Result<()> {
        msg!("yo, this is microgift");
        
        let vault_bump = ctx.bumps.vault.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[
            &[VAULT_SEED, vault_bump.as_ref()]
        ];

        msg!("Swap on Meteora");

        let meteora_program_id: Pubkey = Pubkey::from_str(METEORA_PROGRAM_KEY).unwrap();

        let mut accounts: Vec<AccountMeta> = vec![
            AccountMeta::new(ctx.accounts.lb_pair.key(), false),
            AccountMeta::new_readonly(ctx.accounts.meteora_program.key(), false),
            AccountMeta::new(ctx.accounts.reserve_x.key(), false),
            AccountMeta::new(ctx.accounts.reserve_y.key(), false),
            AccountMeta::new(ctx.accounts.user_token_in.key(), false),
            AccountMeta::new(ctx.accounts.user_token_out.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_x_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_y_mint.key(), false),
            AccountMeta::new(ctx.accounts.oracle.key(), false),
            AccountMeta::new(ctx.accounts.meteora_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.vault.key(), true),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
            AccountMeta::new_readonly(ctx.accounts.meteora_program.key(), false)
        ];
        accounts.extend(
            ctx.remaining_accounts.iter().map(|acc| AccountMeta {
                pubkey: *acc.key,
                is_signer: false,
                is_writable: true
            })
        );

        let data = get_ix_data(AMOUNT_IN, MIN_AMOUNT_OUT);

        let instruction = Instruction {
            program_id: meteora_program_id,
            accounts,
            data
        };

        let mut account_infos: Vec<AccountInfo<'info>> = vec![
            ctx.accounts.lb_pair.to_account_info(),
            ctx.accounts.reserve_x.to_account_info(),
            ctx.accounts.reserve_y.to_account_info(),
            ctx.accounts.user_token_in.to_account_info(),
            ctx.accounts.user_token_out.to_account_info(),
            ctx.accounts.token_x_mint.to_account_info(),
            ctx.accounts.token_y_mint.to_account_info(),
            ctx.accounts.oracle.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.meteora_program.to_account_info(),
            ctx.accounts.event_authority.to_account_info()
        ];

        account_infos.extend_from_slice(ctx.remaining_accounts);


        invoke_signed(&instruction, &account_infos, signer_seeds)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct TokenSwap<'info> {

    #[account(
        seeds = [VAULT_SEED], 
        bump
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: 
    pub meteora_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    /// CHECK: will be checked on meteora
    pub lb_pair: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: 
    pub reserve_x: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: 
    pub reserve_y: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: 
    pub user_token_in: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: 
    pub user_token_out: AccountInfo<'info>,

    /// CHECK: 
    pub token_x_mint: AccountInfo<'info>,
    /// CHECK: 
    pub token_y_mint: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: 
    pub oracle: AccountInfo<'info>,
    
    /// CHECK: 
    pub event_authority: AccountInfo<'info>
}


