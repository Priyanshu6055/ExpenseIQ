import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export default function useUpiPayment(API_URL, token, onSuccess) {
  const [pendingExpense, setPendingExpense] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Use a ref so the focus listener always sees the latest value
  // without needing to be re-registered on every render
  const pendingExpenseRef = useRef(null);

  const updatePendingExpense = (id) => {
    pendingExpenseRef.current = id;
    setPendingExpense(id);
  };

  // 1️⃣ Creates a pending expense on the backend and returns its ID
  // This is called BEFORE the redirect, so the ID is always available on return
  const initiatePayment = async (payload) => {
    const res = await axios.post(
      `${API_URL}/api/expenses/upi/initiate`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const expenseId = res.data.data.expenseId;
    updatePendingExpense(expenseId);
    return expenseId; // ✅ caller can also await this
  };

  // 2️⃣ Called when user taps Yes/No in the confirm modal
  const confirmPayment = useCallback(async (status) => {
    const id = pendingExpenseRef.current;
    if (!id) {
      console.warn("confirmPayment called with no pending expense ID — ignoring.");
      return;
    }
    if (confirming) return;

    setConfirming(true);
    try {
      await axios.patch(
        `${API_URL}/api/expenses/upi/confirm/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updatePendingExpense(null);
      setShowConfirm(false);
      onSuccess?.();
    } catch (err) {
      console.error("confirmPayment API failed:", err);
    } finally {
      setConfirming(false);
    }
  }, [API_URL, token, onSuccess, confirming]);

  // 3️⃣ Detect return from UPI app using focus + visibilitychange
  useEffect(() => {
    const handleReturn = () => {
      // Only show confirm if there is a pending expense
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
  }, []); // ✅ Empty deps: listener reads ref directly, no stale closure

  return {
    initiatePayment,
    confirmPayment,
    showConfirm,
    confirming,
    pendingExpense,
  };
}
