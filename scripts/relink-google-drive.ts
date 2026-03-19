import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function main() {
    console.log("Fetching Drive credentials from database...");
    const settings = await prisma.systemSettings.findFirst();

    if (!settings?.driveClientId || !settings?.driveClientSecret) {
        console.error("ERROR: No Client ID or Secret found in the DB. Please save them in the Settings UI first.");
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        settings.driveClientId,
        settings.driveClientSecret,
        REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });

    console.log("\n======================================");
    console.log("1. Click the link below to authorize FTS ERP:");
    console.log(authUrl);
    console.log("======================================\n");

    rl.question("2. Enter the authorization code here: ", async (code) => {
        rl.close();
        try {
            console.log("Verifying code...");
            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.refresh_token) {
                console.log("No new refresh token was returned. You must authorize it fully to grant a new token. Try again, ensure you check 'Select All' for Google Drive permissions.");
            } else {
                console.log("Saving new Refresh Token to Database...");
                await prisma.systemSettings.update({
                    where: { id: settings.id },
                    data: { driveRefreshToken: tokens.refresh_token }
                });
                console.log("\n>>> SUCCESS! Google Drive is now fully linked! <<<");
                console.log("You can go back to your Browser and use the 'Generate All Project Folders' button in the UI.");
            }
        } catch (error: any) {
            console.error("Error retrieving access token:", error.message);
        }
        process.exit(0);
    });
}

main().catch(console.error);
