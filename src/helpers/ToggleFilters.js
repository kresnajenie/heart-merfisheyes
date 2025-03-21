import { updateDotSize, updateGenePercentile } from '../states/ButtonState.js';

export const toggleCellFilter = () => {

    const cellCheckbox = document.getElementById("cellCheckbox");
    const geneRadioContainer = document.getElementById('geneRadioContainer');

    const toggleCellCheckbox = document.getElementById('toggleCellCheckbox');
    const toggleGeneRadio = document.getElementById('toggleGeneRadio');

    toggleCellCheckbox.addEventListener('click', () => {

        console.log(cellCheckbox.style.display);

        cellCheckbox.style.display = cellCheckbox.style.display === 'none' ? 'block' : 'none';

        console.log(cellCheckbox.style.display);

        // set to highlight mode
        toggleCellCheckbox.style.backgroundColor = 'white';
        toggleCellCheckbox.style.color = 'black';

        // clear other toggle's style
        toggleGeneRadio.style.backgroundColor = '#282828';
        toggleGeneRadio.style.color = 'white';

        // check if gene checkbox is visible, if yes disable it
        if (geneRadioContainer.style.display === 'block') {
            geneRadioContainer.style.display = 'none';
        }

        // reset it if clicked again
        if (cellCheckbox.style.display === 'none') {
            toggleCellCheckbox.style.backgroundColor = '#282828';
            toggleCellCheckbox.style.color = 'white';
        }
    });
}

// toggles the gene filter popup
export const toggleGeneFilter = () => {

    const cellCheckbox = document.getElementById("cellCheckbox");
    const geneRadioContainer = document.getElementById('geneRadioContainer');

    const toggleCellCheckbox = document.getElementById('toggleCellCheckbox');
    const toggleGeneRadio = document.getElementById('toggleGeneRadio');

    toggleGeneRadio.addEventListener('click', () => {

        geneRadioContainer.style.display = geneRadioContainer.style.display === 'none' ? 'block' : 'none';

        // set to highlight mode
        toggleGeneRadio.style.backgroundColor = 'white';
        toggleGeneRadio.style.color = 'black';

        // clear other toggle's style
        toggleCellCheckbox.style.backgroundColor = '#282828';
        toggleCellCheckbox.style.color = 'white';

        // check if cell checkbox is visible, if yes disable it
        if (cellCheckbox.style.display === 'block') {
            cellCheckbox.style.display = 'none';
        }

        // reset it if clicked again
        if (geneRadioContainer.style.display === 'none') {
            toggleGeneRadio.style.backgroundColor = '#282828';
            toggleGeneRadio.style.color = 'white';
        }
    })
}

export const toggleButton = () => {

    const buttons = document.querySelectorAll('.iconBtn,.toggles');
    const togglePointSize = document.getElementById("togglePointSize");
    const pointSizeSliderBox = document.getElementById("pointSizeSliderBox");
    const pointSizeSlider = document.getElementById("pointSizeSlider");
    const pointSizeSliderValue = document.getElementById("pointSizeSliderValue");
    const toggleGenePercentile = document.getElementById("toggleGenePercentile");
    const geneSliderBox = document.getElementById("geneSliderBox");
    const geneSlider = document.getElementById("geneSlider");
    const geneSliderValue = document.getElementById("geneSliderValue");

    const cellCheckbox = document.getElementById("cellCheckbox");
    const geneRadioContainer = document.getElementById('geneRadioContainer');

    const toggleCellCheckbox = document.getElementById('toggleCellCheckbox');
    const toggleGeneRadio = document.getElementById('toggleGeneRadio');
    
    // Check if any required elements are missing
    if (!togglePointSize || !pointSizeSliderBox || !toggleGenePercentile || !geneSliderBox) {
        console.warn('Some UI elements are not available yet');
        return;
    }

    // hover functions for each button 

    buttons.forEach(button => {

        const show = () => {
            const targetId = button.dataset.target;
            const targetBox = document.getElementById(targetId);
            targetBox.style.display = 'block';
        }

        const hide = () => {
            const targetId = button.dataset.target;
            const targetBox = document.getElementById(targetId);
            targetBox.style.display = 'none';
        }

        ['mouseenter'].forEach((event) => {
            button.addEventListener(event, function() {
                show();
            });
        });

        ['mouseleave'].forEach((event) => {
            button.addEventListener(event, function() {
                hide();
            });
        });
    });

    // point size slider function
    
    if (togglePointSize) {
        togglePointSize.addEventListener('click', () => {

            // check if anything else is open -> close

            if (cellCheckbox.style.display === 'block') {
                cellCheckbox.style.display = 'none';
                toggleCellCheckbox.style.backgroundColor = '#282828';
                toggleCellCheckbox.style.color = 'white';
            }
            if (geneRadioContainer.style.display === 'block') {
                geneRadioContainer.style.display = 'none';
                toggleGeneRadio.style.backgroundColor = '#282828';
                toggleGeneRadio.style.color = 'white';
            }
            if (geneSliderBox.style.display === 'block') {
                geneSliderBox.style.display = 'none';
            }

            pointSizeSliderBox.style.display = pointSizeSliderBox.style.display === 'none' ? 'block' : 'none';
        })
    }
    if (pointSizeSlider) {
        pointSizeSlider.onchange = function() {
            pointSizeSliderValue.value = parseFloat(this.value).toFixed(2);
            updateDotSize(parseFloat(this.value).toFixed(2));
        }
    }

    if (pointSizeSlider) {
        pointSizeSlider.addEventListener('mouseup', function() {
            pointSizeSliderValue.value = parseFloat(this.value).toFixed(2);
            updateDotSize(parseFloat(this.value).toFixed(2));
        });
    }

    if (pointSizeSliderValue) {
        pointSizeSliderValue.onchange = function() {
            if (this.value < 0.1) {
                this.value = 0.1;
            } else if (this.value > 15) {
                this.value = 15;
            }
            pointSizeSlider.value = parseFloat(this.value).toFixed(2);
            updateDotSize(parseFloat(this.value).toFixed(2));
        }
    }

    // unfocus on enter
    if (pointSizeSliderValue) {
        pointSizeSliderValue.onkeydown = function(e) {
            if (e.key === "Enter") {
                document.activeElement.blur();
            }
        }
    }

    // gene percentile slider function

    if (toggleGenePercentile) {
        toggleGenePercentile.addEventListener('click', () => {

            // check if anything else is open -> close

            if (cellCheckbox.style.display === 'block') {
                cellCheckbox.style.display = 'none';
                toggleCellCheckbox.style.backgroundColor = '#282828';
                toggleCellCheckbox.style.color = 'white';
            }
            if (geneRadioContainer.style.display === 'block') {
                geneRadioContainer.style.display = 'none';
                toggleGeneRadio.style.backgroundColor = '#282828';
                toggleGeneRadio.style.color = 'white';
            }
            if (pointSizeSliderBox.style.display === 'block') {
                pointSizeSliderBox.style.display = 'none';
            }

            geneSliderBox.style.display = geneSliderBox.style.display === 'none' ? 'block' : 'none';
        })
    }

    if (geneSlider) {
        geneSlider.addEventListener('mouseup', function() {
            geneSliderValue.value = parseFloat(this.value).toFixed(2);
            updateGenePercentile(parseFloat(this.value).toFixed(2));
        });
    }

    if (geneSliderValue) {
        geneSliderValue.onchange = function() {
            if (this.value < 80) {
                this.value = 80;
            } else if (this.value > 99.99) {
                this.value = 99.99;
            }
            geneSlider.value = parseFloat(this.value).toFixed(2);
            updateGenePercentile(parseFloat(this.value).toFixed(2));
        }
    }

    // unfocus on enter
    if (geneSliderValue) {
        geneSliderValue.onkeydown = function(e) {
            if (e.key === "Enter") {
                document.activeElement.blur();
            }
        }
    }
}