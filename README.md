# Plantilla de Servidor con Autenticación de usuarios con JWT

El objetivo principal de esta plantilla es servir de base para proyectos que necesiten un sistema de autenticación que incluya las siguientes características:

* Ingreso
* Registro
* Perfil
* Reenvío de confirmación de Email
* Reinicio de contraseña
* Egreso

La aplicación consta de:
* Un servidor Express que utiliza `Express.Router()` para generar las rutas necesarias.
* GraphQL es el protoclo de la API con la introspección activada según la configuración de la aplicación.
* TypeORM maneja las capas de abstracción de la base de datos según la configuración de la aplicación y de la base de datos.
* PostGres es la base de datos seleccionada para guardar información.
* JSONWebToken es el encargado de encriptar y desencriptar los tokens. Estos son enviados mediante `Bearer <token>` en la cabecera `Authentication`.
* SendGrid es el proveedor de correo electrónico elegido, también configurado en el archivo de configuración.

La configuración del servidor, de algunas características y de la base de datos se encuentra disponible en `process.env` gracias el el archivo `.env` en la ruta principal del proyecto. Estos son las claves a utilizar y sus respectivas descripciones:

| Clave | Descripción |
| ----- | ----------- |
| **APP_PORT** | Puerto del servidor |
| **GRAPHQL_PATH** | Ruta de GraphiQL. Por ejemplo `/graphql` |
| **GRAPHQL_INTROSPECTION** | Habilitación de GraphiQL para realizar pruebas, en producción debería desactivarse |
| **ACCESS_TYPE_USER** | Código del tipo de acceso de usuario. Por ejemplo `user` |
| **ACCESS_TYPE_REFRESH** | Código del tipo de acceso de actualización de token. Por ejemplo `refresh` |
| **ACCESS_TYPE_CONFIRM** | Código del tipo de acceso de confirmación de usuario. Por ejemplo `confirm` |
| **ACCESS_TYPE_FORGOT_PASSWORD** | Código del tipo de acceso pérdida de contraseña. Por ejemplo `forgotpassword` |
| **REFRESH_TOKEN_EXPIRATION_DAYS** | Tiempo en días de vigencia del token. Por ejemplo `5` |
| **REFRESH_TOKEN_SECRET** | Palabra secreta para encriptación del token. Por ejemplo `SUPERSECRET` |
| **ACCESS_TOKEN_EXPIRATION_MINUTES** | Tiempo en minutos de vigencia del token. Por ejemplo `10` |
| **ACCESS_TOKEN_SECRET** | Palabra secreta para encriptación del token. Por ejemplo `SUPERSECRET2` |
| **JWT_ISSUER** | Autoridad responsable de la encriptación del token. Por ejemplo `JWTAUTHORITY` |
| **REFRESH_TOKEN_NAME** | Nombre de la cookie enviada en el header el token de actualización. Por ejemplo `app` |
| **REFRESH_TOKEN_DOMAIN** | Dominio habilitado para enviar el token de actualización. Por ejemplo `localhost` |
| **REFRESH_TOKEN_HTTPONLY** | Habilitación de protocolo HTTP necesario para token de autenticación. Por ejemplo `false` |
| **REFRESH_TOKEN_SECURE** | Habilitación de SSL necesaria para token de autenticación. Por ejemplo `false` |
| **CONFIRMATION_URL** | URL de confirmación. Por ejemplo `http://localhost:4000/confirmacion` |
| **FORGOT_PASSWORD_URL** | URL de reinicio de contraseña. Por ejemplo `http://localhost:4000/olvido-contraseña` |
| **CORS_ORIGIN** | Dominio habilitado para el Cross-Origin header. Por ejemplo `http://localhost:3000` |
| **SENDGRID_API_KEY** | Clave de acceso de API. Obtenido en SendGrid |
| **SENDGRID_FROM_EMAIL** | COrreo electrónico verificado por SendGrid para envío de correos |
| **SENDGRID_CONFIRM_TEMPLATE_ID** | Clave de plantilla de confirmación de usuario de SendGrid |
| **SENDGRID_FORGOT_PASSWORD_TEMPLATE_ID** | Clave de plantilla de reinicio de contraseña de SendGrid |

