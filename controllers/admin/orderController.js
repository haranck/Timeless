const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const { default: mongoose } = require('mongoose')

const getOrdersPage= async (req, res) => {
    try {

        const orders = await Order.find()
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId','productName productImages price')
            .sort({ createdAt: -1 })

        console.log(JSON.stringify(orders, null, 2));

        res.render('order-mgt',{orders})

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const updateOrder = async (req, res) => {

    try {
        const {orderId,status} = req.body

        const updatedOrder = await Order.findByIdAndUpdate(orderId,{status},{new:true})

        if(!updatedOrder){
            return res.status(404).json({success:false, message:"order not found"})
        }

        res.status(200).json({success:true, message:"order updated successfully"})
    } catch (error) {
        console.log("error updating order",error)
        res.status(500).json({success:false, message:"internal server error"})
    }
    
}


module.exports = {
    getOrdersPage,
    updateOrder
}

