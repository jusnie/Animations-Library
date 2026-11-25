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
import { CATEGORIES, CURATED_SETS, ANIMATIONS } from './data/animationsData';
import AnimationCanvas from './components/AnimationCanvas';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'library'
  const [activeCat, setActiveCat] = useState('all');
  const [activeSet, setActiveSet] = useState('all');
  const [activeFormat, setActiveFormat] = useState('all');
  const [activeTech, setActiveTech] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [mp4Url, setMp4Url] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setMp4Url(null);
    if (!selectedItem || showCanvas || !selectedItem.postUrl?.includes('x.com/')) return;
    let cancelled = false;
    fetch(`/api/video?url=${encodeURIComponent(selectedItem.postUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.mp4Url) {
          setMp4Url(data.mp4Url);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedItem, showCanvas]);
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
      fetch('/data/video-post.json').then((r) => (r.ok ? r.json() : {})),
    ]).then(([libRes, extraRes, promptRes, videoPostRes]) => {
      const libItems = libRes.status === 'fulfilled' && Array.isArray(libRes.value) ? libRes.value : [];
      const extraItems = extraRes.status === 'fulfilled' && Array.isArray(extraRes.value) ? extraRes.value : [];
      const promptEn = promptRes.status === 'fulfilled' && promptRes.value ? promptRes.value : {};
      const videoPost = videoPostRes.status === 'fulfilled' && videoPostRes.value ? videoPostRes.value : {};
      const mergedRaw = [...extraItems, ...libItems];
      if (mergedRaw.length === 0) return;
      const mapped = mergedRaw.map((item, idx) => {
        const enOverride = promptEn[item.id]?.en;
        const poster = item.poster?.startsWith('/')
          ? `https://lumpongautomated.com/opus-video-library${item.poster}`
          : item.poster;
        const techArr = Array.isArray(item.tech) ? item.tech : [];
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
          prompt: enOverride || item.prompt || 'Prompt not available.',
          postUrl: videoPost[item.id] || item.postUrl || '',
        };
      });
      setImportedItems(mapped);
    });
  }, []);

  // Accessibility state
  const [textSize, setTextSize] = useState('base'); // 'base' | 'lg' | 'xl'
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);

  const resetA11y = () => {
    setTextSize('base');
    setHighContrast(false);
    setReduceMotion(false);
    setUnderlineLinks(false);
  };

  const openLibraryWithFilter = (filter = {}) => {
    setActiveCat(filter.cat || 'all');
    setActiveSet(filter.set || 'all');
    setActiveFormat(filter.format || 'all');
    setActiveTech(filter.tech || 'all');
    setView('library');
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
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
      if (activeSet !== 'all' && !item.sets.includes(activeSet)) return false;
      if (activeFormat !== 'all' && item.format !== activeFormat) return false;
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

  const rootClasses = [
    'min-h-screen flex flex-col transition-colors',
    textSize === 'lg' ? 'text-size-lg' : textSize === 'xl' ? 'text-size-xl' : '',
    highContrast ? 'high-contrast' : '',
    reduceMotion ? 'reduce-motion' : '',
    underlineLinks ? 'underline-links' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      {/* Top Sketchbook Navbar */}
      <header className="sticky top-0 z-30 bg-[#fdfbf7]/95 backdrop-blur-sm border-b-2 border-[#1e1b18] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <span className="inline-block bg-[#fde047] border-2 border-[#1e1b18] px-2.5 py-0.5 rounded-lg font-marker text-lg sm:text-xl -rotate-2 group-hover:rotate-0 transition-transform shadow-[2px_2px_0px_#1e1b18]">
              Opus
            </span>
            <span className="font-marker text-xl sm:text-2xl tracking-tight">
              Video Library
            </span>
          </button>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534e]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (view !== 'library') setView('library');
                }}
                placeholder="Search prompts, styles, @authors..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border-2 border-[#1e1b18] rounded-xl font-hand text-base focus:outline-none focus:ring-2 focus:ring-[#fde047]"
              />
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
              onClick={() => openLibraryWithFilter({})}
              className={`sketch-btn px-3.5 py-1.5 text-base font-bold cursor-pointer ${
                view === 'library' ? 'bg-[#38bdf8]' : 'bg-white'
              }`}
            >
              Browse All
            </button>
            <label className="sketch-btn bg-[#bbf7d0] px-3.5 py-1.5 text-base font-bold cursor-pointer flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                multiple
                onChange={handleImportFiles}
                className="hidden"
              />
            </label>
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
                <span className="marker-highlight inline-block rotate-1">
                  every prompt.
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
                      className="w-full h-28 rounded-lg border-2 border-[#1e1b18] mb-4 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: cat.color }}
                    >
                      <span className="font-marker text-2xl text-[#1e1b18] group-hover:scale-110 transition-transform">
                        {cat.title.split(' ')[0]}
                      </span>
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
                <Sparkles className="w-7 h-7 text-[#1e1b18]" />
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
                    className="sketch-box-alt p-6 text-left flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 bg-white border-2 border-[#1e1b18] rounded-full">
                          {set.badge}
                        </span>
                        <span className="font-bold text-sm">{set.count}</span>
                      </div>
                      <h3 className="font-marker text-2xl mb-1">{set.title}</h3>
                      <p className="text-lg text-[#1e1b18]/85">
                        {set.subtitle}
                      </p>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 font-bold text-base">
                      Explore set <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
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
                            reduceMotion={reduceMotion}
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
            )}
          </section>
        )}
      </main>

      {/* Accessibility Footer */}
      <footer className="border-t-2 border-[#1e1b18] bg-white px-4 sm:px-8 py-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-marker text-base mr-1">Text size:</span>
            {[
              { id: 'base', label: 'A' },
              { id: 'lg', label: 'A+' },
              { id: 'xl', label: 'A++' },
            ].map((sz) => (
              <button
                key={sz.id}
                onClick={() => setTextSize(sz.id)}
                className={`sketch-btn px-2.5 py-0.5 text-sm font-bold cursor-pointer ${
                  textSize === sz.id ? 'bg-[#fde047]' : 'bg-[#fdfbf7]'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`sketch-btn px-3 py-1 text-sm font-bold cursor-pointer ${
                highContrast ? 'bg-[#1e1b18] text-white' : 'bg-[#fdfbf7]'
              }`}
            >
              High contrast
            </button>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              className={`sketch-btn px-3 py-1 text-sm font-bold cursor-pointer ${
                reduceMotion ? 'bg-[#38bdf8]' : 'bg-[#fdfbf7]'
              }`}
            >
              Reduce motion
            </button>
            <button
              onClick={() => setUnderlineLinks(!underlineLinks)}
              className={`sketch-btn px-3 py-1 text-sm font-bold cursor-pointer ${
                underlineLinks ? 'bg-[#bbf7d0]' : 'bg-[#fdfbf7]'
              }`}
            >
              Underline links
            </button>
            <button
              onClick={resetA11y}
              className="sketch-btn bg-white px-3 py-1 text-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 pt-3 border-t border-dashed border-[#1e1b18]/30 flex flex-wrap items-center justify-between gap-2 text-sm text-[#57534e]">
          <span className="font-caveat text-xl">
            Hand-drawn &amp; coded by{' '}
            <span className="marker-highlight font-bold text-[#1e1b18]">
              Yasuda
            </span>
          </span>
          <span>Opus Video Library Clone</span>
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
              {showCanvas || (!selectedItem.thumbnailUrl && !mp4Url) ? (
                <div className="w-full h-full">
                  <AnimationCanvas
                    demoType={selectedItem.demoType}
                    accent={selectedItem.accent}
                    reduceMotion={reduceMotion}
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <button
                onClick={() => setShowCanvas(!showCanvas)}
                className="sketch-btn bg-white px-3 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />{' '}
                {showCanvas ? 'Show X Video' : 'Play Live Canvas'}
              </button>
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
                <div className="flex items-center gap-2">
                  {selectedItem.postUrl && (
                    <a
                      href={selectedItem.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sketch-btn bg-[#bae6fd] px-3 py-1 text-sm font-bold flex items-center gap-1.5"
                    >
                      Original Video <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
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
