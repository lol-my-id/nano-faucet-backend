export class WalletNotFoundError extends Error {
    constructor() {
        super("Wallet not found in database");
        this.name = 'WalletNotFoundError';
    }
}

export enum Errors {
    INVALID_ADDRESS = 'INVALID_ADDRESS',
    FAUCET_UNAVAILABLE = 'FAUCET_UNAVAILABLE',
    FAILED = 'FAILED',
    CAPTCHA = 'CAPTCHA',
}