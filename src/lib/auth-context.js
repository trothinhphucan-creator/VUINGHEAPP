"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isConfigured, auth, db, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isConfigured || !auth) {
            // Firebase not configured — app works without auth
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                let userRole = "user";
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
                        userRole = userSnap.data().role || "user";
                    }
                } catch (e) {
                    console.error("Firestore upsert error:", e);
                }
                setUser(firebaseUser);
                setRole(userRole);
            } else {
                setUser(null);
                setRole(null);
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
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Google Sign-In error:", error);
            if (error.code === "auth/popup-closed-by-user") return null;
            if (error.code === "auth/cancelled-popup-request") return null;
            alert("Đăng nhập thất bại: " + (error.message || "Vui lòng thử lại."));
            return null;
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
        <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, signOut, isConfigured }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
