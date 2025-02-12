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
import { hex } from 'chroma-js';

const url = new URL(window.location);
const params = new URLSearchParams(url.search);

export class SceneInitializer {
    constructor(container) {
        this.container = container;
        this.instancedMesh;
        // this.instancedMeshUmap;
        this.initScene();
        this.subscribeToStateChanges();
        // console.log("KONTOL ANJING BABI NGENTOT")
    }

    // Function to downsample both data and colors
    downsampleData(data, step) {
        return data.filter((_, index) => index % step === 0);
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
    
        // Set up the orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.update();
    
        // Get the data from the state and filter out clusters with value "remove"
        // Filter out clusters with value "remove" from jsonData and count1
        this.filteredData = MatrixState.value.items
            .map((point, index) => ({ point, index })) // Map items with their original index
            // .filter(item => item.point["clusters"] !== "remove"); // Filter based on clusters

        // Update this.jsonData with the filtered points
        this.jsonData = this.filteredData.map(item => item.point);
        // this.jsonData = MatrixState.value.items.filter(point => point["clusters"] !== "remove");
        this.pallete = ApiState.value.pallete

        this.original_colors = this.createColors();
        this.ones = Array(this.jsonData.length).fill(1);

        this.genePercentile = ButtonState.value.genePercentile;

    
        // Define the geometry and material
        // const circleGeometry = new THREE.CircleGeometry(0.5, 16); // Circle with radius 0.5 and 16 segments
        const circleGeometry = new THREE.SphereGeometry(0.2, 4, 4); // Circle with radius 0.5 and 16 segments
        const material = new THREE.MeshBasicMaterial();
    
        // Call setupLOD with the initial data
        this.setupLOD(this.jsonData, circleGeometry, material);
    
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
            // If you want to deep compare array objects, you might replace the next line with a custom comparison function
            distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        ).subscribe(items => {
            // console.log('Items have updated:');
            // console.log(MatrixState.value.items);
            // Here you can handle the update, e.g., update UI components to reflect the new items array
        });

        // ApiState.pipe(
        //     map(state => state.prefix),
        //     distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        // ).subscribe(items => {
        //     // console.log("Prefix changed:", items);
        //     // console.log(ApiState.value.prefix);

        //     const prefix = document.getElementById("dropdownMenuButton");
        //     prefix.innerText = ApiState.value.prefix;
        // });

        UIState.pipe(
            map(state => state.isLoading),
            distinctUntilChanged((prev, curr) => isEqual(prev, curr))
        ).subscribe(items => {
            // console.log("Loading changed:", items);
            // console.log(UIState.value.isLoading);
            loading(UIState.value.isLoading);
        });

        // listens for changing celltype
        SelectedState.pipe(
            map(state => state.selectedCelltypes),
            distinctUntilChanged((prev, curr) => prev.join() === curr.join())
        ).subscribe(async items => {
            // console.log("Selected celltypes changed:", items);
            // console.log(SelectedState.value.selectedCelltypes);
            updateLoadingState(true);
            // console.log("APA SIH ANJ")
            console.log(SelectedState.value.selectedCelltypes)
            if (SelectedState.value.selectedCelltypes.length == 0) {
                // await this.updateInstancedMesh(SelectedState.value.selectedCelltypes);
                this.updateAllLODColors(this.original_colors);
                this.updateAllLODScales(this.jsonData.map(point => 1));
                // this.updateAllLODColors(this.original_colors, this.ones);
                // console.log("UPDATE ALL LOD COLOR")
                // console.log(this.original_colors)
            } else {
                this.updateColor(SelectedState.value.selectedCelltypes);
            }

            updateLoadingState(false);

            showCellFilters();

            if (SelectedState.value.selectedCelltypes.length > 0) {
                const newCelltype = encodeURIComponent(JSON.stringify(SelectedState.value.selectedCelltypes));
                
                // params not in celltype
                if (params.has("celltype")) {
                    params.set("celltype", newCelltype)
                } else {
                    params.append("celltype", newCelltype)
                }
            
            // there's no celltypes selected
            } else {
                params.delete("celltype");
            }
            changeURL(params);
        });

        SelectedState.pipe(
            map(state => state.selectedGenes),
            distinctUntilChanged((prev, curr) => prev.join() === curr.join())
        ).subscribe(async items => {
            // console.log("Selected genes changed:", items);
            // console.log(SelectedState.value.selectedGenes);

            if (SelectedState.value.mode === 2) {
                showSelectedGeneFilters();
            }

            updateLoadingState(true);

            if (SelectedState.value.selectedGenes.length == 0) {
                // this.updateAllLODColors(this.original_colors, this.ones)
                this.updateAllLODColors(this.original_colors)
                this.updateAllLODScales(this.jsonData.map(point => 1));

                // await this.updateInstancedMesh(SelectedState.value.selectedGenes);
                // await this.updateInstancedMesh(SelectedState.value.selectedGenes); // JANK FIX FOR QUICK GENE SWITCHING
            } else {
                await this.updateGene(SelectedState.value.selectedGenes)
                // await this.updateInstancedMesh([]);
            }

            updateLoadingState(false);

            showGeneFilters();

            if (SelectedState.value.selectedGenes.length > 0) {
                // hype boy
                const newGenes = encodeURIComponent(JSON.stringify(SelectedState.value.selectedGenes));
                params.append("gene", newGenes)

                // params not in celltype
                if (params.has("gene")) {
                    params.set("gene", newGenes)
                } else {
                    params.append("gene", newGenes)
                }
            
            // there's no genes selected
            } else {
                params.delete("gene");
            }

            changeURL(params);
        });

        // SelectedState.pipe(
        //     map(state => state.mode),
        //     distinctUntilChanged()
        // ).subscribe(items => {
        //     console.log("Selected genes changed:", items);

        //     if (params.has("mode")) {
        //         params.set("mode", items)
        //     } else {
        //         params.append("mode", items);
        //     }

        //     changeURL(params);
        // });

        // // listen for changing dotsize

        // ButtonState.pipe(
        //     map(state => state.dotSize),
        //     distinctUntilChanged()
        // ).subscribe(async items => {
        //     console.log("Dot Size Changed:", items);
        //     // console.log(ButtonState.value.dotSize);

        //     updateLoadingState(true);

        //     if (ButtonState.value.dotSize) {
        //         await this.updateInstancedMesh(ButtonState.value.dotSize);
        //     } else {
        //         await this.updateInstancedMesh([]);
        //     }

        //     updateLoadingState(false);
        // });
        
        // ButtonState.pipe(
        //     map(state => state.genePercentile),
        //     distinctUntilChanged()
        // ).subscribe(async items => {
        //     console.log("Gene Percentile", items);
        //     // console.log(ButtonState.value.genePercentile);

        //     updateLoadingState(true);

        //     if (ButtonState.value.genePercentile) {
        //         await this.updateInstancedMesh(ButtonState.value.genePercentile);
        //     } else {
        //         await this.updateInstancedMesh([]);
        //     }

        //     updateLoadingState(false);
        // })
    }

    updateColor(cells) {    
        // Map each point's cluster to a corresponding color in the palette
        // Generate lists for colors, scales, and alphas
        let colors = [];
        let scales = [];

        this.jsonData.forEach(point => {
            const cluster = point["clusters"];
            
            if (cells.includes(cluster)) {
                // If cluster is in the cells list
                colors.push(this.pallete[cluster] || '#FFFFFF');
                scales.push(4);  // Full scale
            } else {
                // If cluster is not in the cells list
                colors.push("#707070"); // Default color
                scales.push(0.5);       // Reduced scale
            }
        });
        this.updateAllLODColors(colors);
        // this.updateAllLODColors(colors, scales);
        this.updateAllLODScales(scales)
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
    
        // Call the update function with the generated colors, scales, and alphas
        this.updateAllLODColors(colorrgb, true);
        this.updateAllLODScales(scales)
        // this.updateAllLODColors(colorrgb, scales, true);
    }

    generateWhiteColorList(dataLength) {
        return new Array(dataLength).fill('#FFFFFF');


    }

    setupMesh(data, geometry, material) {
        // Create a single instanced mesh
        this.instancedMesh = this.createInstancedMesh(data, geometry, material);
    
        // Add the mesh to the scene
        this.scene.add(this.instancedMesh);
    }
    
    createInstancedMesh(data, geometry, material, scale = 1.0) {
        const count = data.length;
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    
        const dummy = new THREE.Object3D();
        const colors = new Float32Array(count * 3);
        let color;
    
        data.forEach((point, i) => {
            // Set the position
            dummy.position.set(
                point["X_spateo1_norm"] * 200,
                point["X_spateo2_norm"] * -200,
                point["X_spateo0_norm"] * 200
            );
    
            // Apply scaling
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
    
            // Get the cluster color
            const hexColor = this.pallete[point["clusters"]] || '#5e5e5e';
            color = new THREE.Color(hexColor);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        });
    
        instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;
    
        return instancedMesh;
    }
    
    parseRGBColor(rgbString) {
        const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
            const [_, r, g, b] = match;
            return new THREE.Color(
                parseInt(r) / 255,
                parseInt(g) / 255,
                parseInt(b) / 255
            );
        } else {
            console.error("Invalid RGB format:", rgbString);
            return new THREE.Color('#FFFFFF'); // Default to white if parsing fails
        }
    }    
    
    /**
     * Updates colors and scales for the single instanced mesh.
     * @param {Array} hexColors - List of colors in hex or RGB format.
     * @param {Array} scales - List of scale values for each instance.
     * @param {boolean} rgb - Whether colors are in RGB format.
     */
    updateMeshColorsAndScales(hexColors, scales, rgb = false) {
        console.log("Updating colors and scales for the instanced mesh");
        if (!this.instancedMesh || !hexColors || !scales) return;
    
        const count = this.instancedMesh.count;
        if (hexColors.length !== count || scales.length !== count) {
            console.error(`Attribute list lengths do not match instance count (${count}).`);
            return;
        }
    
        const colors = new Float32Array(count * 3);
        const dummy = new THREE.Object3D();
    
        // Update colors and scales for each instance
        hexColors.forEach((colorValue, i) => {
            let color;
    
            // Handle RGB format if rgb is true
            if (rgb && colorValue.startsWith('rgb')) {
                color = this.parseRGBColor(colorValue);
            } else {
                color = new THREE.Color(colorValue);
            }
    
            // Update color attributes
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
    
            // Update scale
            const scale = scales[i];
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        });
    
        // Update instance color attribute and matrix
        this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.instancedMesh.instanceColor.needsUpdate = true;
        console.log("Colors and scales updated.");
    }
    

    setupLOD(data, geometry, material) {
        this.lod = new THREE.LOD();
    
        // Define downsample levels
        const dataFull = this.downsampleData(data, 1);
        // const dataHalf = this.downsampleData(data, 2);
        // const dataQuarter = this.downsampleData(data, 4);
        // const dataEighth = this.downsampleData(data, 8);
    
        // // Create meshes for each level of detail
        const meshFull = this.createInstancedMesh(dataFull, geometry, material);
        // const meshHalf = this.createInstancedMesh(dataHalf, geometry, material);
        // const meshQuarter = this.createInstancedMesh(dataQuarter, geometry, material);
        // const meshEighth = this.createInstancedMesh(dataEighth, geometry, material);
        
    
        // Add levels of detail to the LOD object
        this.lod.addLevel(meshFull, 10);
        // this.lod.addLevel(meshHalf, 30);
        // this.lod.addLevel(meshQuarter, 50);
        // this.lod.addLevel(meshEighth, 100);
    
        // Add the LOD object to the scene
        this.scene.add(this.lod);
    }

    // createInstancedMesh(data, geometry, material, scale = 1.0) {
    //     const count = data.length;
    //     const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    
    //     const dummy = new THREE.Object3D();
    //     const colors = new Float32Array(count * 3);
    //     let color;
    
    //     let celltypes = SelectedState.value.selectedCelltypes;
    //     let genes = SelectedState.value.selectedGenes;
    
    //     data.forEach((point, i) => {
    //         // Set the position
    //         dummy.position.set(
    //             point["X_spatial0_norm"] * 200,
    //             point["X_spatial1_norm"] * 200,
    //             point["X_spatial2_norm"] * 200
    //         );
    
    //         // Apply scaling based on LOD level
    //         dummy.scale.set(scale, scale, scale);
    //         dummy.updateMatrix();
    //         instancedMesh.setMatrixAt(i, dummy.matrix);
    
    //         // Get the cluster color
    //         const hexColor = this.pallete[point["clusters"]] || '#5e5e5e';
    //         color = new THREE.Color(hexColor);
    //         colors[i * 3] = color.r;
    //         colors[i * 3 + 1] = color.g;
    //         colors[i * 3 + 2] = color.b;
    //     });
    
    //     instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    //     instancedMesh.instanceMatrix.needsUpdate = true;
    //     instancedMesh.instanceColor.needsUpdate = true;
    
    //     return instancedMesh;
    // }

    // parseRGBColor(rgbString) {
    //     const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    //     if (match) {
    //         const [_, r, g, b] = match;
    //         return new THREE.Color(
    //             parseInt(r) / 255,
    //             parseInt(g) / 255,
    //             parseInt(b) / 255
    //         );
    //     } else {
    //         console.error("Invalid RGB format:", rgbString);
    //         return new THREE.Color('#FFFFFF'); // Default to white if parsing fails
    //     }
    // }    

    updateAllLODColors(hexColors, rgb = false) {
        // console.log("harusnya kesini");
        // console.log(hexColors);
        if (!this.lod || !hexColors || hexColors.length === 0) return;
        // console.log("ada isinya");
    
        // Update colors for each LOD level
        this.lod.levels.forEach((level, lodIndex) => {
            const instancedMesh = level.object;
            if (!instancedMesh) return;
    
            // Determine downsampling factor based on LOD level
            const downsampleFactor = Math.pow(2, lodIndex);
            const downsampledColors = this.downsampleData(hexColors, downsampleFactor);
    
            const count = instancedMesh.count;
            if (downsampledColors.length !== count) {
                console.error(`Color list length (${downsampledColors.length}) does not match instance count (${count}) for LOD level ${lodIndex}.`);
                return;
            }
    
            const colors = new Float32Array(count * 3);
    
            // Update the colors for the current LOD level
            downsampledColors.forEach((colorValue, i) => {
                let color;
                
                // Handle RGB format if rgb is true
                if (rgb && colorValue.startsWith('rgb')) {
                    color = this.parseRGBColor(colorValue);
                } else {
                    // Assume hex format otherwise
                    color = new THREE.Color(colorValue);
                }
    
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            });
    
            // Update instance color attribute
            instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
            instancedMesh.instanceColor.needsUpdate = true;
        });
    
        console.log("Colors updated for all LOD levels.");
    }

    /**
     * Updates scales for all LOD levels.
     * @param {Array<number>} scales - List of scale values for each instance.
     */
    updateAllLODScales(scales) {
        console.log("Updating scales for all LOD levels");
        if (!this.lod || !scales || scales.length === 0) return;

        // Update scales for each LOD level
        this.lod.levels.forEach((level, lodIndex) => {
            const instancedMesh = level.object;
            if (!instancedMesh) return;

            // Determine downsampling factor based on LOD level
            const downsampleFactor = Math.pow(2, lodIndex);
            const downsampledScales = this.downsampleData(scales, downsampleFactor);

            const count = instancedMesh.count;
            if (downsampledScales.length !== count) {
                console.error(`Scale list length (${downsampledScales.length}) does not match instance count (${count}) for LOD level ${lodIndex}.`);
                return;
            }

            const dummy = new THREE.Object3D();

            // Update the scale for each instance without resetting the position
            for (let i = 0; i < count; i++) {
                // Get the existing matrix
                const matrix = new THREE.Matrix4();
                instancedMesh.getMatrixAt(i, matrix);

                // Decompose the matrix into position, rotation, and scale
                const position = new THREE.Vector3();
                const rotation = new THREE.Quaternion();
                const currentScale = new THREE.Vector3();
                matrix.decompose(position, rotation, currentScale);

                // Update only the scale
                const newScaleValue = downsampledScales[i];
                dummy.position.copy(position);
                dummy.rotation.setFromQuaternion(rotation);
                dummy.scale.set(newScaleValue, newScaleValue, newScaleValue);
                dummy.updateMatrix();

                // Set the updated matrix back
                instancedMesh.setMatrixAt(i, dummy.matrix);
            }

            // Mark the instance matrix as needing an update
            instancedMesh.instanceMatrix.needsUpdate = true;
        });

        console.log("Scales updated for all LOD levels.");
    }



   

    animate = () => {
        requestAnimationFrame(this.animate);
        this.controls.update(); // Only needed if controls.enableDamping is true
        
        if (this.lod) {
            this.lod.update(this.camera);
        }

        // this.instancedMesh.instanceMatrix.needsUpdate = true; // Important!
        this.renderer.render(this.scene, this.camera);
    }
}
