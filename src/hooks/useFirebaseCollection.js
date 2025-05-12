import { useState, useEffect, useCallback } from "react";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export function useFirebaseCollection(collectionName, qOptions = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);

  const handleSnapshot = useCallback((snapshot) => {
    setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  }, []);

  const handleError = useCallback((err) => {
    setError(err.message);
    toast.error(`Real-time update failed: ${err.message}`);
  }, []);

  const cleanupSubscription = useCallback(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  }, [unsubscribe]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, collectionName), ...qOptions);
      const snapshot = await getDocs(q);
      handleSnapshot(snapshot);
    } catch (err) {
      handleError(err);
    }
  }, [collectionName, qOptions, handleSnapshot, handleError]);

  useEffect(() => {
    cleanupSubscription();

    const q = query(collection(db, collectionName), ...qOptions);
    const unsubscribeFn = onSnapshot(q, handleSnapshot, handleError);

    setUnsubscribe(() => unsubscribeFn);

    return cleanupSubscription;
  }, [
    collectionName,
    qOptions,
    handleSnapshot,
    handleError,
    cleanupSubscription,
  ]);

  return { data, loading, error, refetch: fetchData };
}
