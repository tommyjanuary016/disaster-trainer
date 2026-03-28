// Firebase初期化
// VITE_USE_MOCK=true の場合、またはFirebase設定がない場合はモックモードで動作

import { initializeApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'

// モックモードかどうかの判定
// 環境変数 VITE_USE_MOCK=true か、APIキーが未設定の場合はモック使用
export const USE_MOCK =
    import.meta.env.VITE_USE_MOCK === 'true' ||
    !import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.VITE_FIREBASE_API_KEY === 'your-api-key-here'

let app: FirebaseApp | null = null
let db: Firestore | null = null

if (!USE_MOCK) {
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

    try {
        app = initializeApp(firebaseConfig)
        db = getFirestore(app)
        console.log('Firebase初期化成功')
    } catch (e) {
        console.warn('Firebase初期化失敗。モックモードで起動します。', e)
    }
}

export { app, db }
