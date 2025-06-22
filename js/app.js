/**
 * App - Main application controller
 * Coordinates all components of the NeuroQuantum Composer
 */
class App {
    constructor() {
        // Components
        this.inputSystem = null;
        this.quantumLayer = null;
        this.aiMusicEngine = null;
        this.audioSystem = null;
        this.visualizer = null;
        this.musicGenerator = null;
        
        // Application state
        this.isRunning = false;
        this.updateInterval = null;
        this.lastRhythmTriggerTime = 0;
        this.rhythmInterval = 1000; // 1 second between rhythm triggers
        
        // Performance optimization
        this.frameSkip = 0;
        this.frameCount = 0;
        
        // Input tracking for music responsiveness
        this.lastInputValues = {
            alpha: 0,
            beta: 0
        };
        this.inputChangeThreshold = 0.05;
        
        // UI elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Initialize
        this._init();
    }
    
    async _init() {
        try {
            console.log('Initializing NeuroQuantum Composer...');
            
            // Initialize components
            this.inputSystem = new InputSystem();
            this.quantumLayer = new QuantumLayer();
            this.aiMusicEngine = new AIMusicEngine();
            this.audioSystem = new AudioSystem();
            this.visualizer = new Visualizer('visualizer-container');
            
            // Initialize catchy music generator for responsive music
            this.musicGenerator = new CatchyMusicGenerator(this.audioSystem);
            
            // Set up event listeners
            this._bindEvents();
            
            // Detect performance capabilities and adjust settings
            this._detectPerformance();
            
            console.log('Initialization complete');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }
    
    _detectPerformance() {
        // Simple performance test
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }
        const duration = performance.now() - start;
        
        console.log(`Performance test time: ${duration.toFixed(2)}ms`);
        
        // Adjust frameSkip based on performance
        if (duration > 100) {
            // Low performance - skip more frames
            this.frameSkip = 2; // Only process every 3rd frame
            console.log('Low performance mode activated');
        } else if (duration > 50) {
            // Medium performance
            this.frameSkip = 1; // Process every other frame
            console.log('Medium performance mode activated');
        } else {
            // High performance
            this.frameSkip = 0; // Process every frame
            console.log('High performance mode activated');
        }
    }
    
    _bindEvents() {
        // Connect UI buttons
        if (this.startBtn) {
            this.startBtn.addEventListener('click', this.start.bind(this));
        }
        
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', this.stop.bind(this));
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Space key toggles start/stop
            if (event.code === 'Space' && !event.repeat) {
                event.preventDefault();
                this.isRunning ? this.stop() : this.start();
            }
        });
    }
    
    /**
     * Start the application
     */
    start() {
        if (this.isRunning) return;
        console.log('Starting NeuroQuantum Composer');
        
        this.isRunning = true;
        this._updateUI();
        
        // Start Tone.js audio context
        Tone.start().then(() => {
            // Set initial volume
            this.audioSystem.setVolume(0.8);
            
            // Get initial input values
            const inputData = this.inputSystem.update();
            this.lastInputValues = {
                alpha: inputData.alpha,
                beta: inputData.beta
            };
            
            // Start background music immediately for better UX
            this.musicGenerator.startMusic(inputData.alpha, inputData.beta);
            
            // Start the update loop
            this._startUpdateLoop();
        });
    }
    
    /**
     * Stop the application
     */
    stop() {
        if (!this.isRunning) return;
        console.log('Stopping NeuroQuantum Composer');
        
        this.isRunning = false;
        this._updateUI();
        
        // Stop the update loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        } else if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Stop audio
        this.audioSystem.stop();
        this.musicGenerator.stopMusic();
    }
    
    /**
     * Start the update loop
     */
    _startUpdateLoop() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Use requestAnimationFrame for smoother animation
        this.frameCount = 0;
        
        const animationLoop = async (timestamp) => {
            if (!this.isRunning) return;
            
            // Skip frames for performance if needed
            if (this.frameSkip > 0) {
                this.frameCount = (this.frameCount + 1) % (this.frameSkip + 1);
                if (this.frameCount !== 0) {
                    this.animationFrameId = requestAnimationFrame(animationLoop);
                    return;
                }
            }
            
            // Process frame
            await this._update();
            
            // Schedule next frame
            this.animationFrameId = requestAnimationFrame(animationLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(animationLoop);
    }
    
    /**
     * Main update loop
     */
    async _update() {
        if (!this.isRunning) return;
        
        // Get input values
        const inputData = this.inputSystem.update();
        const alphaValue = inputData.alpha;
        const betaValue = inputData.beta;
        
        // Check if input values have changed significantly
        const alphaDiff = Math.abs(alphaValue - this.lastInputValues.alpha);
        const betaDiff = Math.abs(betaValue - this.lastInputValues.beta);
        const inputChanged = alphaDiff > this.inputChangeThreshold || betaDiff > this.inputChangeThreshold;
        
        // Update music in real-time based on input
        this.musicGenerator.updateMusic(alphaValue, betaValue);
        
        // Update quantum visualization even if no rhythm trigger
        const quantumState = this.quantumLayer.getStateForVisualization();
        this.visualizer.update(quantumState, alphaValue, betaValue, false);
        
        // Only proceed with more intensive operations if inputs changed enough
        if (inputChanged) {
            // Update stored input values
            this.lastInputValues.alpha = alphaValue;
            this.lastInputValues.beta = betaValue;
            
            // Check if we should trigger a new rhythm
            const now = Date.now();
            const timeSinceLastRhythm = now - this.lastRhythmTriggerTime;
            let rhythmTrigger = false;
            
            // Dynamic rhythm interval based on alpha waves (mouse speed)
            const baseInterval = 1000; // 1 second
            const minInterval = 300; // 300ms (fastest possible trigger)
            const adjustedInterval = baseInterval - (alphaValue * (baseInterval - minInterval));
            
            if (timeSinceLastRhythm >= adjustedInterval) {
                rhythmTrigger = true;
                this.lastRhythmTriggerTime = now;
                
                // Process input through quantum layer
                const rhythmPattern = this.quantumLayer.processInput(alphaValue, betaValue);
                
                // Trigger immediate rhythm sound for feedback
                this.audioSystem.playRhythmPattern(rhythmPattern);
                
                // Update visualization with rhythm trigger
                this.visualizer.update(quantumState, alphaValue, betaValue, true);
            }
        }
    }
    
    /**
     * Update UI based on current state
     */
    _updateUI() {
        if (this.startBtn) {
            this.startBtn.disabled = this.isRunning;
        }
        
        if (this.stopBtn) {
            this.stopBtn.disabled = !this.isRunning;
        }
    }
}

// Initialize the application when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});