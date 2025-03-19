// /src/scene/SceneInitializer.js
import * as THREE from 'three';
import { MatrixState } from '../states/MatrixState.js';
import { ApiState } from '../states/ApiState.js';
import { SceneState } from '../states/SceneState.js';
import { UIState, updateLoadingState } from '../states/UIState.js';
import { SelectedState } from '../states/SelectedState.js';
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { isEqual } from 'lodash';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { ButtonState } from '../states/ButtonState.js';
import { loading } from '../helpers/Loading.js';
import { showCellFilters } from '../helpers/Filtering/Celltype.js';
import { calculateGenePercentile, coolwarm, getGene, normalizeArray } from '../helpers/GeneFunctions.js';
import { showGeneFilters, showSelectedGeneFilters } from '../helpers/Filtering/Gene.js';
import { changeURL } from '../helpers/URL.js';

const url = new URL(window.location);
const params = new URLSearchParams(url.search);

export class SceneInitializer {
    constructor(container) {
        this.container = container;
        
        // Wait for DOM to be fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initScene();
                this.subscribeToStateChanges();
            });
        } else {
            this.initScene();
            this.subscribeToStateChanges();
        }
    }

    async initScene() {
        // Get the scene from your state
        this.scene = SceneState.value.scene;
    
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);
        this.camera.position.z = ButtonState.value.cameraPositionZ;
        this.camera.position.y = ButtonState.value.cameraPositionY;
        this.camera.position.x = ButtonState.value.cameraPositionX;
    
        // Set up the renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
    
        // Set up the TrackballControls
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);

        // Configure TrackballControls
        this.controls.rotateSpeed = 2.0; // Speed of rotation
        this.controls.zoomSpeed = 1; // Speed of zooming
        this.controls.panSpeed = 0.8; // Speed of panning
        this.controls.noZoom = false; // Allow zooming
        this.controls.noPan = false; // Allow panning
        this.controls.staticMoving = false; // Smooth movement
        this.controls.dynamicDampingFactor = 0.8; // Damping factor for smoothness

        // Set panning to left mouse button for 2D visualization
        if (ApiState.value.prefix == "2D Heart" || ApiState.value.prefix == "2D3D Heart") {
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };
        } else {
            this.controls.enableRotate = true;
        }
    
        // Map data items with their original index
        this.filteredData = MatrixState.value.items
            .map((point, index) => ({ point, index }));

        // Update this.jsonData with the filtered points
        this.jsonData = this.filteredData.map(item => item.point);
        this.pallete = ApiState.value.pallete;

        this.original_colors = this.createColors();
        this.ones = Array(this.jsonData.length).fill(1);

        this.genePercentile = ButtonState.value.genePercentile;
    
        // Create buffer geometry for all points at once
        this.createPointsGeometry(this.jsonData);
        
        // Apply initial colors
        this.updateColors(this.original_colors);
        this.updateScales(this.ones);
    
        // Start the animation loop
        this.animate();
        updateLoadingState(false);
    
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);
    }

    createColors() {
        // Check if jsonData and palette are defined
        if (!this.jsonData || !this.pallete) {
            console.error("Data or palette not available");
            return [];
        }
    
        // Map each point's cluster to a corresponding color in the palette
        return this.jsonData.map(point => {
            const cluster = point["clusters"];
            // Get the color from the palette, defaulting to white if not found
            return this.pallete[cluster] || '#FFFFFF';
        });
    }
    

    subscribeToStateChanges() {
        MatrixState.pipe(
            map(state => state.items),
            distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        ).subscribe(items => {
            // Handle matrix state updates if needed
        });

        ApiState.pipe(
            map(state => state.prefix),
            distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        ).subscribe(items => {
            const prefix = document.getElementById("dropdownMenuButton");
            if (prefix) {
                prefix.innerText = ApiState.value.prefix;
            }
        });

        UIState.pipe(
            map(state => state.isLoading),
            distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        ).subscribe(items => {
            loading(UIState.value.isLoading);
        });

        // Listen for changing celltype
        SelectedState.pipe(
            map(state => state.selectedCelltypes),
            distinctUntilChanged((prev, curr) => prev.join() === curr.join())
        ).subscribe(async items => {
            updateLoadingState(true);
            console.log(SelectedState.value.selectedCelltypes);
            
            if (SelectedState.value.selectedCelltypes.length == 0) {
                this.updateColors(this.original_colors);
                // Reset scales to default when clearing cell type selection
                this.updateScales(this.ones);
                // Reset transparency to fully opaque
                this.setUniformTransparency(1.0);
            } else {
                this.updateColor(SelectedState.value.selectedCelltypes);
            }

            updateLoadingState(false);

            showCellFilters();

            if (SelectedState.value.selectedCelltypes.length > 0) {
                const newCelltype = encodeURIComponent(JSON.stringify(SelectedState.value.selectedCelltypes));
                
                if (params.has("celltype")) {
                    params.set("celltype", newCelltype);
                } else {
                    params.append("celltype", newCelltype);
                }
            } else {
                params.delete("celltype");
            }
            changeURL(params);
        });

        SelectedState.pipe(
            map(state => state.selectedGenes),
            distinctUntilChanged((prev, curr) => prev.join() === curr.join())
        ).subscribe(async items => {
            if (SelectedState.value.mode === 2) {
                showSelectedGeneFilters();
            }

            updateLoadingState(true);

            if (SelectedState.value.selectedGenes.length == 0) {
                this.updateColors(this.original_colors);
                // Reset scales to default when clearing gene selection
                this.updateScales(this.ones);
                // Reset transparency to fully opaque
                this.setUniformTransparency(1.0);
            } else {
                await this.updateGene(SelectedState.value.selectedGenes);
            }

            updateLoadingState(false);

            showGeneFilters();

            if (SelectedState.value.selectedGenes.length > 0) {
                const newGenes = encodeURIComponent(JSON.stringify(SelectedState.value.selectedGenes));
                
                if (params.has("gene")) {
                    params.set("gene", newGenes);
                } else {
                    params.append("gene", newGenes);
                }
            } else {
                params.delete("gene");
            }

            changeURL(params);
        });
    }

    updateColor(cells) {    
        // Map each point's cluster to a corresponding color in the palette
        // Generate lists for colors, scales, and alphas
        let colors = [];
        let scales = [];
        let alphas = [];

        this.jsonData.forEach(point => {
            const cluster = point["clusters"];
            
            if (cells.includes(cluster)) {
                // If cluster is in the cells list
                const color = this.pallete[cluster];
                if (color) {
                    // If color is found in the palette
                    colors.push(color);
                    scales.push(2);  // Full scale
                    alphas.push(1.0); // Fully opaque
                } else {
                    // If color is not found in the palette, make it invisible
                    colors.push('#FFFFFF'); // Color doesn't matter as it will be invisible
                    scales.push(0);  // Zero scale
                    alphas.push(0);  // Completely transparent
                }
            } else {
                // If cluster is not in the cells list
                colors.push("#707070"); // Default color
                scales.push(0.5);       // Reduced scale
                alphas.push(0.5);       // Semi-transparent
            }
        });
        this.updateColors(colors, false, alphas);
        this.updateScales(scales);
        console.log("Colors, scales, and transparency updated based on selected cell types.");
    }

    async updateGene(genes) {    
        // Fetch the gene expression values
        let count1 = await getGene(genes[0]);
        count1 = this.filteredData.map(item => count1[item.index]); // Keep only the corresponding elements

        // console.log(count1);
    
        // Calculate the gene percentile and normalize the values
        let nmax1 = calculateGenePercentile(count1, this.genePercentile);
        let ctsClipped1 = normalizeArray(count1, nmax1);
    
        // Generate colors using the coolwarm function
        const colorrgb = ctsClipped1.map(value => coolwarm(value));
    
        // Generate scales based on the normalized values
        const dotSize = 5;
        const scales = ctsClipped1.map(value => value * dotSize + dotSize / 5);
        
        // Generate alphas based on the normalized values
        // Higher expression = more opaque, lower expression = more transparent
        const alphas = ctsClipped1.map(value => 0.5 + value * 0.5); // Range from 0.5 to 1.0
    
        // Call the update function with the generated colors, scales, and alphas
        this.updateColors(colorrgb, true, alphas);
        this.updateScales(scales);
        console.log("Gene expression visualization updated with colors, scales, and transparency.");
    }

    /**
     * Generates a list of white colors (which will be rendered as transparent)
     * @param {number} dataLength - Length of the data array
     * @returns {Array<string>} Array of white color strings
     */
    generateWhiteColorList(dataLength) {
        console.log(`Generating ${dataLength} white (transparent) points`);
        return new Array(dataLength).fill('#FFFFFF');
    }

    parseRGBColor(rgbString) {
        const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
            const [_, r, g, b] = match;
            // Check if the color is white or very close to white
            if (parseInt(r) > 250 && parseInt(g) > 250 && parseInt(b) > 250) {
                console.log("Found white or near-white color in RGB format:", rgbString);
                return null; // Return null for white colors
            }
            return new THREE.Color(
                parseInt(r) / 255,
                parseInt(g) / 255,
                parseInt(b) / 255
            );
        } else {
            console.error("Invalid RGB format:", rgbString);
            return null; // Return null instead of white when parsing fails
        }
    }
    

    createPointsGeometry(data) {
        console.log("KESIINI BRP KALIII")
        const count = data.length;
        
        // Create buffer geometry
        const geometry = new THREE.BufferGeometry();
        
        // Create position buffer
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const alphas = new Float32Array(count);
        
        // Fill position and color buffers
        data.forEach((point, i) => {
            if (ApiState.value.prefix == "2D Heart") {
                positions[i * 3] = point["X_spatial0_norm"] * 500;
                positions[i * 3 + 1] = point["X_spatial1_norm"] * 500;
                positions[i * 3 + 2] = 0;
            } else if (ApiState.value.prefix == "2D3D Heart") {
                positions[i * 3] = point["X_spatial0_norm"] * 1000;
                positions[i * 3 + 1] = point["X_spatial1_norm"] * 1000;
                positions[i * 3 + 2] = 0;
            } else if (ApiState.value.prefix == "3D Heart") {
                positions[i * 3] = point["X_spateo1_norm"] * 200;
                positions[i * 3 + 1] = point["X_spateo2_norm"] * -200;
                positions[i * 3 + 2] = point["X_spateo0_norm"] * 200;
            }
            
            // Default color (will be updated later)
            const hexColor = this.pallete[point["clusters"]] || '#5e5e5e';
            const color = new THREE.Color(hexColor);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Default scale (will be updated later)
            scales[i] = 1.0;
            
            // Default alpha (fully opaque)
            alphas[i] = 0.5;
        });
        
        // Set attributes
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        // Define custom shaders for better control over point rendering
        const vertexShader = `
            attribute float size;
            attribute vec3 color;
            attribute float alpha;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vColor = color;
                vAlpha = alpha;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                // The 300.0 factor controls how much the size changes with distance
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                // Create circular points instead of squares
                if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) {
                    discard;
                }
                gl_FragColor = vec4(vColor, vAlpha);
            }
        `;

        // Create custom shader material
        const material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });
        
        // Create points mesh
        this.pointsMesh = new THREE.Points(geometry, material);
        this.scene.add(this.pointsMesh);
        

    }

    updateColors(hexColors, rgb = false, alphas = null) {
        if (!this.pointsMesh || !hexColors || hexColors.length === 0) return;
        
        const geometry = this.pointsMesh.geometry;
        const colorAttribute = geometry.getAttribute('color');
        const count = colorAttribute.count;
        
        if (hexColors.length !== count) {
            console.error(`Color list length (${hexColors.length}) does not match point count (${count}).`);
            return;
        }
        
        // Create new arrays for colors and alphas
        const colorArray = new Float32Array(count * 3);
        const alphaArray = new Float32Array(count);
        
        // Fill the arrays with color and alpha values
        hexColors.forEach((colorValue, i) => {
            let color;
            let isWhite = false;
            
            // Handle RGB format if rgb is true
            if (rgb && colorValue.startsWith('rgb')) {
                color = this.parseRGBColor(colorValue);
                if (color === null) {
                    isWhite = true;
                    color = new THREE.Color(1, 1, 1); // Temporary color, will be invisible
                }
            } else {
                // Check if it's a white hex color
                if (colorValue === '#FFFFFF' || colorValue === '#ffffff') {
                    isWhite = true;
                }
                // Assume hex format otherwise
                color = new THREE.Color(colorValue);
            }
            
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
            
            // Set alpha value
            if (isWhite) {
                // Make white points completely transparent
                alphaArray[i] = 0;
                // console.log(`Made white point at index ${i} transparent`);
            } else if (alphas && i < alphas.length) {
                // Use provided alpha if available
                alphaArray[i] = Math.max(0, Math.min(1, alphas[i]));
            } else if (colorValue === '#707070' || colorValue === '#5e5e5e') {
                // Make gray points semi-transparent
                alphaArray[i] = 0.5;
            } else {
                // Default to fully opaque
                alphaArray[i] = 1.0;
            }
        });
        
        // Replace the color and alpha attributes with the new arrays
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphaArray, 1));
        
        console.log("Colors and transparency updated for all points.");
    }

    /**
     * Updates scales for all points.
     * @param {Array<number>} scales - List of scale values for each point.
     */
    updateScales(scales) {
        console.log("Updating scales for all points");
        if (!this.pointsMesh || !scales || scales.length === 0) return;
        
        const geometry = this.pointsMesh.geometry;
        const scaleAttribute = geometry.getAttribute('size');
        const count = scaleAttribute.count;
        
        if (scales.length !== count) {
            console.error(`Scale list length (${scales.length}) does not match point count (${count}).`);
            return;
        }
        
        // Create a new array for the size attribute
        const sizeArray = new Float32Array(count);
        
        // Fill the array with scale values
        for (let i = 0; i < count; i++) {
            sizeArray[i] = scales[i] * 1; // Apply scaling factor
        }
        
        // Replace the size attribute with the new array
        geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
        
        console.log("Scales updated for all points.");
    }



   

    /**
     * Scales the entire geometry uniformly.
     * @param {number} x - Scale factor for x-axis.
     * @param {number} y - Scale factor for y-axis.
     * @param {number} z - Scale factor for z-axis.
     */
    scaleGeometry(x, y, z) {
        if (!this.pointsMesh) return;
        
        // Scale the geometry
        this.pointsMesh.geometry.scale(x, y, z);
        console.log(`Geometry scaled by factors: x=${x}, y=${y}, z=${z}`);
    }
    
    /**
     * Updates transparency for all points.
     * @param {Array<number>} alphas - List of alpha values (0.0 to 1.0) for each point.
     */
    updateTransparency(alphas) {
        console.log("Updating transparency for all points");
        if (!this.pointsMesh || !alphas || alphas.length === 0) return;
        
        const geometry = this.pointsMesh.geometry;
        const count = geometry.getAttribute('position').count;
        
        if (alphas.length !== count) {
            console.error(`Alpha list length (${alphas.length}) does not match point count (${count}).`);
            return;
        }
        
        // Create a new array for the alpha attribute
        const alphaArray = new Float32Array(count);
        
        // Fill the array with alpha values
        for (let i = 0; i < count; i++) {
            // Clamp alpha values between 0 and 1
            alphaArray[i] = Math.max(0, Math.min(1, alphas[i]));
        }
        
        // Replace the alpha attribute with the new array
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphaArray, 1));
        
        console.log("Transparency updated for all points.");
    }
    
    /**
     * Sets a uniform transparency for all points.
     * @param {number} alpha - Alpha value (0.0 to 1.0) for all points.
     */
    setUniformTransparency(alpha) {
        if (!this.pointsMesh) return;
        
        const geometry = this.pointsMesh.geometry;
        const count = geometry.getAttribute('position').count;
        
        // Clamp alpha value between 0 and 1
        const clampedAlpha = Math.max(0, Math.min(1, alpha));
        
        // Create an array filled with the same alpha value
        const alphas = new Array(count).fill(clampedAlpha);
        
        // Update transparency with the uniform alpha value
        this.updateTransparency(alphas);
        
        console.log(`Set uniform transparency: ${clampedAlpha}`);
    }

    animate = () => {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
