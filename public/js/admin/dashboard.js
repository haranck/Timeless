
document.addEventListener('DOMContentLoaded', function() {
    // Chart instances
    let salesChart, customersChart, ordersChart, categoryChart;

    const urlParams = new URLSearchParams(window.location.search);
    const initialTimeFilter = urlParams.get('timeFilter', 'weekly') || 'weekly';

    // Set all dropdowns to the initial value
    syncAllFilters(initialTimeFilter);
    
    // Initialize charts with the correct time filter
    initializeCharts(initialTimeFilter);
    
    // Add event listeners to chart filter dropdowns
    const filters = ['sales', 'customers', 'orders', 'category'];
    filters.forEach(type => {
        document.getElementById(`${type}ChartFilter`).addEventListener('change', function() {
            const newTimeFilter = this.value;
            syncAllFilters(newTimeFilter);
            updateAllCharts(newTimeFilter);
        });
    });
    
    function syncAllFilters(timeFilter) {
        const filters = ['sales'];
        filters.forEach(type => {
            document.getElementById(`${type}ChartFilter`).value = timeFilter;
        });
    }
    
    function updateAllCharts(timeFilter) {
        console.log("time filter ", timeFilter)
        // Update URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('timeFilter', timeFilter);
        window.history.replaceState({}, '', currentUrl);

        console.log("currentUrl",currentUrl)
        
        // Show loading state on all charts
        const containers = document.querySelectorAll('.chart-container');
        containers.forEach(container => container.classList.add('loading'));
        
        // Fetch updated data from API
        fetch(`/admin/dashboard-data?timeFilter=${timeFilter}`)
            .then(response => response.json())
            .then(data => {
                // Update all charts with new data
                console.log("data",data)
                updateSalesChart(data.sales);
                updateCustomersChart(data.customers);
                updateOrdersChart(data.orders);
                updateCategoryChart(data.categories);
                updateSummaryCards(data.summary);
                
                // Remove loading state from all charts
                containers.forEach(container => container.classList.remove('loading'));
            })
            .catch(error => {
                console.error('Error fetching chart data:', error);
                containers.forEach(container => container.classList.remove('loading'));
                alert('Error updating chart data. Please try again.');
            });
    }
    
    function initializeCharts(timeFilter) {
        const dashboardData = window.dashboardData;
        
        // Initialize Sales Chart
        const salesCtx = document.getElementById('salesChart').getContext('2d');
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: dashboardData.sales.labels,
                datasets: [{
                    label: 'Sales Revenue (₹)',
                    data: dashboardData.sales.data,
                    borderColor: 'green',
                    backgroundColor: 'rgba(144, 238, 144, 0.5)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: ₹' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Initialize Customers Chart
        const customersCtx = document.getElementById('customersChart').getContext('2d');
        customersChart = new Chart(customersCtx, {
            type: 'bar',
            data: {
                labels: dashboardData.customers.labels,
                datasets: [{
                    label: 'New Customers',
                    data: dashboardData.customers.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Initialize Orders Chart
        const ordersCtx = document.getElementById('ordersChart').getContext('2d');
        ordersChart = new Chart(ordersCtx, {
            type: 'bar',
            data: {
                labels: dashboardData.orders.labels,
                datasets: [{
                    label: 'Orders',
                    data: dashboardData.orders.data,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Initialize Category Performance Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        categoryChart = new Chart(categoryCtx, {
            type: 'pie',
            data: {
                labels: dashboardData.categories.labels,
                datasets: [{
                    label: 'Category Sales (₹)',
                    data: dashboardData.categories.data,
                    backgroundColor: [
                        'rgba(33, 150, 243, 0.7)',  
                        'rgba(255, 193, 7, 0.7)',   
                        'rgba(76, 175, 80, 0.7)',   
                        'rgba(244, 67, 54, 0.7)',   
                        'rgba(156, 39, 176, 0.7)'   
                    ],
                    borderColor: [
                        'rgb(33, 150, 243)',
                        'rgb(255, 193, 7)',
                        'rgb(76, 175, 80)',
                        'rgb(244, 67, 54)',
                        'rgb(156, 39, 176)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ₹${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Update summary cards with actual data
        updateSummaryCards(dashboardData.summary);
    }
    
    function updateSalesChart(salesData) {
        if (salesChart) {
            salesChart.data.labels = salesData.labels;
            salesChart.data.datasets[0].data = salesData.data;
            salesChart.update();
        }
    }
    
    function updateCustomersChart(customersData) {
        if (customersChart) {
            customersChart.data.labels = customersData.labels;
            customersChart.data.datasets[0].data = customersData.data;
            customersChart.update();
        }
    }
    
    function updateOrdersChart(ordersData) {
        if (ordersChart) {
            ordersChart.data.labels = ordersData.labels;
            ordersChart.data.datasets[0].data = ordersData.data;
            ordersChart.update();
        }
    }
    
    function updateCategoryChart(categoryData) {
        if (categoryChart) {
            categoryChart.data.labels = categoryData.labels;
            categoryChart.data.datasets[0].data = categoryData.data;
            categoryChart.update();
        }
    }
    
    function updateSummaryCards(summaryData) {
        // Update Total Revenue
        document.querySelector('.summary-card:nth-child(1) .summary-info h3').textContent = 
            '₹' + Math.round(summaryData.totalRevenue).toLocaleString();
        const revenueChangeEl = document.querySelector('.summary-card:nth-child(1) .summary-change');
        revenueChangeEl.innerHTML = getGrowthHTML(summaryData.revenueGrowth);
        
        // Update Total Customers
        // console.log(summaryData)
        // document.querySelector('.summary-card:nth-child(2) .summary-info h3').textContent = summaryData.totalCustomers
        // document.querySelector('.summary-card:nth-child(2) .summary-info h3').textContent = summaryData.totalCustomers.toLocaleString();
        // const customerChangeEl = document.querySelector('.summary-card:nth-child(2) .summary-change');
        // const customerChangeEl = document.querySelector('.summary-card:nth-child(2) .summary-change');
        // customerChangeEl.innerHTML = getGrowthHTML(summaryData.customerGrowth);
        
        // Update Total Orders
        // document.querySelector('.summary-card:nth-child(3) .summary-info h3').textContent = 
        //     summaryData.totalOrders.toLocaleString();
        // const orderChangeEl = document.querySelector('.summary-card:nth-child(3) .summary-change');
        // orderChangeEl.innerHTML = getGrowthHTML(summaryData.orderGrowth);
    }
    
    function getGrowthHTML(growthPercent) {
        const isIncrease = growthPercent >= 0;
        const className = isIncrease ? 'increase' : 'decrease';
        const icon = isIncrease ? 'fa-arrow-up' : 'fa-arrow-down';
        return `<i class="fas ${icon}"></i><span>${Math.abs(growthPercent)}%</span>`;
    }
});