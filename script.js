// When a file is selected, handle the file parsing
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // Use PapaParse to parse the file
        Papa.parse(file, {
            complete: function(results) {
                // Filter out any empty or whitespace-only rows
                const cleanedData = results.data.filter(row => {
                    // Check if the row has any non-empty values
                    return Object.values(row).some(value => value.trim() !== '');
                });
                
                const input = cleanedData[0];

                const maxVelocity = parseFloat(input["max velocity (mph)"]);
                const minVelocity = parseFloat(input["min velocity (mph)"]);
                const rho = parseFloat(input["rho"]);
                const planformArea = parseFloat(input["planform area (ft^2)"]);
                const weight = parseFloat(input["weight (lbs)"]);
                const liftSlope = parseFloat(input["lift curve slope"]);
                const yIntercept = parseFloat(input["y intercept"]);
                const dragCoeff1 = parseFloat(input["drag coefficient a"]);
                const dragCoeff2 = parseFloat(input["drag coefficient b"]);
                const dragCoeff3 = parseFloat(input["drag coefficient c"]);
                const dragCoeff4 = parseFloat(input["drag coefficient d"]);
                const dragCoeff5 = parseFloat(input["drag coefficient e"]);


                const stepCount = maxVelocity - minVelocity;
                const velocityStep = 1;
                // Generate velocities and calculate dynamic pressure
                const velocities = [];
                const pressures = [];
                const coeffLifts = [];
                const AoAs = [];
                const dragsOZ = [];
                const dragsLbs = [];
                const LoverDs = [];

                for (let i = 0; i < stepCount + 1; i++) {
                    const velocity = minVelocity + i * velocityStep; // velocity mph
                    const velocityFPS = velocity * 5280 / 3600; // velocity fps

                    // calculate q and cl 
                    const dynamicPressure = 0.5 * rho * velocityFPS * velocityFPS;  
                    const coefficientLift = weight / (dynamicPressure * planformArea);
                    const AoA = (coefficientLift - yIntercept) / liftSlope;
                    const coefficientDrag = dragCoeff1 * AoA**4 + dragCoeff2 * AoA**3 + dragCoeff3 * AoA**2 + dragCoeff4 * AoA + dragCoeff5;
                    const dragLb = coefficientDrag * dynamicPressure * planformArea;
                    const dragOz = dragLb * 16;
                    const LoverD = weight / dragLb;

                    velocities.push(velocity);
                    pressures.push(dynamicPressure);
                    coeffLifts.push(coefficientLift);
                    AoAs.push(AoA);
                    dragsLbs.push(dragLb);
                    dragsOZ.push(dragOz);
                    LoverDs.push(LoverD)
                }
                
                // Output the velocities and pressures
                const resultsData = velocities.map((velocity, index) => ({
                    "Velocity (mph)": velocity.toFixed(0),
                    "Dynamic Pressure": pressures[index].toFixed(2),
                    "CL": coeffLifts[index].toFixed(2),
                    "Angle of Attack (deg)": AoAs[index].toFixed(0),
                    "Drag (lbs)": dragsLbs[index].toFixed(2),
                    "Drag (Oz)": dragsOZ[index].toFixed(2),
                    "L/D": LoverDs[index].toFixed(2)
                }));
                
                let tableHTML = "<table border='1'><thead><tr>";
                Object.keys(resultsData[0]).forEach(key => {
                    tableHTML += `<th>${key}</th>`;
                });
                tableHTML += "</tr></thead><tbody>";
                
                resultsData.forEach(rowData => {
                    tableHTML += "<tr>";
                    Object.values(rowData).forEach(value => {
                        tableHTML += `<td>${value}</td>`;
                    });
                    tableHTML += "</tr>";
                });
                tableHTML += "</tbody></table>";
                
                // Store the table HTML string in localStorage
                localStorage.setItem("reportTable", tableHTML);
                
                // Redirect to the report page
                window.location.href = "report.html";

            },
            error: function(error) {
                console.error('Error parsing the file:', error);
            },
            header: true // assuming the CSV has headers
        });
    }
});

