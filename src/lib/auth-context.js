"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isConfigured, auth, db, googleProvider } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isConfigured || !auth) {
            // Firebase not configured — app works without auth
            setLoading(false);
            return;
        }

        // Lazy imports to avoid top-level Firebase errors
        const { onAuthStateChanged } = require("firebase/auth");
        const { doc, setDoc, getDoc, serverTimestamp } = require("firebase/firestore");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
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
                    }
                } catch (e) {
                    console.error("Firestore upsert error:", e);
                }
                setUser(firebaseUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!isConfigured || !auth) {
            alert("Firebase chưa được cấu hình. Vui lòng cài đặt .env.local với Firebase credentials.");
            return;
        }
        const { signInWithPopup } = require("firebase/auth");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Google Sign-In error:", error);
            throw error;
        }
    };

    const signOut = async () => {
        if (!isConfigured || !auth) return;
        const { signOut: firebaseSignOut } = require("firebase/auth");
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Sign-out error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, isConfigured }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
