
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");

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
const verifyPayment = async(req,res)=>{
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature === razorpay_signature) {
            // Store payment details in database
            res.json({ success: true, orderId: razorpay_order_id });
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
