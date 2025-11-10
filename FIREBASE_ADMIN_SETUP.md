# Firebase Admin Setup Guide

## ⚠️ Critical: Fix 401 Errors

If you're seeing 401 errors like:
```
Firebase Admin initialization failed: Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.
```

You need to configure Firebase Admin SDK.

## Step-by-Step Setup

### 1. Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the **gear icon** (⚙️) → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Click **"Generate Key"** in the popup
7. A JSON file will download - **save this file safely**

### 2. Add to Environment Variables

Open or create `apps/web/.env.local` and add:

```bash
# Firebase Admin SDK (REQUIRED for API authentication)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"}'
```

### 3. Format Requirements

**CRITICAL:** The JSON must be:
- On **one single line** (no line breaks)
- Wrapped in **single quotes** (`'...'`)
- All double quotes inside must be escaped or kept as-is
- No trailing commas

**Easy Method:**
1. Open the downloaded JSON file
2. Copy the entire contents
3. Paste it between single quotes in `.env.local`
4. Make sure it's all on one line

**Example:**
```bash
# ❌ WRONG - Multiple lines
FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  ...
}'

# ✅ CORRECT - Single line
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"my-project",...}'
```

### 4. Restart Your Dev Server

After adding the environment variable:

```bash
# Stop the server (Ctrl+C or Cmd+C)
# Then restart
npm run dev
# or
pnpm dev
```

### 5. Verify It's Working

Check your server terminal for:
```
✅ Firebase Admin initialized with service account
```

If you see:
```
❌ Firebase Admin initialization failed
```

Then check:
- Is the JSON on one line?
- Are single quotes wrapping it?
- Did you copy the entire JSON?
- Did you restart the server?

## Alternative: Using Default Credentials (Cloud Functions Only)

If you're deploying to Firebase Cloud Functions or Google Cloud Run, you can use default credentials instead:

```bash
# In .env.local
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# Remove FIREBASE_SERVICE_ACCOUNT_KEY
```

**Note:** This only works in Google Cloud environments, not local development.

## Troubleshooting

### Error: "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format"
- Make sure the JSON is on one line
- Check for any syntax errors in the JSON
- Ensure single quotes wrap the entire JSON

### Error: "Missing FIREBASE_SERVICE_ACCOUNT_KEY"
- Check that `.env.local` is in `apps/web/` directory
- Verify the variable name is exactly `FIREBASE_SERVICE_ACCOUNT_KEY`
- Restart the dev server after adding it

### Still Getting 401 Errors?
1. Check server terminal for initialization messages
2. Verify the JSON is valid: try parsing it in a JSON validator
3. Make sure you're using the correct project's service account key

## Security Note

⚠️ **Never commit `.env.local` to git!** It contains sensitive credentials.

Make sure `.env.local` is in your `.gitignore` file.

