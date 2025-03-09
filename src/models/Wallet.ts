import mongoose, { Types } from "mongoose";

export interface IWallet {
    _id: Types.ObjectId;
    address: string;
    times: number;
    last: number;
    ref_claim: number;
    ref_earnings: number;
    ref_link: string;
    ref_total: number;
    currency: string;
}

export const WalletSchema = new mongoose.Schema({
    address:        { type: String, required: true },
    times:          { type: Number, required: true },
    last:           { type: Number, required: true },
    ref_claim:      { type: Number, required: true },
    ref_earnings:   { type: Number, required: true },
    ref_link:       { type: String, required: false },
    ref_total:      { type: Number, required: true },
    currency:       { type: String, required: true },
});
  
export const WalletModel = mongoose.model('wallets', WalletSchema);