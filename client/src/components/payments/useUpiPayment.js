import { useEffect, useState } from "react";
import axios from "axios";

export default function useUpiPayment(API_URL, token, onSuccess) {
  const [pendingExpense, setPendingExpense] = useState(null);
  const [deferredPayload, setDeferredPayload] = useState(null); // ✅ Stores intent data
  const [showConfirm, setShowConfirm] = useState(false);

  // 1️⃣ Prepare or Execute Payment
  const initiatePayment = async (payload) => {
    if (payload.isIntentTriggered) {
      // ✅ Defer API call for mobile intent flow
      setDeferredPayload(payload);
      return;
    }

    // Direct API call (e.g. for QR scan or non-intent flow)
    const res = await axios.post(
      `${API_URL}/api/expenses/upi/initiate`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setPendingExpense(res.data.data.expenseId);
  };

  // 2️⃣ Execute deferred API call when user returns
  const handleReturnFocus = async () => {
    if (deferredPayload) {
      try {
        const res = await axios.post(
          `${API_URL}/api/expenses/upi/initiate`,
          deferredPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPendingExpense(res.data.data.expenseId);
        setDeferredPayload(null);
        setShowConfirm(true);
      } catch (err) {
        console.error("Failed to initiate deferred payment:", err);
      }
    } else if (pendingExpense) {
      setShowConfirm(true);
    }
  };

  // 3️⃣ User confirmation after comeback
  const confirmPayment = async (status) => {
    await axios.patch(
      `${API_URL}/api/expenses/upi/confirm/${pendingExpense}`,
      { status },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setPendingExpense(null);
    setShowConfirm(false);
    onSuccess?.();
  };

  // 4️⃣ Detect return from UPI app
  useEffect(() => {
    window.addEventListener("focus", handleReturnFocus);
    return () => window.removeEventListener("focus", handleReturnFocus);
  }, [deferredPayload, pendingExpense]);

  return {
    initiatePayment,
    confirmPayment,
    showConfirm,
  };
}
