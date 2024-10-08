# Per User Database Creation with Xata, Clerk, and Hookdeck

This Next.js example demonstrates how to create a database within [Xata](https://xata.io) per user within a Xata Workspace whenever a new user is created within [Clerk](https://clerk.com/). [Hookdeck](https://hookdeck.com?ref=github-xata) is used to manage inbound webhooks.

## Before you being

You'll a free account with the following services:

- [Clerk](https://clerk.com)
- [Xata](https://xata.io)
- [Hookdeck](https://hookdeck.com?ref=github-xata)

Install the Hookdeck CLI:

```
npm i -g hookdeck-cli
```

And login:

```sh
hookdeck login
```

## Get the code

```sh
npx create-next-app xata-per-user-db -e https://github.com/leggetter/xata-per-user-db
```

## Create the config

> [!NOTE]
> This is a little convoluted because you can't create a webhook subscription using the Clerk API.

Create a local config file:

```sh
cp .env.example
.env.local
```

### Hookdeck and Clerk

Create a localtunnel with the Hookdeck CLI to get Hookdeck Source URL:

```sh
hookdeck listen 3000 clerk --path /webhooks/clerk
```

The output will be similar to the following:

```sh
Dashboard
👉 Inspect and replay events: https://dashboard.hookdeck.com?team_id={team_id}

Sources
🔌 clerk URL: https://hkdk.events/{source_id}

Connections
clerk -> clerk_to_cli-clerk forwarding to /webhooks/clerk

> Ready! (^C to quit)
```

Copy the `clerk URL` value and head to [Clerk Dashboard](https://dashboard.clerk.com/) -> Configure -> Webhooks section.

Click **+ Add Endpoint** and enter the Hookdeck URL you copied in the previous step. Click **Create**.

Copy the **Signing Secret** value and set the `CLERK_WEBHOOK_SECRET` value in `.env.local`.

Populate the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` variables with values from the [Clerk Dashboard](https://dashboard.clerk.com/) -> Configure -> API Keys section.

Go to the [Hookdeck Dashboard](https://dashboard.hookdeck.com) -> Settings -> Secrets and add values for `HOOKDECK_API_KEY` and `HOOKDECK_WEBHOOK_SECRET` in `.env.local`.

### Xata

From your workspace settings get your API Key and Workspace slug/ID, and save those in `XATA_API_KEY` and `XATA_WORKSPACE_ID` in your `.env.local` file.

### Run the setup script

Finally, run the setup script:

```sh
npm run hookdeck:setup
```

This ensures that Hookdeck is set up to verify the Clerk webhooks.

You can see the setup connection in the [Connections section](https://dashboard.hookdeck.com/connections) of the Hookdeck dashboard.

## Run the app

In a new terminal:

```sh
npm run dev
```

Navigate to `localhost:3000` (or similar), click the **Sign in** button, complete the sign in/up flow, you will see the webhooks logged by the Hookdeck CLI and output from the terminal you ran `npm run dev` in.

Check the Xata dashboard to see the new per use database has been created.

## Resources

- [Hookdeck docs](https://hookdeck.com/docs?ref=github-xata)
- [Clerk docs](https://clerk.com/docs)
- [Xata docs](https://xata.io/docs)
