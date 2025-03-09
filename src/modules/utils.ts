import { format } from "util";
import isValid from 'nano-address-validator';

export const CLAIM_TIMEOUT_SECONDS = parseInt(process.env.CLAIM_TIMEOUT || '45') * 60;
export const IS_DEV = ['dev', 'development'].includes((process.env.NODE_ENV ?? "prod").toLowerCase());
export type Currency = 'NANO' | 'XDG' | 'BAN';

export const convertIntoNanoAddress = (address: string) => `nano_${address.split("_")?.[1] ?? ""}`;
export const validate = (address: string) => address && validateAddress(address) && getCurrencyFromAddress(address)

const htmlEncode = (str: string) => str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string));
export function createReferralHtml(address: string) {
    const faucetName = process.env.FAUCET_NAME || 'NANO Faucet';

    let body = `<meta name="title" content="${htmlEncode(faucetName)} - join from my link!">`;
    body += `<meta name="description" content="${htmlEncode(format(process.env.REFERRAL_DESCRIPTION || 'Join %s and get free NANO!', faucetName))}" />`;
    body += `<script>\n`;
    body += `localStorage.setItem("ref","${address.replace(/[\u00A0-\u9999<>\&]/g, function(i) {return '&#'+i.charCodeAt(0)+';';})}");\n`;
    body += `window.location.href = "../";\n`;
    body += `</script>\n`;

    return body;
}

export function getCurrencyFromAddress(address: string): Currency | false {
    const addressSplit = address.split('_');

    if(addressSplit.length < 2) return false;
    
    const currency = addressSplit[0].toUpperCase();

    return ['NANO', 'XDG', 'BAN'].includes(currency) ? currency as Currency : false;
}

export function validateAddress(address: string): boolean {
    return isValid(convertIntoNanoAddress(address));
}