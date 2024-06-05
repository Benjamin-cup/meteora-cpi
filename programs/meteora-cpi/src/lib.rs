use anchor_lang::prelude::*;

declare_id!("7eErExKc7XPvoqpTCitqv5PFs2GvcJAooK7NCPmYM55b");

#[program]
pub mod meteora_cpi {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
