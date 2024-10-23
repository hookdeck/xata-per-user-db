# Per User Database Architecture with Xata, Clerk, and Hookdeck

When building an application you often think of having a database with a table named `users` and then throughout your database schema you have references to the `users` to represent the owner of a row in each referencing table. This works in many cases. However, there are a growing number of use cases where there is a need to have a database per user such as the need for data isolation, security, compliance, and performance. Also, when you think about it, this also removes a lot of the complexity that comes from all those user references.

In this tutorial, we'll provide more uses cases where a per-user database architecture makes sense and then walk through how to create a new Xata database per user whenever a new user is created in [Clerk](https://clerk.com) using Clerk webhook notifications with the [Hookdeck event gateway](https://hookdeck.com?ref=xata-user-db) to help both during development with localhost webhook tooling and in production to secure the webhooks and guarantee at-least-once delivery.

## The use cases for a per-user database architecture

As mentioned, a per-user database architecture is often required to guarantee data isolation which enables security and compliance considerations such as access control and data residency. The location of the database can also improve data access performance.

Here are some concrete examples of where a per-user or per-device database makes sense:

- **Software as a Service (SaaS) Platforms**: Each client or user can have their own database to ensure data isolation and security. This setup is advantageous for businesses like Fogbugz, which uses a database per-customer model to manage isolated customer data efficiently.

- **Healthcare Systems**: Per-user databases can securely store sensitive patient data, ensuring compliance with privacy regulations like HIPAA. This approach allows for personalized care and easy retrieval of patient records.

- **Financial Services**: Online banking and fintech platforms can benefit from per-user databases by securely managing individual financial data. This setup enhances security and simplifies the process of auditing and compliance

- **E-commerce Platforms**: Each customer can have a separate database to manage their order history, preferences, and personal information. This helps in providing personalized shopping experiences and targeted marketing.

- **Social Media Applications**: Per-user databases can handle vast amounts of unstructured data, such as posts and interactions, while maintaining user privacy and providing personalized content feeds.

- **IoT Applications**: Per-device databases can manage data from individual sensors or devices, allowing for real-time analytics and efficient data processing.

## Build a per-user database architecture with Xata, Clerk, and Hookdeck

### Before you begin

You'll a free account with the following services:

- [Clerk](https://clerk.com)
- [Xata](https://xata.io)
- [Hookdeck](https://hookdeck.com?ref=github-xata)

### Tech Stack

| Technology | Description                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Xata       | Serverless Postgres database platform for scalable, real-time applications.                                                |
| Clerk      | Platform that provides user authentication and management services                                                         |
| Hookdeck   | Provides tools and infrastructure for reliable asynchronous messaging, debugging, and scaling.                             |
| Next.js    | A React framework for building fast, user-friendly web applications with server-side rendering and static site generation. |

## Steps

### Install and configure the Hookdeck CLI

Install the Hookdeck CLI:

```

npm i -g hookdeck-cli

```

And login:

```sh
hookdeck login
```

TODO: ...

### Scaffold a Next.js app

Run the following and accept all defaults:

```sh
npx create-next-app@latest xata-per-user-db
```

Navigate to the new app directory:

```sh
cd xata-per-user-db
```

### Add Clerk

Install the Clerk Next.js package:

```sh
npm install @clerk/nextjs
```

TODO: Clerk dashboard, configure modal, where to get config?

Create a `.env.local` and add your Clerk configuration:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Add the Clerk middleware. If you're using a `src` directory it does in there, otherwise in the root directory of your project:

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

Update `layout.tsx` to the following:

```tsx
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

This adds the Clerk provided sign in and sign out functionality.

Add the following to `global.css` to improve the button styling a little:

```sh
header {
  text-align: center;
  margin-top: 20px;
}

header button {
  border-radius: 128px;
  height: 48px;
  padding: 0 20px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 20px;
}
```

#### Test the Next.js application

Run the application:

```sh
npm run dev
```

Head to localhost:3000 and click on the **Sign In** and ensure you go to the Clerk sign in modal appears. **Don't complete the sign in / sign up flow yet!**

TODO: screenshot

#### Add the Clerk webhook route

Next, create a webhook handler route.

Install the Hookdeck SDK to be used to verify the webhook:

```sh
npm i @hookdeck/sdk
```

Create a file `app/webhooks/clerk/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@hookdeck/sdk/webhooks";

const HOOKDECK_WEBHOOK_SECRET = process.env.HOOKDECK_WEBHOOK_SECRET;

if (!HOOKDECK_WEBHOOK_SECRET) {
  console.error("Please set HOOKDECK_WEBHOOK_SECRET environment variable");
  process.exit(1);
}

export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();

    const verificationResult = await verifyWebhookSignature({
      headers,
      rawBody,
      signingSecret: HOOKDECK_WEBHOOK_SECRET!,
    });

    if (!verificationResult.isValidSignature) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    console.log("Received event", event);

    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

TODO: code walkthrough

Set up a localtunnel and Hookdeck connection to the webhook route:

```sh
hookdeck listen 3000 clerk --path /webhooks/clerk
```

You will see output similar to the following:

```sh
Dashboard
👉 Inspect and replay events: https://dashboard.hookdeck.com?team_id={team_id}

Sources
🔌 clerk URL: https://hkdk.events/{source_id}

Connections
clerk -> clerk_to_cli-clerk forwarding to /webhooks/clerk

> Ready! (^C to quit)
```

Copy the **clerk URL** value that is output.

#### Configure Clerk webhooks

Head to the Clerk Dashboard and go to the Webhooks section.

Click **+ Add Endpoint** and enter the Hookdeck URL you copied in the previous step. Click **Create**.

TODO: get webhook secret and configure Hookdeck to sign the webhook

![Svix webhook verification for Clerk within the Hookdeck dashboard](./hookdeck-svix-verification.png)

Head back to your application and complete the sign up / sign in flow.

You will receive two webhook events in your local application via Hookdeck.

1. `user.created`
2. `session.created`

#### Filter Clerk webhooks with Hookdeck Filters

Since we only want to create a database for each new user, set up a Hookdeck Filter to only allow `user.created` events.

Note: when creating your webhook subscription in Clerk you can also only choose to get `user.created` events.

TODO: more instructions about the filter setup

```json
{
  "type": "user.created"
}
```

### Add Xata to the Next.js application

From your Xata workspace settings get your API Key and Workspace slug/ID, and save those in your `.env.local` file:

```diff
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
+
+ XATA_API_KEY=...
+ XATA_WORKSPACE_ID=...
```

Install the Xata TypeScript client:

```sh
npm i @xata.io/client
```

Update `route.ts` to import the `XataApiClient`, get the Xata credentials, and create a Xata client instance:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@hookdeck/sdk/webhooks";
import { XataApiClient } from "@xata.io/client";

const HOOKDECK_WEBHOOK_SECRET = process.env.HOOKDECK_WEBHOOK_SECRET;

if (!HOOKDECK_WEBHOOK_SECRET) {
  console.error("Please set HOOKDECK_WEBHOOK_SECRET environment variable");
  process.exit(1);
}

const XATA_API_KEY = process.env.XATA_API_KEY;
const XATA_WORKSPACE_ID = process.env.XATA_WORKSPACE_ID;

const xata = new XataApiClient({
  apiKey: XATA_API_KEY,
});
```

Update the `POST` route handler to create a new database in Xata for each new user using the Xata client:

```ts
export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();

    const verificationResult = await verifyWebhookSignature({
      headers,
      rawBody,
      signingSecret: HOOKDECK_WEBHOOK_SECRET!,
    });

    if (!verificationResult.isValidSignature) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    const dbList = await xata.databases.getDatabaseList({
      pathParams: {
        workspaceId: XATA_WORKSPACE_ID!,
      },
    });

    console.log("Existing DB list", dbList);

    if (dbList.databases.find((db) => db.name === event.data.id)) {
      const msg = "User DB already exists";
      console.log(`${msg}:`, event.data.id);

      // Return 200 as we've processed the event and we don't want Hookdeck to retry
      return NextResponse.json({ message: msg }, { status: 200 });
    }

    const createResult = await xata.databases.createDatabase({
      pathParams: {
        dbName: event.data.id,
        workspaceId: XATA_WORKSPACE_ID!,
      },
      body: {
        region: dbRegion,
      },
    });

    console.log("Created DB", createResult.databaseName);

    return NextResponse.json(createResult);
  } catch (error) {
    console.error("Error creating DB", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

TODO: code walkthrough

#### Use Hookdeck to replay the `user.created` Clerk event

Head to the Hookdeck Dashboard and replay the `user.created` event. The following message will be logged to indicate the database is created:

```sh
User DB created: user_{id}
```

Head to the Xata dashboard and check the database was created.

Replay the `user.created` event again in Hookdeck and ensure that the `User DB already exists` message is logged.

```sh
User DB already exists: user_{id}
 POST /webhooks/clerk 200 in 652ms
```

## Example: Regional database creation

You can test further by deleting both the database in Xata and the user in Clerk, and going through the sign up process again within your application.

As mentioned, one of the use cases for creating a database per user is to enable the data to be hosted in a specific region for data privacy or security reasons. So, here's an example of changing the database region based on an IP address lookup using the location the user signed up from. In a real world scenario, you'd ask the user where they want to host their data either during of after signup.

```ts
export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();

    const verificationResult = await verifyWebhookSignature({
      headers,
      rawBody,
      signingSecret: HOOKDECK_WEBHOOK_SECRET!,
    });

    if (!verificationResult.isValidSignature) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    const dbList = await xata.databases.getDatabaseList({
      pathParams: {
        workspaceId: XATA_WORKSPACE_ID!,
      },
    });

    console.log("Existing DB list", dbList);

    if (dbList.databases.find((db) => db.name === event.data.id)) {
      const msg = "User DB already exists";
      console.log(`${msg}:`, event.data.id);

      // Return 200 as we've processed the event and we don't want Hookdeck to retry
      return NextResponse.json({ message: msg }, { status: 200 });
    }

    let dbRegion = "us-east-1";
    try {
      const ipLookupResponse = await fetch(
        `http://ip-api.com/json/${event.event_attributes.http_request.client_ip}`
      );
      const ipLookupData = await ipLookupResponse.json();

      switch (ipLookupData.continentCode) {
        case "EU":
          dbRegion = "eu-west-1";
          break;
        case "OC":
          dbRegion = "ap-southeast-2";
          break;
      }
    } catch (error) {
      console.error("Error looking up IP. Defaulting to US.", error);
    }

    const createResult = await xata.databases.createDatabase({
      pathParams: {
        dbName: event.data.id,
        workspaceId: XATA_WORKSPACE_ID!,
      },
      body: {
        region: dbRegion,
      },
    });

    console.log("Created DB", createResult.databaseName);

    return NextResponse.json(createResult);
  } catch (error) {
    console.error("Error creating DB", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

This example uses [ip-api](http://ip-api.com) which is free for non-commercial use and handily returns a `continentCode` which we can use to determine the region where we want the database instance created.

TODO: walkthrough

### Deploy to Vercel

The repository, is now ready to deploy to Vercel. Use the following steps to deploy:

- Start by creating a GitHub repository containing your app's code.
- Navigate to the Vercel Dashboard and create a new project.
- Link the new project to the GitHub repository you just created.
- In the project settings, update the environment variables to match those in your local `.env` file.
- Deploy your project! 🚀

## Conclusion

In this tutorial, you have learned the benefits and use cases of a per-user database architecture, particularly in scenarios requiring data isolation, security, and compliance.

You have also walked through the steps to set up a Next.js application integrated with Clerk for user management, Hookdeck for local development and reliable webhook handling, and Xata for database management.

You have configured Clerk webhooks to trigger a per-user database to be created within Xata for each new user. Additionally, you explored how to customize database creation based on user location.

## Where next?

- [Clerk docs](https://clerk.dev/docs)
- [Xata docs](https://xata.io/docs)
- [Hookdeck docs](https://hookdeck.com/docs?ref=xata-user-db)

We'd love to hear your feedback on this tutorial, learn more about your experiences with Xata, or discuss contributing a community blog or tutorial. Connect with us on [Discord](https://discord.com/invite/kvAcQKh7vm) or follow us on [X | Twitter](https://twitter.com/xata). Happy building 🦋
