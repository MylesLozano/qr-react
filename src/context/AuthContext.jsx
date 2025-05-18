import { useState, useEffect } from 'react';
import { db, auth, checkAndAssignUserRole, getUserRole } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import SessionTimeout from '../components/SessionTimeout';
import { AuthContext } from './AuthContextDef';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleTimeout = async () => {
    try {
      await signOut(auth);
      toast.info('Session expired. Please log in again.');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error during session timeout');
    }
  };

  const handleWarning = (timeLeft) => {
    const minutes = Math.floor(timeLeft / 60);
    toast.warning(`Your session will expire in ${minutes} minutes`);
  };
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser?.email.endsWith('@jmc.edu.ph')) {
          console.info(`Auth state changed - User: ${currentUser.email}`);

          // Assign role and capture result
          try {
            await checkAndAssignUserRole(currentUser);
            console.info('User role checked and assigned successfully');
          } catch (roleError) {
            console.error('Role assignment error:', roleError);
            if (isMounted) {
              setError('Error assigning user role. Please try again.');
              setLoading(false);
            }
            return;
          }

          // Check if session was revoked
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userDocRef);
          } catch (docError) {
            console.error('Error fetching user document:', docError);
            if (isMounted) {
              setError('Failed to fetch user data. Please refresh the page.');
              setLoading(false);
            }
            return;
          }

          if (userSnap.exists() && userSnap.data()?.sessionRevoked) {
            await updateDoc(userDocRef, { sessionRevoked: false }); // Reset
            toast.error('Your session was revoked. Please log in again.');
            await signOut(auth);
            return;
          }

          // Set user and get role
          setUser(currentUser);
          let userRole;
          try {
            userRole = await getUserRole(currentUser.uid);
            console.info(`User role retrieved: ${userRole}`);
          } catch (roleError) {
            console.error('Error getting user role:', roleError);
            if (isMounted) {
              setError('Failed to get user role. Please try again.');
              setLoading(false);
            }
            return;
          }

          setRole(userRole);
          setError(null);
        } else {
          if (isMounted) {
            setUser(null);
            setRole(null);
            if (currentUser) {
              setError('Only @jmc.edu.ph accounts are allowed');
              toast.error('Only @jmc.edu.ph accounts are allowed');
            }
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (isMounted) {
          setError('Failed to fetch user information');
          toast.error('Failed to fetch user information');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    role,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {user && (
        <SessionTimeout
          timeoutMinutes={30}
          warningMinutes={5}
          onTimeout={handleTimeout}
          onWarning={handleWarning}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}
