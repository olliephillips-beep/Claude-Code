import { useState, useEffect, useCallback } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CATEGORIES = [
  { id: "rent", label: "Rent & Bills", icon: "🏠", color: "#E8927C" },
  { id: "food", label: "Food & Drink", icon: "🍽", color: "#7CBA6B" },
  { id: "social", label: "Social & Entertainment", icon: "🎶", color: "#6BA4D9" },
  { id: "savings", label: "Savings & Pension", icon: "💰", color: "#D4A843" },
];

const DEFAULT_BUDGETS = { rent: 1800, food: 600, social: 400, savings: 500 };

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(actual, budget) {
  if (!budget) return 0;
  return Math.min(Math.round((actual / budget) * 100), 150);
}

// Storage helpers using localStorage fallback
function loadData() {
  try {
    const raw = localStorage.getItem("budget-tracker-data");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(data) {
  try {
    localStorage.setItem("budget-tracker-data", JSON.stringify(data));
  } catch (e) { console.error("Save failed", e); }
}

function getMonthKey(year, month) { return `${year}-${month}`; }

export default function BudgetTracker() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);
  const [actuals, setActuals] = useState({});
  const [transactions, setTransactions] = useState({});
  const [editingBudget, setEditingBudget] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [addingTo, setAddingTo] = useState(null);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnNote, setTxnNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("overview");
  const [detailCat, setDetailCat] = useState(null);
  const [income, setIncome] = useState(0);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeVal, setIncomeVal] = useState("");

  const mk = getMonthKey(year, month);

  useEffect(() => {
    const d = loadData();
    if (d) {
      if (d.budgets) setBudgets(d.budgets);
      if (d.actuals) setActuals(d.actuals);
      if (d.transactions) setTransactions(d.transactions);
      if (d.income) setIncome(d.income);
    }
    setLoaded(true);
  }, []);

  const persist = useCallback(() => {
    if (loaded) saveData({ budgets, actuals, transactions, income });
  }, [budgets, actuals, transactions, income, loaded]);

  useEffect(() => { persist(); }, [persist]);

  const monthActuals = actuals[mk] || {};
  const monthTxns = transactions[mk] || {};

  const totalBudget = CATEGORIES.reduce((s, c) => s + (budgets[c.id] || 0), 0);
  const totalSpent = CATEGORIES.reduce((s, c) => s + (monthActuals[c.id] || 0), 0);
  const remaining = (income || totalBudget) - totalSpent;

  function addTransaction(catId) {
    const amt = parseFloat(txnAmount);
    if (!amt || isNaN(amt)) return;
    const newActuals = { ...actuals, [mk]: { ...monthActuals, [catId]: (monthActuals[catId] || 0) + amt } };
    const txn = { amount: amt, note: txnNote || "", date: new Date().toISOString() };
    const catTxns = [...(monthTxns[catId] || []), txn];
    const newTxns = { ...transactions, [mk]: { ...monthTxns, [catId]: catTxns } };
    setActuals(newActuals);
    setTransactions(newTxns);
    setTxnAmount("");
    setTxnNote("");
    setAddingTo(null);
  }

  function removeTxn(catId, idx) {
    const catTxns = [...(monthTxns[catId] || [])];
    const removed = catTxns.splice(idx, 1)[0];
    const newTxns = { ...transactions, [mk]: { ...monthTxns, [catId]: catTxns } };
    const newAmt = Math.max(0, (monthActuals[catId] || 0) - removed.amount);
    const newActuals = { ...actuals, [mk]: { ...monthActuals, [catId]: newAmt } };
    setActuals(newActuals);
    setTransactions(newTxns);
  }

  function saveBudget(catId) {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val >= 0) setBudgets({ ...budgets, [catId]: val });
    setEditingBudget(null);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  if (!loaded) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>Budget</h1>
          <span style={styles.titleAccent}>Tracker</span>
        </div>
        <div style={styles.monthNav}>
          <button style={styles.navBtn} onClick={prevMonth}>←</button>
          <span style={styles.monthLabel}>{MONTHS[month]} {year}</span>
          <button style={styles.navBtn} onClick={nextMonth}>→</button>
        </div>
      </div>

      {/* Income bar */}
      <div style={styles.incomeBar}>
        <span style={styles.incomeLabel}>Monthly income</span>
        {editingIncome ? (
          <div style={styles.inlineEdit}>
            <input
              style={styles.inlineInput}
              type="number"
              value={incomeVal}
              onChange={e => setIncomeVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { const v = parseFloat(incomeVal); if (!isNaN(v)) setIncome(v); setEditingIncome(false); }
                if (e.key === "Escape") setEditingIncome(false);
              }}
              autoFocus
            />
            <button style={styles.saveSmall} onClick={() => { const v = parseFloat(incomeVal); if (!isNaN(v)) setIncome(v); setEditingIncome(false); }}>✓</button>
          </div>
        ) : (
          <span style={styles.incomeValue} onClick={() => { setIncomeVal(String(income)); setEditingIncome(true); }}>
            {income ? fmt(income) : "Tap to set"} ✎
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Budget</div>
          <div style={styles.summaryValue}>{fmt(totalBudget)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Spent</div>
          <div style={{ ...styles.summaryValue, color: totalSpent > totalBudget ? "#E8927C" : "#7CBA6B" }}>{fmt(totalSpent)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Remaining</div>
          <div style={{ ...styles.summaryValue, color: remaining < 0 ? "#E8927C" : "#D4A843" }}>{fmt(remaining)}</div>
        </div>
      </div>

      {/* Category cards */}
      {view === "overview" && (
        <div style={styles.catGrid}>
          {CATEGORIES.map(cat => {
            const budget = budgets[cat.id] || 0;
            const actual = monthActuals[cat.id] || 0;
            const p = pct(actual, budget);
            const over = actual > budget;
            return (
              <div key={cat.id} style={styles.catCard}>
                <div style={styles.catHeader}>
                  <div style={styles.catIcon}>{cat.icon}</div>
                  <div style={styles.catInfo}>
                    <div style={styles.catLabel}>{cat.label}</div>
                    {editingBudget === cat.id ? (
                      <div style={styles.inlineEdit}>
                        <input
                          style={styles.inlineInputSmall}
                          type="number"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveBudget(cat.id); if (e.key === "Escape") setEditingBudget(null); }}
                          autoFocus
                        />
                        <button style={styles.saveSmall} onClick={() => saveBudget(cat.id)}>✓</button>
                      </div>
                    ) : (
                      <div style={styles.budgetLabel} onClick={() => { setEditVal(String(budget)); setEditingBudget(cat.id); }}>
                        Budget: {fmt(budget)} ✎
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.progressTrack}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(p, 100)}%`,
                    backgroundColor: over ? "#E8927C" : cat.color,
                  }} />
                  {over && (
                    <div style={{
                      ...styles.progressOver,
                      width: `${Math.min(p - 100, 50)}%`,
                      left: "100%",
                    }} />
                  )}
                </div>

                <div style={styles.catFooter}>
                  <span style={{ color: over ? "#E8927C" : "#ccc" }}>{fmt(actual)} <span style={{ color: "#666" }}>/ {fmt(budget)}</span></span>
                  <span style={{ color: "#666", fontSize: 13 }}>{p}%</span>
                </div>

                <div style={styles.catActions}>
                  <button style={{ ...styles.addBtn, borderColor: cat.color, color: cat.color }} onClick={() => { setAddingTo(addingTo === cat.id ? null : cat.id); setTxnAmount(""); setTxnNote(""); }}>
                    {addingTo === cat.id ? "Cancel" : "+ Add"}
                  </button>
                  <button style={styles.detailBtn} onClick={() => { setDetailCat(cat.id); setView("detail"); }}>
                    View →
                  </button>
                </div>

                {addingTo === cat.id && (
                  <div style={styles.txnForm}>
                    <input style={styles.txnInput} type="number" placeholder="Amount" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} autoFocus />
                    <input style={styles.txnInput} type="text" placeholder="Note (optional)" value={txnNote} onChange={e => setTxnNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTransaction(cat.id); }} />
                    <button style={{ ...styles.txnSubmit, backgroundColor: cat.color }} onClick={() => addTransaction(cat.id)}>Add</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && detailCat && (() => {
        const cat = CATEGORIES.find(c => c.id === detailCat);
        const txns = monthTxns[detailCat] || [];
        return (
          <div style={styles.detailView}>
            <button style={styles.backBtn} onClick={() => setView("overview")}>← Back</button>
            <div style={styles.detailHeader}>
              <span style={{ fontSize: 28 }}>{cat.icon}</span>
              <h2 style={styles.detailTitle}>{cat.label}</h2>
            </div>
            <div style={styles.detailSummary}>
              <span>Spent: <b style={{ color: cat.color }}>{fmt(monthActuals[detailCat] || 0)}</b></span>
              <span>Budget: <b>{fmt(budgets[detailCat] || 0)}</b></span>
            </div>
            {txns.length === 0 ? (
              <div style={styles.emptyTxn}>No transactions yet this month.</div>
            ) : (
              <div style={styles.txnList}>
                {txns.map((t, i) => (
                  <div key={i} style={styles.txnRow}>
                    <div style={styles.txnInfo}>
                      <span style={styles.txnAmountLabel}>{fmt(t.amount)}</span>
                      {t.note && <span style={styles.txnNoteLabel}>{t.note}</span>}
                    </div>
                    <div style={styles.txnMeta}>
                      <span style={styles.txnDate}>{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <button style={styles.txnDelete} onClick={() => removeTxn(detailCat, i)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div style={styles.footer}>
        <span style={{ color: "#555", fontSize: 12 }}>Data saves automatically across sessions</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
    maxWidth: 540,
    margin: "0 auto",
    padding: "24px 16px",
    color: "#E8E4DF",
    minHeight: "100vh",
  },
  loading: { textAlign: "center", padding: 60, color: "#888", fontSize: 16 },
  header: { marginBottom: 20 },
  titleRow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 },
  title: { margin: 0, fontSize: 32, fontWeight: 700, color: "#F0ECE6", letterSpacing: "-0.5px" },
  titleAccent: { fontSize: 32, fontWeight: 300, color: "#7CBA6B", letterSpacing: "-0.5px" },
  monthNav: { display: "flex", alignItems: "center", gap: 16 },
  navBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#ccc", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16,
  },
  monthLabel: { fontSize: 18, fontWeight: 500, color: "#ccc", minWidth: 100, textAlign: "center" },
  incomeBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 12,
    marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)",
  },
  incomeLabel: { fontSize: 14, color: "#888" },
  incomeValue: { fontSize: 15, color: "#D4A843", cursor: "pointer" },
  summaryRow: { display: "flex", gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, padding: "14px 12px", background: "rgba(255,255,255,0.04)",
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center",
  },
  summaryLabel: { fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: 600, color: "#E8E4DF" },
  catGrid: { display: "flex", flexDirection: "column", gap: 14 },
  catCard: {
    padding: "18px 16px", background: "rgba(255,255,255,0.03)",
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)",
  },
  catHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  catIcon: { fontSize: 28, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", borderRadius: 10 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  budgetLabel: { fontSize: 13, color: "#777", cursor: "pointer" },
  progressTrack: {
    position: "relative", height: 8, background: "rgba(255,255,255,0.08)",
    borderRadius: 4, overflow: "visible", marginBottom: 10,
  },
  progressFill: { height: "100%", borderRadius: 4, transition: "width 0.4s ease" },
  progressOver: { position: "absolute", top: 0, height: "100%", background: "rgba(232,146,124,0.4)", borderRadius: "0 4px 4px 0" },
  catFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 14 },
  catActions: { display: "flex", gap: 8 },
  addBtn: {
    background: "transparent", border: "1px solid", borderRadius: 8,
    padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500,
  },
  detailBtn: {
    background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13,
    color: "#888",
  },
  txnForm: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  txnInput: {
    flex: 1, minWidth: 100, padding: "8px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#E8E4DF", fontSize: 14, outline: "none",
  },
  txnSubmit: {
    padding: "8px 18px", borderRadius: 8, border: "none",
    color: "#1a1a1a", fontWeight: 600, cursor: "pointer", fontSize: 14,
  },
  inlineEdit: { display: "flex", gap: 6, alignItems: "center" },
  inlineInput: {
    width: 100, padding: "4px 8px", borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
    color: "#E8E4DF", fontSize: 14, outline: "none",
  },
  inlineInputSmall: {
    width: 80, padding: "3px 6px", borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
    color: "#E8E4DF", fontSize: 13, outline: "none",
  },
  saveSmall: {
    background: "rgba(124,186,107,0.2)", border: "1px solid rgba(124,186,107,0.3)",
    color: "#7CBA6B", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13,
  },
  detailView: {},
  backBtn: {
    background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
    color: "#888", borderRadius: 8, padding: "6px 14px", cursor: "pointer",
    fontSize: 13, marginBottom: 16,
  },
  detailHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  detailTitle: { margin: 0, fontSize: 22, fontWeight: 600 },
  detailSummary: { display: "flex", gap: 24, marginBottom: 20, fontSize: 15, color: "#aaa" },
  emptyTxn: { color: "#666", fontSize: 14, textAlign: "center", padding: 30 },
  txnList: { display: "flex", flexDirection: "column", gap: 8 },
  txnRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  txnInfo: { display: "flex", flexDirection: "column", gap: 2 },
  txnAmountLabel: { fontSize: 15, fontWeight: 600 },
  txnNoteLabel: { fontSize: 13, color: "#777" },
  txnMeta: { display: "flex", alignItems: "center", gap: 10 },
  txnDate: { fontSize: 12, color: "#666" },
  txnDelete: {
    background: "rgba(232,146,124,0.15)", border: "none", color: "#E8927C",
    borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12,
  },
  footer: { textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" },
};
