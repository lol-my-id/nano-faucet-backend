import { WalletNotFoundError } from "../types/errors";
import { Wallet } from "./crud";
import { ExchangeService } from "./exchangeService";
import log from "./logger";
import { CLAIM_TIMEOUT_SECONDS, Currency, getCurrencyFromAddress, validate, validateAddress } from "./utils";

interface Faucets {
    [currency: string]: Faucet;
}

export abstract class FaucetWallet {
    abstract address: string;
    abstract send(address: string, amount: number): Promise<string>; // Should return hash or throw an error in case of fail
}

interface Settings {
    currency: Currency;
    wallet: FaucetWallet;
    winnings: Array<number>;
}

interface Claim {
    hash: string;
    prize: number;
}

export class Faucet {
    static readonly list: Faucets = {};
    
    static get(currency: Currency): Faucet {
        return this.list[currency];
    }

    readonly settings: Settings;

    get winnings(): Array<number> {
        return this.settings.winnings;
    }

    // Queue of claims to prevent race conditions
    private claimQueue: Array<{ 
        address: string; 
        refAddress: string;
        resolve: ({hash, prize}: Claim) => void; 
        reject: (reason?: any) => void 
    }> = [];
    private refClaimQueue: Array<{ 
        address: string; 
        resolve: (value: string) => void; 
        reject: (reason?: any) => void 
    }> = [];

    private isProcessingClaim = false;
    private isProcessingRefClaim = false;

    /**
     * Calculate weighted random prize
     * @returns A random number from the winnings array
     */
    roll(): number {
        const items = this.settings.winnings.sort((a, b) => a - b);
        const totalWeight = items.reduce((sum, _, i) => sum + 1/(i+1), 0);

        let randomNumber = Math.random() * totalWeight;

        return items.find((_, i) => (randomNumber -= 1/(i+1)) < 0) || items[0];
    }

    private async processClaimQueue() {
        if (this.isProcessingClaim) return;
        this.isProcessingClaim = true;
    
        while (this.claimQueue.length > 0) {
            const { address, refAddress, resolve, reject } = this.claimQueue.shift()!;
            try {
                const hash = await this.processClaim(address, refAddress);
                resolve(hash);
            } catch (error) {
                reject(error);
            }
        }
    
        this.isProcessingClaim = false;
    }
    

    claim(address: string, refAddress?: string): Promise<Claim> {
        refAddress = refAddress ?? '';
        return new Promise<Claim>((resolve, reject) => {
            this.claimQueue.push({ address, refAddress, resolve, reject });
            if (!this.isProcessingClaim) {
                this.processClaimQueue();
            }
        });
    }

    awardReferral(address: string, amount: number): void {
        if (!validate(address)) throw new Error('Invalid address');
        if (amount <= 0) throw new Error('Invalid amount');

        Wallet.AwardReferral(address, amount).catch(()=>{})
    }

    /**
     * Claim a prize
     * @param address The address to send the prize to
     * @returns The hash of the transaction
     * @throws Invalid address
     * @throws Invalid prize
     */
    async processClaim(address: string, refAddress: string): Promise<Claim> {
        if (!validate(address)) throw new Error('Invalid address');

        const prize = this.roll();

        return new Promise<Claim>((resolve, reject) => {
            Wallet.ByAddress(address).then(async (data) => {
                const lastClaim = data.last;
                const now = Date.now();

                if(Math.floor((now - lastClaim) / 1000) < CLAIM_TIMEOUT_SECONDS) {
                    throw new Error('Claim too soon');
                }

                await Wallet.Update(data._id.toString(), { $inc: { times: 1 }, last: now });

                log.debug(`Awarding ${address} with ${prize}, ref: ${refAddress}`);
                try {
                    const hash = await this.settings.wallet.send(address, prize);
                    
                    if(data.ref_link && ExchangeService.available) {
                        try {
                            const refPrize = ExchangeService.convert(this.settings.currency, getCurrencyFromAddress(data.ref_link) as Currency, prize);
                            log.debug(`Awarding referral ${data.ref_link} with ${refPrize*0.2}`);
                            this.awardReferral(data.ref_link, refPrize*0.2);
                        } catch(err) {
                            log.error('Failed to award referral:', err);
                        } // Ignore errors
                    }

                    resolve({ hash, prize });
                } catch {
                    // Revert 'last' on error
                    await Wallet.Update(data._id.toString(), { $set: { last: lastClaim }, $inc: { times: -1 } });
                    throw new Error('Failed to send prize');
                }
            }).catch(err=>{
                if(err instanceof WalletNotFoundError) {
                    Wallet.Create(address, this.settings.currency, refAddress).then(async()=>{
                        resolve(await this.processClaim(address, refAddress));
                    });
                    return;
                }

                reject(err);
            });
        });
    }

    refClaim(address: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.refClaimQueue.push({ address, resolve, reject });
            if (!this.isProcessingRefClaim) {
                this.processRefClaimQueue();
            }
        });
    }
    
    private async processRefClaimQueue() {
        if (this.isProcessingRefClaim) return;
        this.isProcessingRefClaim = true;
    
        while (this.refClaimQueue.length > 0) {
            const { address, resolve, reject } = this.refClaimQueue.shift()!;
            try {
                const hash = await this.processRefClaim(address);
                resolve(hash);
            } catch (error) {
                reject(error);
            }
        }
    
        this.isProcessingRefClaim = false;
    }
    
    async processRefClaim(address: string): Promise<string> {
        if (!validate(address)) throw new Error('Invalid address');
    
        try {
            const wallet = await Wallet.ByAddress(address);
            if (wallet.ref_claim <= 0) throw new Error('Nothing to claim');
            const claimAmount = wallet.ref_claim;
    
            // Atomically reset ref_claim
            const updated = await Wallet.collection.findOneAndUpdate(
                { _id: wallet._id, ref_claim: claimAmount },
                { $set: { ref_claim: 0 } },
                { returnDocument: 'after' }
            );
    
            if (!updated) throw new Error('Concurrent ref_claim detected');
    
            try {
                const hash = await this.settings.wallet.send(address, claimAmount);
                return hash;
            } catch (err) {
                // Revert ref_claim on error
                await Wallet.collection.updateOne(
                    { _id: wallet._id, ref_claim: 0 },
                    { $set: { ref_claim: claimAmount } }
                );
                throw err;
            }
        } catch (error) {
            log.error('Failed to claim ref prize: ' + error);
            throw error;
        }
    }

    constructor(settings: Settings) {
        this.settings = settings;

        this.claimQueue = [];
        this.refClaimQueue = [];

        // Add Faucet to the list
        Faucet.list[this.settings.currency] = this;
    }
}