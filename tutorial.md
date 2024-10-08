# Per User Database Creation with Xata, Clerk, and Hookdeck

TODO: Intro

Run the following and accept all defaults:

```sh
npx create-next-app@latest xata-per-user-db
```

Navigate to the new app directory:

```sh
cd xata-per-user-db
```

Install the Clerk Next.js package:

```sh
npm install @clerk/nextjs
```

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

Update `layout.tsx`:

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

Add the following to `global.css`:

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

Run the application:

```sh
npm run dev
```

Head to localhost:3000 and click on the **Sign In** and ensure you go to the Clerk sign in page. Don't complete the sign in / sign up flow yet!

Create a webhook handler route. Create a file `app/webhooks/clerk/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    console.log("Received event", event);

    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

Install the Hookdeck CLI:

```sh
npm i -g hookdeck-cli
```

Login to Hookdeck using the CLI and create a free Hookdeck account:

```sh
hookdeck login
```

Set up a local tunnel and Hookdeck connection to the webhook route:

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

Copy the URL that is output.

Head to the Clerk Dashboard and go to the Webhooks section.

Click **+ Add Endpoint** and enter the Hookdeck URL you copied in the previous step. Click **Create**.

Head back to your application and complete the sign up / sign in flow.

You will receive two webhook events in your local application via Hookdeck.

1. `user.created`
2. `session.created`

Since we only want to create a database for each new user, set up a Hookdeck Filter to only allow `user.created` events.

Note: when creating your webhook subscription in Clerk you can also only choose to get `user.created` events.

TODO: more instructions about the filter setup

```json
{
  "type": "user.created"
}
```

Sign up for a [free Xata account](https://app.xata.io/signin?mode=signup). From your workspace settings get your API Key and Workspace slug/ID, and save those in your `.env.local` file:

```diff
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
+
+ XATA_API_KEY=...
+ XATA_WORKSPACE_ID=...
```

Install the Xata TypeScript client and update `route.ts` to create a new database in Xata for each new user:

```ts
import { XataApiClient } from "@xata.io/client";
import { NextRequest, NextResponse } from "next/server";

const XATA_API_KEY = process.env.XATA_API_KEY;
const XATA_WORKSPACE_ID = process.env.XATA_WORKSPACE_ID;

if (!XATA_API_KEY) {
  console.error("Please set XATA_API_KEY environment variable");
  process.exit(1);
}

if (!XATA_WORKSPACE_ID) {
  console.error("Please set XATA_WORKSPACE_ID environment variable");
  process.exit(1);
}

const xata = new XataApiClient({
  apiKey: XATA_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log("Received event", event);

    const dbList = await xata.databases.getDatabaseList({
      pathParams: {
        workspaceId: XATA_WORKSPACE_ID!,
      },
    });

    console.log("Existing DB list", dbList);

    if (dbList.databases.find((db) => db.name === event.data.id)) {
      const msg = "User DB already exists";
      console.log(msg, event.data.id);
      // Return 200 as we've processed the event and we don't want Hookdeck to retry
      return NextResponse.json({ message: msg }, { status: 200 });
    }

    const createResult = await xata.databases.createDatabase({
      pathParams: {
        dbName: event.data.id,
        workspaceId: XATA_WORKSPACE_ID!,
      },
      body: {
        region: "us-east-1",
      },
    });

    return NextResponse.json(createResult);
  } catch (error) {
    console.error("Error creating DB", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

Head to the Hookdeck Dashboard and replay the `user.created` event.

Head to the Xata dashboard and check the database was created.

Replay the `user.created` event again in Hookdeck and ensure that the `User DB already exists` message is logged.

```sh
User DB already exists user_{id}
 POST /webhooks/clerk 200 in 652ms
```

You can test further by deleting both the database in Xata and the user in Clerk, and going through the sign up process again within your application.
