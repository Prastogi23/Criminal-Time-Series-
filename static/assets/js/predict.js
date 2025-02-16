document.addEventListener("DOMContentLoaded", function () {
    // Initialize Select2 for crime dropdowns
    $('.crime-select').select2({
        placeholder: "Select crime(s)",
        allowClear: true,
        width: "100%",
        theme: "classic" // Optional theme for better appearance
    });

    const singleDate = document.getElementById("singleDate");
    const dateRange = document.getElementById("dateRange");
    const singleDateSection = document.getElementById("singleDateSection");
    const dateRangeSection = document.getElementById("dateRangeSection");

    // Toggle sections based on radio selection
    singleDate.addEventListener("change", () => {
        singleDateSection.classList.remove("d-none");
        dateRangeSection.classList.add("d-none");
    });

    dateRange.addEventListener("change", () => {
        singleDateSection.classList.add("d-none");
        dateRangeSection.classList.remove("d-none");
    });
});

// Fetch data from the API
async function fetchCrimes(apiUrl, date, classes) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            date,
            classes,
        }),
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return await response.json();
}

document.getElementById('predictBtn').addEventListener('click', function () {
    // Simulated results for demonstration
    const predictionType = document.querySelector('input[name="predictionType"]:checked').value;

    // Clear previous results
    document.getElementById('resultSection').classList.remove('d-none');
    document.querySelectorAll('.card').forEach(card => card.classList.add('d-none'));

    if (predictionType === "single") {
        const selectedCrimes = Array.from(document.querySelector('#crimeSelect').selectedOptions).map(opt => opt.value);
        const specificDate = document.querySelector('#specificDate').value;

        if (selectedCrimes.length === 1) {
            // Case 1: Single Date, Single Crime
            fetchCrimes('/api/predict_single_date', specificDate, selectedCrimes)
                .then(data => {

                    document.getElementById('case1Result').classList.remove('d-none');

                    const totalCrimes = Object.values(data.data.totalCrimes).reduce((sum, value) => sum + value, 0)

                    document.getElementById('case1Total').textContent = totalCrimes;
                    document.getElementById('case1Date').textContent = specificDate;

                })
                .catch(err => console.error("Error Fetching data for Case 1:", err));
        } else {
            // Case 2: Single Date, Multiple Crimes
            fetchCrimes('/api/predict_single_date', specificDate, selectedCrimes)
            .then(data => {
                document.getElementById('case2Result').classList.remove('d-none');
        
                // Extract totalCrimes data from API response
                const totalCrimes = data.data.totalCrimes;
                
                // Calculate the sum of all crimes
                const totalCrimesCount = Object.values(totalCrimes).reduce((sum, value) => sum + value, 0);
        
                // Update the total crimes count in the UI
                document.getElementById('case2Total').textContent = totalCrimesCount.toFixed(2);
                document.getElementById('case2Date').textContent = specificDate;
        
                // Prepare the data for the selected crimes
                const crimesCount = selectedCrimes.length;
                const caseData = selectedCrimes.map(crime => totalCrimes[crime] || 0); // Default to 0 if crime doesn't exist
                const colors = ['#f39c12', '#27ae60', '#8e44ad', '#e74c3c', '#e67e22', '#1abc9c', '#9b59b6', '#c0392b'];
        
                // Generate Pie Chart
                const ctx = document.getElementById('case2Chart').getContext('2d');
                new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: selectedCrimes,
                        datasets: [{
                            data: caseData,
                            backgroundColor: colors.slice(0, crimesCount),
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top' },
                            tooltip: {
                                callbacks: {
                                    label: function (tooltipItem) {
                                        return `${tooltipItem.label}: ${tooltipItem.raw.toFixed(2)} cases`;
                                    },
                                },
                            },
                        },
                    },
                });
        
                // Dynamically generate the crime names and their case values
                const crimeListContainer = document.getElementById('crimeList');
                crimeListContainer.innerHTML = ''; // Clear any existing content
                selectedCrimes.forEach((crime, index) => {
                    const crimeItem = document.createElement('div');
                    crimeItem.classList.add('crime-item', 'mb-2');
                    const crimeCount = caseData[index].toFixed(2);
                    crimeItem.innerHTML = `<strong>${crime}</strong>: ${crimeCount} cases`;
                    crimeListContainer.appendChild(crimeItem);
                });
            })
            .catch(err => console.error("Error Fetching data for Case 2:", err));
        }
    } else if (predictionType === "range") {
        const selectedCrimes = Array.from(document.querySelector('#crimeRangeSelect').selectedOptions).map(opt => opt.value);
        const startDate = document.querySelector('#startDate').value;
        const endDate = document.querySelector('#endDate').value;
        
        if (selectedCrimes.length === 1) {
            // Case 3: Date Range, Single Crime
            document.getElementById('case3Result').classList.remove('d-none');
            document.getElementById('case3Start').textContent = startDate;
            document.getElementById('case3End').textContent = endDate;
        
            // Prepare the request body
            const requestBody = {
                start_date: startDate,
                end_date: endDate,
                classes: selectedCrimes
            };
        
            // Fetch data from the API
            fetch('http://127.0.0.1:8080/api/predict_date_range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })
            .then(response => response.json())
            .then(data => {
                if (data.Status === 200) {
                    // Extract totalCrimes data from the API response
                    const totalCrimes = data.data.totalCrimes;
                    const dateLabels = [];
                    const caseValues = [];
                    let granularity;
                    let allDates = new Set(); // Use a Set to collect all unique dates
        
                    // Calculate the number of days between the start and end date
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    let totalSum = 0;
                    // Decide granularity based on the date range
                    if (totalDays <= 30) {
                        granularity = 'daily'; // Use daily labels for small ranges
                    } else if (totalDays <= 365) {
                        granularity = 'weekly'; // Use weekly labels for medium ranges
                    } else {
                        granularity = 'monthly'; // Use monthly labels for large ranges
                    }
        
                    let tempCases = 0; // Temporary storage for aggregation
        
                    // Generate labels and aggregate data based on granularity
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const date = new Date(d);
                        const currentLabel = date.toISOString().split('T')[0]; // YYYY-MM-DD
                        selectedCrimes.forEach(crime => {
                            if (totalCrimes[crime] && totalCrimes[crime][currentLabel] !== undefined) {
                                const dailyCases = totalCrimes[crime][currentLabel];
                                if (!dateLabels.includes(currentLabel)) {
                                    dateLabels.push(currentLabel);
                                }
                                caseValues.push(dailyCases);
                                totalSum += dailyCases; // Aggregate data
                                allDates.add(currentLabel); // Add date to the Set of unique dates
                            }
                        });
                    }
        
                    // Display the total number of unique dates in the 'case3Total' element
                    document.getElementById('case3Total').textContent = totalSum;
        
                    // Generate the line chart
                    const ctx = document.getElementById('case3Chart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: dateLabels, // Dynamic labels based on dates
                            datasets: [{
                                label: `${selectedCrimes[0]} Cases`, // Crime name
                                data: caseValues, // Aggregated values
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                                fill: true,
                                tension: 0.3, // Smooth curve
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: granularity.charAt(0).toUpperCase() + granularity.slice(1) // Capitalized granularity
                                    },
                                    ticks: {
                                        maxRotation: 45,
                                        minRotation: 0
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Number of Cases'
                                    },
                                    beginAtZero: true
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (tooltipItem) {
                                            return `${tooltipItem.raw} cases`;
                                        }
                                    }
                                }
                            }
                        }
                    });
        
                } else {
                    console.error('Error: ' + data.message);
                }
            })
            .catch(err => console.error('Error Fetching Data:', err));
        }
         else {
            // Case 4: Date Range, Multiple Crimes
            document.getElementById('case4Result').classList.remove('d-none');
            document.getElementById('case4Total').textContent = "Total cases displayed below";
            document.getElementById('case4Start').textContent = startDate;
            document.getElementById('case4End').textContent = endDate;
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            
            // Decide granularity
            let granularity ='daily';
            // if (totalDays <= 30) {
            //     granularity = 'daily';
            // } else if (totalDays <= 365) {
            //     granularity = 'weekly';
            // } else {
            //     granularity = 'monthly';
            // }
            
            const dateLabels = [];
            const caseData = {}; // Store data for each crime
            let tempCases = {}; // Temporary storage for aggregating cases for weekly/monthly granularity
            
            // Initialize caseData for each crime
            selectedCrimes.forEach(crime => {
                caseData[crime] = [];
                tempCases[crime] = 0;
            });
            
            let currentLabel;
            
            // Prepare the request body for the API call
            const requestBody = {
                start_date: startDate,
                end_date: endDate,
                classes: selectedCrimes
            };
            
            // Fetch data from the API
            fetch('http://127.0.0.1:8080/api/predict_date_range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.Status === 200) {
                        const totalCrimes = data.data.totalCrimes; // Assuming the API returns totalCrimes with data for each crime per day
            
                        // Generate labels and aggregate data based on granularity
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            const date = new Date(d);
            
                            if (granularity === 'daily') {
                                currentLabel = date.toISOString().split('T')[0]; // YYYY-MM-DD
                                dateLabels.push(currentLabel);
            
                                selectedCrimes.forEach(crime => {
                                    // Check if we have data for this crime on the current day
                                    if (totalCrimes[crime] && totalCrimes[crime][currentLabel] !== undefined) {
                                        caseData[crime].push(totalCrimes[crime][currentLabel]);
                                    } else {
                                        caseData[crime].push(0); // If no data for the crime, push 0
                                    }
                                });
                            } else if (granularity === 'weekly') {
                                const weekNumber = Math.ceil(date.getDate() / 7);
                                currentLabel = `Week ${weekNumber}, ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                                if (!dateLabels.includes(currentLabel)) {
                                    if (Object.values(tempCases).some(value => value > 0)) {
                                        selectedCrimes.forEach(crime => {
                                            caseData[crime].push(tempCases[crime]);
                                            tempCases[crime] = 0;
                                        });
                                    }
                                    dateLabels.push(currentLabel);
                                }
            
                                selectedCrimes.forEach(crime => {
                                    if (totalCrimes[crime] && totalCrimes[crime][currentLabel]) {
                                        tempCases[crime] += totalCrimes[crime][currentLabel];
                                    }
                                });
                            } else if (granularity === 'monthly') {
                                currentLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                                if (!dateLabels.includes(currentLabel)) {
                                    if (Object.values(tempCases).some(value => value > 0)) {
                                        selectedCrimes.forEach(crime => {
                                            caseData[crime].push(tempCases[crime]);
                                            tempCases[crime] = 0;
                                        });
                                    }
                                    dateLabels.push(currentLabel);
                                }
            
                                selectedCrimes.forEach(crime => {
                                    if (totalCrimes[crime] && totalCrimes[crime][currentLabel]) {
                                        tempCases[crime] += totalCrimes[crime][currentLabel];
                                    }
                                });
                            }
                        }
            
                        if (granularity !== 'daily') {
                            selectedCrimes.forEach(crime => {
                                caseData[crime].push(tempCases[crime]);
                            });
                        }
            
                        // Prepare datasets for the line chart
                        const datasets = selectedCrimes.map((crime, index) => ({
                            label: crime,
                            data: caseData[crime],
                            borderColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f'][index % 5], // Dynamic colors
                            backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent
                            fill: false,
                            tension: 0.3 // Smooth curves
                        }));
            
                        // Generate the line chart
                        const ctx = document.getElementById('case4Chart').getContext('2d');
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: dateLabels,
                                datasets: datasets
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: {
                                        title: {
                                            display: true,
                                            text: granularity.charAt(0).toUpperCase() + granularity.slice(1)
                                        },
                                        ticks: {
                                            maxRotation: 45,
                                            minRotation: 0
                                        }
                                    },
                                    y: {
                                        title: {
                                            display: true,
                                            text: 'Number of Cases'
                                        },
                                        beginAtZero: true
                                    }
                                },
                                plugins: {
                                    legend: {
                                        position: 'top',
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function (tooltipItem) {
                                                return `${tooltipItem.raw} cases`;
                                            }
                                        }
                                    }
                                }
                            }
                        });
            
                        // Display totals for each crime below the chart
                        const totalsDiv = document.getElementById('case4Totals');
                        totalsDiv.innerHTML = ''; // Clear previous totals
                        selectedCrimes.forEach(crime => {
                            const totalCases = caseData[crime].reduce((sum, value) => sum + value, 0);
                            const totalElement = document.createElement('div');
                            totalElement.textContent = `${crime}: ${totalCases} cases`;
                            totalsDiv.appendChild(totalElement);
                        });
                    } else {
                        console.error('Error fetching data from API:', data.message);
                    }
                })
                .catch(err => {
                    console.error('Error Fetching Data:', err);
                });
            

            // Display totals for each crime below the chart
            const totalsDiv = document.getElementById('case4Totals');
            totalsDiv.innerHTML = ''; // Clear previous totals
            selectedCrimes.forEach(crime => {
                const totalCases = caseData[crime].reduce((sum, value) => sum + value, 0);
                const totalElement = document.createElement('div');
                totalElement.textContent = `${crime}: ${totalCases} cases`;
                totalsDiv.appendChild(totalElement);
            });
        }
    }
});
