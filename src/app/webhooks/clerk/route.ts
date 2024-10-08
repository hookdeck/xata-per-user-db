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
