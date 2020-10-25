import dotenv from 'dotenv';
dotenv.config();

import express, { response } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema, root } from './api/schema';
import { createConnection } from 'typeorm';
import cookieParser from 'cookie-parser';
import Access from './entity/access';
import cors from 'cors';

createConnection()
    .then(async connection => {
        await Access.load();
        const app = express();
        const corsOptions = {
            origin: process.env.CORS_ORIGIN!,
            credentials: true,
            optionSuccessStatus: 200 // Legacy Browsers como IE11, algunos Smart TVs, etc
        };
        app.use(cors(corsOptions));
        app.use(express.json());
        app.use(cookieParser());
        
        app.use(process.env.GRAPHQL_PATH!, graphqlHTTP((request, response, graphQLParams) => ({
            schema,
            rootValue: root,
            graphiql: process.env.GRAPHQL_INTROSPECTION === 'true',
            context: {
                req: request,
                res: response
            }
        })));
        
        app.listen(parseInt(process.env.APP_PORT!));
        const link = `http://localhost:${process.env.APP_PORT!}${process.env.GRAPHQL_PATH}`;
        console.log(`Servidor iniciado en URL: ${link}`);
    })
    .catch(error => {
        console.log(error);
    })