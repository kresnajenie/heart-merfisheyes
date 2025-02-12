// /src/components/SceneInitializer.js
import * as THREE from 'three';
import { MatrixState } from '../states/MatrixState.js';
import { ApiState } from '../states/ApiState.js';
import { SceneState } from '../states/SceneState.js';
import { UIState, updateLoadingState } from '../states/UIState.js';
import { SelectedState } from '../states/SelectedState.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isEqual } from 'lodash';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { ButtonState } from '../states/ButtonState.js';
import { loading } from '../helpers/Loading.js';
import { showCellFilters, updateCelltypeCheckboxes } from '../helpers/Filtering/Celltype.js';
import { calculateGenePercentile, coolwarm, getGene, normalizeArray } from '../helpers/GeneFunctions.js';
import { showGeneFilters, showSelectedGeneFilters } from '../helpers/Filtering/Gene.js';
import { changeURL } from '../helpers/URL.js';
import { updateBadge, updateCelltypeBadge } from '../ui/Showing/Showing.js';

const url = new URL(window.location);
const params = new URLSearchParams(url.search);

// Function to downsample both data and colors
function downsampleData(data, step) {
    return data.filter((_, index) => index % step === 0);
}

export class SceneInitializer {
    constructor(container) {
        this.container = container;
        this.scene = SceneState.value.scene;
        this.pallete = ApiState.value.pallete;
        this.lod = null;
        this.currentLODLevel = -1; // Initialize LOD level tracker
        this.initScene();
        console.log(this.pallete)
        console.log(Object.keys(this.pallete));

        // this.subscribeToStateChanges();
    }

    initScene() {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 200);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.addEventListener('change', () => this.lod?.update(this.camera));

        window.addEventListener('resize', this.handleResize.bind(this), false);

        this.updateInstancedMesh();
        this.animate = this.animate.bind(this);
        this.animate();
        this.updateLoadingState(false);
    }

    

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Function to downsample both data and colors
    downsampleData(data, step) {
        return data.filter((_, index) => index % step === 0);
    }


    // Function to create mesh geometry with colors based on clusters
    createMesh(data) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        data.forEach(point => {
            // Add positions
            positions.push(
                point["X_spatial1_norm"] * 50, 
                point["X_spatial0_norm"] * 50, 
                point["X_spatial2_norm"] * 50
            );

            // Get the cluster's hex color from the palette
            // const hexColor = this.pallete[point["clusters"]] || '#ffffff'; // Default to white if no color found
            let hexColor;

            if (this.pallete[point["clusters"]]) {
                // console.log(`Cluster found: "${point["clusters"]}"`);
                hexColor = this.pallete[point["clusters"]];
            } else {
                console.log(`Cluster not found: "${point["clusters"]}", defaulting to white.`);
                hexColor = '#ffffff'; // Default to white if no color found
            }

            const color = new THREE.Color(hexColor);

            // Add the color to the colors array (normalized to [0, 1])
            colors.push(color.r, color.g, color.b);
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            vertexColors: true,
            size: 0.2,
            blending: THREE.NoBlending, // Disable blending
            transparent: false,         // Disable transparency
            depthTest: true,            // Ensure proper depth sorting
            depthWrite: true            // Ensure the material writes to the depth buffer
        });
        
        // return new THREE.Points(geometry, material);
        return new THREE.Points(geometry, material);
    }
    

    setupLOD(data) {
        this.lod = new THREE.LOD();
    
        const dataFull = this.downsampleData(data, 1);
        const dataHalf = this.downsampleData(data, 2);
        const dataQuarter = this.downsampleData(data, 4);
        const dataEighth = this.downsampleData(data, 8);
    
        const meshFull = this.createMesh(dataFull);
        const meshHalf = this.createMesh(dataHalf);
        const meshQuarter = this.createMesh(dataQuarter);
        const meshEighth = this.createMesh(dataEighth);
    
        this.lod.addLevel(meshFull, 10);
        this.lod.addLevel(meshHalf, 20);
        this.lod.addLevel(meshQuarter, 40);
        this.lod.addLevel(meshEighth, 80);
    
        this.scene.add(this.lod);
    }


    async updateInstancedMesh() {
        const jsonData = MatrixState.value.items || [];
        console.log(jsonData)

        // Setup LOD with the current data
        this.setupLOD(jsonData);
    }

    animate() {
        requestAnimationFrame(this.animate);

        if (this.lod) {
            const distance = this.camera.position.distanceTo(this.lod.position);
            const previousLevel = this.currentLODLevel;
    
            // Determine the current LOD level based on distance
            if (distance < 10) {
                this.currentLODLevel = 0;
            } else if (distance < 20) {
                this.currentLODLevel = 1;
            } else if (distance < 40) {
                this.currentLODLevel = 2;
            } else {
                this.currentLODLevel = 3;
            }
    
            // Log to console if LOD level changes
            if (previousLevel !== this.currentLODLevel) {
                console.log(`LOD level changed to: ${this.currentLODLevel}`);
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

