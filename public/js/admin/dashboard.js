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
    const dashboardData = window.dashboardData;

    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: dashboardData.sales.labels,
            datasets: [{
                label: 'Monthly Sales (₹)',
                data: dashboardData.sales.data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Customers Chart
    const customersCtx = document.getElementById('customersChart').getContext('2d');
    new Chart(customersCtx, {
        type: 'bar',
        data: {
            labels: dashboardData.customers.labels,
            datasets: [{
                label: 'New Customers',
                data: dashboardData.customers.data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Orders Chart
    const ordersCtx = document.getElementById('ordersChart').getContext('2d');
    new Chart(ordersCtx, {
        type: 'bar',
        data: {
            labels: dashboardData.orders.labels,
            datasets: [{
                label: 'Monthly Orders',
                data: dashboardData.orders.data,
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Category Performance Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: dashboardData.categories.labels,
            datasets: [{
                label: 'Category Sales (₹)',
                data: dashboardData.categories.data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });

    // Chart filter event listeners
    document.getElementById('salesChartFilter').addEventListener('change', function() {
        console.log('Sales chart filter changed to:', this.value);
        // In a real app, you would fetch and update chart data based on the filter
    });

    document.getElementById('customersChartFilter').addEventListener('change', function() {
        console.log('Customers chart filter changed to:', this.value);
        // In a real app, you would fetch and update chart data based on the filter
    });

    document.getElementById('ordersChartFilter').addEventListener('change', function() {
        console.log('Orders chart filter changed to:', this.value);
        // In a real app, you would fetch and update chart data based on the filter
    });

    document.getElementById('categoryChartFilter').addEventListener('change', function() {
        console.log('Category chart filter changed to:', this.value);
        // In a real app, you would fetch and update chart data based on the filter
    });
});