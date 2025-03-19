# Heart MERFISHeyes

A web application for visualizing single-cell spatial data from heart tissue using Three.js. This application supports both 2D and 3D visualizations of spatial transcriptomics data.

## Features

- Interactive 3D/2D visualization of spatial transcriptomics data
- Cell type filtering and highlighting
- Gene expression visualization with color gradients
- Adjustable point size and gene percentile thresholds
- URL state persistence for sharing specific views

## Technology Stack

- **Frontend**: JavaScript, Three.js, RxJS
- **Visualization**: WebGL via Three.js
- **State Management**: RxJS Observables
- **Build System**: Vite

## Project Structure

- `src/scene/`: Three.js scene initialization and rendering
- `src/states/`: State management using RxJS
- `src/helpers/`: Utility functions for filtering, loading, and data processing
- `src/ui/`: User interface components

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd heart-merfisheyes

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

1. Use the dropdown to select between 2D and 3D visualization modes
2. Toggle cell type filters to highlight specific cell populations
3. Select genes to visualize their expression levels
4. Adjust point size and gene percentile thresholds using the sliders
5. Navigate the 3D space using mouse controls (pan, rotate, zoom)

## Data

The application fetches data from a backend API hosted at quan-be.merfisheyes.com. The data includes:

- Cell coordinates in 2D/3D space
- Cell type annotations
- Gene expression values

## Performance Considerations

The application uses Three.js BufferGeometry and Points for efficient rendering of large datasets. Point size and visibility can be adjusted to optimize performance on different devices.
