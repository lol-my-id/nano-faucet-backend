import { WalletNotFoundError } from "../types/errors";
import { WalletModel, IWallet } from "../models/Wallet";
import log from "./logger";

export class Wallet {
    static collection = WalletModel;

    static async ByID(id: string): Promise<IWallet> {
        return new Promise<IWallet>((resolve, reject) => {
            WalletModel.findById(id)
                .then(wallet => {
                    if (!wallet) {
                        throw new WalletNotFoundError();
                    }

                    resolve(wallet as IWallet)
                }).catch(reject);
        });
    }

    static async ByAddress(address: string): Promise<IWallet> {
        return new Promise<IWallet>((resolve, reject) => {
            WalletModel.findOne({ address })
                .then(wallet => {
                    if (!wallet) {
                        throw new WalletNotFoundError();
                    }
                    
                    resolve(wallet as IWallet)
                }).catch(reject);
        });
    }

    static async Create(address: string, currency: string, refAddress?: string): Promise<IWallet> {
        log.debug('Creating wallet:', address, currency, refAddress);
        if(refAddress) {
            try {
                const wallet = await Wallet.ByAddress(refAddress);
                await this.Update(wallet._id.toString(), { $inc: { ref_total: 1 } });
            } catch(err) {
                refAddress = '';
            }
        }

        currency = currency.toLowerCase();

        return new Promise<IWallet>((resolve, reject) => {
            WalletModel.create({
                address,
                currency,
                times: 0,
                last: 0,
                ref_claim: 0,
                ref_earnings: 0,
                ref_link: refAddress,
                ref_total: 0,
            }).then(wallet => resolve(wallet as IWallet)).catch(reject);
        });
    }

    static async Update(id: string, data: any): Promise<IWallet> {
        return new Promise<IWallet>((resolve, reject) => {
            WalletModel.findByIdAndUpdate(id, data, { new: true })
                .then(wallet => resolve(wallet as IWallet))
                .catch(reject);
        });
    }

    static IncrementRefTotal = (address: string) => WalletModel.findOneAndUpdate({ address }, { $inc: { ref_total: 1 } }, { new: true });
    static AwardReferral = (address: string, prize: number) => WalletModel.findOneAndUpdate({ address }, { $inc: { ref_earnings: prize, ref_claim: prize } }, { new: true });
}