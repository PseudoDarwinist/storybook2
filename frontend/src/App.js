import { useEffect, useRef, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const FloatingElement = ({ src, alt, size, position, delay = 0 }) => {
  const elementRef = useRef(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    let animationId;
    let startTime = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp + delay * 1000;
      const elapsed = timestamp - startTime;
      
      // Create floating effect with 3D transforms
      const floatY = Math.sin(elapsed * 0.001) * 20;
      const floatX = Math.cos(elapsed * 0.0008) * 15;
      const rotateX = Math.sin(elapsed * 0.0005) * 2;
      const rotateY = Math.cos(elapsed * 0.0007) * 2;
      const scale = 1 + Math.sin(elapsed * 0.0012) * 0.05;
      
      element.style.transform = `translate3d(${floatX}px, ${floatY}px, 0px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [delay]);
  
  return (
    <div 
      ref={elementRef}
      className={`absolute will-change-transform ${position}`}
      style={{ zIndex: 2 }}
    >
      <div className={`floating-image-container ${size}`}>
        <img 
          src={src} 
          alt={alt} 
          className="floating-image opacity-100 w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

const FluidSimulation = () => {
  const canvasRef = useRef(null);
  const fluidSimRef = useRef(null);
  const pointersRef = useRef([]);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check WebGL support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, using fallback CSS animation');
      setWebglSupported(false);
      return;
    }

    // Resize canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (fluidSimRef.current && fluidSimRef.current.resize) {
        fluidSimRef.current.resize();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load and initialize fluid simulation
    const initializeFluidSimulation = () => {
      try {
        if (window.FluidSimulation && canvas && !isInitialized) {
          fluidSimRef.current = new window.FluidSimulation(canvas);
          
          // Initialize pointer
          const pointer = {
            id: -1,
            texcoordX: 0,
            texcoordY: 0,
            prevTexcoordX: 0,
            prevTexcoordY: 0,
            deltaX: 0,
            deltaY: 0,
            down: false,
            moved: false,
            color: { r: 0, g: 0, b: 0 }
          };
          pointersRef.current = [pointer];
          
          if (fluidSimRef.current) {
            fluidSimRef.current.pointers = pointersRef.current;
            
            // Initialize splatStack if not exists
            if (!fluidSimRef.current.splatStack) {
              fluidSimRef.current.splatStack = [];
            }

            // Add some initial splats for ambient motion
            setTimeout(() => {
              if (fluidSimRef.current && fluidSimRef.current.splatStack) {
                fluidSimRef.current.splatStack.push(3);
              }
            }, 1000);
            
            setIsInitialized(true);
          }
        }
      } catch (error) {
        console.error('Error initializing fluid simulation:', error);
        setWebglSupported(false);
      }
    };

    // Check if FluidSimulation class is already available
    if (window.FluidSimulation) {
      initializeFluidSimulation();
    } else {
      // Load fluid simulation script only once globally
      if (!window.fluidScriptLoaded && !window.fluidScriptLoading) {
        window.fluidScriptLoading = true;
        const script = document.createElement('script');
        script.src = '/fluid.js';
        script.onload = () => {
          window.fluidScriptLoaded = true;
          window.fluidScriptLoading = false;
          initializeFluidSimulation();
        };
        script.onerror = () => {
          console.error('Failed to load fluid simulation');
          window.fluidScriptLoading = false;
          setWebglSupported(false);
        };
        document.head.appendChild(script);
      } else if (window.fluidScriptLoaded) {
        initializeFluidSimulation();
      } else {
        // Script is loading, wait for it
        const checkForFluidSimulation = () => {
          if (window.FluidSimulation) {
            initializeFluidSimulation();
          } else if (!window.fluidScriptLoading) {
            setWebglSupported(false);
          } else {
            setTimeout(checkForFluidSimulation, 100);
          }
        };
        setTimeout(checkForFluidSimulation, 100);
      }
    }

    // Mouse event handlers
    const handleMouseMove = (e) => {
      if (!fluidSimRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const pointer = pointersRef.current[0];
      if (!pointer.down) {
        fluidSimRef.current.updatePointerDownData(pointer, -1, x, y);
      }
      fluidSimRef.current.updatePointerMoveData(pointer, x, y);
    };

    const handleMouseDown = (e) => {
      if (!fluidSimRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const pointer = pointersRef.current[0];
      fluidSimRef.current.updatePointerDownData(pointer, -1, x, y);
    };

    const handleMouseUp = () => {
      if (!fluidSimRef.current) return;
      
      const pointer = pointersRef.current[0];
      fluidSimRef.current.updatePointerUpData(pointer);
    };

    // Touch event handlers
    const handleTouchStart = (e) => {
      e.preventDefault();
      if (!fluidSimRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const pointer = pointersRef.current[0];
      fluidSimRef.current.updatePointerDownData(pointer, touch.identifier, x, y);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!fluidSimRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const pointer = pointersRef.current[0];
      fluidSimRef.current.updatePointerMoveData(pointer, x, y);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (!fluidSimRef.current) return;
      
      const pointer = pointersRef.current[0];
      fluidSimRef.current.updatePointerUpData(pointer);
    };

    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isInitialized]);

  // Fallback CSS animation if WebGL not supported
  if (!webglSupported) {
    return (
      <div 
        className="fixed inset-0 z-0 w-full h-full fallback-fluid-bg"
        style={{ 
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(6, 78, 59, 0.8) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 80%, rgba(5, 46, 22, 0.7) 0%, transparent 50%),
            linear-gradient(135deg, #064e3b 0%, #052e16 50%, #000000 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
          animation: 'fluidFallback 8s ease-in-out infinite'
        }}
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 z-0 w-full h-full"
      style={{ 
        background: 'linear-gradient(135deg, #064e3b 0%, #052e16 50%, #000000 100%)',
        touchAction: 'none'
      }}
    />
  );
};

const CustomCursor = () => {
  const cursorRef = useRef(null);
  
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    
    const handleMouseMove = (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div 
        ref={cursorRef}
        className="absolute rounded-full bg-white mix-blend-difference"
        style={{
          width: '16px',
          height: '16px',
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  );
};

const Home = () => {
  // Magical floating elements data  
  const floatingElements = [
    {
      src: "https://storybook.emergent.sh/images/download1.png",
      alt: "Floating magic",
      size: "w-48 h-48",
      position: "top-[15%] left-[12%]",
      delay: 0
    },
    {
      src: "https://storybook.emergent.sh/images/download2.png",
      alt: "Floating magic",
      size: "w-36 h-36",
      position: "top-[10%] left-[45%]",
      delay: 0.5
    },
    {
      src: "https://storybook.emergent.sh/images/download3.jpg",
      alt: "Floating sparkles",
      size: "w-52 h-52",
      position: "top-[18%] right-[15%]",
      delay: 1
    },
    {
      src: "https://storybook.emergent.sh/images/download4.png",
      alt: "Floating elements",
      size: "w-32 h-32",
      position: "top-[45%] left-[5%]",
      delay: 1.5
    },
    {
      src: "https://storybook.emergent.sh/images/download5.png",
      alt: "Floating magic",
      size: "w-44 h-44",
      position: "top-[50%] right-[8%]",
      delay: 2
    },
    {
      src: "https://storybook.emergent.sh/images/download6.png",
      alt: "Floating elements",
      size: "w-32 h-32",
      position: "bottom-[10%] left-[18%]",
      delay: 2.5
    },
    {
      src: "https://storybook.emergent.sh/images/download7.png",
      alt: "Floating sparkles",
      size: "w-36 h-36",
      position: "bottom-[5%] left-[45%]",
      delay: 3
    },
    {
      src: "https://storybook.emergent.sh/images/download8.png",
      alt: "Floating magic",
      size: "w-36 h-36",
      position: "bottom-[12%] right-[14%]",
      delay: 3.5
    }
  ];

  return (
    <div className="landing-page-container relative overflow-hidden min-h-screen">
      {/* Fluid Simulation Background */}
      <FluidSimulation />
      
      {/* Floating Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-[2]">
        {floatingElements.map((element, index) => (
          <FloatingElement 
            key={index}
            src={element.src}
            alt={element.alt}
            size={element.size}
            position={element.position}
            delay={element.delay}
          />
        ))}
      </div>
      
      {/* Custom Cursor */}
      <CustomCursor />
      
      {/* Main Content */}
      <div className="content-container relative z-20 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <h1 className="headline text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight">
          Create magic moments
        </h1>
        <p className="description text-xl md:text-2xl text-gray-200 mb-12 max-w-2xl leading-relaxed">
          Wonderful Illustrated stories all about your children
        </p>
        <a 
          className="cta-button bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
          href="/app/kid-details" 
          data-discover="true"
        >
          Start your adventure
        </a>
      </div>
    </div>
  );
};

const KidDetails = () => {
  const navigate = useNavigate();
  const [kidData, setKidData] = useState({
    photo: null,
    name: '',
    age: ''
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setKidData(prev => ({ ...prev, photo: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (kidData.name && kidData.age) {
      // Store kid data in sessionStorage for now
      sessionStorage.setItem('kidData', JSON.stringify(kidData));
      navigate('/app/theme-selection');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Step Indicator */}
      <div className="flex justify-center pt-8 pb-6">
        <div className="flex items-center space-x-8">
          {[
            { num: 1, label: 'Kid Details', sublabel: 'Photos & Info', active: true },
            { num: 2, label: 'Theme', sublabel: 'Story Setting', active: false },
            { num: 3, label: 'Story Specs', sublabel: 'Customize', active: false },
            { num: 4, label: 'Creating Magic', sublabel: 'AI Generation', active: false }
          ].map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                  step.active ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {step.num}
                </div>
                <div className={`text-xs font-medium ${step.active ? 'text-white' : 'text-gray-400'}`}>
                  {step.label}
                </div>
                <div className={`text-xs ${step.active ? 'text-gray-300' : 'text-gray-500'}`}>
                  {step.sublabel}
                </div>
              </div>
              {index < 3 && (
                <div className="w-8 h-px bg-gray-600 mx-4 mt-[-20px]"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-400 mb-3">Tell Us About Your Little One!</h1>
            <p className="text-gray-400 text-sm">Upload photos and share their names to personalize the story</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="block text-white text-sm font-medium mb-3 flex items-center">
                <span className="mr-2">📷</span>
                Upload Kid's Photo
              </label>
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label 
                htmlFor="photo"
                className="cursor-pointer block w-full h-48 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                {kidData.photo ? (
                  <img 
                    src={kidData.photo} 
                    alt="Kid" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 mb-3">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {/* Camera body */}
                        <rect x="40" y="80" width="120" height="80" rx="8" fill="#4ade80" stroke="#22c55e" strokeWidth="2"/>
                        {/* Camera top */}
                        <rect x="60" y="60" width="80" height="30" rx="6" fill="#22c55e"/>
                        {/* Viewfinder */}
                        <circle cx="140" cy="70" r="6" fill="#1f2937"/>
                        {/* Lens outer */}
                        <circle cx="100" cy="120" r="25" fill="#1f2937" stroke="#374151" strokeWidth="2"/>
                        {/* Lens inner */}
                        <circle cx="100" cy="120" r="18" fill="#3b82f6"/>
                        {/* Lens center */}
                        <circle cx="100" cy="120" r="8" fill="#1e40af"/>
                        {/* Lens highlight */}
                        <circle cx="105" cy="115" r="3" fill="#60a5fa" opacity="0.7"/>
                        {/* Flash */}
                        <rect x="70" y="65" width="8" height="8" rx="2" fill="#374151"/>
                      </svg>
                    </div>
                    <p className="text-white text-sm font-medium mb-1">Drag & drop a photo here</p>
                    <p className="text-gray-400 text-xs">or click to browse files</p>
                  </div>
                )}
              </label>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-white text-sm font-medium mb-3 flex items-center">
                <span className="mr-2">👤</span>
                Kid's Name(s) <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={kidData.name}
                onChange={(e) => setKidData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter names (separated by commas for multiple kids)"
                className="w-full px-4 py-3 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Age Selection */}
            <div>
              <label className="block text-white text-sm font-medium mb-3 flex items-center">
                <span className="mr-2">🎂</span>
                Age Level <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[
                  { label: '3-4 years', value: '3-4' },
                  { label: '5-7 years', value: '5-7' },
                  { label: '8-10 years', value: '8-10' },
                  { label: '11-12 years', value: '11-12' }
                ].map((ageRange) => (
                  <button
                    key={ageRange.value}
                    type="button"
                    onClick={() => setKidData(prev => ({ ...prev, age: ageRange.value }))}
                    className={`py-3 px-6 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      kidData.age === ageRange.value
                        ? 'bg-green-500 text-white border-2 border-green-400'
                        : 'bg-gray-800 text-gray-300 border-2 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {ageRange.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!kidData.name || !kidData.age}
                className="w-full bg-green-500 text-white py-3 px-6 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ThemeSelection = () => {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState('');

  const themes = [
    {
      id: 'forest',
      title: 'Adventure in Forest',
      description: 'Explore magical woods with talking animals',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-green-600 to-emerald-700'
    },
    {
      id: 'space',
      title: 'Space Exploration',
      description: 'Journey through galaxies and meet alien friends',
      image: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-purple-600 to-indigo-700'
    },
    {
      id: 'ocean',
      title: 'Ocean Discovery',
      description: 'Dive deep and discover underwater treasures',
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-blue-600 to-cyan-700'
    },
    {
      id: 'castle',
      title: 'Royal Castle',
      description: 'Knights, princesses, and magical kingdoms',
      image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c962?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-amber-600 to-orange-700'
    },
    {
      id: 'dinosaur',
      title: 'Dinosaur Land',
      description: 'Meet friendly dinosaurs in prehistoric times',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-red-600 to-pink-700'
    },
    {
      id: 'fairy',
      title: 'Fairy Kingdom',
      description: 'Magical fairies and enchanted gardens',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center',
      gradient: 'from-pink-600 to-rose-700'
    }
  ];

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    // Store theme selection
    sessionStorage.setItem('selectedTheme', themeId);
    setTimeout(() => {
      navigate('/app/story-customization');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Choose Your Adventure</h1>
          <p className="text-xl text-gray-200">Pick a magical world to explore!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`cursor-pointer group transform transition-all duration-300 hover:scale-105 ${
                selectedTheme === theme.id ? 'scale-105' : ''
              }`}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={theme.image} 
                    alt={theme.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${theme.gradient} opacity-60`}></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{theme.title}</h3>
                  <p className="text-gray-200">{theme.description}</p>
                </div>
                {selectedTheme === theme.id && (
                  <div className="absolute inset-0 border-4 border-white rounded-3xl animate-pulse"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/app/kid-details')}
            className="text-white/80 hover:text-white transition-colors underline"
          >
            ← Back to Kid Details
          </button>
        </div>
      </div>
    </div>
  );
};

const StoryCustomization = () => {
  const navigate = useNavigate();
  const [customization, setCustomization] = useState({
    storyType: '',
    length: '',
    specialIngredients: []
  });

  const storyTypes = [
    { id: 'adventure', title: 'Adventure Story', description: 'Action-packed journey with excitement' },
    { id: 'educational', title: 'Educational Story', description: 'Learning through fun storytelling' }
  ];

  const lengths = [
    { id: 'short', title: 'Short (5-10 pages)', duration: '5-10 min read' },
    { id: 'medium', title: 'Medium (10-15 pages)', duration: '10-15 min read' },
    { id: 'long', title: 'Long (15+ pages)', duration: '15+ min read' }
  ];

  const ingredients = [
    'Magic spells', 'Talking animals', 'Hidden treasures', 'Flying vehicles',
    'Secret doors', 'Friendly monsters', 'Time travel', 'Superhero powers'
  ];

  const toggleIngredient = (ingredient) => {
    setCustomization(prev => ({
      ...prev,
      specialIngredients: prev.specialIngredients.includes(ingredient)
        ? prev.specialIngredients.filter(i => i !== ingredient)
        : [...prev.specialIngredients, ingredient]
    }));
  };

  const handleCreateStory = () => {
    if (customization.storyType && customization.length) {
      // Store customization data
      sessionStorage.setItem('storyCustomization', JSON.stringify(customization));
      navigate('/app/story-creation');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Customize Your Story</h1>
          <p className="text-xl text-gray-200">Make it uniquely yours!</p>
        </div>

        <div className="space-y-12">
          {/* Story Type */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">What type of story?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCustomization(prev => ({ ...prev, storyType: type.id }))}
                  className={`p-6 rounded-2xl text-left transition-all ${
                    customization.storyType === type.id
                      ? 'bg-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-sm opacity-90">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Story Length */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">How long should it be?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lengths.map((length) => (
                <button
                  key={length.id}
                  onClick={() => setCustomization(prev => ({ ...prev, length: length.id }))}
                  className={`p-4 rounded-2xl text-center transition-all ${
                    customization.length === length.id
                      ? 'bg-teal-500 text-white shadow-lg scale-105'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <h3 className="font-semibold mb-1">{length.title}</h3>
                  <p className="text-sm opacity-90">{length.duration}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Special Ingredients */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Add special ingredients (optional)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient}
                  onClick={() => toggleIngredient(ingredient)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    customization.specialIngredients.includes(ingredient)
                      ? 'bg-cyan-500 text-white shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {ingredient}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              onClick={() => navigate('/app/theme-selection')}
              className="text-white/80 hover:text-white transition-colors underline"
            >
              ← Back to Themes
            </button>
            
            <button
              onClick={handleCreateStory}
              disabled={!customization.storyType || !customization.length}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-8 rounded-2xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-[1.02]"
            >
              Create My Story! →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StoryCreation = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Gathering magical ingredients...');
  const [storyContent, setStoryContent] = useState('');
  
  const steps = [
    'Gathering magical ingredients...',
    'Creating your unique story...',
    'Adding beautiful illustrations...',
    'Bringing characters to life...',
    'Adding final touches...',
    'Your story is ready!'
  ];

  useEffect(() => {
    // Get data from session storage
    const kidData = JSON.parse(sessionStorage.getItem('kidData') || '{}');
    const selectedTheme = sessionStorage.getItem('selectedTheme') || '';
    const customization = JSON.parse(sessionStorage.getItem('storyCustomization') || '{}');

    // Create story API call
    const createStory = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kid_name: kidData.name,
            kid_age: parseInt(kidData.age),
            kid_photo: kidData.photo,
            theme: selectedTheme,
            story_type: customization.storyType,
            length: customization.length,
            special_ingredients: customization.specialIngredients || []
          })
        });

        if (response.ok) {
          const data = await response.json();
          setStoryContent(data.story_content);
        } else {
          console.error('Failed to create story');
        }
      } catch (error) {
        console.error('Error creating story:', error);
      }
    };

    createStory();

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            // Show the story content in an alert for now
            alert(`Story Created!\n\n${storyContent || 'Your magical story has been created!'}`);
            navigate('/');
          }, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [navigate, storyContent]);

  useEffect(() => {
    const stepIndex = Math.floor(progress / 20);
    if (stepIndex < steps.length) {
      setCurrentStep(steps[stepIndex]);
    }
  }, [progress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl">
          {/* Floating magical elements */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center mb-6 animate-pulse">
              <span className="text-4xl">✨</span>
            </div>
            
            {/* Floating sparkles */}
            <div className="absolute top-0 left-1/4 animate-bounce delay-100">⭐</div>
            <div className="absolute top-4 right-1/4 animate-bounce delay-300">💫</div>
            <div className="absolute bottom-4 left-1/3 animate-bounce delay-500">🌟</div>
            <div className="absolute bottom-0 right-1/3 animate-bounce delay-700">✨</div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-6">Creating Your Story</h1>
          
          <p className="text-xl text-gray-200 mb-8">{currentStep}</p>
          
          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-4 mb-8">
            <div 
              className="bg-gradient-to-r from-purple-400 to-pink-400 h-4 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="text-2xl font-semibold text-white mb-8">
            {Math.round(progress)}%
          </div>
          
          {progress < 100 && (
            <p className="text-gray-300">
              Please wait while we create something magical just for you...
            </p>
          )}
          
          {progress === 100 && (
            <div className="animate-bounce">
              <p className="text-2xl text-white font-semibold">
                🎉 Your story is ready! 🎉
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/kid-details" element={<KidDetails />} />
          <Route path="/app/theme-selection" element={<ThemeSelection />} />
          <Route path="/app/story-customization" element={<StoryCustomization />} />
          <Route path="/app/story-creation" element={<StoryCreation />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;