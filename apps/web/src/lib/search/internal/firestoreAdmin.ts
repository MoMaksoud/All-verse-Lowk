import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminDb() {
    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!raw) {
            throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY env var");
        }

        const serviceAccount = JSON.parse(raw);
        initializeApp({
            credential: cert(serviceAccount),
        });
    }

    return getFirestore();
}