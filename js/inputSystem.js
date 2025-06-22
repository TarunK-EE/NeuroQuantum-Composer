/**
 * InputSystem - Tracks user interactions and converts them into simulated brainwave data
 */
class InputSystem {
    constructor() {
        // Input tracking variables
        this.mouseX = 0;
        this.mouseY = 0;
        this.prevMouseX = 0;
        this.prevMouseY = 0;
        this.mouseVelocity = 0;
        this.mouseDirection = 0;
        this.keysPressed = new Set();
        this.keyActivityLevel = 0;
        this.keyActivityDecay = 0.95; // Decay rate for key activity

        // Simulated brainwave values
        this.alphaValue = 0; // 0.0 - 1.0 (based on mouse movement)
        this.betaValue = 0;  // 0.0 - 1.0 (based on keyboard activity)
        
        // UI elements
        this.alphaMeter = document.getElementById('alpha-meter').querySelector('.meter-value');
        this.betaMeter = document.getElementById('beta-meter').querySelector('.meter-value');
        this.alphaValueText = document.getElementById('alpha-value');
        this.betaValueText = document.getElementById('beta-value');

        // Bind event handlers
        this._bindEvents();
    }

    _bindEvents() {
        // Mouse movement tracking
        document.addEventListener('mousemove', this._handleMouseMove.bind(this));
        
        // Keyboard tracking
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
        document.addEventListener('keyup', this._handleKeyUp.bind(this));
    }

    _handleMouseMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    _handleKeyDown(event) {
        // Ignore keys like Shift, Ctrl, etc.
        if (event.key.length === 1) {
            this.keysPressed.add(event.key);
            this.keyActivityLevel = Math.min(1.0, this.keyActivityLevel + 0.2);
        }
    }    _handleKeyUp(event) {
        if (this.keysPressed.has(event.key)) {
            this.keysPressed.delete(event.key);
        }
    }
    
    update() {
        // Calculate mouse velocity
        const dx = this.mouseX - this.prevMouseX;
        const dy = this.mouseY - this.prevMouseY;
        this.mouseVelocity = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate direction (if moving)
        if (this.mouseVelocity > 0.1) {
            this.mouseDirection = Math.atan2(dy, dx);
        }

        // Update previous mouse position
        this.prevMouseX = this.mouseX;
        this.prevMouseY = this.mouseY;

        // Apply mouse velocity to alpha waves (with enhanced sensitivity)
        // Higher velocity = higher frequency simulation (more pronounced alpha waves)
        const normalizedVelocity = Math.min(1.0, this.mouseVelocity / 20); // Increased sensitivity
        
        // Apply frequency-focused weighting (exponential curve gives more dynamic range)
        const frequencyFactor = Math.pow(normalizedVelocity, 1.5);
        this.alphaValue = this.alphaValue * 0.8 + frequencyFactor * 0.2;

        // Apply keyboard activity to beta waves (with enhanced complexity mapping)
        this.keyActivityLevel *= this.keyActivityDecay;
        
        // The more keys pressed simultaneously, the more complex the rhythm
        const complexityFactor = Math.min(1.0, this.keysPressed.size / 5) * 0.5;
        const activityFactor = this.keyActivityLevel * 0.5;
        
        // Combine both factors for beta value (rhythm complexity)
        this.betaValue = this.betaValue * 0.7 + (complexityFactor + activityFactor) * 0.3;

        // Update UI meters
        this._updateMeters();

        return {
            alpha: this.alphaValue,
            beta: this.betaValue,
            mouseDirection: this.mouseDirection,
            keysActive: this.keysPressed.size
        };
    }

    _updateMeters() {
        // Update the visual meters
        this.alphaMeter.style.width = `${this.alphaValue * 100}%`;
        this.betaMeter.style.width = `${this.betaValue * 100}%`;
        
        // Update text values (formatted to 2 decimal places)
        this.alphaValueText.textContent = this.alphaValue.toFixed(2);
        this.betaValueText.textContent = this.betaValue.toFixed(2);
    }

    // Public getter methods
    getAlphaWaves() {
        return this.alphaValue;
    }

    getBetaWaves() {
        return this.betaValue;
    }
}

// Export the class for use in other modules
window.InputSystem = InputSystem;