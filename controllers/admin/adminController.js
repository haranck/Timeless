const User = require("../../models/userSchema")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")
const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const moment = require('moment');


const loadLogin = (req, res) => {
   if (req.session.admin) {
      return res.redirect('/admin/');
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
//     try {
//        if (req.session.admin) {
//           return res.render('dashboard')
//        }
//        return res.redirect('/admin/login')
//     } catch (err) {
//        console.log(err)
//        res.redirect('/admin/login')
//     }
// }


const loadDashboard = async (req, res) => {
   try {
       if (!req.session.admin) {
           return res.redirect('/admin/login');
       }
       const orders = await Order.find({ status: { $nin: ["failed"] } })
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName productImages price ')
            .sort({ createdAt: -1 })

       // Get filter from query params, default to monthly
       const timeFilter = req.query.timeFilter || 'weekly';
       
       // Get dashboard data
       const dashboardData = await getDashboardData(timeFilter);
       
       return res.render('dashboard', { dashboardData, orders });
   } catch (err) {
       console.log('Dashboard load error:', err);
       res.status(500).json({ error: 'Internal server error' });
   }
};

// API endpoint to get updated dashboard data
const getDashboardDataAPI = async (req, res) => {
   try {
       const { timeFilter } = req.query;
       if (!timeFilter) {
           return res.status(400).json({ error: 'timeFilter parameter is required' });
       }
       
       const dashboardData = await getDashboardData(timeFilter);
       res.json(dashboardData);
   } catch (err) {
       console.log('Dashboard data API error:', err);
       res.status(500).json({ error: 'Internal server error' });
   }
};

async function getDashboardData(timeFilter) {
   // Get current date
   const currentDate = new Date();
   
   // Set time range based on filter
   let startDate, labels, format, aggregateBy;
   
   switch(timeFilter) {
       case 'weekly':
           startDate = moment().subtract(6, 'days').startOf('day').toDate();
           labels = Array.from({length: 7}, (_, i) => 
               moment().subtract(6 - i, 'days').format('ddd')
           );
           format = '%Y-%m-%d';
           aggregateBy = { day: '$createdAt' };
           break;
       case 'yearly':
           startDate = moment().subtract(5, 'years').startOf('year').toDate();
           labels = Array.from({length: 6}, (_, i) => 
               moment().subtract(5 - i, 'years').format('YYYY')
           );
           format = '%Y';
           aggregateBy = { year: '$createdAt' };
           break;
       case 'monthly':
       default:
           startDate = moment().subtract(5, 'months').startOf('month').toDate();
           labels = Array.from({length: 6}, (_, i) => 
               moment().subtract(5 - i, 'months').format('MMM')
           );
           format = '%Y-%m';
           aggregateBy = { month: '$createdAt' };
   }

   // Get total revenue
   const totalRevenue = await Order.aggregate([
       { $match: { status: { $nin: ['cancelled', 'failed', 'Return approved', 'refunded','pending'] } } },
       { $group: { _id: null, total: { $sum: '$finalAmount' } } }
   ]);

   // Get total customers
   const totalCustomers = await User.countDocuments({ isAdmin: false });

   // Get total orders
   const totalOrders = await Order.countDocuments({ 
       status: { $nin: ['cancelled', 'failed'] } 
   });

   // Get revenue growth percentage compared to previous period
   const previousPeriodStart = moment(startDate).subtract(
       timeFilter === 'weekly' ? 7 : 
       timeFilter === 'yearly' ? 6 : 6, 
       timeFilter === 'weekly' ? 'days' : 
       timeFilter === 'yearly' ? 'years' : 'months'
   ).toDate();
   
   const currentPeriodRevenue = await Order.aggregate([
       { 
           $match: { 
               createdAt: { $gte: startDate, $lte: currentDate },
               status: { $nin: ['cancelled', 'failed', 'Return approved', 'refunded'] }
           } 
       },
       { $group: { _id: null, total: { $sum: '$finalAmount' } } }
   ]);
   
   const previousPeriodRevenue = await Order.aggregate([
       { 
           $match: { 
               createdAt: { $gte: previousPeriodStart, $lt: startDate },
               status: { $nin: ['cancelled', 'failed', 'Return approved', 'refunded'] }
           } 
       },
       { $group: { _id: null, total: { $sum: '$finalAmount' } } }
   ]);

   const revenueGrowth = calculateGrowthPercentage(
       currentPeriodRevenue[0]?.total || 0,
       previousPeriodRevenue[0]?.total || 0
   );

   // Get customer growth percentage
   const currentPeriodCustomers = await User.countDocuments({ 
       createdAt: { $gte: startDate, $lte: currentDate },
       isAdmin: false
   });
   
   const previousPeriodCustomers = await User.countDocuments({ 
       createdAt: { $gte: previousPeriodStart, $lt: startDate },
       isAdmin: false
   });
   
   const customerGrowth = calculateGrowthPercentage(
       currentPeriodCustomers,
       previousPeriodCustomers
   );

   // Get orders growth percentage
   const currentPeriodOrders = await Order.countDocuments({ 
       createdAt: { $gte: startDate, $lte: currentDate },
       status: { $nin: ['cancelled', 'failed'] }
   });
   
   const previousPeriodOrders = await Order.countDocuments({ 
       createdAt: { $gte: previousPeriodStart, $lt: startDate },
       status: { $nin: ['cancelled', 'failed'] }
   });
   
   const orderGrowth = calculateGrowthPercentage(
       currentPeriodOrders,
       previousPeriodOrders
   );

   // Get sales data over time
   const salesByPeriod = await Order.aggregate([
       { 
           $match: { 
               createdAt: { $gte: startDate, $lte: currentDate },
               status: { $nin: ['cancelled', 'failed', 'Return approved', 'refunded'] }
           } 
       },
       {
           $group: {
               _id: timeFilter === 'weekly' 
                   ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                   : timeFilter === 'yearly'
                       ? { $dateToString: { format: '%Y', date: '$createdAt' } }
                       : { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
               total: { $sum: '$finalAmount' }
           }
       },
       { $sort: { '_id': 1 } }
   ]);

   // Get customer signups over time
   const customersByPeriod = await User.aggregate([
       { 
           $match: { 
               createdAt: { $gte: startDate, $lte: currentDate },
               isAdmin: false
           } 
       },
       {
           $group: {
               _id: timeFilter === 'weekly' 
                   ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                   : timeFilter === 'yearly'
                       ? { $dateToString: { format: '%Y', date: '$createdAt' } }
                       : { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
               count: { $sum: 1 }
           }
       },
       { $sort: { '_id': 1 } }
   ]);

   // Get orders over time
   const ordersByPeriod = await Order.aggregate([
       { 
           $match: { 
               createdAt: { $gte: startDate, $lte: currentDate },
               status: { $nin: ['cancelled', 'failed'] }
           } 
       },
       {
           $group: {
               _id: timeFilter === 'weekly' 
                   ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                   : timeFilter === 'yearly'
                       ? { $dateToString: { format: '%Y', date: '$createdAt' } }
                       : { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
               count: { $sum: 1 }
           }
       },
       { $sort: { '_id': 1 } }
   ]);

   // Get category performance
   const categoryPerformance = await Order.aggregate([
       { 
           $match: { 
               status: { $nin: ['cancelled', 'failed', 'Return approved', 'refunded'] }
           } 
       },
       { $unwind: '$order_items' },
       {
           $lookup: {
               from: 'products',
               localField: 'order_items.productId',
               foreignField: '_id',
               as: 'productDetails'
           }
       },
       { $unwind: '$productDetails' },
       {
           $lookup: {
               from: 'categories',
               localField: 'productDetails.category',
               foreignField: '_id',
               as: 'categoryDetails'
           }
       },
       { $unwind: '$categoryDetails' },
       {
           $group: {
               _id: '$categoryDetails._id',
               categoryName: { $first: '$categoryDetails.name' },
               totalSales: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
           }
       },
       { $sort: { totalSales: -1 } },
       { $limit: 5 }
   ]);

   // Get recent orders
   const recentOrders = await Order.aggregate([
       { $sort: { createdAt: -1 } },
       { $limit: 5 },
       {
           $lookup: {
               from: 'users',
               localField: 'user_id',
               foreignField: '_id',
               as: 'userDetails'
           }
       },
       { $unwind: '$userDetails' },
       {
           $project: {
               orderId: 1,
               customer: '$userDetails.name',
               product: { $arrayElemAt: ['$order_items.productId.productName', 0] },
               // productImages: { $arrayElemAt: ['$order_items.productId.productImages', 0] } ,
               date: '$createdAt',
               amount: '$finalAmount',
               status: 1
           }
       }
   ]);

   // Map data to chart format with labels
   const salesData = mapDataToLabels(salesByPeriod, labels, timeFilter, 'total');
   const customersData = mapDataToLabels(customersByPeriod, labels, timeFilter, 'count');
   const ordersData = mapDataToLabels(ordersByPeriod, labels, timeFilter, 'count');

   // Prepare category data
   const categoryLabels = categoryPerformance.map(cat => cat.categoryName);
   const categoryData = categoryPerformance.map(cat => cat.totalSales);

   return {
       summary: {
           totalRevenue: totalRevenue[0]?.total || 0,
           totalCustomers,
           totalOrders,
           revenueGrowth,
           customerGrowth,
           orderGrowth
       },
       sales: {
           labels,
           data: salesData
       },
       customers: {
           labels,
           data: customersData
       },
       orders: {
           labels,
           data: ordersData
       },
       categories: {
           labels: categoryLabels,
           data: categoryData
       },
       recentOrders
   };
}

// Helper function to calculate growth percentage
function calculateGrowthPercentage(current, previous) {
   if (previous === 0) return current > 0 ? 100 : 0;
   return Number(((current - previous) / previous * 100).toFixed(1));
}

// Helper function to map database results to chart labels
function mapDataToLabels(data, labels, timeFilter, valueField) {
   const result = [];
   const dataMap = new Map();
   
   // Convert data array to map for easy lookup
   data.forEach(item => {
       let key;
       if (timeFilter === 'weekly') {
           // Extract day of week from YYYY-MM-DD
           key = moment(item._id).format('ddd');
       } else if (timeFilter === 'yearly') {
           key = item._id; // Already in YYYY format
       } else {
           // Convert YYYY-MM to month name
           key = moment(item._id, 'YYYY-MM').format('MMM');
       }
       dataMap.set(key, item[valueField]);
   });
   
   // Fill in data for each label
   labels.forEach(label => {
       result.push(dataMap.get(label) || 0);
   });
   
   return result;
}


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
   logout,
   getDashboardDataAPI
}