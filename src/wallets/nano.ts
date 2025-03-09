import { Wallet } from 'simple-nano-wallet';
import { FaucetWallet } from '../modules/faucet';

const seed = process.env.SEED;

// initialize wallet
export class NanoWallet implements FaucetWallet {
    private wallet: Wallet;

    constructor() {
        this.wallet = new Wallet({
            rpcUrls: ["https://nanoslo.0x.no/proxy", "https://rainstorm.city/api", "https://node.somenano.com/proxy"],
            workUrls: ["https://nanoslo.0x.no/proxy", "https://rainstorm.city/api", "https://node.somenano.com/proxy", "https://rpc.nano.to"],
            defaultRep: "nano_3getnanons1aaqo5itbm8wdbzhtsp7tctd6p6qa7axwff7ocemzs3w381kfy",
            seed,
        });

        this.wallet.generateAccounts(1);
    }
    
    get address(): string {
        return this.wallet.accounts[0];
    }

    send(address: string, amount: number): Promise<string> {
        return this.wallet.sendFunds({
            source: this.address,
            destination: address,
            amount: this.wallet.tools.megaToRaw(amount)
        });
    }
}