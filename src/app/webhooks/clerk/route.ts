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

    console.log("User DB created", createResult.databaseName);

    return NextResponse.json(createResult);
  } catch (error) {
    console.error("Error creating DB", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
