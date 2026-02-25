import React, {
  useEffect,
  useState,
  useMemo,
  useCallback
} from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

// -------- Payments --------
import UpiPayModal from "../components/payments/UpiPayModal";
import PaymentConfirmModal from "../components/payments/PaymentConfirmModal";
import useUpiPayment from "../components/payments/useUpiPayment";

// -------- Dashboard Components --------
import SummaryCards from "../components/dashboard/SummaryCards";
import ExpenseChart from "../components/dashboard/ExpenseChart";
import FiltersBar from "../components/dashboard/FiltersBar";
import TransactionsTable from "../components/dashboard/TransactionsTable";
import FloatingActions from "../components/dashboard/FloatingActions";
import EditTransactionModal from "../components/dashboard/EditTransactionModal";
import DeleteConfirmModal from "../components/dashboard/DeleteConfirmModal";

function Dashboard() {
  // ---------------- STATE ----------------
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalIncomeAmount, setTotalIncomeAmount] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 5;

  // Modals
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("token");

  // ---------------- GUARD ----------------
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        Authentication required. Please login again.
      </div>
    );
  }

  // ---------------- HELPERS ----------------
  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const safeError = (err, fallback) => {
    console.error(err);
    return err?.response?.data?.message || fallback;
  };

  // ---------------- FETCH FUNCTIONS ----------------
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/categories`, authHeader);
      setCategories(res.data?.data || []);
    } catch (err) {
      setError(safeError(err, "Failed to load categories"));
    }
  };

  const fetchTransactions = async () => {
    try {
      let url = `${API_URL}/api/expenses`;
      const params = new URLSearchParams();

      if (selectedCategory) params.append("category", selectedCategory);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await axios.get(url, authHeader);
      setTransactions(res.data?.data || []);
    } catch (err) {
      setError(safeError(err, "Failed to fetch transactions"));
    }
  };

  const fetchTotalMonthlyIncome = async () => {
    try {
      const d = new Date();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();

      const res = await axios.get(
        `${API_URL}/api/income/monthly?month=${month}&year=${year}`,
        authHeader
      );

      setTotalIncomeAmount(res.data?.totalIncome || 0);
    } catch (err) {
      setError(safeError(err, "Failed to load income summary"));
    }
  };

  const fetchMonthlyExpense = async () => {
    try {
      const d = new Date();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();

      const res = await axios.get(
        `${API_URL}/api/expenses/summary?month=${month}&year=${year}`,
        authHeader
      );

      setMonthlyExpense(res.data?.expense || 0);
    } catch (err) {
      setError(safeError(err, "Failed to load expense summary"));
    }
  };

  // ---------------- INITIAL LOAD (ONCE) ----------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchCategories(),
        fetchTotalMonthlyIncome(),
        fetchMonthlyExpense(),
      ]);
      setLoading(false);
    })();
  }, []);

  // ---------------- FILTER-BASED FETCH ----------------
  useEffect(() => {
    fetchTransactions();
    setCurrentPage(1);
  }, [selectedCategory, startDate, endDate]);

  // ---------------- RESET FILTERS ----------------
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  // ---------------- DERIVED DATA ----------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx?.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const currentTransactions = useMemo(() => {
    const indexOfLast = currentPage * transactionsPerPage;
    const indexOfFirst = indexOfLast - transactionsPerPage;
    return filteredTransactions.slice(indexOfFirst, indexOfLast);
  }, [filteredTransactions, currentPage]);

  // ---------------- CRUD HANDLERS ----------------
  const handleEdit = useCallback((tx) => {
    setEditingTransaction({ ...tx, date: tx.date?.split("T")[0] });
  }, []);

  const handleDeleteClick = useCallback((tx) => {
    setTransactionToDelete(tx);
    setIsDeleteModalOpen(true);
  }, []);

  const handleUpdate = async (updatedTx) => {
    try {
      await axios.put(
        `${API_URL}/api/expenses/${updatedTx._id}`,
        updatedTx,
        authHeader
      );
      setEditingTransaction(null);
      fetchTransactions();
      fetchMonthlyExpense();
    } catch (err) {
      setError(safeError(err, "Failed to update transaction"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/expenses/${id}`, authHeader);
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      fetchTransactions();
      fetchMonthlyExpense();
    } catch (err) {
      setError(safeError(err, "Failed to delete transaction"));
    }
  };

  // ---------------- UPI PAYMENT ----------------
  const upi = useUpiPayment(API_URL, token, () => {
    fetchTransactions();
    fetchMonthlyExpense();
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  // ---------------- RENDER ----------------
  return (

    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-inter">
      <Navbar />

      <div className="max-w-6xl mt-12 mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="mb-8 md:mb-12  space-y-2">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Overview of your financial activity and recent transactions.
          </p>
        </header>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-8 flex items-center justify-center gap-2 text-sm font-medium animate-fade-in-up">
            <span>⚠️</span> {error}
          </div>
        )}

        <SummaryCards
          totalIncome={totalIncomeAmount}
          totalExpense={monthlyExpense}
        />

        <ExpenseChart transactions={transactions} />

        <FiltersBar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onReset={handleResetFilters}
        />

        <TransactionsTable
          transactions={currentTransactions}
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          itemsPerPage={transactionsPerPage}
          paginate={setCurrentPage}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <FloatingActions onUpiPay={() => setIsPayModalOpen(true)} />

      <UpiPayModal
        open={isPayModalOpen}
        categories={categories}
        onClose={() => setIsPayModalOpen(false)}
        onPay={async (payload) => {
          await upi.initiatePayment(payload);
          setIsPayModalOpen(false);
        }}
      />

      <PaymentConfirmModal
        open={upi.showConfirm}
        onConfirm={upi.confirmPayment}
        onClose={() => upi.dismissConfirm()}
        confirming={upi.confirming}
      />

      <EditTransactionModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleUpdate}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        transaction={transactionToDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(transactionToDelete?._id)}
      />
    </div>
  );
}

export default Dashboard;
