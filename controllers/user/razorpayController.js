
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const options = {
            amount: amount * 100, // Convert to paisa
            currency,
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1,
            
        };

        const order = await razorpayInstance.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, error: "Failed to create order" });
    }
};

const verifyPayment = async(req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            shippingAddress,
            orderedItems,
            totalAmount,
            couponCode 
        } = req.body;

        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        // Parse orderedItems if it's a string
        const parsedOrderItems = typeof orderedItems === 'string' ? JSON.parse(orderedItems) : orderedItems;

        // Transform the order items to match schema
        const transformedOrderItems = parsedOrderItems.map(item => ({
            productId: item.productId._id,
            productName: item.productId.productName,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }));

        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature === razorpay_signature) {
            const newOrder = new Order({
                user_id: req.session.user,
                address_id: shippingAddress,
                payment_method: "razorpay",
                order_items: transformedOrderItems,
                total: totalAmount,
                finalAmount: totalAmount,
                status: "pending",
                couponApplied: couponCode ? true : false,
                razorpay_order_id,
                razorpay_payment_id
            });

            const savedOrder = await newOrder.save();
            const cart = await Cart.findOne({ userId: req.session.user });
            if (!cart) {
                cart = new Cart({
                    userId: req.session.user,
                    items: [],
                    cartTotal: 0
                });
            }
            
            
            res.json({ 
                success: true, 
                orderId: savedOrder._id
            });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Failed to verify payment" });
    }
}

module.exports = { 
    verifyPayment,
    createOrder 
};
