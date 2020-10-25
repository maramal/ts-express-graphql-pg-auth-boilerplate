import { Request, Response } from 'express';
import Result from '../models/result';
import Access from '../entity/access';
import User from '../entity/user';
import Mailer from '../utils/mailer';
import { access } from 'fs';

export function parseAccessToken(req: Request, accessId: number): Result<any> {
    const authHeader = req.headers['authorization'];
    if (authHeader == undefined)
        return new Result(new Error('No autorizado'), 401);

    // Formato: Bearer <token>
    const a = authHeader.split(' ');
    if (a.length != 2)
        return new Result(new Error('No autorizado'), 401);

    const token = a[1];
    const claims = Access.decode(token, accessId);
    if (claims == undefined)
        return new Result(new Error('No autorizado'), 401);
    return new Result(claims, 200);
}

export function setRefreshTokenCookie(res: Response, token: string) {
    const refreshExpiration = Access.refreshExpiration();
    res.cookie(
        process.env.REFRESH_TOKEN_NAME!,
        token,
        {
            domain: process.env.REFRESH_TOKEN_DOMAIN,
            secure: process.env.REFRESH_TOKEN_SECURE == 'true',
            httpOnly: process.env.REFRESH_TOKEN_HTTPONLY == 'true',
            expires: refreshExpiration,
            maxAge: refreshExpiration.getTime(),
        }
    )
}

export async function handleSendEmailRequest(email: string, res: Response, isConfirmation: boolean, accessName: string): Promise<any> {
    const user = await User.getByEmail(email);
    if (user == undefined) {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }

    if (isConfirmation && user.confirmed) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const token = Access.encode(user.ukey, user.refreshIndex, accessName);
    if (token == undefined) {
        res.status(500);
        throw new Error('Error del servidor');
    }

    // todo: implementar queue a enviar un email
    const success = await (isConfirmation ? Mailer.sendConfirmation(user.email, token) : Mailer.sendForgotConfirmation(user.email, token));
    if (!success) {
        console.log('¡Error de reenvío!');
        res.status(500);
        throw new Error('Error del servidor');
    }

    res.status(200);
    return true;
}

export async function handlePasswordChange(oldPassword: undefined | string, newPassword: string, confirmation: string, req: Request, res: Response, accessId: number): Promise<boolean> {
    if (newPassword != confirmation) {
        res.status(400);
        throw new Error('Las contraseñas no coinciden');
    }

    let result = parseAccessToken(req, accessId);
    if (result.isError()) {
        res.status(result.status);
        throw result.getError();
    }

    const claims = result.getObject();
    if (claims.act != accessId) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const user = await User.getByUserKey(claims.uky, claims.rti);
    if (user == undefined) {
        res.status(401);
        throw new Error('No autorizado');
    }

    result = await user.updatePassword(oldPassword, newPassword);
    res.status(200);
    if (result.isError())
        throw result.getError();

    return result.getObject();
}