import { Response, Params, Controller, Get } from '@decorators/express';

import { Response as ExpressResponse } from 'express';
import { createReferralHtml } from '../modules/utils';
import { Wallet } from '../modules/crud';

@Controller('/r')
export class RefLinkController {
    @Get('/')
    index(@Response() res: ExpressResponse) {
        return res.send('There\'s nothing for you here');
    }

    @Get('/:id')
    refLink(@Response() res: ExpressResponse, @Params('id') id: string) {
        if (!id || id.length !== 24) {
            return res.status(400).send('Invalid Referral ID');
        }

        // Looks better than try..catch async/await
        Wallet.ByID(id).then((data) => {
            const html = createReferralHtml(data.address);

            res.status(200);
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }).catch((err) => {
            return res.status(400).send('Invalid Referral ID');
        });
    }
}