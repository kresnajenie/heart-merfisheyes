import { SceneInitializer } from './scene/SceneInitializer.js';
import { cellSearch, clearCells, createCellCheckboxes } from './helpers/Filtering/Celltype.js';
import { clearGenes, createGeneRadio, geneSearch } from './helpers/Filtering/Gene.js';
import { loadGenes, loadGroups, loadItems, loadPallete } from './helpers/LoadFunctions.js';
import { ApiState } from './states/ApiState.js';
import { updateSelectedCelltype, updateSelectedGene } from './states/SelectedState.js';
import { updateLoadingState } from './states/UIState.js';
import { createLoadingIndicator } from './ui/Loading/Loading.js';
// import { createOverlay } from './ui/Overlay/Overlay.js';

document.addEventListener('DOMContentLoaded', async () => {
    // createOverlay();
    const loading = createLoadingIndicator();

    document.body.appendChild(loading);

    updateLoadingState(true); // Assume loading starts

    try {
        // Wait for the palette items to be loaded
        await loadPallete();

        // console.log(ApiState.value.pallete);

        await loadItems();
        await loadGenes();
        console.log(ApiState.value.genes);




        // dictionary of all search paramaters in url
        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);

        if (params.has("celltype")) {
            const cells = JSON.parse(decodeURIComponent(params.get("celltype")))

            // remove invalid celltypes
            const filteredCells = cells.filter((cell) => Object.keys(ApiState.value.pallete).includes(cell))
            // console.log("new cells", filteredCells);

            // params.delete("celltype")
            // changeURL(params)

            updateSelectedCelltype(filteredCells);
        }

        if (params.has("gene")) {

            const genes = JSON.parse(decodeURIComponent(params.get("gene")))

            // remove invalid genes
            const filteredGenes = genes.filter((gene) => ApiState.value.genes.includes(gene))
            // console.log("new genes", filteredGenes);

            // params.delete("gene")
            // changeURL(params)

            updateSelectedGene(filteredGenes);
        }

        createCellCheckboxes(ApiState.value.listPalette);
        clearCells();
        cellSearch()

        createGeneRadio(ApiState.value.genes);
        clearGenes();
        geneSearch();

        const sceneContainer = document.body;
        new SceneInitializer(sceneContainer);

    } catch (err) {
        console.error('Failed to load data:', err);
    } finally {
        updateLoadingState(false); // Loading ends after all async operations
    }
});
