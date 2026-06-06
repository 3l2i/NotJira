import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app boot — check if a valid Cognito session already exists
  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // Step 1: Does Amplify have any cached session?
      await getCurrentUser();

      // Step 2: Get tokens from cache (no network call - fast)
      const session = await fetchAuthSession();

      if (!session.tokens?.idToken || !session.tokens?.accessToken) {
        throw new Error('No valid session tokens found');
      }

      const idToken     = session.tokens.idToken.toString();
      const accessToken = session.tokens.accessToken.toString();

      // Step 3: Validate with our backend using the accessToken
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        await signOut();
        throw new Error('Session expired or invalid');
      }

      const data = await res.json();
      setUser(data);
      setToken(idToken);
    } catch (err) {
      console.log('No active session:', err.message);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    // Clear any stale Amplify session before signing in
    try {
      const existing = await getCurrentUser();
      if (existing) await signOut();
    } catch (e) {
      // No existing session — fine
    }

    const { isSignedIn } = await signIn({ username: email, password });

    if (!isSignedIn) {
      throw new Error('Sign-in was not completed. Please try again.');
    }

    // After fresh sign-in, use forceRefresh to get brand new tokens
    const session = await fetchAuthSession({ forceRefresh: true });

    if (!session.tokens?.idToken || !session.tokens?.accessToken) {
      await signOut();
      throw new Error('Failed to retrieve session tokens from Cognito.');
    }

    const idToken     = session.tokens.idToken.toString();
    const accessToken = session.tokens.accessToken.toString();

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      await signOut();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Login failed. Please try again.');
    }

    const data = await res.json();
    setUser(data);
    setToken(idToken);
  }

  async function logout() {
    await signOut();
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
