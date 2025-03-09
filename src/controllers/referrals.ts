import { Response, Params, Controller, Get, Post } from '@decorators/express';

import { Response as ExpressResponse } from 'express';
import { RequireCaptcha } from '../decorators/CaptchaMiddleware';
import { Currency, getCurrencyFromAddress } from '../modules/utils';
import { Wallet } from '../modules/crud';
import { Faucet } from '../modules/faucet';
import log from '../modules/logger';
import { Errors } from '../types/errors';
import { ValidateAddress } from '../decorators/ValidateAddress';

@Controller('/ref')
export class ReferralController {
    @ValidateAddress()
    @Get('/:address')
    getData(@Response() res: ExpressResponse, @Params('address') address: string) {
        Wallet.ByAddress(address).then((data) => {
            return res.status(200).json({
                url: data._id.toString(),
                usersReferred: data.ref_total,
                totalEarned: data.ref_earnings,
                availableToClaim: data.ref_claim,
            });
        }).catch((err) => {
            return res.status(400).send('Wallet not found');
        });
    }

    @ValidateAddress()
    @RequireCaptcha()
    @Post('/:address/claim')
    claim(@Response() res: ExpressResponse, @Params('address') address: string) {
        // Get faucet, getCurrencyFromAddress can't fail because validate passed
        const faucet = Faucet.get(getCurrencyFromAddress(address) as Currency);

        if(!faucet) {
            return res.status(500).send({ error: Errors.FAUCET_UNAVAILABLE });
        }

        faucet.refClaim(address).then((data) => {
            return res.status(200).json(data);
        }).catch((err) => {
            log.error('Failed to claim referral:', err);
            return res.status(400).send({ error: Errors.FAILED });
        });
    }
}