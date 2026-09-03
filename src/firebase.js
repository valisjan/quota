import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCLbyUgGUcgBalU6pHTewkqtFgUyZrprrs',
  authDomain: 'quota-e1424.firebaseapp.com',
  projectId: 'quota-e1424',
  storageBucket: 'quota-e1424.firebasestorage.app',
  messagingSenderId: '304261658787',
  appId: '1:304261658787:web:eae19ec101a820daee6716',
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
