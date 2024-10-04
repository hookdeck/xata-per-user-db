# Per User Database Creation with Xata, Clerk, and Hookdeck

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

Head to localhost:3000 and click on the **Sign In** and ensure you go to the Clerk sign in page.

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

TODO:

- Sign up via Clerk
- Receive webhook event
- Filter for only `user.created` events in Hookdeck (ack. you can subscribe to just that event in Clerk)
  - At this point, we can assume the user doesn't have a Hookdeck account so need to make sure that the signup flow persists the connection
- Signup for Xata and get API Key and Workspace ID. Set those in .env.local
- Install Xata Client `@xata.io/client`, add to route.ts and create DB when event is received
- Replay event from Hookdeck
- Ensure DB is created in Xata
