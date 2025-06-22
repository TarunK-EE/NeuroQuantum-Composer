/**
 * Visualizer - Creates a 3D visualization using Three.js
 */
class Visualizer {
    constructor(containerId) {
        // Container element
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element '${containerId}' not found`);
            return;
        }
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Visual elements
        this.qubitSpheres = [];
        this.entanglementBeams = [];
        this.particles = [];
        
        // Animation state
        this.animationFrame = null;
        this.lastTime = 0;
        this.rotationSpeed = 0.001;
        
        // Initialize 3D scene
        this._initScene();
    }
    
    _initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.z = 5;
        this.camera.position.y = 1;
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x050510, 1);
        this.container.appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Add point light
        const pointLight = new THREE.PointLight(0x8080ff, 1, 10);
        pointLight.position.set(0, 2, 3);
        this.scene.add(pointLight);
        
        // Create qubit spheres
        this._createQubitSpheres();
        
        // Create entanglement beams
        this._createEntanglementBeams();
        
        // Create particle system
        this._createParticles();
        
        // Handle window resize
        window.addEventListener('resize', this._onResize.bind(this));
        
        // Start animation loop
        this._animate();
    }
    
    _createQubitSpheres() {
        // Create material for the spheres
        const qubitMaterial0 = new THREE.MeshPhongMaterial({
            color: 0x4040ff,
            emissive: 0x2020a0,
            specular: 0x8080ff,
            shininess: 90,
            transparent: true,
            opacity: 0.9
        });
        
        const qubitMaterial1 = new THREE.MeshPhongMaterial({
            color: 0x40ff40,
            emissive: 0x20a020,
            specular: 0x80ff80,
            shininess: 90,
            transparent: true,
            opacity: 0.9
        });
        
        // Create spheres for the qubits
        const qubitGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        
        // Qubit 0
        const qubit0 = new THREE.Mesh(qubitGeometry, qubitMaterial0);
        qubit0.position.set(-1.5, 0, 0);
        this.scene.add(qubit0);
        
        // Qubit 1
        const qubit1 = new THREE.Mesh(qubitGeometry, qubitMaterial1);
        qubit1.position.set(1.5, 0, 0);
        this.scene.add(qubit1);
        
        this.qubitSpheres = [qubit0, qubit1];
    }
    
    _createEntanglementBeams() {
        // Create material for the entanglement beam
        const beamMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });
        
        // Create geometry for the beam
        const beamGeometry = new THREE.BufferGeometry();
        const points = [
            new THREE.Vector3(-1.5, 0, 0),
            new THREE.Vector3(1.5, 0, 0)
        ];
        beamGeometry.setFromPoints(points);
        
        // Create the beam
        const beam = new THREE.Line(beamGeometry, beamMaterial);
        this.scene.add(beam);
        
        // Additional decorative beams
        const secondaryBeamMaterial = new THREE.LineBasicMaterial({
            color: 0x8080ff,
            transparent: true,
            opacity: 0.2,
            linewidth: 1
        });
        
        // Create a spiral beam around the main one
        const spiralPoints = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const x = -1.5 + 3 * t;
            const radius = 0.2 * Math.sin(t * Math.PI);
            const y = radius * Math.sin(t * Math.PI * 10);
            const z = radius * Math.cos(t * Math.PI * 10);
            spiralPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const spiralGeometry = new THREE.BufferGeometry().setFromPoints(spiralPoints);
        const spiralBeam = new THREE.Line(spiralGeometry, secondaryBeamMaterial);
        this.scene.add(spiralBeam);
        
        this.entanglementBeams = [beam, spiralBeam];
    }
    
    _createParticles() {
        // Create particle system
        const particleCount = 200;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const color = new THREE.Color();
        
        for (let i = 0; i < particleCount; i++) {
            // Position
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 6;
            const z = (Math.random() - 0.5) * 10;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Color (blue or green)
            if (Math.random() > 0.5) {
                color.setHSL(0.6, 1, 0.5 + Math.random() * 0.2);
            } else {
                color.setHSL(0.3, 1, 0.5 + Math.random() * 0.2);
            }
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Size
            sizes[i] = Math.random() * 0.1 + 0.05;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Create point system
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        this.particles = {
            system: particleSystem,
            positions: positions,
            colors: colors,
            sizes: sizes,
            initial: {
                positions: positions.slice(),
                sizes: sizes.slice()
            }
        };
    }
    
    _onResize() {
        if (!this.renderer || !this.camera) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    _animate(time = 0) {
        this.animationFrame = requestAnimationFrame(this._animate.bind(this));
        
        const delta = time - this.lastTime;
        this.lastTime = time;
        
        // Rotate the scene slightly
        this.scene.rotation.y += this.rotationSpeed * delta;
        
        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Update the visualization based on quantum state and audio data
     * @param {Object} quantumState - Current quantum state from QuantumLayer
     * @param {Number} alphaValue - Alpha wave value
     * @param {Number} betaValue - Beta wave value
     * @param {Boolean} rhythmTrigger - Whether a rhythm was triggered
     */
    update(quantumState, alphaValue, betaValue, rhythmTrigger) {
        if (!this.scene) return;
        
        // Update qubit spheres based on quantum state
        if (this.qubitSpheres.length >= 2 && quantumState) {
            // Scale spheres based on measurement probabilities
            const q0Scale = 0.5 + quantumState.probabilities[0] + quantumState.probabilities[2];
            const q1Scale = 0.5 + quantumState.probabilities[1] + quantumState.probabilities[3];
            
            this.qubitSpheres[0].scale.set(q0Scale, q0Scale, q0Scale);
            this.qubitSpheres[1].scale.set(q1Scale, q1Scale, q1Scale);
            
            // Elevate spheres based on measurement results
            const elevate0 = quantumState.lastMeasurement[0] ? 0.5 : 0;
            const elevate1 = quantumState.lastMeasurement[1] ? 0.5 : 0;
            
            this.qubitSpheres[0].position.y = elevate0;
            this.qubitSpheres[1].position.y = elevate1;
            
            // Pulse spheres on rhythm trigger
            if (rhythmTrigger) {
                this.qubitSpheres.forEach(sphere => {
                    // Animate quick pulse
                    const currentScale = sphere.scale.x;
                    sphere.scale.set(currentScale * 1.3, currentScale * 1.3, currentScale * 1.3);
                    setTimeout(() => {
                        sphere.scale.set(currentScale, currentScale, currentScale);
                    }, 100);
                });
            }
        }
        
        // Update entanglement beams based on quantum state
        if (this.entanglementBeams.length > 0 && quantumState) {
            // Calculate entanglement strength
            // Maximum entanglement when probabilities of |00⟩ and |11⟩ are equal
            // or when probabilities of |01⟩ and |10⟩ are equal
            const entanglement = 1 - Math.abs(
                quantumState.probabilities[0] - quantumState.probabilities[3]
            ) - Math.abs(
                quantumState.probabilities[1] - quantumState.probabilities[2]
            );
            
            // Update beam opacity based on entanglement
            this.entanglementBeams.forEach(beam => {
                beam.material.opacity = 0.1 + entanglement * 0.7;
            });
            
            // Make beam pulse on rhythm trigger
            if (rhythmTrigger) {
                this.entanglementBeams.forEach(beam => {
                    const originalOpacity = beam.material.opacity;
                    beam.material.opacity = Math.min(1.0, originalOpacity * 2);
                    setTimeout(() => {
                        beam.material.opacity = originalOpacity;
                    }, 100);
                });
            }
        }
        
        // Update particles based on input values
        if (this.particles && this.particles.system) {
            const positions = this.particles.positions;
            const sizes = this.particles.sizes;
            const initialPositions = this.particles.initial.positions;
            const initialSizes = this.particles.initial.sizes;
            
            const particleCount = sizes.length;
            
            for (let i = 0; i < particleCount; i++) {
                // Make particles move based on alpha waves
                const pulseScale = 1 + alphaValue * 0.5;
                sizes[i] = initialSizes[i] * pulseScale;
                
                // Shift particle positions based on beta waves
                const shiftFactor = betaValue * 0.3;
                positions[i * 3] = initialPositions[i * 3] * (1 + shiftFactor);
                positions[i * 3 + 1] = initialPositions[i * 3 + 1] * (1 + shiftFactor);
                
                // Make particles pulse with rhythm
                if (rhythmTrigger && Math.random() > 0.7) {
                    sizes[i] *= 2;
                    
                    // Reset after brief delay
                    setTimeout(() => {
                        sizes[i] = initialSizes[i] * pulseScale;
                    }, 100 + Math.random() * 200);
                }
            }
            
            // Update buffers
            this.particles.system.geometry.attributes.position.needsUpdate = true;
            this.particles.system.geometry.attributes.size.needsUpdate = true;
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this._onResize.bind(this));
        
        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        // Dispose of Three.js objects
        if (this.scene) {
            this._disposeObject(this.scene);
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
    
    /**
     * Helper to dispose Three.js objects
     */
    _disposeObject(obj) {
        if (!obj) return;
        
        // Dispose of geometries and materials
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(material => material.dispose());
            } else {
                obj.material.dispose();
            }
        }
        
        // Recursively dispose of children
        if (obj.children && obj.children.length > 0) {
            for (let i = obj.children.length - 1; i >= 0; i--) {
                this._disposeObject(obj.children[i]);
            }
        }
    }
}

// Export the class for use in other modules
window.Visualizer = Visualizer;