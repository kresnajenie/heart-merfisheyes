// /src/helpers/APIClient.js
// Function to fetch data from the API and return an Observable using async/await

import pako from "pako";

export async function fetchDataFromAPI(columnName, prefix) {
    // const response = await fetch(`http://localhost:8000/getdata?data=${prefix}&gene=${columnName}`);
    // const response = await fetch(`https://fisheyes.techkyra.com/getdata?data=${prefix}&gene=${columnName}`);
    // const response = await fetch(`https://cb-backend.techkyra.com/get-gene-values?gene=${columnName}&dbname=genedb&dbcollection=${prefix}&username=roy&csv_filename=${prefix}_matrix.csv`);
    // const response = await fetch(`http://localhost:8000/get-gene-values?gene=${columnName}&dbname=genedb&dbcollection=${prefix}&username=roy&csv_filename=${prefix}_matrix.csv`);
    // const response = await fetch(`https://quan-be.merfisheyes.com/get-gene-values?gene=${columnName}&dbname=quandb&dbcollection=heart&username=quan&csv_filename=heart_matrix.csv`);
    // const response = await fetch(`http://localhost:8000/get-gene-values?gene=${columnName}&dbname=quandb&dbcollection=heart&username=quan&csv_filename=heart_matrix.csv`);

    const response = await fetch(
        `https://quan-be.merfisheyes.com/get-gz-file?dbname=quandb&dbcollection=3dheartn&username=quan&csv_filename=3dheartn_matrix.csv&gene=${columnName}`
    );

    if (!response.ok) {
        console.error(`Failed to fetch data for column: ${columnName}`);
        return [];
    }

    try {
        // Decompress the .gz file
        const compressedData = await response.arrayBuffer();
        const data = pako.inflate(compressedData, { to: "string" });

        console.log("Raw Data:", data); // Debugging

        // ✅ Trim, Split by Comma, Convert to Numbers
        const parsedData = data
            .trim() // Remove any leading/trailing whitespace
            .split(",") // Split by comma
            .slice(1)
            .map(value => {
                const num = parseFloat(value); 
                return isNaN(num) ? value : num; // Convert to number if possible
            });

        console.log("Parsed Data:", parsedData); // Debugging
        return parsedData;

    } catch (error) {
        console.error(`Error processing data for ${columnName}:`, error);
        return [];
    }
    
}

export async function fetchConstAPI(columnName, prefix) {
    const response = await fetch(`https://quan-be.merfisheyes.com/get-gene-values?gene=${columnName}&dbname=quandb&dbcollection=heart&username=quan&csv_filename=heart_matrix.csv`);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data === undefined || data.gene_values == undefined) {
        return '[]';
    }

    let _d = data.gene_values.split(',').filter(item => item!== "");

    _d.shift()
    return _d;
}