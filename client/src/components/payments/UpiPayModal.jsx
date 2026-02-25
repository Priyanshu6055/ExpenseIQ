import { useState } from "react";
import { X, Smartphone, ScanLine, IndianRupee } from "lucide-react";
import QrScanModal from "./QrScanModal";

export default function UpiPayModal({ open, onClose, categories, onPay }) {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!open) return null;

  // ✅ Correct UPI Intent Flow:
  // 1. Validate (sync)
  // 2. Call backend to create pending expense — AWAIT it so expenseId is set BEFORE redirect
  // 3. Redirect to UPI app (window.location.href is safe after async; doesn't need sync gesture)
  // 4. On return: focus/visibilitychange listener shows confirm modal
  const handlePay = async () => {
    if (paying) return;

    // 1️⃣ Validate
    if (!upiId || !amount || !category) {
      setError("UPI ID, amount, and category are required.");
      return;
    }

    const upiRegex = /^[\w.\-]{2,}@[a-zA-Z]{2,10}$/;
    if (!upiRegex.test(upiId.trim())) {
      setError("Please enter a valid UPI ID (e.g., name@bank).");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const finalAmount = amt.toFixed(2);

    // ✅ Strip ALL non-ASCII and non-alphanumeric chars from pn
    // Many UPI apps (especially on iOS) reject pn with special chars
    const rawName = payeeName.trim() || upiId.split("@")[0];
    const finalPayeeName = rawName.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "UPI Payment";

    setError("");
    setPaying(true);

    // 2️⃣ Register pending expense FIRST — expenseId must exist before redirect
    try {
      await onPay({
        amount: finalAmount,
        category,
        description: description.trim() || `UPI to ${upiId}`,
      });
    } catch (err) {
      console.error("Failed to create pending expense:", err);
      setError("Could not reach server. Please try again.");
      setPaying(false);
      return;
    }

    // 3️⃣ Minimal, compliant UPI deep link
    // ✅ Only use: pa (required), pn (recommended), am, cu
    // ❌ Do NOT include: tn, tr, mc, mode — causes "Something went wrong" on iOS apps
    const upiUrl =
      `upi://pay` +
      `?pa=${encodeURIComponent(upiId.trim())}` +
      `&pn=${encodeURIComponent(finalPayeeName)}` +
      `&am=${finalAmount}` +
      `&cu=INR`;

    window.location.href = upiUrl;

    // Reset state if UPI app never launches (desktop/unsupported browser)
    setTimeout(() => setPaying(false), 5000);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-background border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-muted-foreground";

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
            ? "bg-[#00aaff]/60 text-white cursor-not-allowed"
            : "bg-[#00aaff] text-white hover:bg-[#0088dd] hover:shadow-blue-500/25"
            }`}
        >
          {paying ? "Connecting to UPI..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
