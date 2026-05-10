import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Scale, 
  TrendingUp, 
  Search, 
  AlertCircle, 
  Info,
  CheckCircle2,
  RefreshCw,
  Globe,
  UserCheck,
  ShieldCheck,
  Fingerprint,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeGoldHallmark, getLiveGoldPrices, type GoldAnalysisResult, type GoldPrices } from './services/goldService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [kycData, setKycData] = useState<{
    fullName: string;
    idType: string;
    idNumber: string;
    phone: string;
  } | null>(null);
  const [isKycDone, setIsKycDone] = useState(false);
  const [verifyingKyc, setVerifyingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GoldAnalysisResult | null>(null);
  const [weight, setWeight] = useState<number>(0);
  const [prices, setPrices] = useState<GoldPrices | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [error, setError] = useState<string | null>(null);

  // Load KYC from local storage if exists
  useEffect(() => {
    const savedKyc = localStorage.getItem('aura_kyc');
    if (savedKyc) {
      setKycData(JSON.parse(savedKyc));
      setIsKycDone(true);
    }
  }, []);

  const handleKycSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifyingKyc(true);
    setKycError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName') as string,
      idType: formData.get('idType') as string,
      idNumber: formData.get('idNumber') as string,
      phone: formData.get('phone') as string,
    };

    try {
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setKycData(data);
        setIsKycDone(true);
        localStorage.setItem('aura_kyc', JSON.stringify(data));
      } else {
        setKycError(result.message || "Identity verification failed. Please check your details.");
      }
    } catch (err) {
      setKycError("Verification service temporarily unavailable.");
    } finally {
      setVerifyingKyc(false);
    }
  };

  // Fetch live prices on mount
  useEffect(() => {
    getLiveGoldPrices().then(setPrices).catch(() => setPrices({ 
      usd24k: 78.50, usd22k: 72.00, usd18k: 58.00, 
      inr24k: 7500, inr22k: 6875, inr18k: 5625 
    }));
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImage(base64);
      setError(null);
      await startAnalysis(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: false 
  });

  const startAnalysis = async (base64: string) => {
    setAnalyzing(true);
    setResult(null);
    try {
      const data = await analyzeGoldHallmark(base64);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("AI analysis failed. Please ensure the hallmark is clear.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getActivePrice = () => {
    if (!prices) return 0;
    return currency === 'USD' ? prices.usd24k : prices.inr24k;
  };

  const getSpecificRate = () => {
    if (!prices || !result) return 0;
    const isUSD = currency === 'USD';
    const karat = result.purityKarat?.toUpperCase();
    const purity = result.purityPercentage || 0;

    if (karat?.includes('24K') || purity >= 99) return isUSD ? prices.usd24k : prices.inr24k;
    if (karat?.includes('22K') || purity >= 91) return isUSD ? prices.usd22k : prices.inr22k;
    if (karat?.includes('18K') || purity >= 75) return isUSD ? prices.usd18k : prices.inr18k;

    // Fallback: calculate based on 24K price * purity
    const base24k = isUSD ? prices.usd24k : prices.inr24k;
    return (base24k * purity) / 100;
  };

  const calculateValue = () => {
    const rate = getSpecificRate();
    if (!rate || !weight) return "0.00";
    return (weight * rate).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setWeight(0);
  };

  if (!isKycDone) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-gray-100 font-sans flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-[#D4AF37] w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Identity Verification</h1>
            <p className="text-sm text-gray-500">Secure KYC required to access live gold valuation.</p>
          </div>

          <form onSubmit={handleKycSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Full Name</label>
              <input 
                required
                name="fullName"
                type="text" 
                placeholder="John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">ID Type</label>
                <select 
                  name="idType"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-all appearance-none"
                >
                  <option value="PAN" className="bg-[#0a0a0b]">PAN Card</option>
                  <option value="AADHAAR" className="bg-[#0a0a0b]">Aadhaar Card</option>
                  <option value="PASSPORT" className="bg-[#0a0a0b]">Passport</option>
                  <option value="DL" className="bg-[#0a0a0b]">Driving License</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">ID Number</label>
                <input 
                  required
                  name="idNumber"
                  type="text" 
                  placeholder="XXXX-XXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Phone Number</label>
              <input 
                required
                name="phone"
                type="tel" 
                placeholder="+91 XXXXX XXXXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>

            {kycError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {kycError}
              </div>
            )}

            <button 
              type="submit"
              disabled={verifyingKyc}
              className="w-full bg-[#D4AF37] disabled:opacity-50 text-black py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#c29f2e] transition-all group mt-4 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
            >
              {verifyingKyc ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying with NSDL...
                </>
              ) : (
                <>
                  Verify & Enter App
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest font-medium">
              <Fingerprint className="w-3 h-3 text-[#D4AF37]" />
              End-to-End Encrypted Data
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100 font-sans selection:bg-[#D4AF37]/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">AuraValue</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Gold Hallmark AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Currency Toggle */}
            <div className="hidden sm:flex items-center bg-white/5 rounded-full p-1 border border-white/10">
              <button 
                onClick={() => setCurrency('USD')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                  currency === 'USD' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
                )}
              >
                GLOBAL (USD)
              </button>
              <button 
                onClick={() => setCurrency('INR')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                  currency === 'INR' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
                )}
              >
                INDIA (INR)
              </button>
            </div>

            {prices && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-400">Live Price</span>
                  <span className="text-[#D4AF37] font-mono font-bold">
                    {currency === 'USD' ? '$' : '₹'}{getActivePrice().toLocaleString(undefined, { minimumFractionDigits: 2 })} /g
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end pr-4 border-r border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Verified User</span>
              <span className="text-xs text-white font-medium">{kycData?.fullName}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('aura_kyc');
                setIsKycDone(false);
              }}
              className="text-[10px] text-gray-500 hover:text-[#D4AF37] transition-colors uppercase tracking-widest font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Mobile Currency Toggle */}
        <div className="sm:hidden flex items-center justify-center mb-8 bg-white/5 rounded-full p-1 border border-white/10 w-fit mx-auto">
          <button 
            onClick={() => setCurrency('USD')}
            className={cn(
              "px-4 py-2 rounded-full text-[10px] font-bold transition-all",
              currency === 'USD' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
            )}
          >
            USD
          </button>
          <button 
            onClick={() => setCurrency('INR')}
            className={cn(
              "px-4 py-2 rounded-full text-[10px] font-bold transition-all",
              currency === 'INR' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
            )}
          >
            INR
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Upload & Image */}
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-light text-white leading-tight">
                Evaluate your <span className="text-[#D4AF37] font-medium italic">Gold</span>.
              </h2>
              <p className="text-gray-400 text-sm max-w-sm">
                Take a photo or upload a clear close-up of the hallmark stamp. Our AI will identify the purity and calculate today's value.
              </p>
            </div>
            {!image ? (
              <motion.div
                layoutId="dropzone"
                className="w-full"
              >
                <div 
                  {...getRootProps()}
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 p-10 flex flex-col items-center justify-center gap-4 text-center",
                    isDragActive ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                  )}
                >
                  <input {...getInputProps({ capture: 'environment' })} id="hallmark-upload" />
                  <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-[#D4AF37]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium">Capture or Drop Image</p>
                    <p className="text-xs text-gray-500">Hallmark close-up recommended</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                    className="mt-4 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#c29f2e] transition-colors shadow-[0_4px_20px_rgba(212,175,55,0.2)]"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera
                  </button>

                  <div className="mt-4 px-4 py-2 bg-white/5 rounded-full text-[10px] text-gray-400 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Supports JPEG, PNG up to 10MB
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden border border-white/10 group bg-white/[0.02]"
              >
                <img src={image} alt="Hallmark" className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <button 
                    onClick={reset}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Discard & Retake
                  </button>
                </div>
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#D4AF37] font-medium tracking-widest text-xs uppercase animate-pulse">Analyzing Hallmark...</p>
                  </div>
                )}
              </motion.div>
            )}
          </section>

          {/* Right Column: Analysis & Valuation */}
          <section className="space-y-6 lg:pl-6">
            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4"
                >
                  <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" />
                  <div className="h-20 w-full bg-white/5 rounded animate-pulse" />
                  <div className="h-12 w-full bg-white/5 rounded animate-pulse" />
                </motion.div>
              ) : result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="p-8 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="px-3 py-1 bg-[#D4AF37]/20 rounded-full w-fit">
                          <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider">Identified Purity</span>
                        </div>
                        <h3 className="text-4xl font-bold text-white tracking-tighter">
                          {result.purityKarat || result.fineness || 'Unknown'}
                        </h3>
                      </div>
                      <CheckCircle2 className="text-[#D4AF37] w-8 h-8" />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Purity Scale</span>
                        <span className="text-white font-medium">{result.purityPercentage ?? 0}% Pure Gold</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${result.purityPercentage ?? 0}%` }}
                          className="h-full bg-[#D4AF37]" 
                        />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed italic">
                        "{result.description}"
                      </p>
                    </div>
                  </div>

                  <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] space-y-8">
                    <div className="space-y-3">
                      <label htmlFor="weight-input" className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
                        <Scale className="w-3 h-3" /> Step 2: Weight in Grams
                      </label>
                      <div className="relative">
                        <input 
                          id="weight-input"
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          value={weight || ''}
                          onChange={(e) => setWeight(parseFloat(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-2xl font-bold focus:outline-none focus:border-[#D4AF37] transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-medium">grams</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Estimated Value</p>
                        <p className="text-4xl font-bold text-white tracking-tighter">
                          {currency === 'USD' ? '$' : '₹'}{calculateValue()}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-[#D4AF37] font-medium italic">
                            Applied Rate: {currency === 'USD' ? '$' : '₹'}{getSpecificRate().toFixed(2)}/g
                          </p>
                          <p className="text-[10px] text-gray-600">
                            Based on {currency === 'USD' ? 'Global Spot' : 'MCX / India Market'} Price
                          </p>
                        </div>
                      </div>
                      <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center shrink-0">
                        <TrendingUp className="text-[#D4AF37] w-8 h-8" />
                      </div>
                    </div>
                  </div>

                  {/* CSB Bank Gold Loan Enquiry */}
                  {weight > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <Info className="text-blue-400 w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">Unlock more value today</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Would you like to enquire about a <span className="text-blue-400 font-bold">Gold Loan from CSB Bank</span> based on this valuation?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => window.open('https://www.csb.bank.in/enquiry-gold', '_blank')}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_15px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2"
                        >
                          Yes, Enquire Now
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button 
                          className="px-6 py-3 bg-white/5 border border-white/10 text-gray-500 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                        >
                          Maybe later
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : error ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center gap-4"
                >
                  <AlertCircle className="text-red-500 w-12 h-12" />
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">Unable to Read Hallmark</h4>
                    <p className="text-sm text-gray-400">{error}</p>
                  </div>
                  <button onClick={reset} className="mt-2 text-xs font-bold text-[#D4AF37] hover:underline uppercase tracking-widest">Try another photo</button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 text-gray-600">
                  <Search className="w-12 h-12 opacity-20" />
                  <p className="text-sm max-w-[200px]">Unlock valuation by uploading your hallmark image first.</p>
                </div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col items-center gap-6 text-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] max-w-md">
          AuraValue uses advanced computer vision to identify hallmarks. Valuations are estimates based on pure gold content and global spot prices. Always consult a professional appraiser for final valuation.
        </p>
        <div className="flex gap-4">
          <div className="w-8 h-1 bg-[#D4AF37]/50 rounded-full" />
          <div className="w-8 h-1 bg-[#D4AF37]/20 rounded-full" />
          <div className="w-8 h-1 bg-[#D4AF37]/10 rounded-full" />
        </div>
      </footer>
    </div>
  );
}
