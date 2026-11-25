import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Copy,
  Check,
  Sparkles,
  Play,
  X,
  RotateCcw,
  ArrowRight,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { CATEGORIES, CURATED_SETS, ANIMATIONS, SKILLS_AND_TOOLS } from './data/animationsData';
import AnimationCanvas from './components/AnimationCanvas';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'library'
  const [activeCat, setActiveCat] = useState('all');
  const [activeSet, setActiveSet] = useState('all');
  const [activeFormat, setActiveFormat] = useState('all');
  const [activeTech, setActiveTech] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mp4Url, setMp4Url] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setMp4Url(null);
    if (!selectedItem || !selectedItem.postUrl?.includes('x.com/')) return;
    let cancelled = false;
    fetch(`/api/video?url=${encodeURIComponent(selectedItem.postUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.mp4Url) {
          setMp4Url(`/api/video?stream=1&url=${encodeURIComponent(selectedItem.postUrl)}`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);
  const [importedItems, setImportedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('opus_imported_animations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (importedItems.length > 0) return;
    Promise.allSettled([
      fetch('/data/library.json').then((r) => (r.ok ? r.json() : [])),
      fetch('/data/library-extra.json').then((r) => (r.ok ? r.json() : [])),
      fetch('/data/prompt-en.json').then((r) => (r.ok ? r.json() : {})),
      fetch('/data/prompt-fix.json').then((r) => (r.ok ? r.json() : {})),
      fetch('/data/video-post.json').then((r) => (r.ok ? r.json() : {})),
      fetch('/data/awesome-entries.json').then((r) => (r.ok ? r.json() : [])),
    ]).then(([libRes, extraRes, promptRes, promptFixRes, videoPostRes, awesomeRes]) => {
      const libItems = libRes.status === 'fulfilled' && Array.isArray(libRes.value) ? libRes.value : [];
      const extraItems = extraRes.status === 'fulfilled' && Array.isArray(extraRes.value) ? extraRes.value : [];
      const promptEn = promptRes.status === 'fulfilled' && promptRes.value ? promptRes.value : {};
      const promptFix = promptFixRes.status === 'fulfilled' && promptFixRes.value ? promptFixRes.value : {};
      const videoPost = videoPostRes.status === 'fulfilled' && videoPostRes.value ? videoPostRes.value : {};
      const awesomeItems = awesomeRes.status === 'fulfilled' && Array.isArray(awesomeRes.value) ? awesomeRes.value : [];
      const mergedRaw = [...extraItems, ...libItems].filter(
        (item) => !item.partial && (item.prompt || '').length >= 30
      );
      if (mergedRaw.length === 0 && awesomeItems.length === 0) return;
      const seenUrls = new Set();
      const mapped = mergedRaw.map((item, idx) => {
        const fixOverride = typeof promptFix[item.id] === 'string' ? promptFix[item.id] : promptFix[item.id]?.prompt;
        const enOverride = promptEn[item.id]?.en;
        const poster = item.poster?.startsWith('/')
          ? `https://lumpongautomated.com/opus-video-library${item.poster}`
          : item.poster;
        const techArr = Array.isArray(item.tech) ? item.tech : [];
        const postUrl = videoPost[item.id] || item.postUrl || '';
        if (postUrl) seenUrls.add(postUrl);
        return {
          id: item.id || `data-${idx}`,
          title: item.title || `Opus Animation by @${item.author || 'creator'}`,
          author: item.author ? `@${item.author}` : '@creator',
          category: item.category || 'motion',
          sets: item.sets || [],
          format: item.format || 'landscape',
          tech: techArr.includes('playable') ? 'playable' : 'video',
          duration: techArr.includes('playable') ? 'Interactive' : item.added || 'Code',
          demoType: ['orbit', 'kinetic', 'nodes', 'cube3d', 'particles', 'wave', 'bounce', 'spiral'][idx % 8],
          accent: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][idx % 5],
          thumbnailUrl: poster,
          prompt: fixOverride || enOverride || item.prompt || 'Prompt not available.',
          postUrl,
        };
      });

      const catMap = {
        music: 'motion',
        motion: 'motion',
        explainer: 'explainer',
        '3d': '3d',
        blender: '3d',
        game: 'games',
        games: 'games',
        interactive: 'games',
      };

      awesomeItems.forEach((item, idx) => {
        if (!item.post || seenUrls.has(item.post)) return;
        const rawPrompt =
          typeof item.prompt === 'string'
            ? item.prompt
            : item.prompt?.text || item.prompt?.en || item.desc || '';
        if (!rawPrompt || rawPrompt.length < 30) return;
        seenUrls.add(item.post);
        mapped.push({
          id: `awesome-${item.slug || idx}`,
          title: item.title || `Opus 5.5 Demo by @${item.handle || 'creator'}`,
          author: item.handle ? `@${item.handle}` : '@creator',
          category: catMap[(item.cat || '').toLowerCase()] || 'motion',
          sets: [],
          format: 'landscape',
          tech: 'video',
          duration: 'Opus 5.5',
          demoType: ['orbit', 'kinetic', 'nodes', 'cube3d', 'particles', 'wave', 'bounce', 'spiral'][idx % 8],
          accent: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][idx % 5],
          thumbnailUrl: null,
          prompt: rawPrompt,
          postUrl: item.post,
        });
      });

      setImportedItems(mapped);
    });
  }, []);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const openLibraryWithFilter = (filter = {}) => {
    setActiveCat(filter.cat || 'all');
    setActiveSet(filter.set || 'all');
    setActiveFormat(filter.format || 'all');
    setActiveTech(filter.tech || 'all');
    setView('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let libItems = [];
    let extraItems = [];
    let promptEn = {};

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          if (file.name.includes('extra')) extraItems = data;
          else libItems = [...libItems, ...data];
        } else if (data && typeof data === 'object') {
          promptEn = { ...promptEn, ...data };
        }
      } catch {
        // ignore invalid json
      }
    }

    const mergedRaw = [...extraItems, ...libItems];
    if (mergedRaw.length === 0) {
      setImportStatus('No videos found in selected JSON.');
      return;
    }

    const mapped = mergedRaw.map((item, idx) => {
      const enOverride = promptEn[item.id]?.en;
      const poster = item.poster?.startsWith('/')
        ? `https://lumpongautomated.com/opus-video-library${item.poster}`
        : item.poster;
      const techArr = Array.isArray(item.tech) ? item.tech : [];
      return {
        id: item.id || `imported-${idx}`,
        title: item.title || `Opus Animation by @${item.author || 'creator'}`,
        author: item.author ? `@${item.author}` : '@creator',
        category: item.category || 'motion',
        sets: item.sets || [],
        format: item.format || 'landscape',
        tech: techArr.includes('playable') ? 'playable' : 'video',
        duration: techArr.includes('playable') ? 'Interactive' : item.added || 'Code',
        demoType: ['orbit', 'kinetic', 'nodes', 'cube3d', 'particles', 'wave', 'bounce', 'spiral'][idx % 8],
        accent: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][idx % 5],
        thumbnailUrl: poster,
        prompt: enOverride || item.prompt || 'Prompt not available.',
        postUrl: item.postUrl || '',
      };
    });

    setImportedItems(mapped);
    try {
      localStorage.setItem('opus_imported_animations', JSON.stringify(mapped));
    } catch {
      // ignore quota errors
    }
    setImportStatus(`Loaded ${mapped.length} videos!`);
    setView('library');
  };

  const allAnimations = importedItems.length > 0 ? importedItems : ANIMATIONS;

  const filteredAnimations = useMemo(() => {
    return allAnimations.filter((item) => {
      if (activeCat !== 'all' && item.category !== activeCat) return false;
      if (activeSet === 'start-here') {
        if (item.prompt.length > 350 && !item.sets.includes('start-here')) return false;
      } else if (activeSet === 'product-promos') {
        const text = `${item.title} ${item.prompt}`.toLowerCase();
        if (!item.sets.includes('product-promos') && !/(promo|launch|commercial|brand|product|ad\b)/.test(text)) return false;
      } else if (activeSet !== 'all' && !item.sets.includes(activeSet)) {
        return false;
      }
      if (activeFormat === 'vertical') {
        const text = `${item.title} ${item.prompt}`.toLowerCase();
        if (item.format !== 'vertical' && !/(9:16|vertical|1080x1920|reels|tiktok|shorts)/.test(text)) return false;
      }
      if (activeTech !== 'all' && item.tech !== activeTech) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.prompt.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAnimations, activeCat, activeSet, activeFormat, activeTech, searchQuery]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      {/* Top Sketchbook Navbar */}
      <header className="sticky top-0 z-30 bg-[#fdfbf7]/95 backdrop-blur-sm border-b-2 border-[#1e1b18] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <span className="inline-block bg-[#fde047] border-2 border-[#1e1b18] px-2.5 py-0.5 rounded-lg font-marker text-lg sm:text-xl -rotate-2 group-hover:rotate-0 transition-transform shadow-[2px_2px_0px_#1e1b18]">
              OPUS
            </span>
            <span className="font-marker text-xl sm:text-2xl tracking-tight">
              ANIMATIONS LIBRARY
            </span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div
              className={`relative flex items-center justify-end overflow-hidden transition-all duration-300 ease-out ${
                searchOpen || searchQuery ? 'w-56 sm:w-72' : 'w-10'
              }`}
            >
              {searchOpen || searchQuery ? (
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534e]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (view !== 'library') setView('library');
                    }}
                    onBlur={() => {
                      if (!searchQuery) setSearchOpen(false);
                    }}
                    placeholder="Search prompts, @authors..."
                    className="w-full pl-9 pr-8 py-1.5 bg-white border-2 border-[#1e1b18] rounded-xl font-hand text-base focus:outline-none focus:ring-2 focus:ring-[#fde047]"
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    aria-label="Close search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#57534e] hover:text-[#1e1b18] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  aria-label="Open search"
                  className="sketch-btn bg-white p-2 cursor-pointer flex items-center justify-center"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setView('home')}
              className={`sketch-btn px-3.5 py-1.5 text-base font-bold cursor-pointer ${
                view === 'home' ? 'bg-[#fde047]' : 'bg-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setView('skills')}
              className={`sketch-btn px-3.5 py-1.5 text-base font-bold cursor-pointer ${
                view === 'skills' ? 'bg-[#bbf7d0]' : 'bg-white'
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => openLibraryWithFilter({})}
              className={`sketch-btn px-3.5 py-1.5 text-base font-bold cursor-pointer flex items-center gap-1.5 ${
                view === 'library' ? 'bg-[#38bdf8]' : 'bg-white'
              }`}
            >
              <span>Browse All</span>
              <span className="text-xs font-mono-code bg-[#fdfbf7] border border-[#1e1b18] rounded-full px-1.5 py-0.2">
                {allAnimations.length}
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {view === 'home' ? (
          <>
            {/* Hero Section */}
            <section className="relative mb-14 text-center sm:text-left">
              {/* Pipeline doodle strip */}
              <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 bg-white border-2 border-[#1e1b18] px-4 py-2 rounded-full shadow-[3px_3px_0px_#1e1b18] -rotate-1">
                <span className="font-bold text-sm sm:text-base px-2 py-0.5 bg-[#fef08a] rounded-md border border-[#1e1b18]">
                  Prompt in
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-bold text-sm sm:text-base px-2 py-0.5 bg-[#bae6fd] rounded-md border border-[#1e1b18]">
                  Opus writes code
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-bold text-sm sm:text-base px-2 py-0.5 bg-[#d8b4fe] rounded-md border border-[#1e1b18]">
                  Render
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-bold text-sm sm:text-base px-2 py-0.5 bg-[#bbf7d0] rounded-md border border-[#1e1b18]">
                  Video ready!
                </span>
              </div>

              <h1 className="font-marker text-4xl sm:text-6xl leading-tight mb-4">
                Every Opus video,{' '}
                <span className="marker-highlight inline-block rotate-1 relative">
                  every prompt.
                  <svg
                    viewBox="0 0 220 14"
                    className="w-full h-3 -mt-1 text-[#1e1b18]"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 9C45 3 110 13 217 5"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="font-caveat text-2xl sm:text-3xl text-[#57534e] max-w-2xl mb-8">
                Animations people made by asking Claude Opus 5.5 to write them
                as code. Open any one, copy the prompt, make your own.
              </p>

              {/* 4 Main Categories - Misaligned Sketchbook Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => openLibraryWithFilter({ cat: cat.id })}
                    style={{ transform: `rotate(${cat.tilt})` }}
                    className="sketch-box bg-white p-5 text-left relative cursor-pointer group"
                  >
                    <div
                      className="tape-strip w-16 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2"
                      aria-hidden="true"
                    />
                    <div
                      className="w-full h-28 rounded-lg border-2 border-[#1e1b18] mb-4 overflow-hidden"
                      style={{ backgroundColor: cat.color }}
                    >
                      <img
                        src={cat.thumbnailUrl}
                        alt={cat.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <h2 className="font-marker text-xl mb-1">{cat.title}</h2>
                    <p className="text-sm text-[#57534e] mb-3">
                      {cat.description}
                    </p>
                    <span className="inline-block font-bold text-sm px-2.5 py-0.5 bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-full">
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Curated Sets */}
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-marker text-3xl sm:text-4xl">
                  Not sure where to begin?
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CURATED_SETS.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => openLibraryWithFilter(set.filter)}
                    style={{
                      backgroundColor: set.color,
                      transform: `rotate(${set.tilt})`,
                    }}
                    className="sketch-box-alt p-5 text-left flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-full sm:w-28 h-28 shrink-0 rounded-lg border-2 border-[#1e1b18] overflow-hidden bg-white">
                        <img
                          src={set.thumbnailUrl}
                          alt={set.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 bg-white border-2 border-[#1e1b18] rounded-full">
                            {set.badge}
                          </span>
                          <span className="font-bold text-sm">{set.count}</span>
                        </div>
                        <h3 className="font-marker text-2xl mb-1">{set.title}</h3>
                        <p className="text-base text-[#1e1b18]/85">
                          {set.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 font-bold text-base">
                      Explore set <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : view === 'skills' ? (
          <section>
            <div className="mb-8">
              <h1 className="font-marker text-3xl sm:text-4xl mb-1">
                Skills &amp; Tools
              </h1>
              <p className="font-caveat text-2xl text-[#57534e]">
                Claude Code skills, renderers, and prompt repositories to build your own animations.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SKILLS_AND_TOOLS.map((skill, idx) => (
                <a
                  key={skill.id}
                  href={skill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: skill.color,
                    transform: `rotate(${idx % 2 === 0 ? '-0.8deg' : '0.8deg'})`,
                  }}
                  className="sketch-box-alt p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 bg-white border-2 border-[#1e1b18] rounded-full">
                        {skill.badge}
                      </span>
                      <span className="text-sm font-bold text-[#1e1b18]/75">
                        {skill.author}
                      </span>
                    </div>
                    <h2 className="font-marker text-xl mb-1.5">{skill.title}</h2>
                    <p className="text-base text-[#1e1b18]/85 mb-4">
                      {skill.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-bold text-sm group-hover:underline">
                    Open on GitHub <ArrowRight className="w-4 h-4" />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : (
          /* Library Browser View */
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="font-marker text-3xl sm:text-4xl mb-1">
                  Animation Library
                </h1>
                <p className="font-caveat text-2xl text-[#57534e]">
                  Showing {filteredAnimations.length} interactive sketches &
                  prompts
                </p>
              </div>
              <button
                onClick={() => openLibraryWithFilter({})}
                className="sketch-btn bg-white px-3 py-1.5 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" /> Clear filters
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { label: 'All', cat: 'all' },
                { label: 'Motion graphics', cat: 'motion' },
                { label: 'Explainers', cat: 'explainer' },
                { label: '3D scenes', cat: '3d' },
                { label: 'Games & interactive', cat: 'interactive' },
              ].map((pill) => (
                <button
                  key={pill.cat}
                  onClick={() => setActiveCat(pill.cat)}
                  className={`sketch-btn px-3.5 py-1 text-sm font-bold cursor-pointer ${
                    activeCat === pill.cat ? 'bg-[#fde047]' : 'bg-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
              <button
                onClick={() =>
                  setActiveFormat(activeFormat === 'vertical' ? 'all' : 'vertical')
                }
                className={`sketch-btn px-3.5 py-1 text-sm font-bold cursor-pointer ${
                  activeFormat === 'vertical' ? 'bg-[#bae6fd]' : 'bg-white'
                }`}
              >
                9:16 Vertical
              </button>
              <button
                onClick={() =>
                  setActiveTech(activeTech === 'playable' ? 'all' : 'playable')
                }
                className={`sketch-btn px-3.5 py-1 text-sm font-bold cursor-pointer ${
                  activeTech === 'playable' ? 'bg-[#bbf7d0]' : 'bg-white'
                }`}
              >
                Playable in browser
              </button>
            </div>

            {/* Cards Grid */}
            {filteredAnimations.length === 0 ? (
              <div className="sketch-box bg-white p-10 text-center">
                <p className="font-marker text-2xl mb-2">No sketches found!</p>
                <p className="text-[#57534e] mb-4">
                  Try clearing your filters or searching for something else.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    openLibraryWithFilter({});
                  }}
                  className="sketch-btn bg-[#fde047] px-4 py-2 font-bold cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {filteredAnimations.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      transform: `rotate(${idx % 2 === 0 ? '-0.8deg' : '0.9deg'})`,
                    }}
                    className="sketch-box bg-white p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 border-2 border-[#1e1b18] rounded-lg overflow-hidden mb-3 bg-[#fdfbf7]">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <AnimationCanvas
                            demoType={item.demoType}
                            accent={item.accent}
                            reduceMotion={false}
                            interactive={item.tech === 'playable'}
                          />
                        )}
                        <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 bg-white border-2 border-[#1e1b18] rounded-full">
                          {item.duration}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-marker text-xl">{item.title}</h3>
                      </div>
                      <p className="text-sm text-[#57534e] mb-3">
                        by {item.author} • {item.format}
                      </p>
                      <p className="text-sm line-clamp-2 bg-[#fdfbf7] p-2 border border-dashed border-[#1e1b18]/40 rounded-lg mb-4">
                        "{item.prompt}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="sketch-btn flex-1 bg-[#fde047] py-1.5 px-3 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-4 h-4" /> Open & Prompt
                      </button>
                      <button
                        onClick={() => handleCopy(item.prompt, item.id)}
                        className="sketch-btn bg-white p-1.5 cursor-pointer"
                        title="Copy prompt"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                </div>
                {filteredAnimations.length > visibleCount && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setVisibleCount((c) => c + 24)}
                      className="sketch-btn bg-[#fde047] px-6 py-2.5 font-marker text-lg cursor-pointer"
                    >
                      Load more ({filteredAnimations.length - visibleCount} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 sketch-btn bg-[#fde047] px-3.5 py-2 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
        >
          ↑ Top
        </button>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-[#1e1b18] bg-white px-4 sm:px-8 py-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm text-[#57534e]">
          <span className="font-caveat text-xl">
            Developer:{' '}
            <span className="marker-highlight font-bold text-[#1e1b18]">
              Yasuda
            </span>
          </span>
          <span>Opus Animations Library</span>
        </div>
      </footer>

      {/* Detail & Prompt Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-[#1e1b18]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="sketch-box bg-[#fdfbf7] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="sketch-btn bg-white p-1.5 absolute top-4 right-4 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-marker text-2xl sm:text-3xl mb-1 pr-10">
              {selectedItem.title}
            </h2>
            <p className="text-sm text-[#57534e] mb-4">
              by {selectedItem.author} •{' '}
              {selectedItem.tech === 'playable'
                ? 'Interactive (move mouse or click inside!)'
                : selectedItem.duration}
            </p>

            <div
              className="h-64 sm:h-80 border-2 border-[#1e1b18] rounded-xl overflow-hidden mb-5 bg-[#1e1b18] relative flex items-center justify-center"
            >
              {!selectedItem.thumbnailUrl && !mp4Url ? (
                <div className="w-full h-full">
                  <AnimationCanvas
                    demoType={selectedItem.demoType}
                    accent={selectedItem.accent}
                    reduceMotion={false}
                    interactive={true}
                  />
                </div>
              ) : mp4Url ? (
                <video
                  src={mp4Url}
                  poster={selectedItem.thumbnailUrl}
                  referrerPolicy="no-referrer"
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={selectedItem.thumbnailUrl}
                  alt={selectedItem.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
              {selectedItem.postUrl && (
                <a
                  href={selectedItem.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1"
                >
                  Open on X <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-marker text-lg">Opus Prompt</span>
                <button
                  onClick={() =>
                    handleCopy(selectedItem.prompt, selectedItem.id + '-modal')
                  }
                  className="sketch-btn bg-[#fde047] px-3 py-1 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === selectedItem.id + '-modal' ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy prompt
                    </>
                  )}
                </button>
              </div>
              <pre className="font-mono-code text-xs sm:text-sm bg-white border-2 border-[#1e1b18] rounded-xl p-4 whitespace-pre-wrap">
                {selectedItem.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
