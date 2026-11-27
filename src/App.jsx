import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { CATEGORIES, CURATED_SETS, ANIMATIONS, SKILLS_AND_TOOLS } from './data/animationsData';
import { DRIVE_SOURCES } from './data/driveSources';
import AnimationCanvas from './components/AnimationCanvas';

const detectSkills = (item) => {
  const text = `${item.title || ''} ${item.prompt || ''} ${item.category || ''}`.toLowerCase();
  const skills = [];
  if (/three\.?js|r3f|react three fiber/.test(text)) skills.push('Three.js');
  if (/remotion/.test(text)) skills.push('Remotion');
  if (/gsap|scrolltrigger/.test(text)) skills.push('GSAP');
  if (/manim/.test(text)) skills.push('Manim');
  if (/blender/.test(text)) skills.push('Blender');
  if (/p5\.?js|p5\.brush/.test(text)) skills.push('p5.js');
  if (/webgl|glsl|shader/.test(text)) skills.push('WebGL / Shaders');
  if (/ffmpeg/.test(text)) skills.push('FFmpeg');
  if (/lottie/.test(text)) skills.push('Lottie');
  if (/\bsvg\b/.test(text)) skills.push('SVG');
  if (/canvas/.test(text)) skills.push('HTML5 Canvas');
  if (/react/.test(text) && !skills.includes('Remotion')) skills.push('React');
  if (skills.length === 0) {
    if (item.category === '3d') skills.push('Three.js');
    else if (item.category === 'games' || item.tech === 'playable') skills.push('HTML5 Canvas');
    else skills.push('HTML / CSS / JS');
  }
  return skills.slice(0, 3);
};

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'library'
  const [activeCat, setActiveCat] = useState('all');
  const [activeSet, setActiveSet] = useState('all');
  const [activeFormat, setActiveFormat] = useState('all');
  const [activeTech, setActiveTech] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 180);
    return () => clearTimeout(t);
  }, [searchQuery]);
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
  const [openGuideId, setOpenGuideId] = useState(null);
  const [guidesSearch, setGuidesSearch] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [videoFallback, setVideoFallback] = useState({});
  const [openDriveDocId, setOpenDriveDocId] = useState(null);
  const [copiedDocId, setCopiedDocId] = useState(null);
  const [visitorCount, setVisitorCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem('opus_visits') || '1', 10) || 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    const fallbackVisit = () => {
      try {
        const next = (parseInt(localStorage.getItem('opus_visits') || '0', 10) || 0) + 1;
        localStorage.setItem('opus_visits', String(next));
        setVisitorCount(next);
      } catch {
        setVisitorCount(1);
      }
    };
    fetch('https://api.counterapi.dev/v1/opus-animations-library/visits/up')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.count) setVisitorCount(data.count);
        else fallbackVisit();
      })
      .catch(fallbackVisit);
  }, []);

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
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.prompt.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAnimations, activeCat, activeSet, activeFormat, activeTech, debouncedSearch]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      {/* Top Sketchbook Navbar */}
      <header className="sticky top-0 z-30 bg-[#fdfbf7] border-b-2 border-[#1e1b18] px-4 sm:px-8 py-3">
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
              className={`relative w-10 h-10 flex items-center justify-end transition-opacity duration-200 ${
                view === 'guides' || view === 'skills'
                  ? 'opacity-0 pointer-events-none'
                  : 'opacity-100'
              }`}
            >
              <div
                className={`absolute right-0 top-0 h-10 w-[calc(100vw-2rem)] sm:w-80 origin-right transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform z-20 ${
                  searchOpen || searchQuery
                    ? 'scale-x-100 opacity-100 pointer-events-auto'
                    : 'scale-x-0 opacity-0 pointer-events-none'
                }`}
              >
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534e] pointer-events-none" />
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
                  className="w-full h-full pl-9 pr-8 bg-white border-2 border-[#1e1b18] rounded-xl font-hand text-base focus:outline-none focus:ring-2 focus:ring-[#fde047]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (searchOpen || searchQuery) {
                    setSearchQuery('');
                    setSearchOpen(false);
                  } else {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 60);
                  }
                }}
                aria-label={searchOpen || searchQuery ? 'Close search' : 'Open search'}
                className={`relative z-10 flex items-center justify-center cursor-pointer transition-transform duration-200 ${
                  searchOpen || searchQuery
                    ? 'mr-2.5 text-[#57534e] hover:text-[#1e1b18] scale-100'
                    : 'sketch-btn bg-white w-10 h-10 p-2'
                }`}
              >
                {searchOpen || searchQuery ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setView('home')}
              className={`sketch-btn px-3 py-1.5 text-sm sm:text-base font-bold cursor-pointer ${
                view === 'home' ? 'bg-[#fde047]' : 'bg-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setView('skills')}
              className={`sketch-btn px-3 py-1.5 text-sm sm:text-base font-bold cursor-pointer ${
                view === 'skills' ? 'bg-[#bbf7d0]' : 'bg-white'
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setView('guides')}
              className={`sketch-btn px-3 py-1.5 text-sm sm:text-base font-bold cursor-pointer ${
                view === 'guides' ? 'bg-[#fda4af]' : 'bg-white'
              }`}
            >
              Guides &amp; Sources
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
        ) : view === 'guides' ? (
          <section>
            <div className="mb-8">
              <h1 className="font-marker text-3xl sm:text-5xl mb-2">
                Guides &amp;{' '}
                <span className="marker-highlight">Sources</span>
              </h1>
              <p className="font-caveat text-2xl text-[#57534e]">
                Step-by-step guides, prompts, and workflows. Click a guide to open.
              </p>
              <div className="mt-4 max-w-md relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#57534e]" />
                <input
                  type="text"
                  value={guidesSearch}
                  onChange={(e) => setGuidesSearch(e.target.value)}
                  placeholder="Search guides & sources..."
                  className="w-full pl-10 pr-8 py-2 bg-white border-2 border-[#1e1b18] rounded-xl font-hand text-sm focus:outline-none"
                />
                {guidesSearch && (
                  <button
                    type="button"
                    onClick={() => setGuidesSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#57534e]"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {openGuideId ? (
              <div>
                <button
                  type="button"
                  onClick={() => setOpenGuideId(null)}
                  className="sketch-btn bg-white px-3.5 py-1.5 text-sm font-bold mb-6 cursor-pointer"
                >
                  ← Back to Guides
                </button>

                {openGuideId === 'reverse-engineer' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#fde047] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        Video Workflow • 3 Steps
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        How to Reverse Engineer any type of video
                      </h2>
                    </div>
                    {[
                      {
                        id: 'guide-step-1',
                        step: '1/ Download the video you want to recreate.',
                        body: `Save the video from the social media platform where you found it.\n\nMake sure you have a copy available on your device before moving to the next step.`,
                      },
                      {
                        id: 'guide-step-2',
                        step: '2/ Upload the video to Gemini.',
                        body: `Open Gemini, attach the downloaded video, and paste this prompt:\n\n"Analyse this video in detail, scene by scene and frame by frame where possible.\n\nIdentify the main subject, actions, environment, camera angles, camera movements, lighting, colour grading, composition, transitions, visual effects, and overall aesthetic.\n\nUsing your analysis, write a detailed AI video generation prompt specifically optimised for Seedance 2.5\n\nPreserve the original video's visual style, sequence of events, shot composition, movement, and pacing as closely as possible.\n\nBreak down complex scenes into individual shots and provide clear instructions for recreating each one.\n\nMake the final prompt specific, descriptive, and ready to use."\n\nBONUS: Want to appear in the recreated video?\n\nUpload a clear reference photo of yourself and add:\n\n"Use the person in my uploaded reference photo as the main character instead of the original subject. Preserve their recognisable facial features and overall appearance throughout the video."`,
                      },
                      {
                        id: 'guide-step-3',
                        step: '3/ Generate your recreated video.',
                        body: `Copy the finished prompt and paste it into your preferred AI video generator.\n\nUse the generated instructions alongside your reference images to recreate the video's scenes and visual style.\n\nYou can now turn a video you admire into a detailed AI generation prompt and use it as the blueprint for your own creation.`,
                      },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="font-marker text-xl">{s.step}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopy(s.body, s.id)}
                            className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === s.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy step
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-hand text-base whitespace-pre-wrap text-[#1e1b18]/90">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {openGuideId === 'roblox-3d' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#bae6fd] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        Roblox 3D • Prompts
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        Roblox 3D Model Generation &amp; Studio AI
                      </h2>
                    </div>
                    {[
                      {
                        id: 'roblox-step-1',
                        step: '1/ Prompt: Generate a Roblox-Ready 3D Model (Blender + MeshPart)',
                        body: `Create a Roblox-ready 3D model of [YOUR OBJECT, e.g., stylized medieval lantern] using Blender Python (bmesh).\n\nRequirements:\n- Keep total triangle count under 10,000 tris (Roblox MeshPart limit is 20k).\n- Ensure clean, watertight manifold geometry with no N-gons or inverted normals.\n- Scale in Roblox studs (1 Blender meter = 1 stud) with pivot centered at the bottom.\n- Unwrap clean UVs onto a single 1024x1024 texture atlas.\n- Export as FBX/GLB ready for Roblox Studio MeshPart import, plus a simple collision proxy.`,
                      },
                      {
                        id: 'roblox-step-2',
                        step: '2/ Prompt: Clean Up an AI-Generated 3D Mesh (Hunyuan3D / Meshy) for Roblox',
                        body: `Inspect this raw AI-generated 3D mesh and prepare it for Roblox Studio:\n\n1. Check for non-manifold edges, duplicate/loose vertices, and inward faces.\n2. Decimate cleanly to under 12,000 triangles while preserving the silhouette.\n3. Bake materials/colors into a single 1024px texture.\n4. Set origin/pivot to the base center and scale to [X] studs tall.\n5. Export as .fbx and list the exact MeshPart import settings (CollisionFidelity, RenderFidelity).`,
                      },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="font-marker text-xl">{s.step}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopy(s.body, s.id)}
                            className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === s.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy step
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-hand text-base whitespace-pre-wrap text-[#1e1b18]/90">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {openGuideId === 'yta-niche' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#bbf7d0] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        YTA • YouTube Automation
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        YTA Niche Playbook: Faceless &amp; Documentary Videos
                      </h2>
                    </div>
                    {[
                      {
                        id: 'yta-step-1',
                        step: '1/ Prompt: High-Retention YTA Script & Hook (Documentary / Finance / Tech)',
                        body: `Write a 8-minute YouTube Automation script on [TOPIC] in a high-retention documentary style.\n\nStructure:\n- 0:00–0:30: Pattern-interrupt hook with a bold claim or mystery.\n- 0:30–1:30: Setup & stakes (why the viewer should care right now).\n- Body: 4–5 escalating chapters with open loops at the end of each.\n- Include [VISUAL CUE: ...] tags every 5–8 seconds for motion graphics, maps, or B-roll.`,
                      },
                      {
                        id: 'yta-step-2',
                        step: '2/ Prompt: Generate Animated Explainer Scenes (Opus / Remotion)',
                        body: `Create a 16:9 dark-mode documentary motion graphic scene explaining [CONCEPT/STATISTIC].\n\nInclude:\n- Smooth kinetic typography for key numbers and dates.\n- Minimalist vector map/chart animation with glowing accent lines.\n- Subtle film grain, 60fps easing, and clean 2-second transitions between beats.`,
                      },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="font-marker text-xl">{s.step}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopy(s.body, s.id)}
                            className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === s.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy step
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-hand text-base whitespace-pre-wrap text-[#1e1b18]/90">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {openGuideId === 'clipping-niche' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#fda4af] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        Clipping • Shorts / Reels / TikTok
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        Clipping Niche Playbook: Viral 9:16 Shorts &amp; Reels
                      </h2>
                    </div>
                    {[
                      {
                        id: 'clip-step-1',
                        step: '1/ Prompt: Find Viral Clip Moments from Long-Form Video',
                        body: `Analyze this transcript/video and extract the top 5 viral 30–60 second moments for YouTube Shorts, Reels, and TikTok.\n\nFor each clip, provide:\n- Exact start/end timestamps.\n- A 3-second scroll-stopping hook line.\n- Why it triggers emotion, curiosity, or debate.`,
                      },
                      {
                        id: 'clip-step-2',
                        step: '2/ Prompt: Style 9:16 Kinetic Captions & Retention Edits',
                        body: `Format this clip for 9:16 vertical (1080x1920) with:\n- Dynamic speaker-centered crop and subtle zoom-ins every 3–4 seconds.\n- Bold, word-by-word kinetic captions (2–3 words per line, yellow highlight on power words).\n- Sound effects (whoosh on cuts, subtle riser before the punchline) and clean loop ending.`,
                      },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="font-marker text-xl">{s.step}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopy(s.body, s.id)}
                            className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === s.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy step
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-hand text-base whitespace-pre-wrap text-[#1e1b18]/90">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {openGuideId === 'master-prompt' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#d8b4fe] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        Framework • Text &amp; Template
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        Master Prompt
                      </h2>
                    </div>

                    {[
                      {
                        id: 'master-framework-full',
                        step: '1/ Master Prompt Framework (Full 5-Step Guide)',
                        body: `1. Set the Role\nTell the AI what role it should assume before performing the task.\nExamples:\n- "You are an expert digital marketer..."\n- "Act as a professional script writer..."\n- "You are a senior software developer..."\nThis helps the AI understand the perspective and level of expertise required.\n\n2. Clearly Define the Task\nSpecify exactly what you want.\nExamples:\n- "Write a 30-second script for an Instagram reel..."\n- "Create a login system in Python..."\nBe precise. The clearer the instruction, the better the output.\n\n3. Provide Context\nGive background information so the AI doesn't have to guess.\nContext improves relevance and accuracy.\n\n4. Specify the Output Format (Very Important)\nTell the AI how you want the response structured.\nExamples:\n- "Provide the output in bullet points..."\n- "Present the information in table format..."\n- "Write in simple and clear English..."\nClear formatting instructions produce cleaner results.\n\n5. Add Constraints\nSet limits or conditions for the response.\nExamples:\n- "Maximum 200 words..."\n- "Avoid technical jargon..."\n- "Make it beginner-friendly..."\nConstraints help control length, tone, and complexity.`,
                      },
                      {
                        id: 'master-prompt-template',
                        step: '2/ Universal Master Prompt Template (Professional Version)',
                        body: `You are a [define the expert role clearly, e.g., senior digital marketing strategist / professional scriptwriter / software engineer].\n\nYour task is to [clearly describe what you want the AI to do].\n\nContext:\n- Background information:\n- Target audience:\n- Platform or medium (if applicable):\n- Objective or goal:\n\nRequirements:\n- Tone and style:\n- Word limit (if any):\n- Format (bullet points, table, step-by-step, essay, script, etc.):\n- Key points that must be included:\n- Things to avoid:\n\nAdditional Instructions:\n- Make the response practical and actionable.\n- Keep it clear, structured, and easy to understand.\n- If necessary, ask clarifying questions before proceeding.`,
                      },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="font-marker text-xl">{s.step}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopy(s.body, s.id)}
                            className="sketch-btn bg-[#fde047] px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === s.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy text
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-hand text-base whitespace-pre-wrap text-[#1e1b18]/90">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {openGuideId === 'drive-sources' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="inline-block bg-[#fde047] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                          Google Drive • PDFs, Docs &amp; Scripts
                        </span>
                        <h2 className="font-marker text-2xl sm:text-3xl">
                          Niche Guides &amp; Value Vault Sources
                        </h2>
                      </div>
                      <a
                        href="https://drive.google.com/drive/folders/1Up82oapBIUpKhj8QXprKIMMPrKYvBVbe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sketch-btn bg-[#bae6fd] px-3.5 py-1.5 text-sm font-bold inline-flex items-center gap-1.5"
                      >
                        Open Drive Folder <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="space-y-3">
                      {DRIVE_SOURCES.map((doc) => {
                        const isOpen = openDriveDocId === doc.id;
                        const isCopied = copiedDocId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="inline-block text-[10px] font-mono-code font-bold bg-[#fef08a] border border-[#1e1b18] rounded px-1.5 py-0.5 mr-2">
                                  {doc.type}
                                </span>
                                <span className="font-hand font-bold text-sm">
                                  {doc.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDriveDocId(isOpen ? null : doc.id)
                                  }
                                  className="sketch-btn bg-[#bae6fd] px-3 py-1.5 text-xs font-bold"
                                >
                                  {isOpen ? 'Hide' : 'View'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(doc.content);
                                    setCopiedDocId(doc.id);
                                    setTimeout(() => setCopiedDocId(null), 1500);
                                  }}
                                  className="sketch-btn bg-[#bbf7d0] px-3 py-1.5 text-xs font-bold"
                                >
                                  {isCopied ? 'Copied!' : 'Copy'}
                                </button>
                                <a
                                  href={`https://drive.google.com/uc?export=download&id=${doc.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sketch-btn bg-white px-3 py-1.5 text-xs font-bold"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                            {isOpen && (
                              <pre className="bg-white border border-[#1e1b18] rounded-lg p-4 text-xs font-mono-code whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {doc.content}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {openGuideId?.startsWith('doc-') && (() => {
                  const doc = DRIVE_SOURCES.find((d) => `doc-${d.id}` === openGuideId);
                  if (!doc) return null;
                  const isCopied = copiedDocId === doc.id;
                  return (
                    <div className="sketch-box bg-white p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="inline-block bg-[#fde047] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                            {doc.type} • Source
                          </span>
                          <h2 className="font-marker text-2xl sm:text-3xl">
                            {doc.name.replace(/\.(pdf|docx|txt)$/i, '')}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(doc.content);
                              setCopiedDocId(doc.id);
                              setTimeout(() => setCopiedDocId(null), 1500);
                            }}
                            className="sketch-btn bg-[#bbf7d0] px-3.5 py-1.5 text-sm font-bold"
                          >
                            {isCopied ? 'Copied!' : 'Copy'}
                          </button>
                          <a
                            href={`https://drive.google.com/uc?export=download&id=${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sketch-btn bg-white px-3.5 py-1.5 text-sm font-bold"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                      <pre className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 text-xs font-mono-code whitespace-pre-wrap overflow-x-auto">
                        {doc.content}
                      </pre>
                    </div>
                  );
                })()}

                {/* Standalone Playbook Sections */}

                    {openGuideId === 'video-tutorials' && (
                  <div className="sketch-box bg-white p-6 space-y-6">
                    <div>
                      <span className="inline-block bg-[#bae6fd] border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2">
                        Videos • 4 Parts
                      </span>
                      <h2 className="font-marker text-2xl sm:text-3xl">
                        Video Tutorials (PART 1 – 3.1)
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: 'PART 1.mp4', id: '1mK5js_AVYGgF-5BpzIqyskZFy-CFUK-h' },
                        { name: 'PART 2.mp4', id: '1KEGwtJWF-WLkTEjvgRDdZ1GZUEFkiNab' },
                        { name: 'PART 3.mp4', id: '1l1ls1HWiOnEPfaiZXcN3j-XuZ2EaHEEv' },
                        { name: 'PART 3.1 (CONTINUE).mp4', id: '1IL2mblo33zEaj-WlwQFOp-8ooHPRIpqD' },
                      ].map((v) => (
                        <div
                          key={v.id}
                          className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-marker text-base">{v.name}</h3>
                            <a
                              href={`https://drive.google.com/file/d/${v.id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sketch-btn bg-[#fef08a] px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {playingVideoId === v.id ? (
                            videoFallback[v.id] ? (
                              <iframe
                                src={`https://drive.google.com/file/d/${v.id}/preview`}
                                title={v.name}
                                className="w-full aspect-video rounded-lg border border-[#1e1b18] bg-black"
                                allow="autoplay; fullscreen"
                                allowFullScreen
                              />
                            ) : (
                              <video
                                src={`https://drive.google.com/uc?export=download&id=${v.id}`}
                                controls
                                autoPlay
                                playsInline
                                onError={() => setVideoFallback((prev) => ({ ...prev, [v.id]: true }))}
                                className="w-full aspect-video rounded-lg border border-[#1e1b18] bg-black"
                              />
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPlayingVideoId(v.id)}
                              className="relative w-full aspect-video rounded-lg border-2 border-[#1e1b18] overflow-hidden bg-[#1e1b18] group cursor-pointer block"
                            >
                              <img
                                src={`https://drive.google.com/thumbnail?id=${v.id}&sz=w800`}
                                alt={v.name}
                                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                                loading="lazy"
                              />
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-14 h-14 rounded-full bg-[#fde047] border-2 border-[#1e1b18] shadow-[3px_3px_0px_#1e1b18] flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <Play className="w-6 h-6 text-[#1e1b18] fill-[#1e1b18] ml-0.5" />
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {openGuideId === "yta-resources" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-4">
                      <h3 className="font-marker text-xl">#-yta-resources</h3>

                      <div>
                        <h4 className="font-bold text-sm mb-1">Recommended SIM Options &amp; SMS Virtual</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          <li><strong>GOMO / TM / Globe</strong> lang ang palaging gamitin — pinaka-stable, trusted, at low chance ma-flag ni YouTube as spam. Avoid Smart or TNT for fresh accounts.</li>
                          <li><strong>Tipid Method (SMS Virtual):</strong> Download <em>&quot;SMS Virtual – Receive SMS&quot;</em> from Play Store (~₱19 per number activation).</li>
                          <li><strong>Optimal Timing:</strong> 10:00 PM – 12:00 AM (PH time) for faster code delivery.</li>
                          <li><strong>Country to Use:</strong> Choose <strong>Hongkong</strong> in the app and set YouTube number verification region to Hongkong.</li>
                          <li><strong>Strategic Reminders:</strong> Use virtual number once per Gmail/YT; if code doesn&apos;t arrive within 5 mins, cancel &amp; generate a new number; don&apos;t change number for at least 7 days; update recovery email &amp; password right after activation.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm mb-2">Repetitive / Reused Content Checks &amp; Appeals</h4>
                        <div className="space-y-3">
                          {[
                            {
                              id: '1se4N1TjtTi4x_ByHm6Z_7Gv5Z7gfowRC',
                              type: 'drive',
                              title: 'Paano Malalaman Kung Repetitive o Paulit-ulit na ang Isang Video',
                              url: 'https://drive.google.com/file/d/1se4N1TjtTi4x_ByHm6Z_7Gv5Z7gfowRC/view?usp=sharing',
                            },
                            {
                              id: 'yXmOq_py09M',
                              type: 'youtube',
                              title: 'Reused Content Proper Appeal',
                              url: 'https://youtu.be/yXmOq_py09M?si=p4lgbS-0bP_K59ef',
                            },
                            {
                              id: '2cdiRopMoeQ',
                              type: 'youtube',
                              title: 'Tutorial on How to Create Zack D. Films Videos Using AI (ReachMora)',
                              url: 'https://youtu.be/2cdiRopMoeQ?si=SNH2dJQRY6bVabvk',
                            },
                          ].map((vid) => (
                            <div key={vid.id} className="bg-white border-2 border-[#1e1b18] rounded-xl p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-bold text-xs sm:text-sm text-[#1e1b18] leading-snug">{vid.title}</span>
                                <a
                                  href={vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 text-xs font-bold bg-[#fde047] border border-[#1e1b18] rounded-lg hover:bg-[#fef08a] inline-flex items-center gap-1 shrink-0"
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              {playingVideoId === vid.id ? (
                                vid.type === 'youtube' ? (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${vid.id}?autoplay=1`}
                                    title={vid.title}
                                    className="w-full aspect-video rounded-lg border border-[#1e1b18] bg-black"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    allowFullScreen
                                  />
                                ) : videoFallback[vid.id] ? (
                                  <iframe
                                    src={`https://drive.google.com/file/d/${vid.id}/preview`}
                                    title={vid.title}
                                    className="w-full aspect-video rounded-lg border border-[#1e1b18] bg-black"
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video
                                    src={`https://drive.google.com/uc?export=download&id=${vid.id}`}
                                    controls
                                    autoPlay
                                    playsInline
                                    onError={() => setVideoFallback((prev) => ({ ...prev, [vid.id]: true }))}
                                    className="w-full aspect-video rounded-lg border border-[#1e1b18] bg-black"
                                  />
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPlayingVideoId(vid.id)}
                                  className="relative w-full aspect-video rounded-lg border-2 border-[#1e1b18] overflow-hidden bg-[#1e1b18] group cursor-pointer block"
                                >
                                  <img
                                    src={
                                      vid.type === 'youtube'
                                        ? `https://img.youtube.com/vi/${vid.id}/hqdefault.jpg`
                                        : `https://drive.google.com/thumbnail?id=${vid.id}&sz=w800`
                                    }
                                    alt={vid.title}
                                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                                    loading="lazy"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-14 h-14 rounded-full bg-[#fde047] border-2 border-[#1e1b18] shadow-[3px_3px_0px_#1e1b18] flex items-center justify-center group-hover:scale-105 transition-transform">
                                      <Play className="w-6 h-6 text-[#1e1b18] fill-[#1e1b18] ml-0.5" />
                                    </span>
                                  </span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm mb-1">Prompt for Reused Content Appeal</h4>
                        <pre className="bg-white border border-[#1e1b18] rounded-lg p-3 text-xs font-mono-code whitespace-pre-wrap">
{`Voiceover: "Hello. I'm the creator behind [CHANNEL NAME], a channel dedicated to [CHANNEL/CONTENT DESCRIPTION]. Today, I'm reaching out to appeal the recent monetization decision affecting our community. [Visuals: Clips of your video editing process, showing your work on commentary] Voiceover: "At first glance, our use of clips from various sources might appear as reused content. However, this is a fundamental misunderstanding of our work. These clips are essential, serving as the foundation upon which we build our in-depth analysis and commentary." [Visuals: Side-by-side comparison of original clips and your edited, annotated versions] Voiceover: "Each video undergoes extensive editing to not just show, but to critically examine and underline [CHANNEL/CONTENT DESCRIPTION]. This transformation is crucial, adding educational value and insights that go far beyond the original footage." [Visuals: Fair Use doctrine highlights, emphasizing educational and transformative use] Voiceover: "Our approach is squarely within the bounds of fair use, designed to educate and provoke thought among our viewers. We spend a lot of time crafting each video to ensure it contributes meaningfully to the discourse on [CHANNEL/CONTENT DESCRIPTION]." [Closing Visuals: A sincere appeal to the YouTube team] Voiceover: "We understand and respect YouTube's guidelines and the importance of protecting content creators. That's why we're committed to ensuring our work not only meets but exceeds the criteria for fair use, offering unique, value-added content to our audience. We kindly request a reconsideration of our channel's monetization status. We're prepared to make any necessary adjustments to align with YouTube's policies and guidelines. Thank you for your time and for the opportunity to continue contributing positively to the YouTube community."`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm mb-1">Retention Rate Targets (Above 70% in first 30–60s)</h4>
                        <p className="text-sm text-[#57534e] mb-2">
                          Hook viewers in the first 3 seconds, then sustain interest up to the 1-minute mark. High retention = high satisfaction signal sa algorithm.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono-code bg-white border border-[#1e1b18] rounded-lg p-3">
                          <span>🔥 30s: 83–93% (Excellent hook)</span>
                          <span>🚀 31s: 82–92% (Konting drop lang)</span>
                          <span>⚡ 32s: 82–91% (Holding well)</span>
                          <span>🎯 33s: 81–91% (Top percentile)</span>
                          <span>💯 34s: 80–90% (Solid start)</span>
                          <span>🧠 35s: 80–90% (Viewers focused)</span>
                          <span>✅ 36s: 79–90% (No red flags yet)</span>
                          <span>📈 37s: 78–89% (Smooth pacing)</span>
                          <span>🎬 38s: 78–89% (Walang dead air)</span>
                          <span>🧍 53s: 69–81% (Consider transitions)</span>
                          <span>💤 54s: 68–80% (Huwag maging boring)</span>
                          <span>😴 55s: 68–80% (Try cutaways/shifts)</span>
                          <span>🕳️ 56s: 67–79% (Baka mahaba intro)</span>
                          <span>🤯 57s: 67–78% (Clarity issue?)</span>
                          <span>⚫ 58s: 66–78% (Wrap or tease next)</span>
                          <span>🚫 59s: 65–77% (Major drop / disconnect)</span>
                        </div>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "fba-resources" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-4">
                      <h3 className="font-marker text-xl">#-fba-resources</h3>
                      <div>
                        <h4 className="font-bold text-sm mb-1">Facebook Automation Workflow Notes</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          <li>When the image is generated just type <code>&quot;Value Vault&quot;</code>.</li>
                          <li>There must be two generated images — from step 2 and step 7.</li>
                          <li>If ChatGPT did not generate the step 7 image, complete the prompt until STEP 8 and type <code>&quot;You didn&apos;t generate the storyboard or Generate the storyboard&quot;</code>.</li>
                          <li>Download a 3D character from Chrome or Pinterest.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1">Prompt for Facebook SEO</h4>
                        <pre className="bg-white border border-[#1e1b18] rounded-lg p-3 text-xs font-mono-code whitespace-pre-wrap">
{`You are a Facebook Reels SEO expert.

Your task is to analyze the script I provide and create:
1. A highly engaging Facebook Reels description (1-2 short sentences only).
2. The description must be SEO-optimized using relevant keywords from the script.
3. The description should encourage engagement naturally without sounding spammy.
4. Create exactly 5 SEO-optimized hashtags related to the video's topic.
5. Use only hashtags that are relevant to the content.
6. Do not use emojis unless they fit naturally.
7. Keep the description clean, concise, and optimized for Facebook Reels discovery.
8. Output format:

Description:
[SEO-optimized description]

Hashtags:
#Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5

Wait for my script before generating anything.`}
                        </pre>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "niches-vault" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-4">
                      <h3 className="font-marker text-xl">#-niches</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white border border-[#1e1b18] rounded-lg p-4">
                          <h4 className="font-bold mb-1">American Nostalgia (Tier 1–2)</h4>
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li>Pure AI generated</li>
                            <li>Caption from any editing app</li>
                            <li>Reference: <strong>LiterallyNostalgia</strong> (349K followers)</li>
                          </ul>
                        </div>
                        <div className="bg-white border border-[#1e1b18] rounded-lg p-4">
                          <h4 className="font-bold mb-1">Nostalgia PH Version (Philippines)</h4>
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li>Tools: ChatGPT (ideas), ChatGPT/Claude (prompt), Grok/Flow (animation), CapCut (editing)</li>
                            <li>Reference: <strong>Pinoy Core Memory</strong> (42K followers)</li>
                          </ul>
                        </div>
                        <div className="bg-white border border-[#1e1b18] rounded-lg p-4">
                          <h4 className="font-bold mb-1">Christmas (Tier 1 &amp; 2 • FBA)</h4>
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li>Pure AI generated</li>
                            <li>Reference: <strong>Home for Christmas</strong> (223K followers)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "stickers-voices" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#-stickers &amp; Recommended AI Voices</h3>
                      <p className="text-sm">
                        <strong>ICONS PART 1:</strong>{' '}
                        <a href="https://drive.google.com/drive/folders/1BDnxHDWOcQ9ioSlUiPAvbGubkYDlHqso" target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#1e1b18]">
                          Open Google Drive Folder
                        </a>
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {[
                          'Jessica (Young & popular, playful American)',
                          'Alex (Young American Male, upbeat)',
                          'Brian (Middle-aged, resonant)',
                          'Adam (Bright tenor pitch)',
                          'Daniel (Strong voice)',
                        ].map((v) => (
                          <span key={v} className="bg-white border border-[#1e1b18] rounded-full px-3 py-1 font-bold">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "channel-warmup" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#channel-warm-up</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1.5">
                        <li><strong>Option 1 – Bagong Channel (Bagong Gmail):</strong> 5–10 days warm-up. Setup profile pic, banner, description. Verify phone number (2nd option), wag muna 3rd option (Advanced Features). Engagement: watch 10 Shorts, like 10, comment 10, subscribe + like 1 direct competitor (max 10 engagements total), then exit. Upload 10:30 PM or 11:55 PM PH time, US location/residency, wag mag-edit sa Studio after upload. Enable Advanced Features after 5 uploads.</li>
                        <li><strong>Option 2 – Lumang Gmail / Channel na Ire-rebrand:</strong> 1–3 months inactive bago magpalit ng niche. Private old videos for 1 week before deleting. Clear Watch &amp; Search history, unsubscribe all, subscribe to 1 aligned competitor.</li>
                        <li><strong>Option 3 – Old Gmail (2020 pababa, never used on YouTube):</strong> Treat like Option 1 (2 days warm-up). Higher account-age trust.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "account-warmup-plan" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#account-warmup-plan</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li><strong>Day 1 – Account Setup:</strong> Create Gmail &amp; YT channel. Add profile pic, banner, description ONLY. Do NOT upload, change settings, subscribe, or interact. Sign out &amp; remove account from device.</li>
                        <li><strong>Day 2–9 – Cooling Period:</strong> Do not log in or interact at all (8 days rest).</li>
                        <li><strong>Day 10 – Activation &amp; Engagement:</strong> Log back in, do 10/10/10 method (watch 10, like 10, comment 10), update settings, begin uploading.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "grind-guide" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#grind-guide</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Create a new Gmail &amp; YT channel every 48 hours (target 2 accounts/week for backups).</li>
                        <li><strong>Video Flow Format:</strong> <code>HOOK → BODY → CTA → REVEAL</code> (place CTA in the middle, never at the start; hook in 0–4s).</li>
                        <li>Script + clips are the foundation; editing amplifies. Don&apos;t forget thumbnail.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "upload-time-analysis" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#upload-time-analysis (PH Time)</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li><strong>Option 1 (New Channel + New Gmail, 5–10d warm-up):</strong> Mon–Fri 11:55 PM | Sat–Sun 9:00 PM (targets 8 AM–12 PM EST US).</li>
                        <li><strong>Option 2 (New Channel + Old Gmail, 3–10d warm-up):</strong> Mon–Fri 10:00–10:30 PM | Sat–Sun 11:55 PM.</li>
                        <li><strong>Option 3 (Old Channel + Old Gmail, No warm-up):</strong> Mon–Fri 10:00–11:00 PM | Sat–Sun 11:55 PM.</li>
                        <li><strong>Option 4 (Revived / Rebrand):</strong> Mon–Fri 12:00 AM–2:00 AM | Sat–Sun 10:00 PM.</li>
                        <li><em>Reminder:</em> Rotate upload time by ±5–15 mins daily. Track YouTube Studio &gt; Audience &gt; Top Geographies.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "momentum-building" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#momentum-building</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li><strong>Phase 1 (First 2–20 mins):</strong> Target 100–120 organic views = positive algo signal.</li>
                        <li><strong>Phase 2 (20 mins–1 hr):</strong> Below 10 views after 1 hr = bad sign (weak warm-up, poor metadata, wrong timing, or flagged).</li>
                        <li><strong>Phase 3 (If 2–3 uploads flop):</strong> Reset with fresh Gmail + new channel, re-warm-up properly, tweak title/hashtags/thumbnail, upload 10:30 PM–12 MN PH time. Test 5 uploads; if 3/5 flop, reset.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "cta-frameworks" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#cta-frameworks</h3>
                      <p className="text-sm">Rotate audience targeting &amp; wording every video to avoid spam/shadowban (Teens, Pet lovers, Family, Couples, Gen Z, Nostalgic, Curious, Creators). Never copy-paste exact scripts. Limit to 1 clear CTA per video, switch positions (intro vs middle), use visual cues.</p>
                    </div>

                                      </div>
                )}

                {openGuideId === "account-creation-guide" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#account-creation-guide</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Choose <strong>Personal</strong> Gmail (18+), always add phone number &amp; recovery email.</li>
                        <li>Use separate Chrome Profiles / Incognito + rotate IP/mobile data; max 3–4 accounts/day per device; avoid <code>user1@</code> naming patterns.</li>
                        <li><strong>Channel Setup:</strong> Country = <strong>United States</strong>, Not made for kids, add Channel Keywords/Tags, verify 2 features first (reserve 3rd for after 5 uploads), upload as <strong>Unlisted</strong> first, Category = <strong>People &amp; Blogs</strong>, Video/Title Language = <strong>English (US)</strong>, turn OFF show likes/dislikes.</li>
                      </ul>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <img
                          src="/images/yt-channel-basic-info.webp"
                          alt="YouTube Studio Channel Basic Info Settings"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                        <img
                          src="/images/yt-channel-advanced-settings.webp"
                          alt="YouTube Studio Channel Advanced Settings"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                        <img
                          src="/images/yt-upload-defaults-basic.webp"
                          alt="YouTube Studio Upload Defaults Basic Info"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                        <img
                          src="/images/yt-upload-defaults-advanced-1.webp"
                          alt="YouTube Studio Upload Defaults Advanced Settings 1"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                        <img
                          src="/images/yt-upload-defaults-advanced-2.webp"
                          alt="YouTube Studio Upload Defaults Advanced Settings 2"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                        <img
                          src="/images/yt-feature-eligibility.webp"
                          alt="YouTube Studio Feature Eligibility"
                          className="w-full rounded-lg border-2 border-[#1e1b18]"
                          loading="lazy"
                        />
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "channel-revival" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#channel-revival</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Wait 1–3 months inactive before rebranding. If recent upload in past 30 days, set to Private for 7 full days then delete.</li>
                        <li>Complete rebrand: name, profile pic, banner, about section. Clear Watch &amp; Search history, unsubscribe from unrelated channels, subscribe to 1–2 aligned creators, remove old playlists/unlisted videos, set new niche-only keywords.</li>
                        <li>Do passive warm-up (watch, comment organically, engage 1–3 days) before uploading. Rephrase scripts &amp; rotate CTAs.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "deletion-truth" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#deletion-truth</h3>
                      <p className="text-sm">
                        Deleting videos is allowed, but frequent deletion hurts performance history, watch time/views, subscriber trust, and can cause &quot;shadow impact.&quot; <strong>Safer alternative:</strong> Set to <strong>Private</strong> instead of deleting.
                      </p>
                      <img
                        src="/images/yt-deletion-risk-timeline.png"
                        alt="YouTube Video Deletion Risk Timeline"
                        className="w-full rounded-lg border-2 border-[#1e1b18]"
                        loading="lazy"
                      />
                    </div>

                                      </div>
                )}

                {openGuideId === "visibility-troubleshooting" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#visibility-trouble-shooting</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li><strong>1K View Jail:</strong> Stuck in small-pocket testing. Escape by changing format/hook, focusing on first 30s retention, editing with intention (zooms, crop cuts, text), fixing metadata, and avoiding mass-uploads.</li>
                        <li><strong>Low STW (Subscriber-to-Watch):</strong> Make &quot;Part 2&quot; of top performers, run Community Tab polls, check for dead subs.</li>
                        <li><strong>Flatline / 0 Views:</strong> Change title &amp; thumbnail, trim first 30s dead space, private &amp; re-upload after 3–5 days, or start fresh (new SIM, IP/browser, proper setup).</li>
                        <li><strong>30K View Jail:</strong> Audit your viral video and make a &quot;spiritual sequel&quot;; don&apos;t abruptly shift style/topic right after a viral hit.</li>
                        <li><strong>1 Week Low Views (&lt;1K / &lt;100):</strong> Pause uploads 3–5 days, revisit format/pacing, test 6–9 PM or 12–2 AM, or study 5 new channels (&lt;5K subs) with consistent growth.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "anti-spam-strategy" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#anti-spam-strategy</h3>
                      <p className="text-sm">Rotate CTA style, topic, and placement daily to avoid duplicate-behavior flags:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs bg-white border border-[#1e1b18] rounded-lg p-3">
                        <span>📅 <strong>Mon:</strong> CTA about dogs</span>
                        <span>📅 <strong>Tue:</strong> CTA about cats</span>
                        <span>📅 <strong>Wed:</strong> CTA about family/parents</span>
                        <span>📅 <strong>Thu:</strong> CTA connected to school/education</span>
                        <span>📅 <strong>Fri:</strong> CTA related to mystery/surprise</span>
                        <span>📅 <strong>Sat:</strong> CTA aligned to video topic</span>
                        <span>📅 <strong>Sun:</strong> CTA for viewer emotions/values</span>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "elevenlabs-support" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#11labs-support</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Before hitting 1k credits, create a new Gmail &amp; 11Labs account.</li>
                        <li><strong>IP Ban Prevention:</strong> Switch connection (data hotspot / pocket WiFi, or restart router 30 mins) before switching accounts.</li>
                        <li>Use Incognito / clear cookies; don&apos;t reuse recovery email or phone number across multiple 11Labs accounts.</li>
                      </ul>
                    </div>

                                      </div>
                )}

                {openGuideId === "creators-tools" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#creators-tools</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { name: 'Looka Business Name Generator', url: 'https://looka.com/business-name-generator/' },
                          { name: 'Namelix', url: 'https://namelix.com/' },
                          { name: 'Pinterest', url: 'https://pinterest.com/' },
                          { name: 'ChatGPT', url: 'https://chat.openai.com/' },
                          { name: 'Google Gemini', url: 'https://gemini.google.com/app' },
                          { name: 'ElevenLabs', url: 'https://elevenlabs.io/' },
                          { name: 'Google AI Studio', url: 'https://aistudio.google.com/prompts/new_chat' },
                          { name: 'Vizard.ai Transcription', url: 'https://vizard.ai/upload?from=transcription&tool-page=%2Fen%2Ftools%2Ftranscription' },
                          { name: 'DownSub', url: 'https://downsub.com/' },
                          { name: 'CapCut (April Windows)', url: 'https://capcut.uptodown.com/windows/download/5084010' },
                          { name: 'Cobalt Tools', url: 'https://cobalt.tools/' },
                          { name: 'MyInstants Soundboard', url: 'https://www.myinstants.com/en/index/us/' },
                          { name: 'CnvMP3 (YT to MP3/MP4)', url: 'https://cnvmp3.com/' },
                          { name: 'Tikmate.app', url: 'https://tikmate.app/' },
                          { name: 'Tikmate.io', url: 'https://tikmate.io/' },
                          { name: 'TikDownloader.io', url: 'https://tikdownloader.io/en' },
                        ].map((t) => (
                          <a
                            key={t.url}
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-[#1e1b18] rounded-lg px-3 py-2 font-bold flex items-center justify-between hover:bg-[#fef08a] transition-colors"
                          >
                            <span>{t.name}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "stock-footage-hub" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#stock-footage-hub</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <h4 className="font-bold text-sm mb-1.5">Free Stock Footage Sites</h4>
                          <ul className="space-y-1">
                            {[
                              ['Pexels', 'https://www.pexels.com/videos/'],
                              ['Pixabay', 'https://pixabay.com/videos/'],
                              ['Videezy', 'https://www.videezy.com/'],
                              ['Coverr', 'https://coverr.co/'],
                              ['Mixkit', 'https://mixkit.co/'],
                              ['Life of Vids', 'https://www.lifeofvids.com/'],
                              ['Splitshire', 'https://www.splitshire.com/'],
                              ['Distill', 'https://www.wedistill.io/'],
                              ['Mazwai', 'https://mazwai.com/'],
                              ['Clipstill', 'https://clipstill.com/'],
                            ].map(([n, u]) => (
                              <li key={u}>
                                <a href={u} target="_blank" rel="noopener noreferrer" className="underline font-bold">{n}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-1.5">Paid / Premium Stock Footage Sites</h4>
                          <ul className="space-y-1">
                            {[
                              ['Storyblocks', 'https://www.storyblocks.com/'],
                              ['Artgrid', 'https://artgrid.io/'],
                              ['Envato Elements', 'https://elements.envato.com/'],
                              ['Shutterstock', 'https://www.shutterstock.com/video'],
                              ['Motion Array', 'https://motionarray.com/'],
                              ['Pond5', 'https://www.pond5.com/'],
                              ['Filmsupply', 'https://www.filmsupply.com/'],
                              ['Getty Images', 'https://www.gettyimages.com/videos'],
                              ['Depositphotos', 'https://depositphotos.com/'],
                            ].map(([n, u]) => (
                              <li key={u}>
                                <a href={u} target="_blank" rel="noopener noreferrer" className="underline font-bold">{n}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "video-vault" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#video-vault</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-code">
                        <div>
                          <h4 className="font-sans font-bold text-sm mb-1">Instagram Handles</h4>
                          <p className="leading-relaxed">
                            @bringavoice, @insidestory, @excelbranding, @interestingpedia, @seungjaenim_, @crazy_greape, @diren.kartal, @olima_omega, @mewsttv, @anwar, @collinskey, @needmorecash_vdhh, @catnikaprincess, @mike850822, @alone_boy_2.0.0.4, @alanchikinchow, @candy182, @avinashuphar, @avinashupharstar, @argenby, @bhopal_hunerlegends, @haydenxlee, @brainrot.2019, @doubledate.official, @kkubi99, @hannahstocking, @natesofit, @kailiefitness, @timmorrel, @mike.ocdink
                          </p>
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-sm mb-1">TikTok Handles</h4>
                          <p className="leading-relaxed">
                            @indiana_jose, @kindness.man.official, @dailymail, @matt.tv, @linhchihihihi, @tuanompbbc4, @thekiryalife, @hoa_2309, @rosssmith, @jackdoherty, @hem.seavhor, @alanchikinchow, @oneman.kindness, @robbieromantic, @joker.me1, @lilymiumiu, @parliamentarian84
                          </p>
                        </div>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "competitors-insight" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#cta-competitors &amp; #competitors-insight</h3>
                      <p className="text-xs font-mono-code leading-relaxed">
                        <strong>#cta-competitors:</strong> @GloryPick, @astromax0
                      </p>
                      <p className="text-xs font-mono-code leading-relaxed">
                        <strong>#competitors-insight:</strong> @Bloomshorts01, @Facetiostube, @funkyfoxyz, @GoodNewsDailyYT, @Hamtubezz, @JDGzyro, @PadsdopiaShorts, @Perfecthiingz2.0, @Pestitesaga, @Phenomeniix, @PotatoSheeez, @RealPenguin, @VangoStory, @GreenCloverShorts, @trendflix0, @lifelove001, @buzzhawkk, @monkey.thinks, @joumotivation, @roxxedd, @kacpermalaj, @watchninjadaily, @theloop322, @fitwithgigachad, @amplyawesome, @Vistorryofficial, @Lilasaurus, @Jeykify, @Zerair, @Lilasauruofficial, @Jerwoldshorts, @trottedStory28, @talkaryyy.11, @snap_root, @Rifflexx
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <a href="https://www.instagram.com/asad.alalo" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                          IG: @asad.alalo (250K followers)
                        </a>
                        <a href="https://youtube.com/@kindnex" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                          YT: @kindnex
                        </a>
                      </div>
                    </div>

                                      </div>
                )}

                {openGuideId === "channel-copy-keywords" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#channel-copy &amp; #key-word-hub</h3>
                      <p className="text-sm">
                        <strong>#channel-copy:</strong> Includes Optimized Version 1 (Commentary Niche) and Optimized Version 3 (CTA-Commentary Niche with Milestones 10K–1M) + Section 107 Fair Use disclaimer.
                      </p>
                      <pre className="bg-white border border-[#1e1b18] rounded-lg p-3 text-xs font-mono-code whitespace-pre-wrap">
{`Prompt for YouTube Keyword Generation (#key-word-hub):
"Based on the following YouTube channel/video description, generate a horizontal list of SEO-friendly keywords (no hashtags) focused on [insert niche]. These keywords should help the content rank better on YouTube search, be relevant for both U.S. and global audiences, and match the tone and themes of the description. Keep the list optimized for YouTube Shorts and commentary-style content."`}
                      </pre>
                    </div>

                                      </div>
                )}

                {openGuideId === "cta-snippets-script" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-3">
                      <h3 className="font-marker text-xl">#cta-snippets &amp; #script-prompt</h3>
                      <p className="text-sm">
                        <strong>#cta-snippets:</strong> Animal Rescue CTAs (puppy/kitten/dog empathy hooks) &amp; Emotional Family CTAs (no sticker). Always rotate per <code>#cta-frameworks</code> and <code>#anti-spam-strategy</code>.
                      </p>
                      <pre className="bg-white border border-[#1e1b18] rounded-lg p-3 text-xs font-mono-code whitespace-pre-wrap">
{`#script-prompt:
Give me a story rewritten in simple, natural, and engaging English for better flow:
[ --- Insert your script here --- ]
Make it sound like a casual, attention-grabbing narration — similar to YouTube Shorts voiceover.

Suggest 5 catchy, viral YouTube titles based on the script below:
- Must be in question form, short, scroll-stopping, SEO-optimized, with emojis.
- If I pick one title, also give me: YouTube Video Description + 3-5 SEO-optimized Hashtags (separated by commas).`}
                      </pre>
                    </div>

                                      </div>
                )}

                {openGuideId === "ai-voice-tools" && (
                  <div className="sketch-box bg-white p-6 space-y-4">
                    <div className="bg-[#fdfbf7] border-2 border-[#1e1b18] rounded-xl p-5 space-y-2">
                      <h3 className="font-marker text-xl">#ai-voice-tools (ElevenLabs Voice Lab)</h3>
                      <p className="text-sm">
                        <a href="https://elevenlabs.io/voice-lab" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                          https://elevenlabs.io/voice-lab
                        </a>
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {[
                          'Haven Sands (Youthful General American)',
                          'Reel (Conversational, hyped flair)',
                          'Dan Dan (Upbeat & modulated)',
                          'Alex (Young American Male)',
                          'Nicko (Young male YouTuber, natural)',
                          'Murph (Social Media Voice, commentary/mini-docu)',
                        ].map((v) => (
                          <span key={v} className="bg-white border border-[#1e1b18] rounded-full px-3 py-1 font-bold">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    id: 'reverse-engineer',
                    badge: 'Video Workflow • 3 Steps',
                    color: '#fde047',
                    title: 'How to Reverse Engineer any type of video',
                  },
                  {
                    id: 'roblox-3d',
                    badge: 'Roblox 3D • Prompts',
                    color: '#bae6fd',
                    title: 'Roblox 3D Model Generation & Studio AI',
                  },
                  {
                    id: 'yta-niche',
                    badge: 'YTA • YouTube Automation',
                    color: '#bbf7d0',
                    title: 'YTA Niche Playbook: Faceless & Documentary Videos',
                  },
                  {
                    id: 'clipping-niche',
                    badge: 'Clipping • Shorts / Reels / TikTok',
                    color: '#fda4af',
                    title: 'Clipping Niche Playbook: Viral 9:16 Shorts & Reels',
                  },
                  {
                    id: 'master-prompt',
                    badge: 'Framework • PDFs & Template',
                    color: '#d8b4fe',
                    title: 'Master Prompt',
                  },
                  {
                    id: 'video-tutorials',
                    badge: 'Videos • 4 Parts',
                    color: '#bae6fd',
                    title: 'Video Tutorials (PART 1 – 3.1)',
                  },
                  {
                    id: 'yta-resources',
                    badge: 'Playbook • YTA & Retention',
                    color: '#fbcfe8',
                    title: 'YTA Resources & Retention Targets',
                  },
                  {
                    id: 'fba-resources',
                    badge: 'Playbook • FBA & SEO',
                    color: '#fbcfe8',
                    title: 'FBA Resources & Facebook SEO',
                  },
                  {
                    id: 'niches-vault',
                    badge: 'Playbook • Niches',
                    color: '#fbcfe8',
                    title: 'Niche Ideas (Nostalgia & Christmas)',
                  },
                  {
                    id: 'stickers-voices',
                    badge: 'Playbook • Assets & Voices',
                    color: '#fbcfe8',
                    title: 'Stickers & Recommended AI Voices',
                  },
                  {
                    id: 'channel-warmup',
                    badge: 'Playbook • Warm-Up',
                    color: '#fbcfe8',
                    title: 'Channel Warm-Up (Options 1–3)',
                  },
                  {
                    id: 'account-warmup-plan',
                    badge: 'Playbook • 10-Day Plan',
                    color: '#fbcfe8',
                    title: 'Account Warmup Plan',
                  },
                  {
                    id: 'grind-guide',
                    badge: 'Playbook • Workflow',
                    color: '#fbcfe8',
                    title: 'Grind Guide & Video Flow',
                  },
                  {
                    id: 'upload-time-analysis',
                    badge: 'Playbook • Schedule',
                    color: '#fbcfe8',
                    title: 'Upload Time Analysis (PH Time)',
                  },
                  {
                    id: 'momentum-building',
                    badge: 'Playbook • Growth',
                    color: '#fbcfe8',
                    title: 'Momentum Building',
                  },
                  {
                    id: 'cta-frameworks',
                    badge: 'Playbook • Engagement',
                    color: '#fbcfe8',
                    title: 'CTA Frameworks',
                  },
                  {
                    id: 'account-creation-guide',
                    badge: 'Playbook • Setup & Screenshots',
                    color: '#fbcfe8',
                    title: 'Account Creation Guide',
                  },
                  {
                    id: 'channel-revival',
                    badge: 'Playbook • Rebrand',
                    color: '#fbcfe8',
                    title: 'Channel Revival',
                  },
                  {
                    id: 'deletion-truth',
                    badge: 'Playbook • Risk Timeline',
                    color: '#fbcfe8',
                    title: 'Deletion Truth & Risk Timeline',
                  },
                  {
                    id: 'visibility-troubleshooting',
                    badge: 'Playbook • View Jail',
                    color: '#fbcfe8',
                    title: 'Visibility Troubleshooting',
                  },
                  {
                    id: 'anti-spam-strategy',
                    badge: 'Playbook • Rotation',
                    color: '#fbcfe8',
                    title: 'Anti-Spam Strategy',
                  },
                  {
                    id: 'elevenlabs-support',
                    badge: 'Playbook • IP Hygiene',
                    color: '#fbcfe8',
                    title: '11Labs Support',
                  },
                  {
                    id: 'creators-tools',
                    badge: 'Playbook • Links',
                    color: '#fbcfe8',
                    title: 'Creators Tools',
                  },
                  {
                    id: 'stock-footage-hub',
                    badge: 'Playbook • Stock Video',
                    color: '#fbcfe8',
                    title: 'Stock Footage Hub',
                  },
                  {
                    id: 'video-vault',
                    badge: 'Playbook • Handles',
                    color: '#fbcfe8',
                    title: 'Video Vault (IG & TikTok)',
                  },
                  {
                    id: 'competitors-insight',
                    badge: 'Playbook • Research',
                    color: '#fbcfe8',
                    title: 'Competitors & Insights',
                  },
                  {
                    id: 'channel-copy-keywords',
                    badge: 'Playbook • SEO & Copy',
                    color: '#fbcfe8',
                    title: 'Channel Copy & Keyword Hub',
                  },
                  {
                    id: 'cta-snippets-script',
                    badge: 'Playbook • Prompts',
                    color: '#fbcfe8',
                    title: 'CTA Snippets & Script Prompt',
                  },
                  {
                    id: 'ai-voice-tools',
                    badge: 'Playbook • Voice Lab',
                    color: '#fbcfe8',
                    title: 'AI Voice Tools (ElevenLabs)',
                  },
                  ...DRIVE_SOURCES.map((doc) => ({
                    id: `doc-${doc.id}`,
                    badge: `${doc.type} • Source`,
                    color: '#fde047',
                    title: doc.name.replace(/\.(pdf|docx|txt)$/i, '').replace(/_/g, ' '),
                  })),
                ]
                  .filter((g) => {
                    if (!guidesSearch.trim()) return true;
                    const q = guidesSearch.toLowerCase();
                    return (
                      g.title.toLowerCase().includes(q) ||
                      g.badge.toLowerCase().includes(q)
                    );
                  })
                  .map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setOpenGuideId(g.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="sketch-box bg-white p-6 text-left flex flex-col justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <span
                        className="inline-block border border-[#1e1b18] px-2.5 py-0.5 rounded-full text-xs font-bold mb-2"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.badge}
                      </span>
                      <h2 className="font-marker text-2xl">{g.title}</h2>
                    </div>
                    <span className="sketch-btn bg-[#fdfbf7] px-3 py-1.5 text-sm font-bold self-start">
                      Open Guide →
                    </span>
                  </button>
                ))}
              </div>
            )}
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
            </div>

            {/* Filter Pills */}
            {activeCat !== 'all' ? (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-marker text-3xl sm:text-4xl">
                  {CATEGORIES.find((c) => c.id === activeCat)?.title || activeCat}
                </h2>
                <button
                  onClick={() => setView('home')}
                  className="sketch-btn bg-white px-3.5 py-1.5 text-sm font-bold cursor-pointer"
                >
                  ← Back to Home
                </button>
              </div>
            ) : (
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
            )}

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
                            reduceMotion={true}
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
                      <p className="text-sm text-[#57534e] mb-2">
                        by {item.author} • {item.format}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {detectSkills(item).map((sk) => (
                          <span
                            key={sk}
                            className="text-[11px] font-mono-code font-bold bg-[#fef08a] text-[#1e1b18] border border-[#1e1b18] rounded-md px-1.5 py-0.5"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
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
          <div className="flex items-center gap-3">
            <span className="sketch-btn bg-[#fef08a] text-[#1e1b18] px-3 py-0.5 font-hand text-sm font-bold">
              Visitors: {visitorCount.toLocaleString()}
            </span>
            <span>Opus Animations Library</span>
          </div>
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
            <p className="text-sm text-[#57534e] mb-2">
              by {selectedItem.author} •{' '}
              {selectedItem.tech === 'playable'
                ? 'Interactive (move mouse or click inside!)'
                : selectedItem.duration}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {detectSkills(selectedItem).map((sk) => (
                <span
                  key={sk}
                  className="text-xs font-mono-code font-bold bg-[#fef08a] text-[#1e1b18] border border-[#1e1b18] rounded-md px-2 py-0.5"
                >
                  {sk}
                </span>
              ))}
            </div>

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
