import { ShieldCheck, XCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentConfirmModal({ open, onConfirm, confirming }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-card p-6 rounded-2xl text-center w-full max-w-sm border border-border/50 shadow-2xl animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-background shadow-lg">
          {confirming ? (
            <Loader2 size={32} className="text-primary animate-spin" />
          ) : (
            <ShieldCheck size={32} className="text-primary" />
          )}
        </div>

        <h2 className="text-foreground text-xl font-bold mb-2">
          {confirming ? "Updating..." : "Payment Confirmation"}
        </h2>
        <p className="text-muted-foreground text-sm mb-6 px-4 leading-relaxed">
          {confirming
            ? "Please wait while we record your payment."
            : "Did the UPI transaction complete successfully in your payment app?"}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onConfirm("failed")}
            disabled={confirming}
            className="flex-1 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle size={16} className="group-hover:scale-110 transition-transform" /> No, Failed
          </button>

          <button
            onClick={() => onConfirm("confirmed")}
            disabled={confirming}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" /> Yes, Success
          </button>
        </div>
      </div>
    </div>
  );
}
