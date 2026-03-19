const { google } = require('googleapis');
require('dotenv').config();

async function testDriveConnection() {
    console.log("Testing Google Drive Connection...");

    try {
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!clientEmail || !privateKey || !folderId) {
            console.error("❌ Missing environment variables!");
            process.exit(1);
        }

        console.log("Authenticating as:", clientEmail);

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly']
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log("Checking access to folder ID:", folderId);

        // Try to get folder details
        const folderRes = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, permissions'
        });

        console.log("✅ Successfully connected to Drive!");
        console.log("📁 Root Folder Name:", folderRes.data.name);

        // List contents
        const listRes = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 5
        });

        if (listRes.data.files && listRes.data.files.length > 0) {
            console.log("📂 Found files in folder:");
            listRes.data.files.forEach(f => console.log(`  - ${f.name} (${f.mimeType})`));
        } else {
            console.log("📂 Folder is empty, but accessible.");
        }

    } catch (error) {
        console.error("❌ Connection failed!");
        console.error("Error details:", error.message);
    }
}

testDriveConnection();
