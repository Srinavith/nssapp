'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, Cpu, Unlock } from 'lucide-react';

interface Volunteer {
  name: string;
  regNo?: string;
  total: number;
  rank: number;
  batch: string;
}

// ─── Search Utilities ────────────────────────────────────────────────────────

/** Normalise a string: lowercase, collapse whitespace, strip punctuation */
const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Bigram set similarity (Sørensen–Dice) — good for name transpositions */
function bigramSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set: string[] = [];
    for (let i = 0; i < s.length - 1; i++) set.push(s.slice(i, i + 2));
    return set;
  };
  const bg1 = bigrams(a);
  const bg2 = bigrams(b);
  if (!bg1.length || !bg2.length) return 0;
  const set2 = new Set(bg2);
  const hits = bg1.filter(b => set2.has(b)).length;
  return (2 * hits) / (bg1.length + bg2.length);
}

/**
 * Multi-strategy search across a volunteer list.
 *
 * Priority order:
 *  1. Exact match (normalised)
 *  2. Every query token appears in the name (e.g. "raj kumar" ↔ "kumar raj")
 *  3. Name starts with query (prefix)
 *  4. Name contains query as a substring
 *  5. Any single query token matches a name token exactly
 *  6. Fuzzy: combined Levenshtein + bigram score
 *
 * Returns { match, isFuzzy } — match is null if nothing good was found.
 */
function smartSearch(
  query: string,
  volunteers: Volunteer[]
): { match: Volunteer | null; isFuzzy: boolean; suggestion: string | null } {
  const q = normalise(query);
  const qTokens = q.split(' ').filter(Boolean);

  // 1. Exact match
  const exact = volunteers.find(v => normalise(v.name) === q);
  if (exact) return { match: exact, isFuzzy: false, suggestion: null };

  // 2. All tokens present (order-independent full name match)
  const tokenAll = volunteers.find(v => {
    const vTokens = normalise(v.name).split(' ');
    return qTokens.every(t => vTokens.includes(t));
  });
  if (tokenAll) return { match: tokenAll, isFuzzy: false, suggestion: null };

  // 3. Prefix match
  const prefix = volunteers.find(v => normalise(v.name).startsWith(q));
  if (prefix) return { match: prefix, isFuzzy: false, suggestion: null };

  // 4. Substring match
  const substr = volunteers.find(v => normalise(v.name).includes(q));
  if (substr) return { match: substr, isFuzzy: false, suggestion: null };

  // 5. Any query token matches any name token exactly
  const tokenAny = volunteers.find(v => {
    const vTokens = normalise(v.name).split(' ');
    return qTokens.some(t => vTokens.includes(t));
  });
  if (tokenAny) return { match: tokenAny, isFuzzy: false, suggestion: null };

  // 6. Fuzzy scoring
  type Scored = { volunteer: Volunteer; score: number };
  const scored: Scored[] = volunteers.map(v => {
    const vn = normalise(v.name);
    const vTokens = vn.split(' ');

    // Best bigram similarity across all token pairs
    let bestBigram = bigramSimilarity(q, vn);
    for (const qt of qTokens)
      for (const vt of vTokens)
        bestBigram = Math.max(bestBigram, bigramSimilarity(qt, vt));

    // Levenshtein similarity (1 − normalised distance)
    const maxLen = Math.max(q.length, vn.length) || 1;
    const levSim = 1 - levenshtein(q, vn) / maxLen;

    // Best token-level Levenshtein
    let bestTokenLev = 0;
    for (const qt of qTokens)
      for (const vt of vTokens) {
        const tMax = Math.max(qt.length, vt.length) || 1;
        bestTokenLev = Math.max(bestTokenLev, 1 - levenshtein(qt, vt) / tMax);
      }

    const score = 0.4 * bestBigram + 0.3 * levSim + 0.3 * bestTokenLev;
    return { volunteer: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Only suggest if confidence is reasonable
  if (best && best.score >= 0.45) {
    return { match: null, isFuzzy: true, suggestion: best.volunteer.name };
  }

  return { match: null, isFuzzy: false, suggestion: null };
}

// ─── Matrix Rain ─────────────────────────────────────────────────────────────

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:"<>?~`日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ'.split(
        ''
      );
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975)
          drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 opacity-40 pointer-events-none"
    />
  );
};

// ─── Decrypting Reveal ────────────────────────────────────────────────────────

const DecryptingReveal = ({ result }: { result: Volunteer }) => {
  const [displayHours, setDisplayHours] = useState<string | number>('000');
  const [displayRank, setDisplayRank] = useState<string | number>('00');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let scrambleInterval: NodeJS.Timeout;

    if (phase === 0) {
      scrambleInterval = setInterval(() => {
        setDisplayHours(
          Math.floor(Math.random() * 999)
            .toString()
            .padStart(3, '0')
        );
        setDisplayRank(
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, '0')
        );
      }, 50);

      setTimeout(() => {
        clearInterval(scrambleInterval);
        setPhase(1);
      }, 2000);
    } else if (phase === 1) {
      setDisplayHours(result.total);
      setDisplayRank(result.rank);

      if (result.total >= 300) {
        triggerMatrixConfetti(100, 3);
      } else if (result.total >= 200) {
        triggerMatrixConfetti(50, 1);
      }
    }

    return () => clearInterval(scrambleInterval);
  }, [phase, result]);

  const triggerMatrixConfetti = (particleCount: number, bursts: number) => {
    const colors = ['#00FF00', '#003300', '#33FF33', '#FFFFFF'];
    let count = 0;
    const interval = setInterval(() => {
      confetti({ particleCount, spread: 100, origin: { y: 0.6 }, colors });
      count++;
      if (count >= bursts) clearInterval(interval);
    }, 500);
  };

  return (
    <div className="mt-8 border-2 border-green-500/50 bg-black/80 p-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.2)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10 opacity-50" />

      <div className="relative z-20 font-mono">
        <div className="flex items-center gap-2 text-green-400 mb-4 border-b border-green-500/30 pb-2">
          {phase === 0 ? (
            <Unlock className="h-5 w-5 animate-pulse" />
          ) : (
            <ShieldAlert className="h-5 w-5" />
          )}
          <span className="text-xs tracking-widest">
            {phase === 0 ? '> DECRYPTING_IDENTITY...' : '> CLEARANCE_GRANTED'}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-green-400 mb-1 drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] uppercase">
          {phase === 0
            ? result.name.replace(/[a-zA-Z]/g, () =>
                String.fromCharCode(Math.floor(Math.random() * 26) + 65)
              )
            : result.name}
        </h2>
        <p className="text-green-600/80 text-sm mb-6">
          [BATCH_DATA: {result.batch}]{' '}
          {result.regNo && `[ID: ${result.regNo}]`}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-green-500/30 p-4 bg-green-950/20 flex flex-col items-center">
            <Cpu className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-4xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(0,255,0,1)]">
              {displayHours}
            </span>
            <span className="text-[10px] text-green-600 uppercase tracking-widest mt-2">
              SYS_HOURS
            </span>
          </div>

          <div className="border border-green-500/30 p-4 bg-green-950/20 flex flex-col items-center">
            <Terminal className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-4xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(0,255,0,1)]">
              {typeof displayRank === 'number' ? `#${displayRank}` : displayRank}
            </span>
            <span className="text-[10px] text-green-600 uppercase tracking-widest mt-2">
              GLOBAL_RANK
            </span>
          </div>
        </div>

        {phase === 1 && result.total >= 300 && (
          <div className="animate-pulse bg-green-500 text-black px-4 py-2 text-center text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,255,0,0.6)]">
            WARNING: GOD-TIER VOLUNTEER DETECTED
          </div>
        )}
        {phase === 1 && result.total >= 200 && result.total < 300 && (
          <div className="bg-green-900/50 border border-green-500 text-green-400 px-4 py-2 text-center text-xs font-bold tracking-widest uppercase">
            STATUS: ELITE OPERATIVE CONFIRMED
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NSSHoursTracker() {
  const [data24, setData24] = useState<Volunteer[]>([]);
  const [data25, setData25] = useState<Volunteer[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Volunteer | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processData = (
      data: any[],
      hasRegNo: boolean,
      batchName: string
    ): Volunteer[] => {
      const parsed: Volunteer[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = Object.values(data[i]);
        if (!row || !row[0] || (row[0] as string).trim() === '') continue;

        const name = (row[0] as string).trim();
        const regNo = hasRegNo ? (row[1] as string)?.trim() : undefined;
        let total = parseInt(row[row.length - 1] as string, 10);
        if (isNaN(total)) total = 0;

        parsed.push({ name, regNo, total, rank: 0, batch: batchName });
      }

      parsed.sort((a, b) => b.total - a.total);
      let currentRank = 1;
      parsed.forEach((item, index) => {
        if (index > 0 && item.total < parsed[index - 1].total)
          currentRank = index + 1;
        item.rank = currentRank;
      });
      return parsed;
    };

    const fetchCSVs = async () => {
      try {
        const [res24, res25] = await Promise.all([
          fetch('/batch24.csv').then(r => r.text()),
          fetch('/batch25.csv').then(r => r.text()),
        ]);
        setData24(
          processData(Papa.parse(res24, { skipEmptyLines: true }).data, false, '2024-2026')
        );
        setData25(
          processData(Papa.parse(res25, { skipEmptyLines: true }).data, true, '2025-2027')
        );
        setLoading(false);
      } catch (err) {
        console.error('Error loading CSVs.', err);
      }
    };

    fetchCSVs();
  }, []);

  const handleSearch = (e: FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const searchQuery = (overrideQuery ?? query).trim();
    if (!searchQuery) return;

    setResult(null);
    setSuggestion(null);
    setNotFound(false);

    const isRegNo = /^\d{6,}$/.test(searchQuery);

    if (isRegNo) {
      // Reg-number lookup: only batch25 has reg nos
      const match = data25.find(v => v.regNo === searchQuery);
      if (match) {
        setResult(match);
      } else {
        setNotFound(true);
      }
      return;
    }

    // Name search across BOTH batches
    const allVolunteers = [...data24, ...data25];
    const { match, isFuzzy, suggestion: fuzzyName } = smartSearch(searchQuery, allVolunteers);

    if (match) {
      setResult(match);
    } else if (isFuzzy && fuzzyName) {
      setSuggestion(fuzzyName);
    } else {
      setNotFound(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-green-500 font-mono">
        <span className="animate-pulse">{'>'} INITIALIZING_MAINFRAME...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500 flex flex-col items-center justify-center p-4 font-mono overflow-hidden relative selection:bg-green-500 selection:text-black">
      <MatrixRain />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="z-10 w-full max-w-lg backdrop-blur-sm"
      >
        <div className="text-left mb-8 border-l-4 border-green-500 pl-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2 drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] uppercase">
            NSS_Database_v2.0
          </h1>
          <p className="text-green-700 text-xs md:text-sm tracking-widest uppercase">
            Awaiting input sequence (RegNo or Name)...
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative group flex flex-col gap-2"
        >
          <div className="flex bg-black border border-green-500/50 shadow-[0_0_10px_rgba(0,255,0,0.1)] focus-within:shadow-[0_0_15px_rgba(0,255,0,0.4)] transition-shadow">
            <div className="bg-green-950/30 px-3 md:px-4 flex items-center justify-center border-r border-green-500/50 text-green-500 font-bold">
              {'>_'}
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ENTER_QUERY..."
              className="w-full bg-transparent py-4 px-3 md:px-4 text-green-400 placeholder-green-800 focus:outline-none uppercase min-w-0"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-4 md:px-6 bg-green-950/50 text-green-500 hover:bg-green-500 hover:text-black border-l border-green-500/50 font-bold tracking-widest transition-colors flex items-center justify-center text-xs md:text-sm"
            >
              EXECUTE
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {/* Fuzzy suggestion */}
          {suggestion && (
            <motion.div
              key="suggestion"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-black border border-yellow-500/50 text-yellow-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2"
            >
              <span>
                SYS_SUGGESTION: Did you mean [<strong>{suggestion}</strong>]?
              </span>
              <button
                onClick={e => {
                  setQuery(suggestion);
                  handleSearch(e, suggestion);
                }}
                className="px-4 py-1.5 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black transition-colors font-bold uppercase whitespace-nowrap"
              >
                EXECUTE
              </button>
            </motion.div>
          )}

          {/* Not found */}
          {notFound && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-left text-red-500 text-xs uppercase border-l-2 border-red-500 pl-2 bg-red-950/20 py-2"
            >
              ERR_NOT_FOUND: No matching operative in database.
            </motion.div>
          )}

          {/* Result */}
          {result && <DecryptingReveal key={result.name} result={result} />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}