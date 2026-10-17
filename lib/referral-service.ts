import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserWallet, ReferralRecord } from './types';

/**
 * Global configurable Referral Link Base.
 * "Jo referral link hogi woh main tumhe provide karunga woh rahegi."
 * Can be overridden via NEXT_PUBLIC_REFERRAL_BASE_URL or dynamically uses window.location.origin
 */
export const CUSTOM_REFERRAL_BASE = process.env.NEXT_PUBLIC_REFERRAL_BASE_URL || '';

/**
 * Returns formatted referral link for sharing
 */
export function getReferralLink(referralCode: string): string {
  const code = (referralCode || 'REFROYAL').trim().toUpperCase();
  if (CUSTOM_REFERRAL_BASE) {
    const base = CUSTOM_REFERRAL_BASE.trim().replace(/\/+$/, '');
    return `${base}/signup?ref=${encodeURIComponent(code)}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
  }
  return `https://rummyadda.app/signup?ref=${encodeURIComponent(code)}`;
}

/**
 * Sanitizes and normalizes referral code
 */
export function cleanReferralCode(code?: string | null): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/**
 * Derives user's public referral code from their playerId
 * e.g. "RA-K9P2X4" -> "REFK9P2X4"
 */
export function getCodeFromPlayerId(playerId?: string | null): string {
  if (!playerId) return 'REFROYAL';
  if (playerId.startsWith('RA-')) {
    return playerId.replace('RA-', 'REF');
  }
  return `REF${playerId}`;
}

/**
 * Finds referrer user profile by referral code, playerId, or stripped ID
 */
export async function findReferrerByCode(code: string): Promise<UserProfile | null> {
  const cleaned = cleanReferralCode(code);
  if (!cleaned) return null;

  try {
    const usersRef = collection(db, 'users');

    // 1. Direct match on referralCode field
    const qCode = query(usersRef, where('referralCode', '==', cleaned));
    const snapCode = await getDocs(qCode);
    if (!snapCode.empty) {
      return snapCode.docs[0].data() as UserProfile;
    }

    // 2. Direct match on playerId (e.g. "RA-XXXXXX")
    const qPlayer = query(usersRef, where('playerId', '==', cleaned));
    const snapPlayer = await getDocs(qPlayer);
    if (!snapPlayer.empty) {
      return snapPlayer.docs[0].data() as UserProfile;
    }

    // 3. If code starts with "REF", check "RA-"
    if (cleaned.startsWith('REF')) {
      const converted = cleaned.replace('REF', 'RA-');
      const qConv = query(usersRef, where('playerId', '==', converted));
      const snapConv = await getDocs(qConv);
      if (!snapConv.empty) {
        return snapConv.docs[0].data() as UserProfile;
      }
    }

    // 4. If code starts with "RA-", check "REF"
    if (cleaned.startsWith('RA-')) {
      const converted = cleaned.replace('RA-', 'REF');
      const qConv = query(usersRef, where('referralCode', '==', converted));
      const snapConv = await getDocs(qConv);
      if (!snapConv.empty) {
        return snapConv.docs[0].data() as UserProfile;
      }
    }

    // 5. Try "RA-" + cleaned
    const qAlt = query(usersRef, where('playerId', '==', `RA-${cleaned}`));
    const snapAlt = await getDocs(qAlt);
    if (!snapAlt.empty) {
      return snapAlt.docs[0].data() as UserProfile;
    }

    return null;
  } catch (err) {
    console.error('Error finding referrer by code:', err);
    return null;
  }
}

/**
 * Validates a referral code and checks self-referral
 */
export async function validateReferralCode(
  code: string,
  candidatePhone?: string
): Promise<{ isValid: boolean; referrer?: UserProfile; message: string }> {
  const cleaned = cleanReferralCode(code);
  if (!cleaned) {
    return { isValid: false, message: 'Please enter a referral code.' };
  }

  const referrer = await findReferrerByCode(cleaned);
  if (!referrer) {
    return {
      isValid: false,
      message: `Referral code "${cleaned}" not found. Please verify with your friend.`,
    };
  }

  // Prevent self referral
  if (candidatePhone && referrer.phone) {
    const cleanCand = candidatePhone.replace(/[^\d]/g, '').slice(-10);
    const cleanRefPhone = referrer.phone.replace(/[^\d]/g, '').slice(-10);
    if (cleanCand && cleanRefPhone && cleanCand === cleanRefPhone) {
      return {
        isValid: false,
        message: 'You cannot use your own referral code.',
      };
    }
  }

  return {
    isValid: true,
    referrer,
    message: `✓ Valid code from ${referrer.displayName || 'friend'}! You will receive 20 + 20 = 40 Free Chips!`,
  };
}

/**
 * Executes referral rewards:
 * - New User (referee) gets: 20 + 20 = 40 Chips (20 Deposit Chips + 20 Bonus Chips)
 * - Referrer gets: 50 Chips credited to wallet
 * - Detailed transaction records and referral records are created
 */
export async function executeReferralReward(params: {
  refereeUid: string;
  refereePhone: string;
  refereeName: string;
  referralCode: string;
}): Promise<{ success: boolean; referrerUid?: string; message: string }> {
  const { refereeUid, refereePhone, refereeName, referralCode } = params;
  const cleaned = cleanReferralCode(referralCode);
  if (!cleaned) return { success: false, message: 'No referral code provided.' };

  const referrer = await findReferrerByCode(cleaned);
  if (!referrer) {
    return { success: false, message: 'Referrer not found.' };
  }

  // Prevent self-referral
  if (referrer.uid === refereeUid) {
    return { success: false, message: 'Cannot refer yourself.' };
  }

  const now = new Date().toISOString();

  try {
    // 1. Credit Referrer with 50 Chips
    // "Aur jo jisne usko bheja hai woh referral code, us referral code jisne bheja hai usko 50 mil jayenge, 50 chips mil jayengi."
    const referrerWalletRef = doc(db, 'wallets', referrer.uid);
    const refWalletSnap = await getDoc(referrerWalletRef);
    if (refWalletSnap.exists()) {
      const curWallet = refWalletSnap.data() as UserWallet;
      await updateDoc(referrerWalletRef, {
        bonusBalance: (curWallet.bonusBalance || 0) + 50,
        rewardPoints: (curWallet.rewardPoints || 0) + 50,
        updatedAt: now,
      });
    } else {
      await setDoc(referrerWalletRef, {
        uid: referrer.uid,
        depositBalance: 0,
        winBalance: 0,
        bonusBalance: 50,
        rewardPoints: 50,
        updatedAt: now,
      });
    }

    // Transaction for Referrer
    const refTxRef = doc(collection(db, 'transactions'));
    await setDoc(refTxRef, {
      id: refTxRef.id,
      uid: referrer.uid,
      type: 'reward',
      amount: 50,
      currency: 'INR',
      status: 'completed',
      description: `Referral Reward: ${refereeName || 'Friend'} (+91 ${refereePhone.slice(-4)}) joined with your code (+50 Chips)`,
      referenceId: `ref_award_${refereeUid}`,
      createdAt: now,
    });

    // Update Referrer Profile statistics
    const referrerUserRef = doc(db, 'users', referrer.uid);
    await updateDoc(referrerUserRef, {
      totalReferrals: (referrer.totalReferrals || 0) + 1,
      referralEarnings: (referrer.referralEarnings || 0) + 50,
      updatedAt: now,
    });

    // 2. Credit Referee (New User) with 20 + 20 Chips
    // "Aur usko na jisne referral code dala hai usko 20 + 20 chips mil jayengi."
    // 20 Deposit Chips + 20 Bonus Chips = 40 Chips total!
    const refereeWalletRef = doc(db, 'wallets', refereeUid);
    const refereeWalletSnap = await getDoc(refereeWalletRef);
    if (refereeWalletSnap.exists()) {
      const curRefWallet = refereeWalletSnap.data() as UserWallet;
      await updateDoc(refereeWalletRef, {
        depositBalance: (curRefWallet.depositBalance || 0) + 20,
        bonusBalance: Math.max(20, curRefWallet.bonusBalance || 0),
        updatedAt: now,
      });
    } else {
      await setDoc(refereeWalletRef, {
        uid: refereeUid,
        depositBalance: 20,
        winBalance: 0,
        bonusBalance: 20,
        rewardPoints: 0,
        updatedAt: now,
      });
    }

    // Transaction for Referee - Referral Bonus (20 Deposit Chips)
    const refereeTxRef = doc(collection(db, 'transactions'));
    await setDoc(refereeTxRef, {
      id: refereeTxRef.id,
      uid: refereeUid,
      type: 'reward',
      amount: 20,
      currency: 'INR',
      status: 'completed',
      description: `Referral Reward: +20 Free Deposit Chips (Friend Code: ${cleaned})`,
      referenceId: `referee_reward_${cleaned}`,
      createdAt: now,
    });

    // 3. Update Referee Profile with referrer info
    const refereeUserRef = doc(db, 'users', refereeUid);
    await updateDoc(refereeUserRef, {
      referredBy: referrer.uid,
      referredByCode: cleaned,
      referredAt: now,
      updatedAt: now,
    });

    // 4. Save record in referrals collection
    const recordRef = doc(collection(db, 'referrals'));
    const record: ReferralRecord = {
      id: recordRef.id,
      referrerUid: referrer.uid,
      referrerCode: cleaned,
      refereeUid,
      refereePhone: `+91 ******${refereePhone.slice(-4)}`,
      refereeName,
      referrerChips: 50,
      refereeChips: 40,
      status: 'completed',
      createdAt: now,
    };
    await setDoc(recordRef, record);

    return {
      success: true,
      referrerUid: referrer.uid,
      message: `Referral rewards applied: 20 + 20 chips credited to new user, 50 chips credited to ${referrer.displayName || 'referrer'}!`,
    };
  } catch (err) {
    console.error('Error applying referral reward:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to apply referral reward.',
    };
  }
}
