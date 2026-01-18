
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Expense, View, PaymentMode, PaymentStatus } from './types';
import { ICONS, SMART_LABELS } from './constants';

const STORAGE_KEY = 'did-i-pay-expenses';
const ARCHIVE_KEY = 'did-i-pay-archive';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showUndo, setShowUndo] = useState(false);
  const lastArchivedData = useRef<Expense[]>([]);
  const undoTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setExpenses(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setExpenses([newExpense, ...expenses]);
    setView('home');
  };

  const archiveData = () => {
    if (expenses.length === 0) return;
    lastArchivedData.current = [...expenses];
    const currentArchive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...currentArchive, ...expenses]));
    setExpenses([]);
    setShowUndo(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = window.setTimeout(() => setShowUndo(false), 10000);
  };

  const undoArchive = () => {
    if (lastArchivedData.current.length > 0) {
      setExpenses(lastArchivedData.current);
      const currentArchive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
      const newArchive = currentArchive.slice(0, currentArchive.length - lastArchivedData.current.length);
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(newArchive));
      lastArchivedData.current = [];
      setShowUndo(false);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(e => 
      e.person.toLowerCase().includes(query) || 
      e.label?.toLowerCase().includes(query) ||
      e.amount.toString().includes(query) ||
      e.mode.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white overflow-hidden shadow-xl relative">
      {view === 'home' && (
        <Home 
          expenses={filteredExpenses} 
          onAddClick={() => setView('add')}
          onPersonClick={(name) => { setSelectedPerson(name); setView('person'); }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          formatTime={formatTime}
          onArchive={archiveData}
        />
      )}
      {view === 'add' && (
        <AddExpense 
          onSave={addExpense} 
          onBack={() => setView('home')} 
        />
      )}
      {view === 'person' && selectedPerson && (
        <PersonDetail 
          name={selectedPerson} 
          expenses={expenses.filter(e => e.person === selectedPerson)} 
          onBack={() => setView('home')}
          formatTime={formatTime}
        />
      )}

      {showUndo && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-sm bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between z-[60] animate-bounce-subtle">
          <span className="text-sm font-medium">History archived!</span>
          <button 
            onClick={undoArchive}
            className="text-blue-400 font-bold text-sm tracking-widest uppercase ml-4 px-2 py-1 active:opacity-50"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

const Home: React.FC<HomeProps> = ({ expenses, onAddClick, onPersonClick, searchQuery, setSearchQuery, formatTime, onArchive }) => {
  const isEndOfMonth = new Date().getDate() >= 25;
  const nudgeItem = expenses.find(e => {
    const ageInDays = (Date.now() - e.timestamp) / (1000 * 60 * 60 * 24);
    return ageInDays > 3 && ageInDays < 7;
  });

  return (
    <div className="flex flex-col h-full relative">
      <header className="px-6 pt-10 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Did I Pay?</h1>
          <p className="text-slate-500 text-sm mt-1">Memory, not math.</p>
        </div>
        {isEndOfMonth && expenses.length > 0 && (
          <button 
            onClick={() => { if(confirm("Archive current list to start fresh?")) onArchive(); }}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100 active:scale-95 transition-transform"
          >
            Archive
          </button>
        )}
      </header>

      <div className="px-6 mt-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
          <input 
            type="text" 
            placeholder="Search Rohit, 120, Chai..." 
            className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {nudgeItem && !searchQuery && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-xs font-medium text-amber-900 leading-tight">
              You paid <span className="font-bold">₹{nudgeItem.amount}</span> with {nudgeItem.person} {formatTime(nudgeItem.timestamp).toLowerCase()}. Worth checking?
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24 mt-6">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4 text-2xl">⚡️</div>
            <p className="font-medium text-slate-600">Clear mind, no debts.<br/>Tap + to add a memory.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map(expense => (
              <div 
                key={expense.id} 
                onClick={() => onPersonClick(expense.person)}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer shadow-sm hover:border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${expense.status === 'They Paid' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {expense.person[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{expense.person}</p>
                      {expense.status === 'Split' && (
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ring-1 ring-blue-100">Split</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                      <span className="max-w-[120px] truncate">{expense.label || 'No Label'}</span>
                      <span>•</span>
                      <span>{formatTime(expense.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${expense.status === 'They Paid' ? 'text-red-500' : 'text-slate-900'}`}>
                    {expense.status === 'They Paid' ? '-' : ''}₹{expense.amount}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                    {ICONS[expense.mode]}
                    {expense.mode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={onAddClick}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 ring-4 ring-white"
      >
        {ICONS.Plus}
      </button>
    </div>
  );
};

const AddExpense: React.FC<AddProps> = ({ onSave, onBack }) => {
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('I Paid');
  const [proof, setProof] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProof(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!amount || !person) return;
    onSave({
      amount: parseFloat(amount),
      person: person.trim(),
      mode,
      label: label.trim(),
      status,
      proof
    });
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="px-6 py-8 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">{ICONS.Back}</button>
        <h2 className="text-xl font-bold text-slate-900">Add Payment</h2>
      </header>

      <div className="flex-1 px-6 space-y-8 overflow-y-auto no-scrollbar pb-10">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Amount</label>
          <div className="flex items-center gap-2 border-b-2 border-slate-100 focus-within:border-blue-500 transition-colors py-2">
            <span className="text-4xl font-light text-slate-300">₹</span>
            <input 
              type="number" 
              placeholder="0" 
              autoFocus
              className="w-full text-5xl font-semibold outline-none bg-transparent"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Who Paid?</label>
          <div className="flex bg-[#F8FAFC] p-1.5 rounded-[24px] border border-[#F1F5F9] min-h-[110px]">
            {(['I Paid', 'Split', 'They Paid'] as PaymentStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 rounded-[18px] ${
                  status === s 
                  ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-[1.02] border border-[#E2E8F0]' 
                  : 'opacity-40 grayscale-[0.5]'
                }`}
              >
                <div className={`w-10 h-10 mb-2 flex items-center justify-center rounded-[10px] ${s === 'I Paid' ? 'bg-[#D1FAE5]' : s === 'Split' ? 'bg-[#DBEAFE]' : 'bg-[#FEE2E2]'}`}>
                  <span className="text-xl">{s === 'I Paid' ? '✅' : s === 'Split' ? '↔️' : '❌'}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${status === s ? (s === 'I Paid' ? 'text-[#059669]' : s === 'Split' ? 'text-[#2563EB]' : 'text-[#DC2626]') : 'text-slate-500'}`}>{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Person</label>
          <input 
            type="text" 
            placeholder="Name or Contact" 
            className="w-full text-xl font-medium py-3 border-b border-slate-100 outline-none focus:border-blue-500 transition-colors bg-transparent"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Mode</label>
          <div className="flex gap-3">
            {(['UPI', 'Cash'] as PaymentMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-semibold ${mode === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
              >
                {ICONS[m]} {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Label (Optional)</label>
          <input 
            type="text" 
            placeholder="What was this for?" 
            className="w-full text-lg font-medium py-3 border-b border-slate-100 outline-none focus:border-blue-500 transition-colors bg-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {SMART_LABELS.map(l => (
              <button 
                key={l}
                onClick={() => setLabel(l === label ? '' : l)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${label === l ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 active:bg-slate-200'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Add Proof (Screenshot)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer overflow-hidden"
          >
            {proof ? (
              <img src={proof} alt="Proof" className="w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-2xl">📸</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Tap to upload</span>
              </>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          {proof && (
            <button 
              onClick={(e) => { e.stopPropagation(); setProof(undefined); }}
              className="text-[10px] font-bold text-red-500 uppercase tracking-widest"
            >
              Remove proof
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <button 
          onClick={handleSave}
          disabled={!amount || !person}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-20 disabled:scale-100"
        >
          Save Memory
        </button>
      </div>
    </div>
  );
};

interface DetailProps {
  name: string;
  expenses: Expense[];
  onBack: () => void;
  formatTime: (ts: number) => string;
}

const PersonDetail: React.FC<DetailProps> = ({ name, expenses, onBack, formatTime }) => {
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const lastPayment = expenses[0];
  const balance = expenses.reduce((acc, curr) => {
    if (curr.status === 'They Paid') return acc - curr.amount;
    if (curr.status === 'Split') return acc + (curr.amount / 2);
    return acc + curr.amount;
  }, 0);

  const shareHistory = () => {
    const text = expenses.map(e => `${formatTime(e.timestamp)}: ₹${e.amount} - ${e.label || 'Misc'}`).join('\n');
    const header = `Memory with ${name}:\nTotal Balance: ₹${Math.abs(balance)}\n\n`;
    if (navigator.share) navigator.share({ title: `Split with ${name}`, text: header + text }).catch(() => {});
    else { navigator.clipboard.writeText(header + text); alert("Summary copied!"); }
  };

  const balanceText = balance > 0 ? `Owes you ₹${balance.toFixed(0)}` : balance < 0 ? `You owe ₹${Math.abs(balance).toFixed(0)}` : `Settled Up`;

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300 relative">
      <header className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-1 -ml-1 text-slate-800 active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-[22px] font-bold text-[#0F172A] lowercase">{name}</h2>
        </div>
        <button onClick={shareHistory} className="text-[#64748B] p-1 active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
        </button>
      </header>

      <div className="px-6 mb-10">
        <div className="bg-[#2563EB] rounded-[32px] p-8 text-white shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
          <p className="text-white/80 text-[13px] font-semibold mb-1">Net Balance</p>
          <h3 className="text-[48px] font-bold mb-6 tracking-tight leading-none">₹{Math.abs(balance).toFixed(0)}</h3>
          
          <div className="bg-white/20 inline-flex items-center px-5 py-2.5 rounded-full mb-8 backdrop-blur-sm">
            <span className="text-[15px] font-bold text-white leading-none">{balanceText}</span>
          </div>
          
          <div className="w-full h-[1px] bg-white/20 mb-6" />
          
          {lastPayment && (
            <p className="text-[13px] text-white/90 font-medium">
              Last payment: <span className="font-extrabold">₹{lastPayment.amount}</span> via {lastPayment.mode} • {formatTime(lastPayment.timestamp)}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-7 pb-10">
        <h4 className="text-[12px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-6">HISTORY</h4>
        
        <div className="space-y-8">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-[#0F172A] text-[17px] mb-1">{e.label || 'Other'}</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] text-[#94A3B8] font-semibold">{formatTime(e.timestamp)}</span>
                  <span className="text-[#E2E8F0]">|</span>
                  <div className="flex items-center gap-1.5 text-[#94A3B8]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                      {e.mode === 'UPI' ? <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/> : <rect width="20" height="12" x="2" y="6" rx="2"/>}
                    </svg>
                    <span className="text-[13px] font-bold lowercase tracking-wide">{e.mode}</span>
                  </div>
                  {e.proof && (
                    <button 
                      onClick={() => setSelectedProof(e.proof!)}
                      className="ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-100"
                    >
                      Proof 🖼️
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-[20px] font-black tracking-tight ${e.status === 'They Paid' ? 'text-[#EF4444]' : (e.status === 'Split' ? 'text-[#3B82F6]' : 'text-[#0F172A]')}`}>
                  ₹{e.amount}
                </p>
                <div className="mt-1 flex justify-end">
                  {e.status === 'Split' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EFF6FF] text-[#3B82F6] text-[9px] font-black uppercase tracking-widest ring-1 ring-blue-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/></svg>
                      SPLIT
                    </span>
                  ) : (
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 block leading-none ${e.status === 'They Paid' ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`}>
                      {e.status === 'I Paid' ? 'I PAID' : 'THEY PAID'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProof && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-xl"
          onClick={() => setSelectedProof(null)}
        >
          <img src={selectedProof} alt="Screenshot Proof" className="max-w-full max-h-full rounded-[24px] shadow-2xl border border-white/10" />
          <button className="absolute top-12 right-6 w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white text-3xl font-light hover:bg-white/20 transition-colors">&times;</button>
        </div>
      )}
    </div>
  );
};

interface HomeProps {
  expenses: Expense[];
  onAddClick: () => void;
  onPersonClick: (name: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  formatTime: (ts: number) => string;
  onArchive: () => void;
}

interface AddProps {
  onSave: (expense: Omit<Expense, 'id' | 'timestamp'>) => void;
  onBack: () => void;
}
