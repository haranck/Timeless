const mongoose = require('mongoose');
const { Schema } = mongoose
const { v4: uuidv4 } = require('uuid');
const Product = require('./productSchema');

const orderSchema = new Schema({
   orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true
   },
   user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
   },
   address_id: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true
   },
   payment_method: {
      type: String,
      enum: ["cod", "razorpay"],
      required: true
   },
   order_items: [{
      productId: {
         type: Schema.Types.ObjectId,
         ref: "Product",
         required: true
      },
      productName: {
         type: String,
         required: true,
      },
      price: {
         type: Number,
         required: true
      },
      quantity: {
         type: Number,
         required: true
      }
   }],
   total: {
      type: Number,
      required: true
   },
   createdAt: {
      type: Date,
      default: Date.now
   },
   discount: {
      type: Number,
      default: 0
   },
   finalAmount: {
      type: Number,
      required: true
   },
   status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled","Return requested", "Return approved","Return rejected", "refunded","failed"],
      default: "pending"
   },
   paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
   },
   
   returnReason:{
      type:String,
      default:null   
   },
   adminReturnStatus:{
      type:String,
      default:null
   },
   invoiceDate: {
      type: Date,
      default: Date.now
   },
   coupenApplied: {
      type: String,
      default: false
   },
   
}, { timestamps: true });



const Order = mongoose.model('Order', orderSchema);
module.exports = Order;