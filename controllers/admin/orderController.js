const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const { default: mongoose } = require('mongoose')
const Wallet = require('../../models/walletSchema')

const getOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 5 
        const skip = (page - 1)*limit
        const count = await Order.countDocuments()
        const totalPages = Math.ceil(count/limit)

        const orders = await Order.find()
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName productImages price ')
            .sort({ createdAt: -1 }).skip(skip).limit(limit)
        

        // console.log(JSON.stringify(orders, null, 2));

        const returnRequests = orders.filter(order => order.status === 'Return requested');


        res.render('order-mgt', {
            orders,
            returnRequests,
            currentPage:page,
            totalPages
        })

    } catch (error) {
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const updateOrder = async (req, res) => {

    try {
        const { orderId, status } = req.body

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "order ID and status are required" })
        }

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true })

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "order not found" })
        }

        await updatedOrder.save()

        res.status(200).json({ success: true, message: "order updated successfully" })

    } catch (error) {
        console.log("error updating order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }

}

const cancelOrder = async (req, res) => {

    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        await Order.findByIdAndUpdate(orderId, {status:'cancelled'})


        res.status(200).json({ success: true, message: "order deleted successfully" })

    } catch (error) {
        console.log("error deleting order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }

}

const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findByIdAndUpdate(orderId, {status:'Return approved'})

        const userId = order.user_id

        for (let item of order.order_items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += order.total;
        wallet.transactions.push({
            type: 'credit',
            amount: order.total,
            description: `Refund for returned order`,
            status: 'completed'
        });

        await wallet.save();

        

        res.status(200).json({ success: true, message: "Return approved" })             
    } catch (error) {
        console.log("error approving return", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const rejectReturn = async (req, res) => {
    try {
        const {reason} = req.body
        const orderId = req.params.orderId
        console.log("Rejecting return with reason:", reason);
        console.log("Order ID:", orderId);

        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findById(orderId)
        if(!order){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        order.status = "Return rejected"
        order.adminReturnStatus =  reason

        await order.save()

        res.status(200).json({ success: true, message: "Return rejected" })         
    } catch (error) {
        console.log("error rejecting return", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const getSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit; 

        const totalOrders = await Order.countDocuments(); 
        const totalPages = Math.ceil(totalOrders / limit); 

        const orders = await Order.find({})
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

        res.render('sales', { 
            orders, 
            totalSales, 
            totalOrders, 
            currentPage: page, 
            totalPages 
        });

    } catch (error) {
        console.log("Error getting sales report", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



module.exports = {
    getOrdersPage,
    updateOrder,
    cancelOrder,
    approveReturn,
    cancelOrder,
    approveReturn,
    rejectReturn,
    getSalesReport
}

