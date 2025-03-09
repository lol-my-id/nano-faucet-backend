import { Wallet } from 'simple-nano-wallet';
import { FaucetWallet } from '../modules/faucet';

const seed = process.env.SEED;

// initialize wallet
export class BananoWallet implements FaucetWallet {
    private wallet: Wallet;

    constructor() {
        this.wallet = new Wallet({
            rpcUrls: ["https://kaliumapi.appditto.com/api", "https://booster.dev-ptera.com/banano-rpc", "https://bnm.moonano.net/proxy"],
            workUrls: ["https://kaliumapi.appditto.com/api", "https://booster.dev-ptera.com/banano-rpc"],
            defaultRep: "ban_3getnanons1aaqo5itbm8wdbzhtsp7tctd6p6qa7axwff7ocemzs3w381kfy",
            addressPrefix: "ban_",
            decimalPlaces: 29,
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