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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setKidData(prev => ({ ...prev, photo: e.target.result }));
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file) {
      // Create a synthetic event object for handlePhotoUpload
      const syntheticEvent = {
        target: {
          files: [file]
        }
      };
      handlePhotoUpload(syntheticEvent);
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
                className="cursor-pointer block w-full h-48 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors relative overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {kidData.photo ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={kidData.photo} 
                      alt="Kid" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <span className="text-white text-sm opacity-0 hover:opacity-100 transition-opacity">Click to change photo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 mb-3">
                      <img 
                        src="https://cdn-icons-png.flaticon.com/512/10473/10473491.png" 
                        alt="Camera" 
                        className="w-full h-full object-contain"
                      />
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
      icon: '🌲',
      bgColor: 'bg-green-600'
    },
    {
      id: 'space',
      title: 'Space Exploration', 
      description: 'Journey through galaxies and meet alien friends',
      icon: '🚀',
      bgColor: 'bg-blue-600'
    },
    {
      id: 'ocean',
      title: 'Ocean Discovery',
      description: 'Dive deep and discover underwater treasures', 
      icon: '🌊',
      bgColor: 'bg-cyan-600'
    },
    {
      id: 'castle',
      title: 'Magical Kingdom',
      description: 'Knights, princesses, and magical kingdoms',
      icon: '👑',
      bgColor: 'bg-orange-600'
    },
    {
      id: 'dinosaur',
      title: 'Dinosaur World',
      description: 'Meet friendly dinosaurs in prehistoric times',
      icon: '🦕',
      bgColor: 'bg-red-600'
    },
    {
      id: 'custom',
      title: 'Custom Theme...',
      description: 'Create your own magical world',
      icon: '✨',
      bgColor: 'bg-purple-600'
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      
      {/* Modal Content */}
      <div className="relative bg-gray-800 rounded-3xl p-8 max-w-2xl w-full mx-auto shadow-2xl border border-gray-700">
        
        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-6">
            {[
              { num: 1, label: 'Kid Details', sublabel: 'Photos & Info', active: false, icon: '👤' },
              { num: 2, label: 'Theme', sublabel: 'Story Setting', active: true, icon: '🎨' },
              { num: 3, label: 'Story Specs', sublabel: 'Customize', active: false, icon: '📝' },
              { num: 4, label: 'Creating Magic', sublabel: 'AI Generation', active: false, icon: '✨' }
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-1 ${
                    step.active ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {step.icon}
                  </div>
                  <div className={`text-xs font-medium ${step.active ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                  <div className={`text-xs ${step.active ? 'text-gray-300' : 'text-gray-500'}`}>
                    {step.sublabel}
                  </div>
                </div>
                {index < 3 && (
                  <div className="w-6 h-px bg-gray-600 mx-3 mt-[-20px]"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Choose a Magical Theme</h2>
          <p className="text-gray-400">Select the perfect backdrop for your story adventure</p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`cursor-pointer group relative rounded-2xl p-4 text-center transition-all duration-200 ${theme.bgColor} ${
                selectedTheme === theme.id 
                  ? 'ring-4 ring-green-400 ring-opacity-60 scale-105' 
                  : 'hover:scale-105'
              }`}
            >
              {/* Selection Check */}
              {selectedTheme === theme.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              <div className="text-4xl mb-3">{theme.icon}</div>
              <h3 className="text-white font-bold text-sm mb-1">{theme.title}</h3>
              <p className="text-white text-xs opacity-90 leading-tight">{theme.description}</p>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/app/kid-details')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <button
            onClick={() => {
              if (selectedTheme) {
                navigate('/app/story-customization');
              }
            }}
            disabled={!selectedTheme}
            className={`flex items-center px-6 py-2 rounded-lg font-medium transition-all ${
              selectedTheme 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Next Step
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
    { 
      id: 'adventure', 
      title: 'Adventure Story', 
      description: 'Brave quests and exciting journeys!',
      icon: '⚔️',
      bgColor: 'bg-orange-500'
    },
    { 
      id: 'educational', 
      title: 'Learning Story', 
      description: 'Fun facts and cool discoveries!',
      icon: '🧠',
      bgColor: 'bg-blue-500'
    },
    { 
      id: 'treasure', 
      title: 'Treasure Hunt', 
      description: 'Find hidden treasures and solve puzzles!',
      icon: '🗺️',
      bgColor: 'bg-amber-600'
    },
    { 
      id: 'friendship', 
      title: 'Friendship Tale', 
      description: 'Meet new friends and help each other!',
      icon: '👫',
      bgColor: 'bg-pink-500'
    }
  ];

  const lengths = [
    { id: 'short', title: 'Quick Story', subtitle: '5 minutes', icon: '⚡', bgColor: 'bg-green-500' },
    { id: 'medium', title: 'Medium Story', subtitle: '10 minutes', icon: '📖', bgColor: 'bg-blue-500' },
    { id: 'long', title: 'Epic Story', subtitle: '15+ minutes', icon: '📚', bgColor: 'bg-purple-500' }
  ];

  const ingredients = [
    { name: 'Magic spells', icon: '✨' },
    { name: 'Talking animals', icon: '🦜' },
    { name: 'Hidden treasures', icon: '💎' },
    { name: 'Flying vehicles', icon: '🚁' },
    { name: 'Secret doors', icon: '🚪' },
    { name: 'Friendly monsters', icon: '👹' },
    { name: 'Time travel', icon: '⏰' },
    { name: 'Superhero powers', icon: '💪' }
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
      sessionStorage.setItem('storyCustomization', JSON.stringify(customization));
      navigate('/app/story-creation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      
      {/* Modal Content */}
      <div className="relative bg-gray-800 rounded-3xl p-8 max-w-4xl w-full mx-auto shadow-2xl border border-gray-700 max-h-[95vh] overflow-y-auto">
        
        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-6">
            {[
              { num: 1, label: 'Kid Details', sublabel: 'Photos & Info', active: false, icon: '👤' },
              { num: 2, label: 'Theme', sublabel: 'Story Setting', active: false, icon: '🎨' },
              { num: 3, label: 'Story Specs', sublabel: 'Customize', active: true, icon: '📝' },
              { num: 4, label: 'Creating Magic', sublabel: 'AI Generation', active: false, icon: '✨' }
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-1 ${
                    step.active ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {step.icon}
                  </div>
                  <div className={`text-xs font-medium ${step.active ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                  <div className={`text-xs ${step.active ? 'text-gray-300' : 'text-gray-500'}`}>
                    {step.sublabel}
                  </div>
                </div>
                {index < 3 && (
                  <div className="w-6 h-px bg-gray-600 mx-3 mt-[-20px]"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Header with Adventure Images */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Customize Your Story!</h2>
          <p className="text-gray-400 mb-6">Let's make your adventure perfect for you!</p>
          
          {/* Adventure Images */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-400">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkY4QzAwIi8+CjwhLS0gQWR2ZW50dXJlIFNjZW5lIC0tPgo8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNIDQwIDEwMCBMIDYwIDEwMCBMIDUwIDUwIFoiIGZpbGw9IiMzNDQ5NUUiLz4KPHN2Zz4="
                alt="Adventure Scene" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-400">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZENzAwIi8+CjwhLS0gVHJlYXN1cmUgTWFwIC0tPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjIwIiBmaWxsPSIjRkY0NDQ0Ii8+CjxwYXRoIGQ9Ik0gOTAgOTAgTCAxMTAgOTAgTCAxMTAgMTEwIEwgOTAgMTEwIFoiIGZpbGw9IiM4QjQ1MTMiLz4KPHN2Zz4="
                alt="Treasure Map" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Story Type Selection */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-3">📖</span>
              What kind of story do you want?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {storyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCustomization(prev => ({ ...prev, storyType: type.id }))}
                  className={`p-4 rounded-2xl text-center transition-all duration-200 ${type.bgColor} ${
                    customization.storyType === type.id 
                      ? 'ring-4 ring-green-400 ring-opacity-60 scale-105' 
                      : 'hover:scale-105'
                  }`}
                >
                  {customization.storyType === type.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <h4 className="text-white font-bold text-sm mb-1">{type.title}</h4>
                  <p className="text-white text-xs opacity-90">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Story Length */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-3">⏱️</span>
              How long should your story be?
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {lengths.map((length) => (
                <button
                  key={length.id}
                  onClick={() => setCustomization(prev => ({ ...prev, length: length.id }))}
                  className={`p-4 rounded-2xl text-center transition-all duration-200 ${length.bgColor} relative ${
                    customization.length === length.id 
                      ? 'ring-4 ring-green-400 ring-opacity-60 scale-105' 
                      : 'hover:scale-105'
                  }`}
                >
                  {customization.length === length.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="text-2xl mb-2">{length.icon}</div>
                  <h4 className="text-white font-bold text-sm mb-1">{length.title}</h4>
                  <p className="text-white text-xs opacity-90">{length.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Special Ingredients */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-3">🪄</span>
              Add some magical ingredients! (Pick any you like)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient.name}
                  onClick={() => toggleIngredient(ingredient.name)}
                  className={`p-3 rounded-xl text-center transition-all duration-200 ${
                    customization.specialIngredients.includes(ingredient.name)
                      ? 'bg-green-500 text-white ring-2 ring-green-300 scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
                  }`}
                >
                  <div className="text-xl mb-1">{ingredient.icon}</div>
                  <div className="text-xs font-medium">{ingredient.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => navigate('/app/theme-selection')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Themes
          </button>
          
          <button
            onClick={handleCreateStory}
            disabled={!customization.storyType || !customization.length}
            className={`flex items-center px-8 py-3 rounded-xl font-bold text-lg transition-all ${
              customization.storyType && customization.length
                ? 'bg-green-500 text-white hover:bg-green-600 transform hover:scale-105 shadow-lg' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Create My Story! 
            <span className="ml-2">🚀</span>
          </button>
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