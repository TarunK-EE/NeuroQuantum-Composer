/**
 * CatchyMusicGenerator - Creates responsive, dynamic music based on user input
 * This class enhances the audio experience with more responsive music generation
 */
class CatchyMusicGenerator {
    constructor(audioSystem) {
        this.audioSystem = audioSystem;
        
        // Tone.js instruments
        this.instruments = {
            bass: null,
            lead: null,
            pad: null,
            drums: null
        };
        
        // Musical patterns
        this.patterns = {
            bass: [],
            lead: [],
            drums: []
        };
        
        // Playback state
        this.currentParts = [];
        this.currentPattern = 'simple';
        this.isPlaying = false;
        
        // Initialize instruments
        this._initInstruments();
    }
    
    _initInstruments() {
        // Bass synth
        this.instruments.bass = new Tone.MonoSynth({
            oscillator: {
                type: "sawtooth"
            },
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.6,
                release: 0.5
            },
            filterEnvelope: {
                attack: 0.05,
                decay: 0.5,
                sustain: 0.2,
                release: 1,
                baseFrequency: 200,
                octaves: 2.5
            }
        }).toDestination();
        
        // Lead synth
        this.instruments.lead = new Tone.PolySynth({
            maxPolyphony: 4,
            voice: Tone.Synth,
            options: {
                oscillator: {
                    type: "square4"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.3,
                    sustain: 0.4,
                    release: 0.6
                }
            }
        }).toDestination();
        
        // Pad synth
        this.instruments.pad = new Tone.PolySynth({
            maxPolyphony: 4,
            voice: Tone.Synth,
            options: {
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.5,
                    decay: 0.5,
                    sustain: 0.8,
                    release: 1.5
                }
            }
        }).toDestination();
        
        // Drums
        this.instruments.drums = {
            kick: new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 5,
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 0.4
                }
            }).toDestination(),
            snare: new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.02,
                    release: 0.4
                }
            }).toDestination(),
            hihat: new Tone.MetalSynth({
                frequency: 200,
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0.01,
                    release: 0.1
                },
                harmonicity: 5.1,
                modulationIndex: 16,
                resonance: 4000,
                octaves: 1.5
            }).toDestination()
        };
        
        // Create musical patterns
        this._createPatterns();
    }
    
    _createPatterns() {
        // Bass patterns based on complexity
        this.patterns.bass = {
            // Simple bass line
            simple: ["C2", null, "G1", null, "A1", null, "F1", null],
            // Medium complexity
            medium: ["C2", "E2", "G1", null, "A1", "C2", "F1", "G1"],
            // Complex
            complex: ["C2", "E2", "G1", "C3", "A1", "C2", "F1", "G1"]
        };
        
        // Lead patterns
        this.patterns.lead = {
            simple: [null, "E4", null, "C4", null, "G3", null, null],
            medium: [null, "E4", "G4", "C4", null, "G3", "A3", "C4"],
            complex: ["C4", "E4", "G4", "C5", "A4", "G4", "E4", "D4"]
        };
        
        // Drum patterns
        this.patterns.drums = {
            simple: [
                ["kick", null, "hihat", null, "kick", null, "hihat", null],
                [null, null, null, null, "snare", null, null, null]
            ],
            medium: [
                ["kick", null, "hihat", "kick", "kick", null, "hihat", "kick"],
                [null, "hihat", null, null, "snare", null, "hihat", null]
            ],
            complex: [
                ["kick", "hihat", "kick", "hihat", "kick", "hihat", "kick", "hihat"],
                ["hihat", null, "snare", "hihat", "snare", "hihat", "snare", "hihat"]
            ]
        };
    }
    
    /**
     * Start playing music based on input parameters
     * @param {Number} alpha - Alpha wave value (0-1)
     * @param {Number} beta - Beta wave value (0-1)
     */
    startMusic(alpha, beta) {
        this.stopMusic(); // Stop any current playback
        
        // Determine tempo based on alpha (mouse speed)
        const tempo = 80 + Math.round(alpha * 80); // 80-160 BPM
        Tone.Transport.bpm.value = tempo;
        
        // Determine complexity based on beta (keyboard activity)
        let complexity;
        if (beta < 0.3) {
            complexity = "simple";
        } else if (beta < 0.7) {
            complexity = "medium";
        } else {
            complexity = "complex";
        }
        
        this.currentPattern = complexity;
        
        // Subdivision based on alpha (faster = 16th notes, slower = 8th notes)
        const subdivision = alpha > 0.5 ? "16n" : "8n";
        
        // Set up bass pattern
        const bassPattern = new Tone.Sequence(
            (time, note) => {
                if (note !== null) {
                    this.instruments.bass.triggerAttackRelease(note, "8n", time, 0.8);
                }
            },
            this.patterns.bass[complexity],
            subdivision
        );
        
        // Set up lead pattern
        const leadPattern = new Tone.Sequence(
            (time, note) => {
                if (note !== null) {
                    this.instruments.lead.triggerAttackRelease(note, "16n", time, 0.6);
                }
            },
            this.patterns.lead[complexity],
            subdivision
        );
        
        // Set up drum patterns
        const kickPattern = new Tone.Sequence(
            (time, drum) => {
                if (drum === "kick") {
                    this.instruments.drums.kick.triggerAttackRelease("C1", "8n", time, 0.8);
                } else if (drum === "hihat") {
                    this.instruments.drums.hihat.triggerAttackRelease("8n", time, 0.4);
                }
            },
            this.patterns.drums[complexity][0],
            subdivision
        );
        
        const snarePattern = new Tone.Sequence(
            (time, drum) => {
                if (drum === "snare") {
                    this.instruments.drums.snare.triggerAttackRelease("16n", time, 0.7);
                } else if (drum === "hihat") {
                    this.instruments.drums.hihat.triggerAttackRelease("32n", time, 0.3);
                }
            },
            this.patterns.drums[complexity][1],
            subdivision
        );
        
        // Start all patterns
        bassPattern.start(0);
        leadPattern.start(0);
        kickPattern.start(0);
        snarePattern.start(0);
        
        // Store references for disposal
        this.currentParts = [bassPattern, leadPattern, kickPattern, snarePattern];
        
        // Start Transport if not already started
        if (Tone.Transport.state !== "started") {
            Tone.Transport.start();
        }
        
        this.isPlaying = true;
    }
    
    /**
     * Update music parameters in real-time
     * @param {Number} alpha - Alpha wave value (0-1)
     * @param {Number} beta - Beta wave value (0-1) 
     */
    updateMusic(alpha, beta) {
        if (!this.isPlaying) return;
        
        // Update tempo based on alpha (mouse speed)
        const tempo = 80 + Math.round(alpha * 80); // 80-160 BPM
        Tone.Transport.bpm.rampTo(tempo, 0.5);
        
        // Determine if complexity needs to change
        let newComplexity;
        if (beta < 0.3) {
            newComplexity = "simple";
        } else if (beta < 0.7) {
            newComplexity = "medium";
        } else {
            newComplexity = "complex";
        }
        
        // Only change patterns if complexity changed
        if (newComplexity !== this.currentPattern) {
            this.currentPattern = newComplexity;
            // Restart with new complexity
            this.startMusic(alpha, beta);
            return;
        }
        
        // Update synth parameters
        
        // Bass filter cutoff based on alpha
        if (this.instruments.bass.filterEnvelope) {
            const filterFreq = 100 + (alpha * 400);
            this.instruments.bass.filterEnvelope.baseFrequency = filterFreq;
        }
        
        // Lead synth waveform based on beta
        if (beta > 0.8 && this.instruments.lead.get().oscillator.type !== "sawtooth") {
            this.instruments.lead.set({ oscillator: { type: "sawtooth" } });
        } else if (beta > 0.4 && beta <= 0.8 && 
                  this.instruments.lead.get().oscillator.type !== "square4") {
            this.instruments.lead.set({ oscillator: { type: "square4" } });
        } else if (beta <= 0.4 && this.instruments.lead.get().oscillator.type !== "triangle") {
            this.instruments.lead.set({ oscillator: { type: "triangle" } });
        }
    }
    
    /**
     * Stop all music playback
     */
    stopMusic() {
        // Stop and dispose all current parts
        if (this.currentParts && this.currentParts.length) {
            this.currentParts.forEach(part => {
                part.stop();
                part.dispose();
            });
            this.currentParts = [];
        }
        
        this.isPlaying = false;
    }
}

// Export for use in other modules
window.CatchyMusicGenerator = CatchyMusicGenerator;