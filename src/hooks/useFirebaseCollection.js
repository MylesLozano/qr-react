import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';

export function useFirebaseCollection(collectionName, qOptions = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unsubscribe, setUnsubscribe] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const q = query(collection(db, collectionName), ...qOptions);
                const snapshot = await getDocs(q);
                setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                setError(err.message);
                toast.error(`Failed to fetch data: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();  // For initial fetch

        const unsubscribeFn = onSnapshot(query(collection(db, collectionName), ...qOptions), (snapshot) => {
            setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
            setError(err.message);
            toast.error(`Real-time update failed: ${err.message}`);
        });

        setUnsubscribe(() => unsubscribeFn);

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [collectionName, JSON.stringify(qOptions)]);  // Depend on query options

    return { data, loading, error, refetch: fetchData };
} 