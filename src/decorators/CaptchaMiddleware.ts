import { attachMiddleware } from "@decorators/express";
import { Request, Response, NextFunction } from 'express';
import hcaptcha from 'hcaptcha';

import { IS_DEV } from "../modules/utils";
import log from "../modules/logger";
import { Errors } from "../types/errors";

export function RequireCaptcha() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        attachMiddleware(target, propertyKey, async (req: Request, res: Response, next: NextFunction) => {
            if(IS_DEV) return next(); // Skip captcha in dev mode

            const token = req.headers['captcha'] as string; // This is how we do it around here

            if (!token) {
                return res.status(400).json({ error: Errors.CAPTCHA });
            }

            try {
                const secret = process.env.HCAPTCHA_SECRET ?? '';
                const data = await hcaptcha.verify(secret, token);

                if (data.success) {
                    next();
                } else {
                    res.status(400).json({ error: 'Invalid captcha' });
                }
            } catch (error) {
                log.error('Captcha verification failed:', error);
                res.status(500).json({ error: 'Captcha verification failed' });
            }
        });
    };
}