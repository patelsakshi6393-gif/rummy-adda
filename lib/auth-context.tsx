'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserWallet } from './types';
import { handleFirestoreError, OperationType } from './firebase-error';
import { executeReferralReward, getCodeFromPlayerId } from './referral-service';

export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export function phoneToAuthEmail(phone: string): string {
  const sanitized = sanitizePhone(phone);
  return `${sanitized}@phone.rummyadda.in`;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  wallet: UserWallet | null;
  loading: boolean;
  signInWithPhone: (phone: string, pass: string) => Promise<void>;
  signUpWithPhone: (phone: string, pass: string, referralCode?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generatePlayerId(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'RA-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const ADMIN_EMAILS = [
  '9118431155@rummyadda.app',
  '9118431155@phone.rummyadda.in',
  'supportalkabrain@gmail.com',
  'admin@rummyadda.com',
  'admin@rummyadda.app',
  'admin@rummyadda.in',
];

export function isUserAdmin(
  currentUser: { email?: string | null; phoneNumber?: string | null } | null,
  profile?: { phone?: string | null; role?: string | null; email?: string | null } | null
): boolean {
  if (!currentUser && !profile) return false;
  const email = (currentUser?.email || profile?.email || '').trim().toLowerCase();
  const phone = sanitizePhone(currentUser?.phoneNumber || profile?.phone || '');

  if (ADMIN_EMAILS.includes(email)) return true;
  if (phone === '9118431155') return true;
  if (profile?.role === 'admin' || profile?.role === 'Admin') return true;
  return false;
}

export async function ensureAdminPrivileges(targetAuthUser: User | null): Promise<boolean> {
  if (!targetAuthUser) return false;
  try {
    const userRef = doc(db, 'users', targetAuthUser.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? (snap.data() as UserProfile) : null;
    const qualifies = isUserAdmin(targetAuthUser, data);

    if (qualifies) {
      await setDoc(
        userRef,
        {
          uid: targetAuthUser.uid,
          role: 'admin',
          phone: '9118431155',
          email: targetAuthUser.email || '9118431155@rummyadda.app',
          displayName: data?.displayName || 'Admin (Imran)',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.warn('ensureAdminPrivileges notice:', err);
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate Firestore connection on boot as mandated
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firestore client is offline or initializing.');
        }
      }
    }
    testConnection();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setWallet(null);
        setLoading(false);
        return;
      }

      // Ensure profile and wallet exist in Firestore
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const walletRef = doc(db, 'wallets', currentUser.uid);

        const userSnap = await getDoc(userRef);
        const isAdminUser = isUserAdmin(currentUser);

        if (!userSnap.exists()) {
          const newPlayerId = generatePlayerId();
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            playerId: newPlayerId,
            referralCode: getCodeFromPlayerId(newPlayerId),
            displayName: currentUser.displayName || (isAdminUser ? 'Admin (Imran)' : 'Royal Player'),
            email: currentUser.email || '',
            phone: isAdminUser ? '9118431155' : (currentUser.phoneNumber || ''),
            photoURL: currentUser.photoURL || '',
            role: isAdminUser ? 'admin' : 'player',
            accountStatus: 'active',
            totalReferrals: 0,
            referralEarnings: 0,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
        } else {
          // If profile exists, check if user is an admin but lacks admin role or phone in Firestore
          const existingData = userSnap.data() as UserProfile;
          if (
            (isAdminUser || isUserAdmin(currentUser, existingData)) &&
            (existingData.role !== 'admin' || existingData.phone !== '9118431155')
          ) {
            await setDoc(
              userRef,
              {
                role: 'admin',
                phone: '9118431155',
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }

        const walletSnap = await getDoc(walletRef);
        if (!walletSnap.exists()) {
          const now = new Date().toISOString();
          const initialWallet: UserWallet = {
            uid: currentUser.uid,
            depositBalance: 0,
            winBalance: 0,
            bonusBalance: 20, // ₹20 Non-withdrawable welcome bonus
            welcomeBonusClaimed: true,
            rewardPoints: 0,
            updatedAt: now,
          };
          await setDoc(walletRef, initialWallet);

          const txRef = doc(collection(db, 'transactions'));
          await setDoc(txRef, {
            id: txRef.id,
            uid: currentUser.uid,
            type: 'reward',
            amount: 20,
            currency: 'INR',
            status: 'completed',
            description: 'Welcome Bonus - ₹20 Non-withdrawable Game Credits',
            referenceId: 'welcome_bonus_20',
            createdAt: now,
          });
        } else {
          // If wallet exists but welcome bonus was never claimed on an uninitialized account, ensure ₹20 welcome bonus is set ONCE
          const wData = walletSnap.data() as UserWallet;
          if (
            !wData.welcomeBonusClaimed &&
            (wData.bonusBalance === undefined || wData.bonusBalance === null) &&
            (wData.depositBalance || 0) === 0 &&
            (wData.winBalance || 0) === 0
          ) {
            await setDoc(
              walletRef,
              {
                bonusBalance: 20,
                welcomeBonusClaimed: true,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.error('Error synchronizing user data:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time listener for profile
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (isUserAdmin(user, data)) {
            data.role = 'admin';
            data.phone = '9118431155';
          }
          setProfile(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );
    return () => unsub();
  }, [user]);

  // Real-time listener for wallet
  useEffect(() => {
    if (!user) return;
    const walletRef = doc(db, 'wallets', user.uid);
    const unsub = onSnapshot(
      walletRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const wData = docSnap.data() as UserWallet;
          setWallet(wData);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `wallets/${user.uid}`);
      }
    );
    return () => unsub();
  }, [user]);

  const signInWithPhone = async (phone: string, pass: string) => {
    setLoading(true);
    try {
      const cleanPhone = sanitizePhone(phone);
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      const authEmail = phoneToAuthEmail(cleanPhone);
      try {
        await signInWithEmailAndPassword(auth, authEmail, pass);
      } catch (firstErr) {
        // Fallback for admin or alternate domain format
        if (cleanPhone === '9118431155') {
          await signInWithEmailAndPassword(auth, '9118431155@rummyadda.app', pass);
        } else {
          throw firstErr;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPhone = async (phone: string, pass: string, referralCode?: string) => {
    setLoading(true);
    try {
      const cleanPhone = sanitizePhone(phone);
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      const authEmail = phoneToAuthEmail(cleanPhone);
      const cred = await createUserWithEmailAndPassword(auth, authEmail, pass);
      const newPlayerId = generatePlayerId();
      const myReferralCode = getCodeFromPlayerId(newPlayerId);
      const displayName = `Player ${cleanPhone.slice(-4)}`;
      await updateProfile(cred.user, { displayName });

      const userRef = doc(db, 'users', cred.user.uid);
      const walletRef = doc(db, 'wallets', cred.user.uid);
      const now = new Date().toISOString();

      const isNewAdmin = cleanPhone === '9118431155';
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        playerId: newPlayerId,
        referralCode: myReferralCode,
        displayName: isNewAdmin ? 'Admin (Imran)' : displayName,
        email: authEmail,
        phone: cleanPhone,
        role: isNewAdmin ? 'admin' : 'player',
        accountStatus: 'active',
        totalReferrals: 0,
        referralEarnings: 0,
        createdAt: now,
      };
      await setDoc(userRef, newProfile);

      // Check if user entered a referral code:
      // "Aur usko na jisne referral code dala hai usko 20 + 20 chips mil jayengi.
      // Aur jo jisne usko bheja hai woh referral code, us referral code jisne bheja hai usko 50 mil jayenge, 50 chips mil jayengi."
      let appliedReferral = false;
      if (referralCode && referralCode.trim()) {
        const refRes = await executeReferralReward({
          refereeUid: cred.user.uid,
          refereePhone: cleanPhone,
          refereeName: displayName,
          referralCode: referralCode.trim(),
        });
        if (refRes.success) {
          appliedReferral = true;
        }
      }

      // If no referral was applied, assign standard welcome bonus (20 bonus chips) strictly once
      if (!appliedReferral) {
        const walletSnap = await getDoc(walletRef);
        if (!walletSnap.exists()) {
          const initialWallet: UserWallet = {
            uid: cred.user.uid,
            depositBalance: 0,
            winBalance: 0,
            bonusBalance: 20, // ₹20 Non-withdrawable welcome bonus
            welcomeBonusClaimed: true,
            rewardPoints: 0,
            updatedAt: now,
          };
          await setDoc(walletRef, initialWallet);

          const txRef = doc(collection(db, 'transactions'));
          await setDoc(txRef, {
            id: txRef.id,
            uid: cred.user.uid,
            type: 'reward',
            amount: 20,
            currency: 'INR',
            status: 'completed',
            description: 'Welcome Bonus - ₹20 Non-withdrawable Game Credits',
            referenceId: 'welcome_bonus_20',
            createdAt: now,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });

      const newPlayerId = generatePlayerId();
      const userRef = doc(db, 'users', cred.user.uid);
      const walletRef = doc(db, 'wallets', cred.user.uid);

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        playerId: newPlayerId,
        displayName: name,
        email: email,
        phone: phone || '',
        role: 'player',
        accountStatus: 'active',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);

      const walletSnap = await getDoc(walletRef);
      if (!walletSnap.exists()) {
        const now = new Date().toISOString();
        const initialWallet: UserWallet = {
          uid: cred.user.uid,
          depositBalance: 0,
          winBalance: 0,
          bonusBalance: 20, // ₹20 Non-withdrawable welcome bonus
          welcomeBonusClaimed: true,
          rewardPoints: 0,
          updatedAt: now,
        };
        await setDoc(walletRef, initialWallet);

        const txRef = doc(collection(db, 'transactions'));
        await setDoc(txRef, {
          id: txRef.id,
          uid: cred.user.uid,
          type: 'bonus',
          amount: 20,
          currency: 'INR',
          status: 'completed',
          description: 'Welcome Bonus - ₹20 Non-withdrawable Game Credits',
          referenceId: 'welcome_bonus_20',
          createdAt: now,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        loading,
        signInWithPhone,
        signUpWithPhone,
        signInWithEmail,
        signUpWithEmail,
        logout,
        sendPasswordReset,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
