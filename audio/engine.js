/**
 * Audio Engine - Manages all sound generation and processing
 * Uses Tone.js for synthesis and audio processing
 */
class AudioEngine {
    constructor() {
        // Audio state
        this.playing = false;
        this.bpm = 120;
        this.currentPattern = null;
        
        // Loop timing
        this.stepIndex = 0;
        this.totalSteps = 16;
        
        // Analysis data
        this.analyzerData = null;
        
        // Mouse and keyboard input tracking
        this.lastMousePosition = { x: 0.5, y: 0.5 }; // Normalized 0-1
        this.lastKeyCode = 60; // Middle C
        this.keyPressTime = 0;
        
        // Initialize audio engine
        this.init();
    }
    
    init() {
        // Initialize Tone.js
        if (typeof Tone === 'undefined') {
            console.error('Tone.js library not loaded');
            return;
        }
        
        // Initialize audio context and create analyzer
        try {
            // Set initial BPM
            Tone.Transport.bpm.value = this.bpm;
            
            // Create audio analyzer
            this.analyzer = new Tone.Analyser({
                type: 'fft',
                size: 64
            });
            
            // Initialize analyzer data buffer
            this.analyzerData = new Uint8Array(this.analyzer.size);
            
            // Set up main gain node
            this.masterGain = new Tone.Gain(0.7).toDestination();
            this.analyzer.connect(this.masterGain);
            
            // Set up effects first
            this.setupEffects();
            
            // Then set up synthesizers
            this.setupSynths();
            
            // Create default pattern
            this.createDefaultPattern();
            
            // Start analysis loop once audio is initialized
            this.startAnalysisLoop();
            
            // Setup heartbeat to keep audio alive
            this.setupHeartbeat();
            
            // Send ready event after initialization
            document.dispatchEvent(new CustomEvent('audio-analysis', {
                detail: { 
                    ready: true 
                }
            }));
            
            console.log('AudioEngine initialized');
        } catch (error) {
            console.error('Error initializing audio engine:', error);
        }
    }
    
    setupEffects() {
        // Create effects chain
        this.effects = {
            // Reverb for ambience
            reverb: new Tone.Reverb({
                decay: 5,
                preDelay: 0.01,
                wet: 0.3
            }).connect(this.masterGain),
            
            // Delay for rhythm enhancement
            delay: new Tone.PingPongDelay({
                delayTime: "8n",
                feedback: 0.3,
                wet: 0.2
            }).connect(this.masterGain),
            
            // Filter for spectral shaping
            filter: new Tone.Filter({
                type: "lowpass",
                frequency: 2000,
                rolloff: -12,
                Q: 1
            }).connect(this.masterGain),
            
            // New - Auto filter controlled by mouse movement
            autoFilter: new Tone.AutoFilter({
                frequency: 1,
                type: "sine",
                depth: 1,
                baseFrequency: 200,
                octaves: 3,
                wet: 0.5
            }).connect(this.masterGain)
        };
    }
    
    setupSynths() {
        // Create synths for different parts
        this.synths = {
            // Basic synth for melody
            lead: new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.02,
                    decay: 0.2,
                    sustain: 0.2,
                    release: 0.5
                }
            }).connect(this.masterGain),
            
            // FM synth for bass
            bass: new Tone.PolySynth(Tone.FMSynth, {
                modulationIndex: 10,
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 0.8
                },
                modulation: {
                    type: "square"
                },
                modulationEnvelope: {
                    attack: 0.5,
                    decay: 0.01
                }
            }).connect(this.masterGain),
            
            // Simple drum kit
            drums: {
                kick: new Tone.MembraneSynth({
                    pitchDecay: 0.05,
                    octaves: 5,
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.5 }
                }).connect(this.masterGain),
                
                snare: new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0.02, release: 0.1 }
                }).connect(this.masterGain),
                
                hihat: new Tone.MetalSynth({
                    frequency: 200,
                    envelope: { attack: 0.001, decay: 0.05, sustain: 0.002, release: 0.05 },
                    harmonicity: 5.1,
                    modulationIndex: 32,
                    resonance: 1000,
                    octaves: 1.5
                }).connect(this.masterGain)
            },
            
            // Ambient pad
            pad: new Tone.PolySynth(Tone.AMSynth, {
                harmonicity: 2.5,
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 2,
                    decay: 0.1,
                    sustain: 0.9,
                    release: 5
                },
                modulation: {
                    type: "square"
                },
                modulationEnvelope: {
                    attack: 0.5,
                    decay: 0.1,
                    sustain: 1,
                    release: 10
                }
            }).connect(this.masterGain),
            
            // New - Interactive synth triggered by keyboard
            interactive: new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 3,
                modulationIndex: 10,
                detune: 0,
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.2,
                    release: 0.4
                },
                modulation: {
                    type: "square"
                },
                modulationEnvelope: {
                    attack: 0.5,
                    decay: 0.1
                }
            }).connect(this.masterGain)
        };
        
        // Connect synths to effects after both are created
        if (this.effects) {
            this.synths.interactive.connect(this.effects.reverb);
            this.synths.interactive.connect(this.effects.delay);
            this.synths.lead.connect(this.effects.delay);
            this.synths.pad.connect(this.effects.reverb);
        }
    }
    
    updateWithMusicPattern(pattern) {
        // Update current pattern with AI-generated music
        console.log('Received new music pattern from AI');
        this.currentPattern = pattern;
        
        if (this.playing) {
            // Recreate sequences with new pattern
            this.createSequences();
            
            // Notify of pattern change
            document.dispatchEvent(new CustomEvent('pattern-changed', {
                detail: { source: 'ai' }
            }));
        }
    }
    
    // Test audio by playing a simple sound
    testAudio() {
        try {
            // Play a quick test tone to ensure audio is working
            this.synths.lead.triggerAttackRelease("C5", "32n", undefined, 0.2);
            console.log("Test audio triggered");
        } catch (error) {
            console.error("Test audio failed:", error);
        }
    }
    
    // Method to generate a varied pattern based on current pattern
    generateVariedPattern() {
        // Start with the current pattern or default
        const basePattern = this.currentPattern || this.defaultPattern;
        if (!basePattern) return;
        
        // Create a varied version
        const variedPattern = {
            drums: [...basePattern.drums],
            bass: [...basePattern.bass],
            lead: [...basePattern.lead],
            pad: [...basePattern.pad]
        };
        
        // Apply variations based on quantum and brainwave data
        
        // 1. Vary drum pattern - add/remove hits
        variedPattern.drums = this.varyDrumPattern(variedPattern.drums);
        
        // 2. Vary bass pattern - change notes or timing
        variedPattern.bass = this.varyBassPattern(variedPattern.bass);
        
        // 3. Vary lead pattern - add ornaments, change duration
        variedPattern.lead = this.varyLeadPattern(variedPattern.lead);
        
        // 4. Vary pad pattern - change chord voicing
        variedPattern.pad = this.varyPadPattern(variedPattern.pad);
        
        // Update current pattern
        this.currentPattern = variedPattern;
        
        if (this.playing) {
            // Recreate sequences with new pattern
            this.createSequences();
            
            // Notify of pattern change
            document.dispatchEvent(new CustomEvent('pattern-changed', {
                detail: { source: 'variation' }
            }));
        }
        
        console.log('Generated varied music pattern');
        return variedPattern;
    }
    
    setupPatternVariation() {
        // Clear existing interval if any
        if (this.variationInterval) {
            clearTimeout(this.variationInterval);
        }
        
        // Function to schedule next variation
        const scheduleNextVariation = () => {
            // Random interval between 4-8 measures in milliseconds
            const measures = 4 + Math.floor(Math.random() * 4);
            const secondsPerMeasure = (60 / Tone.Transport.bpm.value) * 4; // 4 beats per measure
            const interval = secondsPerMeasure * measures * 1000;
            
            this.variationInterval = setTimeout(() => {
                try {
                    console.log("Generating pattern variation...");
                    
                    // Generate our own variation
                    this.generateVariedPattern();
                    
                    // Periodically (less often) request AI patterns
                    if (Math.random() < 0.2) {
                        document.dispatchEvent(new CustomEvent('request-ai-pattern'));
                    }
                    
                    // Schedule next variation
                    scheduleNextVariation();
                } catch (error) {
                    console.error("Error in pattern variation:", error);
                    // Even if there's an error, try to continue
                    scheduleNextVariation();
                }
            }, interval);
        };
        
        // Start the scheduling immediately
        scheduleNextVariation();
    }
    
    // Vary the drum pattern
    varyDrumPattern(originalPattern) {
        const newPattern = [...originalPattern];
        
        // Random variation type
        const variationType = Math.floor(Math.random() * 3);
        
        switch (variationType) {
            case 0: // Add a new drum hit
                {
                    // Find a suitable position (16th note grid)
                    const positions = Array.from({length: 16}, (_, i) => `${i}*16n`);
                    const randomPos = positions[Math.floor(Math.random() * positions.length)];
                    
                    // Random drum type (kick, snare, or hi-hat)
                    const drumTypes = [
                        { note: "C1", velocity: 0.7, duration: "16n" }, // Kick
                        { note: "D1", velocity: 0.6, duration: "16n" }, // Snare
                        { note: "G2", velocity: 0.4, duration: "32n" }  // Hi-hat
                    ];
                    const randomDrum = drumTypes[Math.floor(Math.random() * drumTypes.length)];
                    
                    // Add to pattern
                    newPattern.push({
                        time: randomPos,
                        note: randomDrum.note,
                        velocity: randomDrum.velocity,
                        duration: randomDrum.duration
                    });
                }
                break;
                
            case 1: // Remove a drum hit
                if (newPattern.length > 8) { // Ensure we keep enough hits
                    const indexToRemove = Math.floor(Math.random() * newPattern.length);
                    newPattern.splice(indexToRemove, 1);
                }
                break;
                
            case 2: // Change velocity of existing hits
                newPattern.forEach(hit => {
                    // Add slight random velocity variation
                    hit.velocity = Math.max(0.3, Math.min(0.9, hit.velocity + (Math.random() * 0.2 - 0.1)));
                });
                break;
        }
        
        return newPattern;
    }
    
    // Vary the bass pattern
    varyBassPattern(originalPattern) {
        const newPattern = [...originalPattern];
        
        // Random variation type
        const variationType = Math.floor(Math.random() * 3);
        
        switch (variationType) {
            case 0: // Change some notes
                newPattern.forEach(note => {
                    // 30% chance to change each note
                    if (Math.random() < 0.3) {
                        const baseNote = Tone.Frequency(note.note).toMidi();
                        const newMidi = baseNote + [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
                        note.note = Tone.Frequency(newMidi, "midi").toNote();
                    }
                });
                break;
                
            case 1: // Change rhythm (note durations)
                newPattern.forEach(note => {
                    // 40% chance to change each duration
                    if (Math.random() < 0.4) {
                        const durations = ["16n", "8n", "8n.", "4n"];
                        note.duration = durations[Math.floor(Math.random() * durations.length)];
                    }
                });
                break;
                
            case 2: // Add bass flourish
                if (newPattern.length > 0 && Math.random() < 0.7) {
                    // Pick a random note to add a flourish after
                    const targetIndex = Math.floor(Math.random() * newPattern.length);
                    const targetNote = newPattern[targetIndex];
                          // Create a new note right after it
                    const baseNote = Tone.Frequency(targetNote.note).toMidi();
                    const flourishNote = baseNote + [2, 4, -2, -4][Math.floor(Math.random() * 4)];
                    
                    // Calculate time more safely - avoid using Tone.Time().add() which can cause issues
                    let nextTime;
                    if (targetNote.time === 0) {
                        nextTime = targetNote.duration;
                    } else if (typeof targetNote.time === 'string') {
                        // Simple time addition for common patterns
                        if (targetNote.duration === '8n') {
                            if (targetNote.time === '0') nextTime = '8n';
                            else if (targetNote.time === '8n') nextTime = '4n';
                            else if (targetNote.time === '4n') nextTime = '4n+8n';
                            else if (targetNote.time === '4n+8n') nextTime = '2n';
                            else if (targetNote.time === '2n') nextTime = '2n+8n';
                            else if (targetNote.time === '2n+8n') nextTime = '2n+4n';
                            else if (targetNote.time === '2n+4n') nextTime = '2n+4n+8n';
                            else nextTime = '0'; // Default to beginning if unknown
                        } else {
                            // For other durations, default to the next quarter note
                            nextTime = targetNote.time;
                        }
                    } else {
                        nextTime = '0'; // Default to beginning if time format is unrecognized
                    }
                    
                    newPattern.push({
                        time: nextTime,
                        note: Tone.Frequency(flourishNote, "midi").toNote(),
                        velocity: 0.6,
                        duration: "16n"
                    });
                }
                break;
        }
        
        return newPattern;
    }
    
    // Vary the lead pattern
    varyLeadPattern(originalPattern) {
        const newPattern = [...originalPattern];
          // If pattern is empty, add a basic melody
        if (newPattern.length === 0) {
            const notes = ["C4", "E4", "G4", "A4"];
            
            newPattern.push({
                time: "2n",
                note: notes[Math.floor(Math.random() * notes.length)],
                velocity: 0.6,
                duration: "4n"
            });
            
            newPattern.push({
                time: "2n+4n", // Directly use "2n+4n" instead of trying to add times
                note: notes[Math.floor(Math.random() * notes.length)],
                velocity: 0.5,
                duration: "4n"
            });
        } else {
            // Modify existing lead pattern
            // 50% chance to transpose the whole melody
            if (Math.random() < 0.5) {
                const transposeAmount = [-12, -7, -5, 0, 5, 7, 12][Math.floor(Math.random() * 7)];
                
                newPattern.forEach(note => {
                    const midiNote = Tone.Frequency(note.note).toMidi() + transposeAmount;
                    note.note = Tone.Frequency(midiNote, "midi").toNote();
                });
            } else {
                // Otherwise vary individual notes
                newPattern.forEach(note => {
                    // 30% chance to change each note
                    if (Math.random() < 0.3) {
                        const scale = [0, 2, 4, 5, 7, 9, 11]; // C major scale intervals
                        const baseNote = Tone.Frequency(note.note).toMidi();
                        const baseOctave = Math.floor(baseNote / 12);
                        const newInterval = scale[Math.floor(Math.random() * scale.length)];
                        note.note = Tone.Frequency(baseOctave * 12 + 60 + newInterval, "midi").toNote();
                    }
                });
            }
        }
        
        return newPattern;
    }
    
    // Vary the pad pattern
    varyPadPattern(originalPattern) {
        const newPattern = [...originalPattern];
        
        // Define chord types to choose from
        const chordTypes = [
            { name: 'major', notes: [0, 4, 7] },
            { name: 'minor', notes: [0, 3, 7] },
            { name: 'sus4', notes: [0, 5, 7] },
            { name: 'major7', notes: [0, 4, 7, 11] },
            { name: 'minor7', notes: [0, 3, 7, 10] }
        ];
        
        // Choose a new chord type
        const chordType = chordTypes[Math.floor(Math.random() * chordTypes.length)];
        
        // Choose a root note from C, F, G, Am (common chord progression roots)
        const roots = [60, 65, 67, 69]; // C, F, G, A in MIDI
        const root = roots[Math.floor(Math.random() * roots.length)];
        
        // Generate new chord
        const chordNotes = chordType.notes.map(interval => 
            Tone.Frequency(root + interval, "midi").toNote()
        );
        
        // Replace existing pad chord or add a new one
        if (newPattern.length > 0) {
            newPattern[0].note = chordNotes;
        } else {
            newPattern.push({
                time: 0,
                note: chordNotes,
                velocity: 0.3,
                duration: "1m"
            });
        }
        
        return newPattern;
    }
    
    startAnalysisLoop() {
        // Create analysis function
        const analysisLoop = () => {
            // Skip if analyzer is not ready
            if (!this.analyzer || !this.analyzerData) {
                requestAnimationFrame(analysisLoop);
                return;
            }
            
            try {
                // Get frequency data - this will be an array of frequency bin values
                const values = this.analyzer.getValue();
                
                // Convert to Uint8Array 
                for (let i = 0; i < values.length; i++) {
                    this.analyzerData[i] = Math.abs(values[i] * 255);
                }
                
                // Calculate audio energy in different frequency bands
                const energy = this.calculateAudioEnergy();
                
                // Dispatch audio analysis event with frequency data
                document.dispatchEvent(new CustomEvent('audio-analysis', {
                    detail: {
                        frequencyData: Array.from(this.analyzerData),
                        energy: energy
                    }
                }));
            } catch (error) {
                console.error('Error in audio analysis loop:', error);
            }
            
            // Continue loop
            requestAnimationFrame(analysisLoop);
        };
        
        // Start the loop
        analysisLoop();
    }
    
    calculateAudioEnergy() {
        // Ensure analyzer data exists before accessing length
        if (!this.analyzerData || !this.analyzerData.length) {
            return {
                bass: 0,
                mid: 0,
                high: 0,
                total: 0
            };
        }
        
        // Calculate energy in different frequency bands
        let bassEnergy = 0;
        let midEnergy = 0;
        let highEnergy = 0;
        
        // Bass frequencies (20-250Hz) - first ~10% of bins
        const bassEnd = Math.floor(this.analyzerData.length * 0.1);
        for (let i = 0; i < bassEnd; i++) {
            bassEnergy += this.analyzerData[i];
        }
        bassEnergy = bassEnergy / bassEnd;
        
        // Mid frequencies (250-2000Hz) - next ~30% of bins
        const midEnd = Math.floor(this.analyzerData.length * 0.4);
        for (let i = bassEnd; i < midEnd; i++) {
            midEnergy += this.analyzerData[i];
        }
        midEnergy = midEnergy / (midEnd - bassEnd);
        
        // High frequencies (2000-20000Hz) - remaining bins
        for (let i = midEnd; i < this.analyzerData.length; i++) {
            highEnergy += this.analyzerData[i];
        }
        highEnergy = highEnergy / (this.analyzerData.length - midEnd);
        
        // Normalize values
        const total = (bassEnergy + midEnergy + highEnergy) / 3;
        
        return {
            bass: bassEnergy / 255,
            mid: midEnergy / 255,
            high: highEnergy / 255,
            total: total / 255
        };
    }
    startPlayback() {
        if (this.playing) return;
        
        try {
            // Ensure Tone.js context is started (needed for audio to work)
            Tone.start().then(() => {
                console.log("Tone.js audio context started");
                
                // Set BPM
                Tone.Transport.bpm.value = this.bpm;
                
                // If no pattern exists, create default
                if (!this.currentPattern) {
                    this.createDefaultPattern();
                }
                
                let sequencesCreated = false;
                try {
                    // Create sequences first
                    this.createSequences();
                    sequencesCreated = true;
                } catch (seqError) {
                    console.error('Error creating sequences:', seqError);
                }
                
                // Start transport
                Tone.Transport.start();
                
                // Set flag
                this.playing = true;
                
                // Ensure we're reliably creating audio even if there's an issue
                this.testAudio();
                
                // If sequences failed, use the emergency pattern as fallback
                if (!sequencesCreated || !this.sequences || Object.keys(this.sequences).length === 0) {
                    console.warn("Using emergency pattern fallback");
                    this.playEmergencyPattern();
                } else {
                    // Set up continuous pattern variation if sequences are working
                    this.setupPatternVariation();
                }
                
                // Set up a simple beat counter for debugging
                if (!this.beatCounter) {
                    this.beatCounter = 0;
                    Tone.Transport.scheduleRepeat(time => {
                        this.beatCounter++;
                        if (this.beatCounter % 16 === 0) {
                            console.log(`Music still playing: beat ${this.beatCounter}`);
                            // Re-test audio to make sure things are working
                            this.testAudio();
                        }
                    }, "4n");
                }
                
                console.log('Audio playback started');
                
            }).catch(err => {
                console.error("Error starting Tone.js:", err);
                // Try emergency pattern even if Tone.start fails
                this.playing = true;
                Tone.Transport.start();
                this.playEmergencyPattern();
            });
            
        } catch (error) {
            console.error('Error starting playback:', error);
            
            // Last resort - try emergency pattern directly
            try {
                Tone.Transport.start();
                this.playing = true;
                this.playEmergencyPattern();
            } catch (emergencyError) {
                console.error("Even emergency playback failed:", emergencyError);
            }
        }
    }
    
    // Emergency play method - will play directly without sequences if needed
    playEmergencyPattern() {
        try {
            console.log("Playing emergency pattern");
            
            // Simple kick drum pattern on beats 1 and 3
            const kickInterval = Tone.Transport.scheduleRepeat(time => {
                this.synths.drums.kick.triggerAttackRelease("C1", "8n", time, 0.8);
            }, "2n");
            
            // Simple snare on beats 2 and 4
            const snareInterval = Tone.Transport.scheduleRepeat(time => {
                this.synths.drums.snare.triggerAttackRelease("8n", time, 0.7);
            }, "2n", "4n"); // start on 2nd beat
            
            // Simple hi-hat pattern on 8th notes
            const hihatInterval = Tone.Transport.scheduleRepeat(time => {
                this.synths.drums.hihat.triggerAttackRelease("32n", time, 0.3);
            }, "8n");
            
            // Simple bass line on quarter notes
            const bassInterval = Tone.Transport.scheduleRepeat(time => {
                const note = ["C2", "G1", "A1", "F1"][Math.floor(this.beatCounter/4) % 4];
                this.synths.bass.triggerAttackRelease(note, "8n", time, 0.7);
            }, "4n");
            
            // Store intervals for later cleanup if needed
            this.emergencyIntervals = {
                kick: kickInterval,
                snare: snareInterval,
                hihat: hihatInterval,
                bass: bassInterval
            };
            
            return true;
        } catch (error) {
            console.error("Error playing emergency pattern:", error);
            return false;
        }
    }
    
    setupHeartbeat() {
        // Set up a heartbeat to ensure audio context stays active
        this.heartbeatInterval = setInterval(() => {
            if (this.playing) {
                // Check if transport is still running
                if (Tone.Transport.state !== "started") {
                    console.log("Transport stopped unexpectedly, restarting...");
                    Tone.Transport.start();
                }
                
                // Make sure sequences are still there
                if (!this.sequences || Object.keys(this.sequences).length === 0) {
                    console.log("Sequences lost, recreating...");
                    this.createSequences();
                }
                
                // Trigger a silent note to keep audio context active
                this.synths.lead.triggerAttackRelease("C8", "32n", undefined, 0.01);
            }
        }, 5000); // Check every 5 seconds
    }
    
    updateWithBrainwaves(data) {
        if (!data) return;
        
        try {
            // Extract alpha and beta values
            const alpha = data.alpha || 0.5;
            const beta = data.beta || 0.3;
            
            // Use alpha waves to adjust BPM (80-140)
            const targetBpm = 80 + (alpha * 60);
            
            // Only change BPM if there's a significant difference
            if (Math.abs(this.bpm - targetBpm) > 5) {
                console.log(`Adjusting BPM from ${this.bpm} to ${targetBpm}`);
                Tone.Transport.bpm.rampTo(targetBpm, 2); // Smooth transition over 2 seconds
                this.bpm = targetBpm;
            }
            
            // Use beta waves (alertness) to adjust overall volume
            if (this.masterGain) {
                const targetVolume = 0.5 + (beta * 0.3); // 0.5 to 0.8 range
                this.masterGain.gain.rampTo(targetVolume, 1);
            }
        } catch (error) {
            console.error('Error processing brainwave data:', error);
        }
    }

    updateWithQuantumData(data) {
        if (!data || !this.effects) return;
        
        try {
            // Extract entropy and complexity values
            const entropy = data.entropy || 0.5;
            const complexity = data.complexity || 0.5;
            
            console.log(`Processing quantum data: entropy=${entropy.toFixed(2)}, complexity=${complexity.toFixed(2)}`);
            
            // Use quantum entropy to control filter frequency
            if (this.effects.filter) {
                // Map entropy to filter frequency (500-5000Hz)
                const filterFreq = 500 + (entropy * 4500);
                this.effects.filter.frequency.rampTo(filterFreq, 0.5);
            }
            
            // Use quantum complexity for delay feedback
            if (this.effects.delay) {
                // Map complexity to delay feedback (0.1-0.6)
                const delayFeedback = 0.1 + (complexity * 0.5);
                this.effects.delay.feedback.rampTo(delayFeedback, 1);
            }
            
            // Use quantum data to trigger pattern variations
            if (this.playing && Math.random() < 0.1) { // 10% chance on each update
                console.log("Quantum fluctuation triggering pattern variation");
                this.generateVariedPattern();
            }
            
            // Use entropy for reverb decay time
            if (this.effects.reverb) {
                // Higher entropy = longer reverb decay (1-8 seconds)
                const reverbDecay = 1 + (entropy * 7);
                
                // Need to rebuild reverb for decay change to take effect
                const currentWet = this.effects.reverb.wet.value;
                this.effects.reverb.dispose();
                this.effects.reverb = new Tone.Reverb({
                    decay: reverbDecay,
                    preDelay: 0.01,
                    wet: currentWet
                }).connect(this.masterGain);
                
                // Reconnect synths to new reverb
                if (this.synths) {
                    this.synths.interactive.connect(this.effects.reverb);
                    this.synths.pad.connect(this.effects.reverb);
                }
            }
        } catch (error) {
            console.error('Error processing quantum data:', error);
        }
    }
    
    // Convert keyboard key code to musical note
    keyCodeToNote(keyCode) {
        // Map keyCode to MIDI note in C major scale
        const cMajorScale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale MIDI notes
        const noteIndex = keyCode % cMajorScale.length;
        const octaveOffset = Math.floor(keyCode / 24) - 2;
        
        // Get base note from the scale
        let midiNote = cMajorScale[noteIndex];
        
        // Apply octave transposition
        midiNote += (octaveOffset * 12);
        
        // Ensure note is in a reasonable range
        while (midiNote < 36) midiNote += 12;
        while (midiNote > 96) midiNote -= 12;
        
        // Convert MIDI note to note name
        return Tone.Frequency(midiNote, "midi").toNote();
    }

    // Generate a chord based on a root note
    generateChord(rootNote) {
        // Basic chord types
        const chordTypes = [
            { name: 'major', intervals: [0, 4, 7] },
            { name: 'minor', intervals: [0, 3, 7] },
            { name: 'dominant7', intervals: [0, 4, 7, 10] },
            { name: 'major7', intervals: [0, 4, 7, 11] },
            { name: 'minor7', intervals: [0, 3, 7, 10] },
            { name: 'sus4', intervals: [0, 5, 7] }
        ];
        
        // Select a random chord type
        const chordType = chordTypes[Math.floor(Math.random() * chordTypes.length)];
        
        // Generate chord notes
        const notes = chordType.intervals.map(interval => rootNote + interval);
        
        return {
            rootNote: rootNote,
            type: chordType.name,
            notes: notes
        };
    }
    
    handleKeyboardInput(data) {
        if (!this.playing || !data || !data.key) return;
        
        try {
            // Store the key code for note generation
            this.lastKeyCode = data.keyCode || data.key.charCodeAt(0);
            this.keyPressTime = Date.now();
            
            // Generate note from key code (map ASCII values to musical notes)
            const note = this.keyCodeToNote(this.lastKeyCode);
            
            // Generate velocity from data or use default
            const velocity = data.velocity || 0.7;
            
            // Trigger sound with interactive synth
            this.synths.interactive.triggerAttackRelease(note, "16n", undefined, velocity);
            
            // Add a percussion sound based on key type
            if (this.lastKeyCode % 2 === 0) {
                // Even key codes trigger hihat
                this.synths.drums.hihat.triggerAttackRelease("32n", undefined, velocity * 0.6);
            } else {
                // Odd key codes trigger snare
                this.synths.drums.snare.triggerAttackRelease("16n", undefined, velocity * 0.4);
            }
            
            // Special keys trigger kick drum
            if (data.key === " " || data.key === "Enter" || data.key === "Backspace") {
                this.synths.drums.kick.triggerAttackRelease("C1", "8n", undefined, velocity * 0.8);
            }
            
            // Dynamic effect adjustment based on recent keyboard activity
            if (this.effects.delay) {
                // Adjust delay feedback based on typing speed
                const timeSinceLastKey = Date.now() - this.keyPressTime;
                if (timeSinceLastKey < 500) { // Fast typing
                    this.effects.delay.feedback.rampTo(0.6, 0.1);
                } else {
                    this.effects.delay.feedback.rampTo(0.3, 1);
                }
            }
        } catch (error) {
            console.error('Error processing keyboard input:', error);
        }
    }
    
    handleMouseInput(data) {
        if (!this.playing || !data || !data.position) return;
        
        try {
            // Store the normalized mouse position
            this.lastMousePosition = data.position;
            
            // Use X position to control filter cutoff
            if (this.effects.filter) {
                const filterFreq = 200 + (this.lastMousePosition.x * 8000);
                this.effects.filter.frequency.rampTo(filterFreq, 0.1);
            }
            
            // Use Y position to control reverb mix
            if (this.effects.reverb) {
                const reverbWet = this.lastMousePosition.y * 0.7;
                this.effects.reverb.wet.rampTo(reverbWet, 0.2);
            }
            
            // Use mouse speed to control auto filter
            if (this.effects.autoFilter && data.speed) {
                const autoFilterFreq = 0.5 + (data.speed * 5);
                this.effects.autoFilter.frequency.rampTo(autoFilterFreq, 0.1);
                
                const autoFilterDepth = 0.5 + (data.speed * 0.5);
                this.effects.autoFilter.depth.rampTo(autoFilterDepth, 0.1);
            }
            
            // Trigger ambient pad notes based on mouse position
            if (data.speed > 0.5 && Math.random() > 0.7) {
                // Generate chord based on mouse position
                const rootNote = 48 + Math.floor(this.lastMousePosition.x * 24);
                const chord = this.generateChord(rootNote);
                
                // Play chord with velocity based on mouse speed
                this.synths.pad.triggerAttackRelease(
                    chord.notes.map(n => Tone.Frequency(n, "midi").toNote()),
                    "2n", 
                    undefined, 
                    Math.min(data.speed * 0.3, 0.5)
                );
            }
        } catch (error) {
            console.error('Error processing mouse input:', error);
        }
    }

    // Create a slightly more interesting default pattern to play until AI generates something
    
    createDefaultPattern() {
        // Generate a random bass line in C major
        const bassNotes = ['C2', 'E2', 'G2', 'A2', 'F2'];
        const bassPattern = [];
        const bassPositions = ['0', '8n', '4n', '4n+8n', '2n', '2n+8n', '2n+4n', '2n+4n+8n'];
        
        bassPositions.forEach((pos, i) => {
            bassPattern.push({
                time: pos,
                note: bassNotes[Math.floor(Math.random() * bassNotes.length)],
                velocity: 0.6 + (Math.random() * 0.2),
                duration: '8n'
            });
        });
        
        // Create a standard drum pattern
        const drumPattern = [
            // Kicks on 1, 2, 3, 4
            { time: 0, note: "C1", velocity: 0.8, duration: "16n" },
            { time: "4n", note: "C1", velocity: 0.7, duration: "16n" },
            { time: "2n", note: "C1", velocity: 0.8, duration: "16n" },
            { time: "2n+4n", note: "C1", velocity: 0.7, duration: "16n" },
            
            // Snares on 2, 4
            { time: "4n", note: "D1", velocity: 0.7, duration: "16n" },
            { time: "2n+4n", note: "D1", velocity: 0.7, duration: "16n" },
            
            // Hi-hats on every 8th note
            ...Array.from({ length: 8 }, (_, i) => ({ 
                time: `${i}*8n`, note: "G2", velocity: 0.3, duration: "32n" 
            }))
        ];
        
        // Add some ghost notes to make drums more interesting
        if (Math.random() < 0.7) {
            drumPattern.push({ time: "8n", note: "D1", velocity: 0.3, duration: "16n" });
        }
        if (Math.random() < 0.7) {
            drumPattern.push({ time: "2n+8n", note: "D1", velocity: 0.3, duration: "16n" });
        }
        
        // Simple lead melody
        const melodyNotes = ['E4', 'G4', 'A4', 'C5'];
        const leadPattern = [
            {
                time: "2n",
                note: melodyNotes[Math.floor(Math.random() * melodyNotes.length)],
                velocity: 0.5,
                duration: "4n"
            },
            {
                time: "2n+4n",
                note: melodyNotes[Math.floor(Math.random() * melodyNotes.length)],
                velocity: 0.5,
                duration: "4n"
            }
        ];
        
        // Random chord for pad (C major or A minor)
        const padChords = [
            ["C3", "E3", "G3"],   // C major
            ["A2", "C3", "E3"]    // A minor
        ];
        const selectedChord = padChords[Math.floor(Math.random() * padChords.length)];
        
        const padPattern = [
            {
                time: 0,
                note: selectedChord,
                velocity: 0.3,
                duration: "1m"
            }
        ];
        
        this.defaultPattern = {
            drums: drumPattern,
            bass: bassPattern,
            lead: leadPattern,
            pad: padPattern
        };
    }
    
    createSequences() {
        // Clean up any existing sequences first
        this.disposeSequences();
        
        // Get pattern to use - either current or default
        const pattern = this.currentPattern || this.defaultPattern;
        if (!pattern) {
            console.error('No pattern available to create sequences');
            return;
        }
        
        try {
            // Initialize sequences object if needed
            this.sequences = this.sequences || {};
            
            // Create drums sequence
            if (pattern.drums && pattern.drums.length > 0) {
                // Create separate sequences for each drum type
                const kickEvents = pattern.drums.filter(d => d.note === "C1");
                const snareEvents = pattern.drums.filter(d => d.note === "D1");
                const hihatEvents = pattern.drums.filter(d => d.note === "G2");
                
                if (kickEvents.length > 0) {
                    this.sequences.kick = new Tone.Part((time, event) => {
                        this.synths.drums.kick.triggerAttackRelease(
                            event.note, 
                            event.duration, 
                            time, 
                            event.velocity
                        );
                    }, kickEvents).start(0);
                }
                
                if (snareEvents.length > 0) {
                    this.sequences.snare = new Tone.Part((time, event) => {
                        this.synths.drums.snare.triggerAttackRelease(
                            event.duration, 
                            time, 
                            event.velocity
                        );
                    }, snareEvents).start(0);
                }
                
                if (hihatEvents.length > 0) {
                    this.sequences.hihat = new Tone.Part((time, event) => {
                        this.synths.drums.hihat.triggerAttackRelease(
                            event.duration, 
                            time, 
                            event.velocity
                        );
                    }, hihatEvents).start(0);
                }
            }
            
            // Create bass sequence
            if (pattern.bass && pattern.bass.length > 0) {
                this.sequences.bass = new Tone.Part((time, event) => {
                    this.synths.bass.triggerAttackRelease(
                        event.note,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, pattern.bass).start(0);
            } else {
                // Create a fallback bass pattern if none exists
                const fallbackBass = [
                    { time: 0, note: "C2", velocity: 0.7, duration: "8n" },
                    { time: "4n", note: "G1", velocity: 0.7, duration: "8n" },
                    { time: "2n", note: "C2", velocity: 0.7, duration: "8n" },
                    { time: "2n+4n", note: "G1", velocity: 0.7, duration: "8n" }
                ];
                
                this.sequences.bass = new Tone.Part((time, event) => {
                    this.synths.bass.triggerAttackRelease(
                        event.note,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, fallbackBass).start(0);
            }
            
            // Create lead sequence
            if (pattern.lead && pattern.lead.length > 0) {
                this.sequences.lead = new Tone.Part((time, event) => {
                    this.synths.lead.triggerAttackRelease(
                        event.note,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, pattern.lead).start(0);
            }
            
            // Create pad sequence
            if (pattern.pad && pattern.pad.length > 0) {
                this.sequences.pad = new Tone.Part((time, event) => {
                    this.synths.pad.triggerAttackRelease(
                        event.note,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, pattern.pad).start(0);
            } else {
                // Create a fallback pad pattern if none exists
                const fallbackPad = [
                    { time: 0, note: ["C3", "E3", "G3"], velocity: 0.3, duration: "1m" }
                ];
                
                this.sequences.pad = new Tone.Part((time, event) => {
                    this.synths.pad.triggerAttackRelease(
                        event.note,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, fallbackPad).start(0);
            }
            
            // Loop all sequences - make sure everything loops every measure
            Object.values(this.sequences).forEach(seq => {
                seq.loop = true;
                seq.loopEnd = "1m";
            });
            
            console.log('Sequences created successfully');
            
        } catch (error) {
            console.error('Error creating sequences:', error);
        }
    }

    disposeSequences() {
        // Clean up all existing sequences
        if (this.sequences) {
            Object.values(this.sequences).forEach(seq => {
                try {
                    seq.dispose();
                } catch (error) {
                    // Ignore disposal errors
                }
            });
            this.sequences = {};
        }
    }
}

// Initialize audio engine when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.audioEngine = new AudioEngine();
    
    // Listen for brainwave events
    document.addEventListener('brainwave-data', (event) => {
        if (window.audioEngine) {
            window.audioEngine.updateWithBrainwaves(event.detail);
        }
    });    // Listen for quantum updates
    document.addEventListener('quantum-update', (event) => {
        if (window.audioEngine) {
            try {
                // Check that the method exists and is callable before using it
                if (typeof window.audioEngine.updateWithQuantumData === 'function') {
                    window.audioEngine.updateWithQuantumData(event.detail);
                } else {
                    console.warn('AudioEngine.updateWithQuantumData is not a function, skipping quantum update');
                }
            } catch (error) {
                console.error('Error handling quantum update:', error);
            }
        }
    });
    
    // Listen for new music patterns
    document.addEventListener('new-music-pattern', (event) => {
        if (window.audioEngine && event.detail) {
            window.audioEngine.updateWithMusicPattern(event.detail);
        }
    });
    
    // Listen for direct keyboard events
    document.addEventListener('keyboard-audio-event', (event) => {
        if (window.audioEngine && event.detail) {
            window.audioEngine.handleKeyboardInput(event.detail);
        }
    });
    
    // Listen for direct mouse events
    document.addEventListener('mouse-audio-event', (event) => {
        if (window.audioEngine && event.detail) {
            window.audioEngine.handleMouseInput(event.detail);
        }
    });
});