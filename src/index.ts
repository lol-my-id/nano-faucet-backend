import 'dotenv/config';

import express from 'express';
import log from './modules/logger';

import { attachControllers } from '@decorators/express';
import { RefLinkController } from './controllers/referralLink';
import { Database } from './modules/database';
import { FaucetController } from './controllers/faucet';
import { ReferralController } from './controllers/referrals';
import { Faucet } from './modules/faucet';
import { ExchangeService } from './modules/exchangeService';
import { NanoWallet } from './wallets/nano';
import { DogeNanoWallet } from './wallets/dogenano';
import { BananoWallet } from './wallets/banano';
import { IS_DEV } from './modules/utils';

const app = express();

const PORT = process.env.PORT || 3000;

function initFaucets() {
    log.info("Initializing faucets...");

    new Faucet({
        currency: "NANO",
        wallet: new NanoWallet(),
        winnings: [0.00007, 0.00008, 0.0001, 0.000155, 0.0002]
    });

    new Faucet({
        currency: "XDG",
        wallet: new DogeNanoWallet(),
        winnings: [0.034, 0.04, 0.051, 0.072, 0.12]
    });

    new Faucet({
        currency: "BAN",
        wallet: new BananoWallet(),
        winnings: [0.01, 0.02, 0.03]
    });

    log.info("Faucets initialized!");
}

async function main() {
    ExchangeService.startService();
    await Database.connect();

    initFaucets();

    // Start routine check for database connection
    setInterval(Database.routineCheck.bind(Database), 5000);

    // Serve static files from the public directory, for frontend
    app.use(express.static('public'));

    // CORS Allow All
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, captcha, ref');

        if (req.method == 'OPTIONS') {
            res.status(200).end();
            return;
        }

        next();
    });

    const apiRouter = express.Router();

    attachControllers(apiRouter, [FaucetController, ReferralController]);
    attachControllers(app, [RefLinkController])

    app.use(IS_DEV ? '/' : '/api', apiRouter);

    app.listen(PORT, () => {
        log.info(`Server is running on ${PORT}`);
    });
}

main().catch(async (err) => {
    log.error(err);
    
    await Database.disconnect();
});