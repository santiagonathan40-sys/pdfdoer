import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ToolGrid from './components/ToolGrid';
import CategorySection from './components/CategorySection';
import ToolPageLayout from './components/ToolPageLayout';
import UploadBox from './components/UploadBox';
import Login from './components/Login';
import Signup from './components/Signup';
import Pricing from './components/Pricing';
import Dashboard from './components/Dashboard';
import UpgradeModal from './components/UpgradeModal';
import {
  getCurrentUser,
  getUsage,
  getGuestUsage,
  incrementUsage,
  logoutUser,
} from './services/authApi';
import { TOOLS } from './data/tools';
import type { PDFTool, ToolCategory, User, UsageStats } from './types';
import {
  Zap,
  ShieldCheck,
  Download,
  Layers,
  Search,
  ArrowRight,
  FileCheck,
  FileText,
} from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<
    'home' | 'all-tools' | 'tool' | 'login' | 'signup' | 'pricing' | 'dashboard'
  >('home');

  const [activeToolSlug, setActiveToolSlug] = useState<string>('compress-pdf');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const [detectedType, setDetectedType] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pdfdoer_user');

    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('pdfdoer_user');
      return null;
    }
  });

  const [actionsCount, setActionsCount] = useState<number>(0);
  const [backendActionsLimit, setBackendActionsLimit] = useState<number | null>(null);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    'limit' | 'ocr' | 'word' | 'batch' | 'generic'
  >('generic');

  const actionsLimit =
    backendActionsLimit ??
    (currentUser ? (currentUser.tier === 'pro' ? 999 : 10) : 3);

  const usageStats: UsageStats = {
    actionsCount,
    actionsLimit,
  };

  const refreshUsage = async () => {
    try {
      if (!currentUser) {
        const guestUsageResult = await getGuestUsage();

        if (guestUsageResult.usage) {
          setActionsCount(guestUsageResult.usage.actionsUsed);
          setBackendActionsLimit(guestUsageResult.usage.actionsLimit);
        }

        return;
      }

      const usageResult = await getUsage();

      if (usageResult.usage) {
        setActionsCount(usageResult.usage.actionsUsed);
        setBackendActionsLimit(
          usageResult.usage.tier === 'pro' ? 999 : usageResult.usage.actionsLimit
        );
      }
    } catch (error) {
      console.error('Unable to refresh usage:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pdfdoer_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pdfdoer_user');
    }
  }, [currentUser]);

  useEffect(() => {
    async function refreshAccountAndUsage() {
      try {
        if (!currentUser) {
          const guestUsageResult = await getGuestUsage();

          if (guestUsageResult.usage) {
            setActionsCount(guestUsageResult.usage.actionsUsed);
            setBackendActionsLimit(guestUsageResult.usage.actionsLimit);
          }

          return;
        }

        const userResult = await getCurrentUser();

        if (userResult.user) {
          setCurrentUser(userResult.user as User);
        }

        const usageResult = await getUsage();

        if (usageResult.usage) {
          setActionsCount(usageResult.usage.actionsUsed);
          setBackendActionsLimit(
            usageResult.usage.tier === 'pro' ? 999 : usageResult.usage.actionsLimit
          );
        }
      } catch (error) {
        console.error('Unable to refresh account or usage:', error);
      }
    }

    refreshAccountAndUsage();
  }, [currentUser?.email, currentUser?.tier]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage, activeToolSlug, categoryFilter]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setActivePage('dashboard');

    try {
      const usageResult = await getUsage();

      if (usageResult.usage) {
        setActionsCount(usageResult.usage.actionsUsed);
        setBackendActionsLimit(
          usageResult.usage.tier === 'pro' ? 999 : usageResult.usage.actionsLimit
        );
      }
    } catch (error) {
      console.error('Unable to load usage after login:', error);
    }
  };

  const handleLogout = async () => {
    logoutUser();
    setCurrentUser(null);
    setActionsCount(0);
    setBackendActionsLimit(null);
    setActivePage('home');

    try {
      const guestUsageResult = await getGuestUsage();

      if (guestUsageResult.usage) {
        setActionsCount(guestUsageResult.usage.actionsUsed);
        setBackendActionsLimit(guestUsageResult.usage.actionsLimit);
      }
    } catch (error) {
      console.error('Unable to load guest usage after logout:', error);
    }
  };

  const handleUpgradeTier = () => {
    setUpgradeModalOpen(false);
    setActivePage('pricing');
  };

  const handleActionProcessed = async () => {
  try {
    if (!currentUser) {
      const result = await incrementUsage();

      if (result.usage) {
        setActionsCount(result.usage.actionsUsed);
        setBackendActionsLimit(result.usage.actionsLimit);
      }

      return;
    }

    const result = await incrementUsage();

    if (result.usage) {
      setActionsCount(result.usage.actionsUsed);
      setBackendActionsLimit(
        result.usage.tier === 'pro' ? 999 : result.usage.actionsLimit
      );
    }
  } catch (error) {
    console.error('Unable to increment usage:', error);
    await refreshUsage();
  }
};
  const handleTriggerUpgrade = (
    reason: 'limit' | 'ocr' | 'word' | 'batch' | 'generic'
  ) => {
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  };

  const handleNavigate = (page: string, catFilter?: string, toolSlug?: string) => {
    if (page === 'tool' && toolSlug) {
      setActiveToolSlug(toolSlug);
      setActivePage('tool');
    } else if (page === 'all-tools') {
      setCategoryFilter(catFilter);
      setActivePage('all-tools');

      if (catFilter) {
        setTimeout(() => {
          const el = document.getElementById(`category-sec-${catFilter}`);

          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } else if (['login', 'signup', 'pricing', 'dashboard', 'home'].includes(page)) {
      setActivePage(page as any);
    } else {
      setActivePage('home');
    }
  };

  const handleHeroFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      const isPro = currentUser?.tier === 'pro';
      const isFree = currentUser?.tier === 'free';
      const maxFileSizeMB = isPro ? 100 : isFree ? 15 : 5;
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

      for (const f of files) {
        if (f.size > maxFileSizeBytes) {
          alert(
            `File "${f.name}" exceeds your size limit of ${maxFileSizeMB}MB. Please log in or upgrade to process files of this size.`
          );
          return;
        }
      }

      setHeroFiles(files);

      const file = files[0];

      if (file.type.includes('pdf')) {
        setDetectedType('pdf');
      } else if (
        file.type.includes('word') ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc')
      ) {
        setDetectedType('word');
      } else if (
        file.type.includes('image') ||
        file.name.endsWith('.jpg') ||
        file.name.endsWith('.png') ||
        file.name.endsWith('.jpeg')
      ) {
        setDetectedType('image');
      } else {
        setDetectedType('unknown');
      }
    }
  };

  const handleSelectSuggestedTool = (toolSlug: string) => {
    if (actionsCount >= actionsLimit) {
      handleTriggerUpgrade('limit');
      return;
    }

    const isPro = currentUser?.tier === 'pro';

    if (toolSlug === 'pdf-to-word' && !isPro) {
      handleTriggerUpgrade('word');
      return;
    }

    if (toolSlug === 'ocr-text-recognition' && !isPro) {
      handleTriggerUpgrade('ocr');
      return;
    }

    setActiveToolSlug(toolSlug);
    setActivePage('tool');
    setHeroFiles([]);
    setDetectedType('');
  };

  const filteredTools = TOOLS.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter ? tool.category === categoryFilter : true;

    return matchesSearch && matchesCategory;
  });

  const getSuggestedToolsForHeroFile = (): PDFTool[] => {
    if (detectedType === 'pdf') {
      return TOOLS.filter((t) =>
        ['compress-pdf', 'pdf-to-word', 'split-pdf', 'sign-pdf', 'password-protect'].includes(
          t.slug
        )
      );
    }

    if (detectedType === 'word') {
      return TOOLS.filter((t) => ['word-to-pdf'].includes(t.slug));
    }

    if (detectedType === 'image') {
      return TOOLS.filter((t) =>
        ['jpg-to-pdf', 'ocr-text-recognition'].includes(t.slug)
      );
    }

    return TOOLS.slice(0, 4);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800 antialiased font-sans">
      <Header
        onNavigate={handleNavigate}
        activePage={activePage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-grow">
        {activePage === 'home' && (
          <div>
            <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-white py-20 lg:py-24 border-b border-slate-50">
              <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-100/30 blur-3xl" />
              <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-sky-100/20 blur-3xl" />

              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                  <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                    <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                      Every PDF Tool <br className="hidden sm:inline" />
                      You Need in <span className="text-blue-600 bg-clip-text">One Place</span>
                    </h1>

                    <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                      Convert, compress, merge, split, edit, sign, and manage your PDF files online with a fast and simple document workflow. Secure sandbox architecture ensures your information remains safe.
                    </p>

                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Popular Tools:
                      </p>

                      <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                        {[
                          { name: 'PDF to Word', slug: 'pdf-to-word' },
                          { name: 'Compress PDF', slug: 'compress-pdf' },
                          { name: 'Merge PDF', slug: 'merge-pdf' },
                          { name: 'Sign Document', slug: 'sign-pdf' },
                        ].map((btn) => (
                          <button
                            key={btn.slug}
                            onClick={() => handleNavigate('tool', undefined, btn.slug)}
                            className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/60 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm hover:shadow-inner"
                          >
                            {btn.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 w-full max-w-xl mx-auto">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md">
                      {heroFiles.length === 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-4.5">
                            <h3 className="font-display text-md font-bold text-slate-800">
                              Instant File Workspace
                            </h3>

                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Secure Gateway
                            </span>
                          </div>

                          <UploadBox
                            onFilesSelected={handleHeroFilesSelected}
                            acceptedTypes=".pdf, .docx, .jpg, .png"
                            toolTitle="SaaS Document Hub"
                          />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                              <h3 className="font-display text-sm font-bold text-slate-800">
                                File Detected Successfully!
                              </h3>

                              <p className="text-xs text-slate-400">
                                Size: {(heroFiles[0].size / 1024).toFixed(1)} KB
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setHeroFiles([]);
                                setDetectedType('');
                              }}
                              className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              Clear File
                            </button>
                          </div>

                          <div className="rounded-lg bg-blue-50/40 border border-blue-200 p-4 flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileText className="text-blue-600" size={24} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {heroFiles[0].name}
                              </p>

                              <p className="text-[10px] text-slate-400 font-medium">
                                Choose a matching converter or optimizer tool below:
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Select Matching Tool Workspace:
                            </label>

                            <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                              {getSuggestedToolsForHeroFile().map((tool) => (
                                <button
                                  key={tool.slug}
                                  onClick={() => handleSelectSuggestedTool(tool.slug)}
                                  className="w-full flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-blue-500 hover:bg-slate-50 transition-all group"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600">
                                      <FileCheck size={16} />
                                    </div>

                                    <div>
                                      <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                                        {tool.title}
                                      </p>

                                      <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                                        {tool.actionButtonText}
                                      </p>
                                    </div>
                                  </div>

                                  <ArrowRight
                                    size={13}
                                    className="text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-end">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-slate-600">
                            Tries today: {actionsCount} / {actionsLimit}
                          </span>

                          {actionsLimit - actionsCount > 0 ? (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {actionsLimit - actionsCount} left
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              Limit Reached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-12 bg-white border-b border-slate-50">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {[
                    {
                      title: 'Fast Processing',
                      desc: 'Convert documents in milliseconds, powered by high performance execution servers.',
                      icon: Zap,
                      color: 'text-blue-600 bg-blue-50 border-blue-100',
                    },
                    {
                      title: 'Secure Uploads',
                      desc: 'Secure HTTPS tunnels and automated file shredding policies protect privacy.',
                      icon: ShieldCheck,
                      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                    },
                    {
                      title: 'Easy Downloads',
                      desc: 'One-click compressed ZIP outputs or high-fidelity downloadable documents.',
                      icon: Download,
                      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
                    },
                    {
                      title: 'Multiple Tools',
                      desc: '18 comprehensive utilities ranging from OCR text extractions to splitters.',
                      icon: Layers,
                      color: 'text-amber-600 bg-amber-50 border-amber-100',
                    },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-start gap-4 p-4.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all duration-300 shadow-sm"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${stat.color}`}
                        >
                          <Icon size={18} />
                        </div>

                        <div>
                          <h4 className="font-display text-sm font-bold text-slate-800">
                            {stat.title}
                          </h4>

                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {stat.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="py-20 bg-slate-50/40">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                      <Layers size={12} />
                      <span>Document Utility Grid</span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      Most Popular PDF Tools
                    </h2>

                    <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
                      Explore our high-performance suite of free document editors and formatting convertors.
                    </p>
                  </div>

                  <button
                    onClick={() => handleNavigate('all-tools')}
                    className="group rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-3 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm self-start md:self-auto cursor-pointer"
                  >
                    <span>View All 18 Tools</span>
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </div>

                <ToolGrid
                  tools={TOOLS}
                  onToolSelect={(slug) => handleNavigate('tool', undefined, slug)}
                  limit={8}
                />

                <div className="mt-14 text-center">
                  <p className="text-xs text-slate-400 mb-4 font-medium">
                    Looking for a specific configuration or organizational layout?
                  </p>

                  <button
                    onClick={() => handleNavigate('all-tools')}
                    className="inline-flex items-center space-x-1 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                  >
                    <span>Explore full categorized tool map</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'all-tools' && (
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-12 text-center max-w-2xl mx-auto">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3.5">
                All PDF Converter & Editor Tools
              </h1>

              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Filter or search through our categorized selection of 18 secure, high-quality document conversion tools. Free forever. No registration required.
              </p>

              <div className="mb-8 p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left max-w-xl mx-auto">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Daily actions left today:{' '}
                      <span className="font-bold text-blue-600">
                        {actionsLimit - actionsCount} / {actionsLimit}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {currentUser?.tier !== 'pro' ? (
                    <button
                      onClick={() => handleTriggerUpgrade('limit')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Upgrade</span>
                      <ArrowRight size={10} />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
                      VIP Active
                    </span>
                  )}

                  {!currentUser && (
                    <button
                      onClick={() => handleNavigate('signup')}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Sign Up (10 actions)
                    </button>
                  )}
                </div>
              </div>

              <div className="relative max-w-lg mx-auto">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4.5 text-slate-400">
                  <Search size={18} />
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for tools... (e.g. compress, word, jpg, sign)"
                  className="w-full rounded-lg border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none transition-all hover:border-slate-300"
                  id="search-tools-input"
                />

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-12 border-b border-slate-200 pb-8">
              {[
                { label: 'All Categories', value: undefined },
                { label: 'Convert', value: 'convert' },
                { label: 'Organize', value: 'organize' },
                { label: 'Edit & Watermark', value: 'edit' },
                { label: 'Security & Locker', value: 'security' },
                { label: 'AI & OCR text', value: 'ai_ocr' },
              ].map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => setCategoryFilter(pill.value)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all border ${
                    categoryFilter === pill.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredTools.length > 0 ? (
              <div>
                {(['convert', 'organize', 'edit', 'security', 'ai_ocr'] as ToolCategory[]).map(
                  (catKey) => {
                    const catTools = filteredTools.filter((t) => t.category === catKey);

                    if (catTools.length === 0) return null;

                    return (
                      <CategorySection
                        key={catKey}
                        categoryKey={catKey}
                        tools={catTools}
                        onToolSelect={(slug) => handleNavigate('tool', undefined, slug)}
                      />
                    );
                  }
                )}
              </div>
            ) : (
              <div className="py-20 text-center rounded-lg bg-white border border-slate-200 max-w-md mx-auto shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-2">
                  No matching tools found
                </p>

                <p className="text-xs text-slate-400 mb-4">
                  We couldn't find any tool matching "{searchQuery}" in our registry.
                </p>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter(undefined);
                  }}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2 text-xs font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {activePage === 'tool' &&
          (() => {
            const currentTool = TOOLS.find((t) => t.slug === activeToolSlug) || TOOLS[0];

            return (
              <ToolPageLayout
                tool={currentTool}
                onBackToTools={() => handleNavigate('all-tools')}
                currentUser={currentUser}
                usageStats={usageStats}
                onTriggerUpgrade={handleTriggerUpgrade}
                onActionProcessed={handleActionProcessed}
                onNavigate={handleNavigate}
              />
            );
          })()}

        {activePage === 'login' && (
          <Login onLogin={handleLogin} onNavigate={handleNavigate} />
        )}

        {activePage === 'signup' && (
          <Signup onLogin={handleLogin} onNavigate={handleNavigate} />
        )}

        {activePage === 'pricing' && <Pricing />}

        {activePage === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            usageStats={usageStats}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={handleUpgradeTier}
	onNavigate={handleNavigate}
        reason={upgradeReason}
      />
    </div>
  );
}