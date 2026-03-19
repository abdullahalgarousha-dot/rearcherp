import { google } from "googleapis";
import * as readline from "readline";

// Provide your Client ID and Client Secret found in Google Cloud Console
// These are currently in your Google Drive Settings in the ERP Admin Panel
const CLIENT_ID = process.env.DRIVE_CLIENT_ID || "YOUR_CLIENT_ID_HERE";
const CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET || "YOUR_CLIENT_SECRET_HERE";

// Standard redirect URI for CLI apps
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

const SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
];

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function main() {
    if (CLIENT_ID === "YOUR_CLIENT_ID_HERE" || CLIENT_SECRET === "YOUR_CLIENT_SECRET_HERE") {
        console.error("ERROR: Please edit this file and enter your Google Cloud CLIENT_ID and CLIENT_SECRET.");
        console.error("You can find them in your ERP Settings at 'Admin > Settings > Cloud Storage'.");
        process.exit(1);
    }

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent", // Force to get refresh token
    });

    console.log("Authorize this app by visiting this url:\\n");
    console.log(authUrl);
    console.log("\\n");

    rl.question("Enter the code from that page here: ", async (code) => {
        rl.close();
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log("\\n=== YOUR NEW TOKENS ===");
            console.log("Access Token:", tokens.access_token);
            console.log("Refresh Token:", tokens.refresh_token);
            console.log("========================\\n");
            console.log("Copy the Refresh Token above and paste it into 'Admin > Settings > Cloud Storage' -> 'OAuth2 Refresh Token'.");
            console.log("Then click 'Save Cloud Settings' and run 'Test Connection'!");
        } catch (error) {
            console.error("Error retrieving access token", error);
        }
    });
}

main();
