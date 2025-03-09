import { attachMiddleware } from "@decorators/express";
import { Request, Response, NextFunction } from 'express';
import { validate } from "../modules/utils";
import { Errors } from "../types/errors";

export function ValidateAddress() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        attachMiddleware(target, propertyKey, async (req: Request, res: Response, next: NextFunction) => {
            const address = req.params.address as string;
            if (!validate(address)) {
                return res.status(400).json({ error: Errors.INVALID_ADDRESS });
            }

            next();
        });
    };
}