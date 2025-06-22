/**
 * QuantumLayer - Simulates a 2-qubit quantum circuit for rhythm generation
 */
class QuantumLayer {
    constructor() {
        // Quantum state (representing 2 qubits)
        this.state = {
            amplitudes: [1, 0, 0, 0], // |00⟩ initial state (100% probability)
            probabilities: [1, 0, 0, 0]
        };
        
        // Gate parameters
        this.phase = 0;
        
        // Measurement results (used for rhythm generation)
        this.lastMeasurement = [0, 0];
        
        // Debug element
        this.quantumStateElement = document.getElementById('quantum-state');
    }
    
    /**
     * Apply a Hadamard gate to the specified qubit
     * H = 1/√2 * [1  1]
     *           [1 -1]
     */
    applyHadamard(qubit) {
        const newState = [...this.state.amplitudes];
        const n = this.state.amplitudes.length;
        
        // Apply H to the specified qubit
        for (let i = 0; i < n; i++) {
            // Check if we need to modify this basis state
            const bitValue = (i >> qubit) & 1;
            const flipMask = 1 << qubit;
            const flipIndex = i ^ flipMask;
            
            // Store original values before we modify them
            const origVal = this.state.amplitudes[i];
            const flipVal = this.state.amplitudes[flipIndex];
            
            // Apply Hadamard transform
            if (bitValue === 0) {
                newState[i] = (origVal + flipVal) / Math.SQRT2;
                newState[flipIndex] = (origVal - flipVal) / Math.SQRT2;
            }
        }
        
        this.state.amplitudes = newState;
        this._updateProbabilities();
    }
    
    /**
     * Apply CNOT gate (controlled-NOT)
     * CNOT = [1 0 0 0]
     *        [0 1 0 0]
     *        [0 0 0 1]
     *        [0 0 1 0]
     */
    applyCNOT(controlQubit, targetQubit) {
        const newState = [...this.state.amplitudes];
        const n = this.state.amplitudes.length;
        
        for (let i = 0; i < n; i++) {
            // Check if control qubit is 1
            const controlValue = (i >> controlQubit) & 1;
            
            if (controlValue === 1) {
                // Flip target qubit
                const flipMask = 1 << targetQubit;
                const flipIndex = i ^ flipMask;
                
                // Swap amplitudes
                newState[i] = this.state.amplitudes[flipIndex];
                newState[flipIndex] = this.state.amplitudes[i];
            }
        }
        
        this.state.amplitudes = newState;
        this._updateProbabilities();
    }
    
    /**
     * Apply a phase rotation gate to the specified qubit
     * R_phi = [1      0     ]
     *         [0  e^(i*phi) ]
     */
    applyPhaseRotation(qubit, phase) {
        const newState = [...this.state.amplitudes];
        const n = this.state.amplitudes.length;
        
        for (let i = 0; i < n; i++) {
            // Check if qubit is 1
            const bitValue = (i >> qubit) & 1;
            
            if (bitValue === 1) {
                // Apply phase rotation
                const real = Math.cos(phase);
                const imag = Math.sin(phase);
                
                // In this simplified version, we're using real numbers only
                newState[i] = this.state.amplitudes[i] * real;
            }
        }
        
        this.state.amplitudes = newState;
        this._updateProbabilities();
    }
    
    /**
     * Update probabilities based on current amplitudes
     */
    _updateProbabilities() {
        const probabilities = [];
        
        // Calculate probabilities (|amplitude|^2)
        for (let i = 0; i < this.state.amplitudes.length; i++) {
            probabilities[i] = Math.pow(this.state.amplitudes[i], 2);
        }
        
        // Normalize probabilities (in case of numerical errors)
        const sum = probabilities.reduce((acc, val) => acc + val, 0);
        if (sum > 0) {
            for (let i = 0; i < probabilities.length; i++) {
                probabilities[i] /= sum;
            }
        }
        
        this.state.probabilities = probabilities;
        this._updateDebugInfo();
    }
    
    /**
     * Process input values through quantum circuit
     */
    processInput(alphaValue, betaValue) {
        // Reset to initial state |00⟩
        this.reset();
        
        // Map input values to quantum gate parameters
        const hadamardStrength = alphaValue;
        this.phase = betaValue * Math.PI;
        
        // Create superposition based on alpha value
        if (hadamardStrength > 0.3) {
            this.applyHadamard(0);
        }
        if (hadamardStrength > 0.6) {
            this.applyHadamard(1);
        }
        
        // Apply phase rotation based on beta value
        this.applyPhaseRotation(0, this.phase);
        
        // Apply CNOT to entangle qubits
        this.applyCNOT(0, 1);
        
        // Perform measurement to get rhythm triggers
        return this.measure();
    }
    
    /**
     * Reset quantum state to |00⟩
     */
    reset() {
        this.state.amplitudes = [1, 0, 0, 0];
        this.state.probabilities = [1, 0, 0, 0];
        this._updateDebugInfo();
    }
    
    /**
     * Measure the quantum state and return results
     */
    measure() {
        // Simulate measurement outcome based on probabilities
        const rand = Math.random();
        let cumulativeProb = 0;
        
        for (let i = 0; i < this.state.probabilities.length; i++) {
            cumulativeProb += this.state.probabilities[i];
            
            if (rand < cumulativeProb) {
                // Convert to binary representation
                this.lastMeasurement = [
                    (i >> 1) & 1,  // First qubit
                    i & 1          // Second qubit
                ];
                
                // Update quantum state to measured state
                const newState = [0, 0, 0, 0];
                newState[i] = 1;
                this.state.amplitudes = newState;
                this.state.probabilities = [0, 0, 0, 0];
                this.state.probabilities[i] = 1;
                
                break;
            }
        }
        
        this._updateDebugInfo();
        
        // Convert measurement to rhythm triggers
        return this._mapMeasurementToRhythm();
    }
    
    /**
     * Map measurement results to rhythm triggers
     */
    _mapMeasurementToRhythm() {
        // Calculate combined state as a decimal (0-3)
        const stateValue = (this.lastMeasurement[0] << 1) | this.lastMeasurement[1];
        
        // Each state triggers different drum combinations
        return {
            kick: stateValue === 1 || stateValue === 3,
            snare: stateValue === 2 || stateValue === 3,
            hihat: stateValue === 1 || stateValue === 2,
            clap: stateValue === 3
        };
    }
    
    /**
     * Update the debug panel with quantum state information
     */
    _updateDebugInfo() {
        if (this.quantumStateElement) {
            const stateInfo = [
                `State Vector:`,
                `|00⟩: ${this.state.amplitudes[0].toFixed(3)} (${(this.state.probabilities[0] * 100).toFixed(1)}%)`,
                `|01⟩: ${this.state.amplitudes[1].toFixed(3)} (${(this.state.probabilities[1] * 100).toFixed(1)}%)`,
                `|10⟩: ${this.state.amplitudes[2].toFixed(3)} (${(this.state.probabilities[2] * 100).toFixed(1)}%)`,
                `|11⟩: ${this.state.amplitudes[3].toFixed(3)} (${(this.state.probabilities[3] * 100).toFixed(1)}%)`,
                ``,
                `Last Measurement: |${this.lastMeasurement[0]}${this.lastMeasurement[1]}⟩`,
                `Phase: ${(this.phase / Math.PI).toFixed(2)}π`
            ].join('\n');
            
            this.quantumStateElement.textContent = stateInfo;
        }
    }
    
    /**
     * Get the quantum state for visualization
     */
    getStateForVisualization() {
        return {
            amplitudes: this.state.amplitudes,
            probabilities: this.state.probabilities,
            lastMeasurement: this.lastMeasurement,
            phase: this.phase
        };
    }
}

// Export the class for use in other modules
window.QuantumLayer = QuantumLayer;