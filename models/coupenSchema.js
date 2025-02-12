const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    couponType: {
        type: String,
        required: true,
        enum: ["percentage", "fixed"]
    },
    couponDiscount: {
        type: Number,
        required: true
    },
    couponValidity: {
        type: Date,
        required: true
    },
    couponMinAmount: {
        type: Number,
        required: true
    },
    couponMaxDiscount: {  //// Optional
        type: Number,
        required: false
    },
    couponDescription: {  //// Optional
        type: String,
        required: false
    },
    // couponImage: {
    //     type: String, // Store image URL
    //     default: null // Optional
    // },
    isActive: {
        type: Boolean,
        default: true
    },
    limit: {
        type: Number,
        default: 1 // How many times a user can use this coupon
    },
    usageCount: {
        type: Number,
        default: 0 // Track how many times this coupon has been used
    },
    createdDate: {
        type: Date,
        default: Date.now
    }
})

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon