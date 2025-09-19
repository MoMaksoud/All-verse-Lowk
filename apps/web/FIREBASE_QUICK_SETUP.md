# 🔥 Firebase Quick Setup Guide

## 🚨 **Current Issue**: Firebase Authentication Not Configured

Your app is showing "Firebase Setup Required" because the Firebase configuration is missing.

## 📋 **Quick Setup Steps**

### 1. **Create Firebase Project**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Click "Create a project" or select existing project
- Follow the setup wizard

### 2. **Get Firebase Config**
- Go to Project Settings (⚙️ gear icon) → General tab
- Scroll to "Your apps" section
- Click "Add app" → Web app (</>)
- Copy the config values

### 3. **Update Environment File**
Your `.env.local` file has been created with placeholders. Replace these values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### 4. **Enable Authentication**
- Go to Authentication → Sign-in method
- Enable "Email/Password"
- Save changes

### 5. **Restart Development Server**
```bash
npm run dev
```

## ✅ **Expected Result**
After setup, the "Firebase Setup Required" screen should disappear and you'll be able to:
- Create accounts
- Sign in/out
- Use location autocomplete
- Access all app features

## 🔗 **Quick Links**
- [Firebase Console](https://console.firebase.google.com/)
- [Authentication Setup](https://console.firebase.google.com/project/YOUR_PROJECT/authentication)

---

**Need help?** Check the detailed guide in `FIREBASE_COMPLETE_SETUP.md`
