import { HookdeckClient } from "@hookdeck/sdk";

if (!process.env.HOOKDECK_API_KEY) {
  console.error("Please set HOOKDECK_API_KEY environment variable");
  process.exit(1);
}

if (!process.env.CLERK_WEBHOOK_SECRET) {
  console.error("Please set CLERK_WEBHOOK_SECRET environment variable");
  process.exit(1);
}

async function main() {
  const hookdeck = new HookdeckClient({ token: process.env.HOOKDECK_API_KEY! });

  hookdeck.connection.upsert({
    name: "clerk_to_cli-clerk",
    source: {
      name: "clerk",
      verification: {
        type: "svix",
        configs: {
          webhookSecretKey: process.env.CLERK_WEBHOOK_SECRET!,
        },
      },
    },
    rules: [
      {
        type: "filter",
        body: {
          type: "user.created",
        },
      },
    ],
    destination: {
      name: "cli-clerk",
      cliPath: "/webhooks/clerk",
    },
  });
}

main()
  .then(() => {
    console.log("Hookdeck connection setup complete");
  })
  .catch((error) => {
    console.error("Hookdeck connection setup failed", error);
  });
