// Sales Chart
new Chart(document.getElementById('salesChart'), {
   type: 'line',
   data: {
       labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
       datasets: [{
           label: 'Sales ($)',
           data: [12000, 19000, 15000, 25000, 22000, 30000],
           borderColor: '#3b82f6',
           tension: 0.4
       }]
   },
   options: {
       responsive: true,
       maintainAspectRatio: false
   }
});

// Customers Chart
new Chart(document.getElementById('customersChart'), {
   type: 'bar',
   data: {
       labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
       datasets: [{
           label: 'New Customers',
           data: [50, 65, 75, 85, 95, 100],
           backgroundColor: '#3b82f6'
       }]
   },
   options: {
       responsive: true,
       maintainAspectRatio: false
   }
});

// Orders Chart
new Chart(document.getElementById('ordersChart'), {
   type: 'line',
   data: {
       labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
       datasets: [{
           label: 'Orders',
           data: [150, 200, 175, 250, 220, 300],
           borderColor: '#3b82f6',
           tension: 0.4
       }]
   },
   options: {
       responsive: true,
       maintainAspectRatio: false
   }
});

// Best Selling Chart (Doughnut)
new Chart(document.getElementById('bestSellingChart'), {
   type: 'doughnut',
   data: {
       labels: ['Men\'s Watches', 'Women\'s Watches'],
       datasets: [{
           data: [60, 40],
           backgroundColor: ['#3b82f6', '#ec4899']
       }]
   },
   options: {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
           legend: {
               position: 'right'
           }
       }
   }
});

// Handle sidebar navigation and breadcrumbs
document.addEventListener('DOMContentLoaded', function() {
   // Get all nav items
   const navItems = document.querySelectorAll('.nav-item');
   const breadcrumbPage = document.getElementById('currentPage');
   
   // Set initial active state
   navItems[0].classList.add('active');

   // Add click event to each nav item
   navItems.forEach(item => {
       item.addEventListener('click', function(e) {
        //    e.preventDefault();
           
           // Remove active class from all items
           navItems.forEach(nav => nav.classList.remove('active'));
           
           // Add active class to clicked item
           this.classList.add('active');
           
           // Update breadcrumbs
           const pageName = this.getAttribute('data-page');
           breadcrumbPage.textContent = pageName;
       });
   });
});