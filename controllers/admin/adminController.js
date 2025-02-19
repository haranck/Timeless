const User = require("../../models/userSchema")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")
const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');


const loadLogin = (req, res) => {
   if (req.session.admin) {
      return res.redirect('/admin/')
   }
   res.render('admin-login')
}

const login = async (req, res) => {
   try {
      const { email, password } = req.body;
      
      const admin = await User.findOne({ email, isAdmin: true });

      if (admin) {
          const passwordMatch = await bcrypt.compare(password, admin.password);
          if (passwordMatch) {
              req.session.admin = true; 
              return res.redirect('/admin'); 
          } 
          else if(!email || !password){
              return res.render('admin-login', { message: 'Please enter email and password' });

          }
          else {
              return res.render('admin-login', { message: 'Incorrect password' }); 
          }
      } else {
          return res.render('admin-login', { message: 'Please enter valid email and password' }); 
      }
  } catch (error) {
      console.log("Login error:", error);
      return res.render('admin-login', { message: 'An error occurred, please try again' }); 
  }
}

// const loadDashboard = async (req, res) => {
//    // if(req.session.admin){
//    //    try {
//    //       res.render('dashboard')
//    //    } catch (error) {
//    //       res.render('/pageerror')
//    //    }
//    // }
//    try {
//       if (req.session.admin) {
//          return res.render('dashboard')
//       }
//       return res.redirect('/admin/login')
//    } catch (err) {
//       console.log(err)
//    }
// }


const loadDashboard = async (req, res) => {
   try {
      
       if (!req.session.admin) {
           return res.redirect('/admin/login');
       }

       // Fetch dashboard data
       const currentDate = new Date();
       const lastYear = new Date();
       lastYear.setFullYear(currentDate.getFullYear() - 1);

       // Get total revenue, customers, and orders
       const [totalRevenue, totalCustomers, totalOrders, categories] = await Promise.all([
           Order.aggregate([
               { $match: { status: { $in: ['delivered', 'completed'] } } },
               { $group: { _id: null, total: { $sum: '$finalAmount' } } }
           ]),
           User.countDocuments({ isAdmin: false }),
           Order.countDocuments(),
           Category.find({ isListed: true })
       ]);

       // Get monthly data for charts (last 6 months)
       const sixMonthsAgo = new Date();
       sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
       
       const monthlyOrders = await Order.aggregate([
           {
               $match: {
                   createdAt: { $gte: sixMonthsAgo },
                   status: { $in: ['delivered', 'completed'] }
               }
           },
           {
               $group: {
                   _id: { 
                       year: { $year: '$createdAt' },
                       month: { $month: '$createdAt' }
                   },
                   revenue: { $sum: '$finalAmount' },
                   orders: { $sum: 1 }
               }
           },
           { $sort: { '_id.year': 1, '_id.month': 1 } }
       ]);

       // Format monthly data
       const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
       const last6Months = [];
       const revenueData = [];
       const ordersData = [];
       
       // Get last 6 months including current month
       for (let i = 0; i < 6; i++) {
           const monthDate = new Date();
           monthDate.setMonth(currentDate.getMonth() - (5 - i));
           const year = monthDate.getFullYear();
           const month = monthDate.getMonth() + 1;
           
           const monthData = monthlyOrders.find(m => 
               m._id.year === year && m._id.month === month
           );
           
           last6Months.push(monthNames[month - 1]);
           revenueData.push(monthData ? monthData.revenue : 0);
           ordersData.push(monthData ? monthData.orders : 0);
       }

       // Get monthly new customers
       const monthlyNewCustomers = await User.aggregate([
           {
               $match: {
                   createdAt: { $gte: sixMonthsAgo },
                   isAdmin: false
               }
           },
           {
               $group: {
                   _id: { 
                       year: { $year: '$createdAt' },
                       month: { $month: '$createdAt' }
                   },
                   count: { $sum: 1 }
               }
           },
           { $sort: { '_id.year': 1, '_id.month': 1 } }
       ]);

       // Format customer data for last 6 months
       const customerData = [];
       for (let i = 0; i < 6; i++) {
           const monthDate = new Date();
           monthDate.setMonth(currentDate.getMonth() - (5 - i));
           const year = monthDate.getFullYear();
           const month = monthDate.getMonth() + 1;
           
           const monthData = monthlyNewCustomers.find(m => 
               m._id.year === year && m._id.month === month
           );
           
           customerData.push(monthData ? monthData.count : 0);
       }

       // Get category performance with Product lookup to get category name
       const categoryPerformance = await Order.aggregate([
           { 
               $match: { 
                   status: { $in: ['delivered', 'completed'] },
                   createdAt: { $gte: sixMonthsAgo }
               } 
           },
           { $unwind: '$order_items' },
           {
               $lookup: {
                   from: 'products',
                   localField: 'order_items.productId',
                   foreignField: '_id',
                   as: 'productInfo'
               }
           },
           { $unwind: '$productInfo' },
           {
               $lookup: {
                   from: 'categories',
                   localField: 'productInfo.category',
                   foreignField: '_id',
                   as: 'categoryInfo'
               }
           },
           { $unwind: '$categoryInfo' },
           {
               $group: {
                   _id: '$categoryInfo._id',
                   name: { $first: '$categoryInfo.name' },
                   total: { $sum: { $multiply: ['$order_items.quantity', '$order_items.price'] } },
                   count: { $sum: '$order_items.quantity' }
               }
           },
           { $sort: { total: -1 } }
       ]);

       // Get recent orders
       const recentOrders = await Order.find()
           .sort({ createdAt: -1 })
           .limit(8)
           .populate('user_id', 'name')
           .lean();

       // Process recent orders data
       const processedRecentOrders = await Promise.all(recentOrders.map(async (order) => {
           // Get product name from first item if it exists
           let productName = "Unknown Product";
           if (order.order_items && order.order_items.length > 0) {
               productName = order.order_items[0].productName || "Unknown Product";
           }

           return {
               id: order._id,
               customer: order.user_id ? order.user_id.name : "Unknown Customer",
               product: productName,
               date: new Date(order.createdAt).toLocaleDateString('en-IN', {
                   year: 'numeric',
                   month: 'short',
                   day: 'numeric'
               }),
               amount: order.finalAmount,
               status: order.status
           };
       }));

       // Calculate percentage changes (month-over-month)
       // Get previous month and current month data
       const currentMonth = currentDate.getMonth() + 1;
       const currentYear = currentDate.getFullYear();
       const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
       const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

       // Fetch current and previous month revenue
       const [currentMonthRevenue, previousMonthRevenue] = await Promise.all([
           Order.aggregate([
               {
                   $match: {
                       createdAt: {
                           $gte: new Date(currentYear, currentMonth - 1, 1),
                           $lt: new Date(currentYear, currentMonth, 1)
                       },
                       status: { $in: ['delivered', 'completed'] }
                   }
               },
               { $group: { _id: null, total: { $sum: '$finalAmount' } } }
           ]),
           Order.aggregate([
               {
                   $match: {
                       createdAt: {
                           $gte: new Date(previousYear, previousMonth - 1, 1),
                           $lt: new Date(previousYear, previousMonth, 0)
                       },
                       status: { $in: ['delivered', 'completed'] }
                   }
               },
               { $group: { _id: null, total: { $sum: '$finalAmount' } } }
           ])
       ]);

       // Calculate revenue change
       const currentMonthRevenueTotal = currentMonthRevenue[0]?.total || 0;
       const previousMonthRevenueTotal = previousMonthRevenue[0]?.total || 0;
       const revenueChange = previousMonthRevenueTotal === 0 ? 100 :
           ((currentMonthRevenueTotal - previousMonthRevenueTotal) / previousMonthRevenueTotal) * 100;

       // Fetch current and previous month orders count
       const [currentMonthOrders, previousMonthOrders] = await Promise.all([
           Order.countDocuments({
               createdAt: {
                   $gte: new Date(currentYear, currentMonth - 1, 1),
                   $lt: new Date(currentYear, currentMonth, 1)
               }
           }),
           Order.countDocuments({
               createdAt: {
                   $gte: new Date(previousYear, previousMonth - 1, 1),
                   $lt: new Date(previousYear, previousMonth, 0)
               }
           })
       ]);

       // Calculate orders change
       const ordersChange = previousMonthOrders === 0 ? 100 :
           ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100;

       // Fetch current and previous month customers count
       const [currentMonthCustomers, previousMonthCustomers] = await Promise.all([
           User.countDocuments({
               createdAt: {
                   $gte: new Date(currentYear, currentMonth - 1, 1),
                   $lt: new Date(currentYear, currentMonth, 1)
               },
               isAdmin: false
           }),
           User.countDocuments({
               createdAt: {
                   $gte: new Date(previousYear, previousMonth - 1, 1),
                   $lt: new Date(previousYear, previousMonth, 0)
               },
               isAdmin: false
           })
       ]);

       // Calculate customers change
       const customersChange = previousMonthCustomers === 0 ? 100 :
           ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100;

       // Format chart data
       const chartData = {
           monthly: {
               labels: last6Months,
               revenue: revenueData,
               orders: ordersData,
               customers: customerData
           },
           category: {
               labels: categoryPerformance.map(cat => cat.name),
               data: categoryPerformance.map(cat => cat.total),
               count: categoryPerformance.map(cat => cat.count)
           }
       };

       // Render dashboard with data
       res.render('dashboard', {
           summary: {
               revenue: totalRevenue[0]?.total || 0,
               customers: totalCustomers,
               orders: totalOrders,
               revenueChange: parseFloat(revenueChange.toFixed(1)),
               ordersChange: parseFloat(ordersChange.toFixed(1)),
               customersChange: parseFloat(customersChange.toFixed(1))
           },
           chartData,
           recentOrders: processedRecentOrders,
           categories: categories.map(cat => ({
               name: cat.name,
               performance: categoryPerformance.find(perf => 
                   perf._id.toString() === cat._id.toString()
               )?.total || 0
           }))
       });

   } catch (error) {
       console.error('Dashboard loading error:', error);
       res.status(500).render('error', { 
           message: 'Error loading dashboard', 
           error: process.env.NODE_ENV === 'development' ? error : {} 
       });
   }
};
const logout = async (req, res) => {
   try {
      req.session.admin = false
         // if (err) {
         //    console.log("Error destroying session", err);
         //    return res.redirect("/pageerror")
         // }
         res.render("admin-login",{message:"Successfully logged out"})
      
   } catch (error) {
      console.log("unexpected error during logout ", error)
      res.redirect('/pageerror')
   }
}

module.exports = {
   loadLogin,
   login,
   loadDashboard,
   logout
}