// // Sales Chart
// new Chart(document.getElementById('salesChart'), {
//    type: 'line',
//    data: {
//        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
//        datasets: [{
//            label: 'Sales (₹)',
//            data: [12000, 19000, 15000, 25000, 22000, 30000],
//            borderColor: 'lightgreen',
//            tension: 0.4
//        }]
//    },
//    options: {
//        responsive: true,
//        maintainAspectRatio: false
//    }
// });

// // Customers Chart
// new Chart(document.getElementById('customersChart'), {
//    type: 'bar',
//    data: {
//        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
//        datasets: [{
//            label: 'New Customers',
//            data: [50, 65, 75, 85, 95, 100],
//            backgroundColor: 'lightgreen'
//        }]
//    },
//    options: {
//        responsive: true,
//        maintainAspectRatio: false
//    }
// });

// // Orders Chart
// new Chart(document.getElementById('ordersChart'), {
//    type: 'line',
//    data: {
//        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
//        datasets: [{
//            label: 'Orders',
//            data: [150, 200, 175, 250, 220, 300],
//            borderColor: 'lightgreen',
//            tension: 0.4
//        }]
//    },
//    options: {
//        responsive: true,
//        maintainAspectRatio: false
//    }
// });

// // Best Selling Chart (Doughnut)
// new Chart(document.getElementById('bestSellingChart'), {
//    type: 'doughnut',
//    data: {
//        labels: ['Men\'s Watches', 'Women\'s Watches'],
//        datasets: [{
//            data: [60, 40],
//            backgroundColor: ['lightgreen', 'orange']
//        }]
//    },
//    options: {
//        responsive: true,
//        maintainAspectRatio: false,
//        plugins: {
//            legend: {
//                position: 'right'
//            }
//        }
//    }
// });

// // Handle sidebar navigation and breadcrumbs
// document.addEventListener('DOMContentLoaded', function() {
//    // Get all nav items
//    const navItems = document.querySelectorAll('.nav-item');
//    const breadcrumbPage = document.getElementById('currentPage');
   
//    // Set initial active state
//    navItems[0].classList.add('active');

//    // Add click event to each nav item
//    navItems.forEach(item => {
//        item.addEventListener('click', function(e) {
//         //    e.preventDefault();
           
//            // Remove active class from all items
//            navItems.forEach(nav => nav.classList.remove('active'));
           
//            // Add active class to clicked item
//            this.classList.add('active');
           
//            // Update breadcrumbs
//            const pageName = this.getAttribute('data-page');
//            breadcrumbPage.textContent = pageName;
//        });
//    });
// });

// Dashboard charts initialization
document.addEventListener('DOMContentLoaded', function() {
    // Get dashboard data from the window object
    const dashboardData = window.dashboardData || {
        monthly: {
            labels: [],
            revenue: [],
            orders: [],
            customers: []
        },
        category: {
            labels: [],
            data: [],
            count: []
        }
    };

    // Chart colors
    const chartColors = {
        revenue: {
            bg: 'rgba(0, 123, 255, 0.2)',
            border: 'rgba(0, 123, 255, 1)'
        },
        orders: {
            bg: 'rgba(40, 167, 69, 0.2)', 
            border: 'rgba(40, 167, 69, 1)'
        },
        customers: {
            bg: 'rgba(255, 193, 7, 0.2)',
            border: 'rgba(255, 193, 7, 1)'
        },
        category: [
            'rgba(255, 99, 132, 0.8)',  // Luxury
            'rgba(54, 162, 235, 0.8)',  // Mid-range
            'rgba(255, 206, 86, 0.8)',  // Budget-friendly
            'rgba(75, 192, 192, 0.8)',  // Cheapest
            'rgba(153, 102, 255, 0.8)', // Extra category if needed
            'rgba(255, 159, 64, 0.8)'   // Extra category if needed
        ]
    };

    // Format currency
    const formatCurrency = (value) => {
        return '₹' + value.toLocaleString('en-IN');
    };

    // --- Sales Revenue Chart ---
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: dashboardData.monthly.labels,
            datasets: [{
                label: 'Revenue',
                data: dashboardData.monthly.revenue,
                backgroundColor: chartColors.revenue.bg,
                borderColor: chartColors.revenue.border,
                borderWidth: 2,
                tension: 0.4,
                fill: true
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
                            return formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Revenue: ' + formatCurrency(context.raw);
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    // --- Customers Chart ---
    const customersCtx = document.getElementById('customersChart').getContext('2d');
    const customersChart = new Chart(customersCtx, {
        type: 'bar',
        data: {
            labels: dashboardData.monthly.labels,
            datasets: [{
                label: 'New Customers',
                data: dashboardData.monthly.customers,
                backgroundColor: chartColors.customers.bg,
                borderColor: chartColors.customers.border,
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
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'New Customers: ' + context.raw;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    // --- Orders Chart ---
    const ordersCtx = document.getElementById('ordersChart').getContext('2d');
    const ordersChart = new Chart(ordersCtx, {
        type: 'line',
        data: {
            labels: dashboardData.monthly.labels,
            datasets: [{
                label: 'Orders',
                data: dashboardData.monthly.orders,
                backgroundColor: chartColors.orders.bg,
                borderColor: chartColors.orders.border,
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Orders: ' + context.raw;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    // --- Category Chart ---
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: dashboardData.category.labels,
            datasets: [{
                label: 'Sales by Category',
                data: dashboardData.category.data,
                backgroundColor: chartColors.category.slice(0, dashboardData.category.labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Handle filter changes
    const handleFilterChange = (chart, filter) => {
        // This would normally fetch new data based on the filter
        // For now, we'll simulate it by showing a loading state
        chart.data.datasets[0].data = chart.data.datasets[0].data.map(() => Math.random() * 1000);
        chart.update();
        
        // In production, you would do an AJAX call to get new data:
        /*
        fetch(`/admin/api/chart-data?chart=${chart.canvas.id}&filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                chart.data.labels = data.labels;
                chart.data.datasets[0].data = data.values;
                chart.update();
            });
        */
    };

    // Add filter event listeners
    document.getElementById('salesChartFilter').addEventListener('change', function() {
        handleFilterChange(salesChart, this.value);
    });

    document.getElementById('customersChartFilter').addEventListener('change', function() {
        handleFilterChange(customersChart, this.value);
    });

    document.getElementById('ordersChartFilter').addEventListener('change', function() {
        handleFilterChange(ordersChart, this.value);
    });

    document.getElementById('categoryChartFilter').addEventListener('change', function() {
        handleFilterChange(categoryChart, this.value);
    });
});