const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const { default: mongoose } = require('mongoose')

const getOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 5 
        const skip = (page - 1)*limit
        const count = await Order.countDocuments()
        const totalPages = Math.ceil(count/limit)

        const orders = await Order.find()
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName productImages price')
            .sort({ createdAt: -1 }).skip(skip).limit(limit)
        

        // console.log(JSON.stringify(orders, null, 2));

        res.render('order-mgt', {
            orders,
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

module.exports = {
    getOrdersPage,
    updateOrder,
    cancelOrder
}

