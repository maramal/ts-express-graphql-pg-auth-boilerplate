import { buildSchema } from 'graphql';
import User from '../entity/user';
import Access from '../entity/access';
import { handlePasswordChange, handleSendEmailRequest, parseAccessToken, setRefreshTokenCookie } from './helper';
import Mailer from '../utils/mailer';

export const schema = buildSchema(`
    type Query {
        profile: Profile
    }

    type Mutation {
        register(email: String!, password: String!, confirmation: String!): Boolean
        login(email: String!, password: String!): AccessToken
        confirm(email: String!): Boolean
        refresh: AccessToken
        resendConfirmation(email: String!): Boolean
        forgotPassword(email: String!): Boolean
        resetPassword(password: String!, confirmation: String!): Boolean
        logout: Boolean
    }

    type Profile {
        ukey: ID
        email: String
    }

    type AccessToken {
        ukey: ID
        access_token: ID
    }
`);

export const root = {
    register: async ({ email, password, confirmation }: { email: string, password: string, confirmation: string }, context: any) => {
        const result = await User.register(email, password, confirmation);
        context.res.status(result.status);

        if (result.isError())
            throw result.getError()!;

        const user = result.getObject()!;
        const confirmToken = Access.encode(user.ukey, user.refreshIndex, process.env.ACCESS_TYPE_CONFIRM!);
        if (confirmToken == undefined) {
            context.res.status(500);
            throw new Error('La confirmación falló');
        }

        // todo: reemplazar esto con una queue + implementacion de mail server
        await Mailer.sendConfirmation(user.email, confirmToken);
        return true;
    },

    resendConfirmation: async ({ email }: { email: string}, context: any) => {
        return await handleSendEmailRequest(email, context.res, true, process.env.ACCESS_TYPE_CONFIRM!);
    },

    confirm: async ({ email }: { email: string }, context: any) => {
        const accessId = Access.idFromName(process.env.ACCESS_TYPE_CONFIRM!);
        let result = parseAccessToken(context.req, accessId);
        if (result.isError()) {
            context.res.status(result.status);
            throw result.getError();
        }

        const claims = result.getObject();
        if (claims.act != accessId) {
            context.res.status(401);
            throw new Error('No autorizado');
        }

        const user = await User.getByUserKey(claims.uky, claims.rti);
        if (user == undefined) {
            context.res.status(404);
            throw new Error('Usuario no encontrado');
        }

        if (email != user.email) {
            context.res.status(401);
            throw new Error('No autorizado');
        }

        result = await user.updateConfirmed();
        if (result.isError()) {
            context.res.status(result.status);
            throw result.getError();
        }

        context.res.status(200);
        return true;
    },

    login: async ({ email, password }: { email: string, password: string }, context: any) => {
        const result = await User.login(email, password);
        context.res.status(result.status);

        if (result.isError())
            throw result.getError();

        const user = result.getObject();

        const accessToken = Access.encode(user.ukey, user.refreshIndex, process.env.ACCESS_TYPE_USER!);
        const refreshToken = Access.encode(user.ukey, user.refreshIndex, process.env.ACCESS_TYPE_REFRESH!);
        if (accessToken == undefined || refreshToken == undefined) {
            context.res.status(500);
            throw new Error('El ingreso falló');
        }

        context.res.status(result.status);
        setRefreshTokenCookie(context.res, refreshToken);
        return {
            ukey: user.ukey,
            access_token: accessToken
        };
    },
    
    profile: async ({}, context: any) => {
        const result = parseAccessToken(context.req, Access.idFromName(process.env.ACCESS_TYPE_USER!));
        if (result.isError()) {
            context.res.status(result.status);
            throw result.getError();
        }

        const claims = result.getObject();
        const user = await User.getByUserKey(claims.uky, claims.rti);

        if (user == undefined) {
            context.res.status(404);
            throw new Error('Usuario no encontrado');
        }

        return user;
    },
    refresh: async ({}, context: any) => {
        const token = context.req.cookies[process.env.REFRESH_TOKEN_NAME!];
        context.res.status(401);
        if (token == undefined)
            throw new Error('No autorizado');

        const claims = Access.decode(token, Access.idFromName(process.env.ACCESS_TYPE_REFRESH!));
        if (claims == undefined)
            throw new Error('No autorizado');

        const user = await User.getByUserKey(claims.uky, claims.rti);
        if (user == undefined)
            throw new Error('No autorizado');

        if (user.refreshIndex != claims.rti)
            throw new Error('No autorizado');

        const result = await user.updateRefreshIndex();
        if (result.isError()) {
            context.res.status(result.status);
            throw result.getError();
        }

        user.refreshIndex++;

        const refreshToken = Access.encode(user.ukey, user.refreshIndex, process.env.ACCESS_TYPE_REFRESH!);
        const accessToken = Access.encode(user.ukey, user.refreshIndex, process.env.ACCESS_TYPE_USER!);
        if (refreshToken == undefined || accessToken == undefined) {
            context.res.status(500);
            throw new Error('La actualización falló');
        }

        setRefreshTokenCookie(context.res, refreshToken);
        context.res.status(200);
        return {
            ukey: user.ukey,
            access_token: accessToken
        };
    },

    forgotPassword: async ({ email }: { email: string }, context: any) => {
        return await handleSendEmailRequest(email, context.res, false, process.env.ACCESS_TYPE_FORGOT_PASSWORD!);
    },

    resetPassword: async ({ password, confirmation }: { password: string, confirmation: string }, context: any) => {
        const accessId = Access.idFromName(process.env.ACCESS_TYPE_FORGOT_PASSWORD!);
        return await handlePasswordChange(undefined, password, confirmation, context.req, context.res, accessId);
    },

    logout: async ({ } : {}, context: any) => {
        const result = parseAccessToken(context.req, Access.idFromName(process.env.ACCESS_TYPE_USER!));
        context.res.status(401);
        if (result.isError())
            throw new Error('No autorizado');

        const token = context.req.cookies[process.env.REFRESH_TOKEN_NAME!];
        if (token === undefined)
            throw new Error('No autorizado');

        const claims = Access.decode(token, Access.idFromName(process.env.ACCESS_TYPE_REFRESH!));
        if (claims == undefined)
            throw new Error('No autorizado');

        context.res.status(200);
        context.res.clearCookie(process.env.REFRESH_TOKEN_NAME!);
        return true;
    },
}