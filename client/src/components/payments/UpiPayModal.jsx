import { useState } from "react";
import { X, Smartphone, ScanLine, IndianRupee } from "lucide-react";
import QrScanModal from "./QrScanModal";
import { extractUpiFromQr } from "./upi.utils";

export default function UpiPayModal({ open, onClose, categories, onPay }) {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState(""); // ✅ dynamic pn
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!open) return null;

  // old code
  // const handlePay = async () => {
  //   if (paying) return;

  //   if (!upiId || !amount || !category) {
  //     setError("UPI ID, amount and category are required");
  //     return;
  //   }

  //   if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
  //     setError("Invalid UPI ID format");
  //     return;
  //   }

  //   const amt = Number(amount);
  //   if (isNaN(amt) || amt <= 0) {
  //     setError("Invalid amount");
  //     return;
  //   }

  //   const finalAmount = amt.toFixed(2);

  //   // ✅ SAFE fallback if pn missing
  //   const finalPayeeName =
  //     payeeName ||
  //     upiId.split("@")[0].replace(/[^a-zA-Z ]/g, "") ||
  //     "UPI Payment";

  //   const txnNote = `Expense_${Date.now()}`;

  //   setError("");
  //   setPaying(true);

  //   // 1️⃣ Create pending expense
  //   await onPay({
  //     amount: finalAmount,
  //     category,
  //     description,
  //   });

  //   // 2️⃣ SAFE UPI URL (ANTI-FRAUD COMPLIANT)
  //   const upiUrl =
  //     `upi://pay` +
  //     `?pa=${encodeURIComponent(upiId)}` +
  //     `&pn=${encodeURIComponent(finalPayeeName)}` +
  //     `&am=${finalAmount}` +
  //     `&cu=INR` +
  //     `&tn=${encodeURIComponent(txnNote)}`;

  //   // 3️⃣ Redirect ONCE
  //   window.location.href = upiUrl;
  // };

  const handlePay = () => {
    if (paying) return;

    // 1️⃣ Synchronous Validation
    if (!upiId || !amount || !category) {
      setError("UPI ID, amount, and category are required.");
      return;
    }

    const upiRegex = /^[\w.\-]{2,}@[a-zA-Z]{2,10}$/;
    if (!upiRegex.test(upiId)) {
      setError("Please enter a valid UPI ID (e.g., name@bank).");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    const finalAmount = amt.toFixed(2);
    const finalPayeeName = payeeName.trim() || upiId.split('@')[0];
    const txnNote = `Pay_${Date.now()}`;

    // 2️⃣ Reset UI State
    setError("");
    setPaying(true);

    // 3️⃣ Generate Intent URL (Production-ready encoding)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(finalPayeeName)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

    // 4️⃣ Synchronous Redirect (Preserves user gesture context)
    // We notify the hook about the payload so it can handle it when the user returns
    onPay({
      amount: finalAmount,
      category,
      description: description || `UPI to ${upiId}`,
      isIntentTriggered: true // Signals useUpiPayment to defer API call
    });

    // Fire the intent immediately
    window.location.href = upiUrl;

    // Fallback if app doesn't open
    setTimeout(() => {
      setPaying(false);
    }, 3000);
  };


  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-muted-foreground";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-card p-6 rounded-2xl w-full max-w-sm relative border border-border/50 shadow-2xl animate-scale-in">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-all duration-200"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <Smartphone size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">Pay via UPI</h2>
            <p className="text-xs text-muted-foreground">Secure & Fast Payments</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={() => setIsQrModalOpen(true)}
          className="w-full mb-4 bg-secondary/50 text-foreground border border-border/50 py-3 rounded-xl hover:bg-secondary/80 transition-all duration-200 text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 group shadow-sm hover:shadow-md"
        >
          <ScanLine size={16} className="text-primary group-hover:scale-110 transition-transform" /> Scan QR Autofill
        </button>

        <QrScanModal
          open={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanSuccess={(data) => {
            setUpiId(data.pa);
            setPayeeName(data.pn || "");
            setError("");
          }}
          onError={(err) => setError(err)}
        />

        <div className="space-y-3">
          <div className="relative">
            <input
              placeholder="UPI ID (e.g. name@upi)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2 bg-background px-4 py-3 rounded-xl border border-input focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
            <IndianRupee size={16} className="text-muted-foreground shrink-0" />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent outline-none text-foreground font-semibold text-lg placeholder:text-muted-foreground/50 placeholder:text-sm placeholder:font-normal"
            />
          </div>

          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">Select Category</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          disabled={paying}
          onClick={handlePay}
          className={`w-full mt-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.98] shadow-lg ${paying
            ? "bg-[#00aaff] text-muted-foreground cursor-not-allowed"
            : "bg-[#00aaff] text-primary-foreground hover:bg-primary-hover hover:shadow-primary/25"
            }`}
        >
          {paying ? "Opening UPI..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
