/**
 * AIMusicEngine - Generates music using the MagentaJS library
 */
class AIMusicEngine {
    constructor() {
        // Magenta model references
        this.musicVAE = null;
        this.musicRNN = null;
        
        // For rhythm-melody generation
        this.currentSequence = null;
        this.generatedSequences = [];
        
        // Music style parameters
        this.genreParams = {
            trance: {
                temperature: 0.8,
                stepsPerQuarter: 4,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempoMultiplier: 1.0
            },
            dubstep: {
                temperature: 1.2,
                stepsPerQuarter: 4,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempoMultiplier: 0.5
            },
            dnb: {
                temperature: 1.0,
                stepsPerQuarter: 6,
                quantizationInfo: { stepsPerQuarter: 6 },
                tempoMultiplier: 1.5
            }
        };
        
        // Current genre blend
        this.genreBlend = {
            trance: 0.33,
            dubstep: 0.33,
            dnb: 0.33
        };
        
        // Initialize Magenta models
        this._initModels();
    }
    
    async _initModels() {
        try {
            // Load MusicVAE melody model
            this.musicVAE = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
            await this.musicVAE.initialize();
            
            // Load MusicRNN continuation model
            this.musicRNN = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
            await this.musicRNN.initialize();
            
            console.log('AI music models loaded successfully');
        } catch (error) {
            console.error('Error initializing Magenta models:', error);
        }
    }
      /**
     * Create a seed melody based on quantum rhythm pattern
     * @param {Object} rhythmPattern - Object with kick, snare, hihat, clap booleans
     * @param {Number} alphaValue - Alpha wave value for pitch selection
     * @param {Number} betaValue - Beta wave value for velocity
     * @returns {Object} Magenta NoteSequence
     */
    createSeedSequence(rhythmPattern, alphaValue, betaValue) {
        // Create a new NoteSequence
        const sequence = {
            notes: [],
            totalTime: 1.0,
            // Dynamic tempo based on alpha waves (frequency)
            tempos: [{ time: 0, qpm: 100 + Math.round(alphaValue * 60) }], // 100-160 BPM range
            // Dynamic quantization based on beta (complexity)
            quantizationInfo: { stepsPerQuarter: Math.max(4, Math.round(4 + betaValue * 4)) }
        };
        
        // Map alpha value to a scale selection
        // Higher alpha (faster mouse) = brighter scales
        const pitchBase = 60; // Middle C
        
        // Scale options from darker to brighter
        const scales = {
            minor: [0, 2, 3, 7, 8, 12, 14, 15], // Minor scale (darker)
            pentatonic: [0, 2, 4, 7, 9, 12, 14, 16], // Pentatonic (neutral)
            major: [0, 2, 4, 5, 7, 9, 11, 12] // Major scale (brighter)
        };
        
        // Select scale based on alpha value
        let selectedScale;
        if (alphaValue < 0.33) {
            selectedScale = scales.minor; // Lower alpha = darker mood
        } else if (alphaValue < 0.66) {
            selectedScale = scales.pentatonic; // Mid alpha = neutral mood
        } else {
            selectedScale = scales.major; // Higher alpha = brighter mood
        }
          // Calculate dynamic step positions based on beta complexity
        // More complex rhythms (higher beta) = more syncopation and subdivisions
        const rhythmComplexity = Math.round(betaValue * 3); // 0-3 complexity levels
        
        const positions = {
            // Kick positions (more complex = more kick drum variations)
            kick: rhythmComplexity === 0 ? [0] : 
                  rhythmComplexity === 1 ? [0, 0.75] : 
                  rhythmComplexity === 2 ? [0, 0.5, 0.75] : 
                  [0, 0.25, 0.5, 0.75],
                  
            // Snare positions (more complex = more syncopated snares)
            snare: rhythmComplexity === 0 ? [0.5] : 
                   rhythmComplexity === 1 ? [0.5, 0.75] : 
                   rhythmComplexity === 2 ? [0.25, 0.5, 0.75] : 
                   [0.125, 0.375, 0.5, 0.875],
                   
            // Hi-hat patterns (more complex = more subdivisions)
            hihat: rhythmComplexity === 0 ? [0, 0.5] : 
                   rhythmComplexity === 1 ? [0, 0.25, 0.5, 0.75] : 
                   rhythmComplexity === 2 ? [0, 0.125, 0.25, 0.375, 0.5, 0.75] : 
                   [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875],
                   
            // Clap positions
            clap: rhythmComplexity === 0 ? [0.75] : [0.25, 0.75]
        };
        
        // Map beta value to note velocity (loudness) - more complex = more dynamics
        const baseVelocity = Math.round(80 + alphaValue * 40); // 80-120 range
        
        // Add notes based on rhythm pattern with frequency-based pitch mapping
        if (rhythmPattern.kick) {
            // Alpha value directly maps to pitch - higher alpha (frequency) = higher pitch
            const pitchVariety = Math.floor(alphaValue * selectedScale.length);
            
            positions.kick.forEach((pos, i) => {
                // Only add note if rhythm complexity is sufficient
                if (i <= rhythmComplexity) {
                    const pitchOffset = (pitchVariety + i) % selectedScale.length;
                    const velocity = baseVelocity - (i * 5); // Slight velocity variation
                    
                    sequence.notes.push({
                        pitch: pitchBase - 24 + selectedScale[pitchOffset],
                        startTime: pos,
                        endTime: pos + 0.2,
                        velocity: velocity
                    });
                }
            });
        }
        
        if (rhythmPattern.snare) {
            positions.snare.forEach((pos, i) => {
                if (i <= rhythmComplexity) {
                    const pitchOffset = Math.floor(alphaValue * selectedScale.length);
                    const velocity = baseVelocity - (i * 3);
                    
                    sequence.notes.push({
                        pitch: pitchBase - 12 + selectedScale[pitchOffset],
                        startTime: pos,
                        endTime: pos + 0.15,
                        velocity: velocity
                    });
                }
            });
        }
        
        if (rhythmPattern.hihat) {
            // Higher alpha = faster hi-hat patterns
            const hihatDensity = Math.min(positions.hihat.length, 
                                        Math.round(2 + alphaValue * 6)); // 2-8 hi-hats
            
            // Use only the first n positions based on alpha value
            positions.hihat.slice(0, hihatDensity).forEach((pos, i) => {
                const pitchOffset = (Math.floor(alphaValue * 100) + i) % selectedScale.length;
                const velocity = baseVelocity - 15 + (alphaValue * 10); // Higher alpha = sharper hi-hats
                
                sequence.notes.push({
                    pitch: pitchBase + selectedScale[pitchOffset],
                    startTime: pos,
                    endTime: pos + 0.1,
                    velocity: velocity
                });
            });
        }
        
        if (rhythmPattern.clap) {
            positions.clap.forEach((pos, i) => {
                if (i <= rhythmComplexity) {
                    const pitchOffset = Math.floor(alphaValue * selectedScale.length);
                    
                    sequence.notes.push({
                        pitch: pitchBase + 12 + selectedScale[pitchOffset],
                        startTime: pos,
                        endTime: pos + 0.2,
                        velocity: baseVelocity + 5
                    });
                }
            });
        }
        
        this.currentSequence = sequence;
        return sequence;
    }
    
    /**
     * Generate full melody from seed sequence using MusicVAE
     * @param {Object} seedSequence - NoteSequence to start from
     * @param {Number} alphaValue - Used to affect temperature
     * @param {Number} betaValue - Used to affect note density
     * @returns {Promise<Object>} Generated NoteSequence
     */
    async generateMelody(seedSequence, alphaValue, betaValue) {
        if (!this.musicVAE || !this.musicVAE.initialized) {
            console.warn('MusicVAE not initialized yet');
            return seedSequence;
        }
        
        try {
            // Calculate blended parameters based on genre mix
            const temperature = this._blendGenreParams('temperature', alphaValue);
            const stepsPerQuarter = this._blendGenreParams('stepsPerQuarter', betaValue);
            
            // Generate 2 variations and interpolate between them
            const z = await this.musicVAE.encode([seedSequence]);
            
            // Create a slightly altered z-vector for variation
            const zAlt = z[0].slice();
            for (let i = 0; i < zAlt.length; i++) {
                zAlt[i] += (Math.random() - 0.5) * 0.5; // Add some noise
            }
            
            // Generate the interpolated sequences
            const sequences = await this.musicVAE.decode(
                [z[0], zAlt],
                { temperature }
            );
            
            // Store generated sequences
            this.generatedSequences = sequences;
            
            return sequences[0];
        } catch (error) {
            console.error('Error generating melody:', error);
            return seedSequence;
        }
    }
    
    /**
     * Blend parameters from different genre settings based on current mix
     * @param {String} paramName - Name of the parameter to blend
     * @param {Number} influenceValue - Value to influence the blending
     * @returns {Number} Blended parameter value
     */
    _blendGenreParams(paramName, influenceValue) {
        // Update genre blend based on influence value
        this._updateGenreBlend(influenceValue);
        
        // Calculate weighted average of parameter across genres
        let blendedValue = 0;
        let totalWeight = 0;
        
        for (const genre in this.genreBlend) {
            const weight = this.genreBlend[genre];
            blendedValue += this.genreParams[genre][paramName] * weight;
            totalWeight += weight;
        }
        
        return blendedValue / totalWeight;
    }
    
    /**
     * Update the genre blend based on input values
     * @param {Number} influenceValue - Value to influence genre mix
     */
    _updateGenreBlend(influenceValue) {
        // Maps influenceValue (0-1) to genre mix
        // Lower values favor trance, mid values favor dubstep, high values favor DnB
        const trance = Math.max(0, 1 - 2 * influenceValue);
        const dnb = Math.max(0, 2 * influenceValue - 1);
        const dubstep = 1 - trance - dnb;
        
        this.genreBlend = {
            trance,
            dubstep,
            dnb
        };
    }
    
    /**
     * Get NoteSequence ready for playback
     * @returns {Object} Current note sequence
     */
    getCurrentSequence() {
        return this.currentSequence;
    }
    
    /**
     * Get current genre blend for audio parameters
     * @returns {Object} Genre blend values
     */
    getGenreBlend() {
        return this.genreBlend;
    }
}

// Export the class for use in other modules
window.AIMusicEngine = AIMusicEngine;