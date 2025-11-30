import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      toast.success(`🎉 Welcome to YOLOvFeed, ${displayName}!`, { duration: 2000 });
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Handle specific Firebase error codes with user-friendly messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          toast.error(
            '📧 This email is already registered! Try signing in instead, or use "Forgot Password" if you can\'t remember your password.',
            { duration: 5000 }
          );
          break;
        case 'auth/weak-password':
          toast.error('🔒 Password is too weak. Please use at least 6 characters.', { duration: 3000 });
          break;
        case 'auth/invalid-email':
          toast.error('📧 Please enter a valid email address.');
          break;
        case 'auth/operation-not-allowed':
          toast.error('🚫 Sign up is currently disabled. Please contact support.');
          break;
        default:
          toast.error('❌ Failed to create account. Please try again or contact support if the problem persists.');
      }
      throw error;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('🔓 Successfully signed in!', { duration: 2000 });
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific Firebase error codes with user-friendly messages
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error(
            '🔍 No account found with this email. Please check your email or create a new account.',
            { duration: 5000 }
          );
          break;
        case 'auth/wrong-password':
          toast.error(
            '🔑 Incorrect password. Please try again or click "Forgot Password" to reset it.',
            { duration: 5000 }
          );
          break;
        case 'auth/invalid-email':
          toast.error('📧 Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          toast.error('🚫 This account has been disabled. Please contact support.');
          break;
        case 'auth/too-many-requests':
          toast.error(
            '⏰ Too many failed attempts. Please wait a moment before trying again or reset your password.',
            { duration: 6000 }
          );
          break;
        case 'auth/network-request-failed':
          toast.error('🌐 Network error. Please check your internet connection and try again.');
          break;
        default:
          toast.error('❌ Sign in failed. Please check your credentials and try again.');
      }
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('🎉 Successfully signed in with Google!', { duration: 2000 });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          toast.error('⚡ Sign in was cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          toast.error('🚫 Popup blocked. Please allow popups for this site and try again.');
          break;
        case 'auth/network-request-failed':
          toast.error('🌐 Network error. Please check your connection and try again.');
          break;
        default:
          toast.error('❌ Google sign in failed. Please try again or use email sign in.');
      }
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('👋 Successfully signed out!', { duration: 2000 });
    } catch (error: any) {
      toast.error(`❌ Sign out failed: ${error.message}`);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(
        '📧 Password reset email sent! Check your inbox and spam folder, then follow the link to reset your password.',
        { duration: 6000 }
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error(
            '🔍 No account found with this email. Please check the email address or create a new account.',
            { duration: 5000 }
          );
          break;
        case 'auth/invalid-email':
          toast.error('📧 Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          toast.error(
            '⏰ Too many password reset requests. Please wait a few minutes before trying again.',
            { duration: 5000 }
          );
          break;
        case 'auth/network-request-failed':
          toast.error('🌐 Network error. Please check your internet connection and try again.');
          break;
        default:
          toast.error('❌ Failed to send reset email. Please try again or contact support.');
      }
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (displayName: string) => {
    try {
      if (currentUser) {
        await updateProfile(currentUser, { displayName });
        toast.success('✅ Profile updated successfully!', { duration: 2000 });
      }
    } catch (error: any) {
      toast.error(`❌ Profile update failed: ${error.message}`);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};