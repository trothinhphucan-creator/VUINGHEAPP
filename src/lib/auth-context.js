"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isConfigured, auth, db, googleProvider } from "./firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { isMobile, isInAppBrowser } from "./in-app-browser";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [needsPhone, setNeedsPhone] = useState(false);

    // Upsert user doc and check phone number
    const upsertUser = async (firebaseUser) => {
        let userRole = "user";
        let hasPhone = false;
        try {
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    createdAt: serverTimestamp(),
                    role: "user",
                });
            } else {
                const data = userSnap.data();
                userRole = data.role || "user";
                hasPhone = !!data.phoneNumber;
            }
        } catch (e) {
            console.error("Firestore upsert error:", e);
        }
        setUser(firebaseUser);
        setRole(userRole);
        setNeedsPhone(!hasPhone);
    };

    // Handle redirect result (for mobile sign-in)
    useEffect(() => {
        if (!isConfigured || !auth) return;

        getRedirectResult(auth)
            .then((result) => {
                // Result is processed by onAuthStateChanged
                // This just prevents unhandled errors
            })
            .catch((error) => {
                if (error.code !== "auth/popup-closed-by-user") {
                    console.error("Redirect result error:", error);
                }
            });
    }, []);

    useEffect(() => {
        if (!isConfigured || !auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await upsertUser(firebaseUser);
            } else {
                setUser(null);
                setRole(null);
                setNeedsPhone(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!isConfigured || !auth) {
            alert("Firebase chưa được cấu hình. Vui lòng cài đặt .env.local với Firebase credentials.");
            return null;
        }
        try {
            // Use redirect on mobile (popup is blocked in many mobile browsers)
            if (isMobile()) {
                await signInWithRedirect(auth, googleProvider);
                return null; // Page will reload after redirect
            }
            // Desktop: use popup
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Google Sign-In error:", error);
            if (error.code === "auth/popup-closed-by-user") return null;
            if (error.code === "auth/cancelled-popup-request") return null;
            if (error.code === "auth/popup-blocked") {
                // Fallback to redirect if popup is blocked
                try {
                    await signInWithRedirect(auth, googleProvider);
                    return null;
                } catch (redirectError) {
                    console.error("Redirect fallback error:", redirectError);
                }
            }
            alert("Đăng nhập thất bại: " + (error.message || "Vui lòng thử lại."));
            return null;
        }
    };

    const savePhoneNumber = async (phone) => {
        if (!user || !isConfigured || !db) return false;
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { phoneNumber: phone, updatedAt: serverTimestamp() }, { merge: true });
            setNeedsPhone(false);
            return true;
        } catch (e) {
            console.error("Save phone error:", e);
            return false;
        }
    };

    const signOut = async () => {
        if (!isConfigured || !auth) return;
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Sign-out error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, signOut, isConfigured, needsPhone, savePhoneNumber }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
