// /src/helpers/LoadFunctions.js
import { fetchDataFromAPI, fetchConstAPI } from './APIClient';
import { updateDataPalette, updateGenes, ApiState, updateGroups } from '../states/ApiState';
import { updateDataItems } from '../states/MatrixState';

export const prefix = ApiState.value.prefix;

export async function loadPallete() {
    const pal_col = ApiState.value.palleteColumn;
    try {
        const data = await fetchConstAPI(pal_col, prefix); 
        // Remove the first element
        console.log(data)

        // Initialize an empty object for the dictionary
        let dictionary = {};

        // Iterate over the list and split each string to create key-value pairs
        data.forEach(item => {
            // console.log(item)
            let [key, value] = item.split(':');
            key = key.replace(/'/g, '').trim();  // Remove quotes and trim whitespace
            value = value.replace(/'/g, '').trim();  // Remove quotes and trim whitespace
            dictionary[key] = value;
        });
        // console.log(dictionary)

        updateDataPalette(dictionary);

    } catch (error) {
        console.error('Failed to load items:', error);
    }
}

export async function loadGenes() {
    try {
        const data = await fetchConstAPI("genes", prefix); 

        updateGenes(data);
    } catch (error) {
        console.error('Failed to load items:', error);
    }
}

export async function loadItems() {
    const columns = prefix === "3D Heart" ? ApiState.value.columns : ApiState.value.columns2;
    let transformedData = {};
    let jsonData = [];

    try {
        // Fetch data for all columns asynchronously
        const results = await Promise.all(columns.map(col => fetchDataFromAPI(col, prefix)));
        
        // console.log("Load Results", results);
        columns.forEach((col, index) => {
            console.log(col);
            console.log(index)
            console.log(results[index])
            transformedData[col] = results[index];
        });

        // console.log("trfdata", transformedData);
    
        // Assuming 'clusters' is a valid key in your transformedData
        // Make sure this logic aligns with how your data is structured
        for (let i = 0; i < transformedData.clusters.length; i++) {
            let row = {};
            for (let key in transformedData) {
                row[key] = transformedData[key][i];
            }
            jsonData.push(row);
        }

        // Update the global state with the new items
        updateDataItems(jsonData);    
    } catch (error) {
        console.error('Error combining data:', error);
    }   
}

export async function loadGroups() {
    try {
        const data = await fetchDataFromAPI("hierarchical_clusters", prefix); 
        updateGroups(JSON.parse(data));
    } catch (error) {
        console.error('Failed to load items:', error);
    }
}