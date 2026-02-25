import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export default function useUpiPayment(API_URL, token, onSuccess) {
  const [pendingExpense, setPendingExpense] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Refs allow focus/visibility listeners to read current values
  // without stale closures — listener is only registered once
  const pendingExpenseRef = useRef(null);
  const confirmingRef = useRef(false); // ✅ prevents stale double-click guard

  const updatePendingExpense = (id) => {
    pendingExpenseRef.current = id;
    setPendingExpense(id);
  };

  const updateConfirming = (val) => {
    confirmingRef.current = val;
    setConfirming(val);
  };

  // 1️⃣ Creates a pending expense and stores its ID
  // Must be awaited by caller BEFORE redirect
  const initiatePayment = async (payload) => {
    const res = await axios.post(
      `${API_URL}/api/expenses/upi/initiate`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const expenseId = res.data.data.expenseId;
    updatePendingExpense(expenseId);
    return expenseId;
  };

  // 2️⃣ Called when user taps Yes/No
  // Uses refs so this function never has a stale guard or stale ID
  const confirmPayment = useCallback(async (status) => {
    const id = pendingExpenseRef.current;
    if (!id) {
      console.warn("confirmPayment: no pendingExpense ID — skipping.");
      return;
    }
    // ✅ Read from ref, not from closure — no stale value
    if (confirmingRef.current) return;

    updateConfirming(true);
    try {
      await axios.patch(
        `${API_URL}/api/expenses/upi/confirm/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ Reset state in correct order: clear ID first, then close modal
      updatePendingExpense(null);
      updateConfirming(false);
      setShowConfirm(false);
      onSuccess?.();
    } catch (err) {
      console.error("confirmPayment API failed:", err);
      updateConfirming(false); // ✅ Always re-enable buttons on error
    }
    // ✅ excluded confirming — we use ref so deps don't need it
  }, [API_URL, token, onSuccess]);

  // 3️⃣ Detect return from UPI app
  // Both events needed: focus (desktop/some Android), visibilitychange (iOS + most Android)
  useEffect(() => {
    const handleReturn = () => {
      if (pendingExpenseRef.current) {
        setShowConfirm(true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleReturn();
      }
    };

    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []); // Empty deps: safe because we read refs, not state

  // 4️⃣ Dismiss modal without confirming (X button)
  const dismissConfirm = () => {
    if (confirmingRef.current) return; // Don't dismiss while a request is in flight
    updatePendingExpense(null);
    setShowConfirm(false);
  };

  return {
    initiatePayment,
    confirmPayment,
    dismissConfirm,
    showConfirm,
    confirming,
    pendingExpense,
  };
}
