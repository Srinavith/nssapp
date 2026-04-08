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

// --- Fuzzy Search Helpers ---

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const jaroWinkler = (s1: string, s2: string): number => {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
};

const scoreName = (query: string, candidate: string): number => {
  const q = normalize(query);
  const c = normalize(candidate);

  if (c === q) return 1;
  if (c.startsWith(q) || q.startsWith(c)) return 0.97;

  const fullScore = jaroWinkler(q, c);

  const qTokens = q.split(' ');
  const cTokens = c.split(' ');
  let tokenScore = 0;
  for (const qt of qTokens) {
    for (const ct of cTokens) {
      tokenScore = Math.max(tokenScore, jaroWinkler(qt, ct));
    }
  }

  return Math.max(fullScore, tokenScore * 0.88);
};

// --- Matrix Rain Background ---

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
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:"<>?~`日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ'.split('');
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
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
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

// --- Decrypting Reveal ---

const DecryptingReveal = ({ result }: { result: Volunteer }) => {
  const [displayHours, setDisplayHours] = useState<string | number>('000');
  const [displayRank, setDisplayRank] = useState<string | number>('00');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let scrambleInterval: NodeJS.Timeout;

    if (phase === 0) {
      scrambleInterval = setInterval(() => {
        setDisplayHours(Math.floor(Math.random() * 999).toString().padStart(3, '0'));
        setDisplayRank(Math.floor(Math.random() * 99).toString().padStart(2, '0'));
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
          [BATCH_DATA: {result.batch}]{result.regNo && ` [ID: ${result.regNo}]`}
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

// --- Main Component ---

export default function NSSHoursTracker() {
  const [data24, setData24] = useState<Volunteer[]>([]);
  const [data25, setData25] = useState<Volunteer[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Volunteer | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
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
        if (index > 0 && item.total < parsed[index - 1].total) {
          currentRank = index + 1;
        }
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

        const parsed24 = Papa.parse(res24, { skipEmptyLines: true }).data;
        const parsed25 = Papa.parse(res25, { skipEmptyLines: true }).data;

        setData24(processData(parsed24, false, '2024-2026'));
        setData25(processData(parsed25, true, '2025-2027'));
        setLoading(false);
      } catch (err) {
        console.error('Error loading CSVs.', err);
      }
    };

    fetchCSVs();
  }, []);

  const handleSearch = (e: FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const searchQuery = (overrideQuery || query).trim();
    if (!searchQuery) return;

    setResult(null);
    setSuggestion(null);

    const isRegNo = /^\d{6,}$/.test(searchQuery);

    if (isRegNo) {
      const match = data25.find(v => v.regNo === searchQuery);
      if (match) {
        setResult(match);
      } else {
        setSuggestion('ERR_NOT_FOUND: Check registration sequence.');
      }
      return;
    }

    // Name search — data24 only
    const normQuery = normalize(searchQuery);

    const exact = data24.find(v => normalize(v.name) === normQuery);
    if (exact) {
      setResult(exact);
      return;
    }

    if (normQuery.length >= 3) {
      const startsWith = data24.find(v => normalize(v.name).startsWith(normQuery));
      if (startsWith) {
        setResult(startsWith);
        return;
      }
    }

    const scored = data24
      .map(v => ({ volunteer: v, score: scoreName(searchQuery, v.name) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];

    if (best.score >= 0.82) {
      setResult(best.volunteer);
    } else if (best.score >= 0.60) {
      setSuggestion(best.volunteer.name);
    } else {
      setSuggestion('ERR_NOT_FOUND: No matching operative.');
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
          {suggestion &&
            suggestion !== 'ERR_NOT_FOUND: Check registration sequence.' &&
            suggestion !== 'ERR_NOT_FOUND: No matching operative.' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-black border border-yellow-500/50 text-yellow-500 text-xs flex flex-col sm:flex-row items-center justify-between"
              >
                <span>
                  SYS_SUGGESTION: Did you mean [<strong>{suggestion}</strong>]?
                </span>
                <button
                  onClick={e => {
                    setQuery(suggestion);
                    handleSearch(e, suggestion);
                  }}
                  className="mt-2 sm:mt-0 px-4 py-1.5 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black transition-colors font-bold uppercase"
                >
                  EXECUTE
                </button>
              </motion.div>
            )}

          {suggestion &&
            (suggestion === 'ERR_NOT_FOUND: Check registration sequence.' ||
              suggestion === 'ERR_NOT_FOUND: No matching operative.') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-left text-red-500 text-xs uppercase border-l-2 border-red-500 pl-2 bg-red-950/20 py-2"
              >
                {suggestion}
              </motion.div>
            )}

          {result && <DecryptingReveal key={result.name} result={result} />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}