'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import stringSimilarity from 'string-similarity';
import { Terminal, ShieldAlert, Cpu, Unlock } from 'lucide-react';

interface Volunteer {
  name: string;
  regNo?: string;
  total: number;
  rank: number;
  batch: string;
}

// Matrix Digital Rain Background Component
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:"<>?~`日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ'.split('');
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

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />;
};

// Suspenseful Decrypting Component
const DecryptingReveal = ({ result }: { result: Volunteer }) => {
  const [displayHours, setDisplayHours] = useState<string | number>('000');
  const [displayRank, setDisplayRank] = useState<string | number>('00');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let scrambleInterval: NodeJS.Timeout;
    
    // Phase 0: Scrambling
    if (phase === 0) {
      scrambleInterval = setInterval(() => {
        setDisplayHours(Math.floor(Math.random() * 999).toString().padStart(3, '0'));
        setDisplayRank(Math.floor(Math.random() * 99).toString().padStart(2, '0'));
      }, 50);

      setTimeout(() => {
        clearInterval(scrambleInterval);
        setPhase(1);
      }, 2000); // 2 seconds of suspense
    } 
    // Phase 1: Reveal
    else if (phase === 1) {
      setDisplayHours(result.total);
      setDisplayRank(result.rank);
      
      // Trigger Matrix-colored Confetti for high achievers
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
      confetti({
        particleCount,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors,
        fontFamily: 'monospace'
      });
      count++;
      if (count >= bursts) clearInterval(interval);
    }, 500);
  };

  return (
    <div className="mt-8 border-2 border-green-500/50 bg-black/80 p-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.2)]">
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10 opacity-50" />
      
      <div className="relative z-20 font-mono">
        <div className="flex items-center gap-2 text-green-400 mb-4 border-b border-green-500/30 pb-2">
          {phase === 0 ? <Unlock className="h-5 w-5 animate-pulse" /> : <ShieldAlert className="h-5 w-5" />}
          <span className="text-xs tracking-widest">
            {phase === 0 ? '> DECRYPTING_IDENTITY...' : '> CLEARANCE_GRANTED'}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-green-400 mb-1 drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] uppercase">
          {phase === 0 ? result.name.replace(/[a-zA-Z]/g, () => String.fromCharCode(Math.floor(Math.random() * 26) + 65)) : result.name}
        </h2>
        <p className="text-green-600/80 text-sm mb-6">
          [BATCH_DATA: {result.batch}] {result.regNo && `[ID: ${result.regNo}]`}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-green-500/30 p-4 bg-green-950/20 flex flex-col items-center">
            <Cpu className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-4xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(0,255,0,1)]">
              {displayHours}
            </span>
            <span className="text-[10px] text-green-600 uppercase tracking-widest mt-2">SYS_HOURS</span>
          </div>
          
          <div className="border border-green-500/30 p-4 bg-green-950/20 flex flex-col items-center">
            <Terminal className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-4xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(0,255,0,1)]">
              {typeof displayRank === 'number' ? `#${displayRank}` : displayRank}
            </span>
            <span className="text-[10px] text-green-600 uppercase tracking-widest mt-2">GLOBAL_RANK</span>
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


export default function NSSHoursTracker() {
  const [data24, setData24] = useState<Volunteer[]>([]);
  const [data25, setData25] = useState<Volunteer[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Volunteer | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse and process CSV data
  useEffect(() => {
    const processData = (data: any[], hasRegNo: boolean, batchName: string) => {
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
          fetch('/batch25.csv').then(r => r.text())
        ]);

        const parsed24 = Papa.parse(res24, { skipEmptyLines: true }).data;
        const parsed25 = Papa.parse(res25, { skipEmptyLines: true }).data;

        setData24(processData(parsed24, false, '2024-2026'));
        setData25(processData(parsed25, true, '2025-2027'));
        setLoading(false);
      } catch (err) {
        console.error("Error loading CSVs.", err);
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

    const isNumeric = /^\d+$/.test(searchQuery) && searchQuery.length > 5;

    if (isNumeric) {
      const match = data25.find(v => v.regNo === searchQuery);
      if (match) {
        setResult(match);
      } else {
        setSuggestion("ERR_NOT_FOUND: Check registration sequence.");
      }
    } else {
      const exactMatch = data24.find(v => v.name.toLowerCase() === searchQuery.toLowerCase());
      
      if (exactMatch) {
        setResult(exactMatch);
      } else {
        const namesList = data24.map(v => v.name);
        const matches = stringSimilarity.findBestMatch(searchQuery, namesList);
        
        if (matches.bestMatch.rating > 0.4) {
          setSuggestion(matches.bestMatch.target);
        } else {
          setSuggestion("ERR_NOT_FOUND: No matching operative.");
        }
      }
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

        <form onSubmit={handleSearch} className="relative group flex flex-col gap-2">
          <div className="flex bg-black border border-green-500/50 shadow-[0_0_10px_rgba(0,255,0,0.1)] focus-within:shadow-[0_0_15px_rgba(0,255,0,0.4)] transition-shadow">
            <div className="bg-green-950/30 px-4 flex items-center justify-center border-r border-green-500/50 text-green-500">
              {'>_'}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ENTER_QUERY..."
              className="w-full bg-transparent py-4 px-4 text-green-400 placeholder-green-800 focus:outline-none uppercase"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="hidden" />
        </form>

        <AnimatePresence mode="wait">
          {suggestion && suggestion !== "ERR_NOT_FOUND: Check registration sequence." && suggestion !== "ERR_NOT_FOUND: No matching operative." && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-black border border-yellow-500/50 text-yellow-500 text-xs flex flex-col sm:flex-row items-center justify-between"
            >
              <span>SYS_SUGGESTION: Did you mean [<strong>{suggestion}</strong>]?</span>
              <button 
                onClick={(e) => {
                  setQuery(suggestion);
                  handleSearch(e, suggestion);
                }}
                className="mt-2 sm:mt-0 px-4 py-1.5 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black transition-colors font-bold uppercase"
              >
                EXECUTE
              </button>
            </motion.div>
          )}

          {suggestion && (suggestion === "ERR_NOT_FOUND: Check registration sequence." || suggestion === "ERR_NOT_FOUND: No matching operative.") && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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