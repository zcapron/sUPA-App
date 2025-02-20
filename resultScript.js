document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggleButton");
    const resultsTable = document.getElementById("resultsTable");
    const altitudeSelect = document.getElementById("altitudeSelect");
    let chartInstance = null; // Store Chart.js instance

    toggleButton.addEventListener("click", function () {
        if (resultsTable.classList.contains("hidden")) {
            resultsTable.classList.remove("hidden");
            toggleButton.textContent = "Hide Table";
        } else {
            resultsTable.classList.add("hidden");
            toggleButton.textContent = "Show Table";
        }
    });

    function loadResults() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        altitudeSelect.innerHTML = ""; // Clear previous options

        for (let altitude in results) {
            let option = document.createElement("option");
            option.value = altitude;
            option.textContent = altitude + " ft";
            altitudeSelect.appendChild(option);
        }

        if (altitudeSelect.options.length > 0) {
            updateTable();
            drawChart();
        }
    }

    function updateTable() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        const selectedAltitude = altitudeSelect.value;
        const tableBody = document.querySelector("#resultsTable tbody");
        tableBody.innerHTML = ""; // Clear existing rows

        if (results[selectedAltitude]) {
            for (let velocity in results[selectedAltitude]) {
                let row = document.createElement("tr");
                let data = results[selectedAltitude][velocity];

                row.innerHTML = `
                    <td>${velocity}</td>
                    <td>${data.dynamicPressure.toFixed(4)}</td>
                    <td>${data.coefficientLift.toFixed(4)}</td>
                    <td>${data.AoA.toFixed(4)}</td>
                    <td>${data.coefficientDrag.toFixed(4)}</td>
                    <td>${data.dragLb.toFixed(4)}</td>
                    <td>${data.dragOz.toFixed(4)}</td>
                    <td>${data.lOverD.toFixed(4)}</td>
                `;

                tableBody.appendChild(row);
            }
        }
    }

    function drawChart() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        const selectedAltitude = altitudeSelect.value;
        if (!selectedAltitude || !results[selectedAltitude]) return;

        const airspeed = [];
        const ldRatio = [];
        const cLThreeHalfD = [];

        for (let velocity in results[selectedAltitude]) {
            airspeed.push(parseFloat(velocity));
            ldRatio.push(results[selectedAltitude][velocity].lOverD);
            cLThreeHalfD.push(results[selectedAltitude][velocity].cLThreeHalfD)
        }

        const ctx = document.getElementById("ldChart").getContext("2d");

        if (chartInstance) {
            chartInstance.destroy(); // Destroy previous chart instance to prevent duplication
        }

        chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: airspeed,
                datasets: [{
                    label: "L/D Ratio",
                    data: ldRatio,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "blue"
                }, 
                {
                    label: "cL^(3/2)/cD Ratio",
                    data: cLThreeHalfD,
                    borderColor: "green",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "green"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Airspeed (mph)"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "L/D Ratio"
                        }
                    }
                }
            }
        });
    }

    altitudeSelect.addEventListener("change", function () {
        updateTable();
        drawChart();
    });

    loadResults();
});
