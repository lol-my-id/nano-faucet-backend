import { Response, Params, Controller, Get, Request } from '@decorators/express';

import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { RequireCaptcha } from '../decorators/CaptchaMiddleware';
import { Wallet } from '../modules/crud';
import log from '../modules/logger';
import { Errors, WalletNotFoundError } from '../types/errors';
import { CLAIM_TIMEOUT_SECONDS, Currency, getCurrencyFromAddress } from '../modules/utils';
import { Faucet } from '../modules/faucet';
import { ValidateAddress } from '../decorators/ValidateAddress';

@Controller('/faucet')
export class FaucetController {
    @ValidateAddress()
    @RequireCaptcha()
    @Get('/:address')
    claimFaucet(@Request() req: ExpressRequest, @Response() res: ExpressResponse, @Params('address') address: string) {
        const refAddress = req.headers['ref'] as string ?? '';

        // Get faucet, getCurrencyFromAddress can't fail because validate passed
        const faucet = Faucet.get(getCurrencyFromAddress(address) as Currency);
        const winnings = faucet.winnings;

        if(!faucet) {
            return res.status(500).send({ error: Errors.FAUCET_UNAVAILABLE });
        }

        faucet.claim(address, refAddress).then((data) => {
            return res.status(200).json({ ...data, winnings });
        }).catch((err) => {
            log.error('Failed to claim faucet:', err);
            return res.status(400).send({ error: Errors.FAILED });
        });
    }

    @ValidateAddress()
    @Get('/:address/when')
    when(@Response() res: ExpressResponse, @Params('address') address: string) {
        const response = { seconds: 0 }; // How long until the next claim in seconds

        Wallet.ByAddress(address).then((data) => {
            const now = Date.now();
            const diff = now - data.last;

            // Convert to seconds remaining
            response.seconds = CLAIM_TIMEOUT_SECONDS - Math.floor(diff/1000);
            if(response.seconds < 0) response.seconds = 0;

            return res.status(200).json(response);
        }).catch((err) => {
            // Wallet not found is a valid response, first time user
            if(err instanceof WalletNotFoundError) {
                return res.status(200).json(response);
            }

            log.error('Failed to get wallet:', err);
            return res.status(400).send({ error: Errors.INVALID_ADDRESS });  
        });;
    }
}