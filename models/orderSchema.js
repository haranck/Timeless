const mongoose = require('mongoose');
const {Schema} = mongoose.Schema;
const {v4: uuidv4} = require('uuid');
const Product = require('./productSchema');

const orderSchema = new Schema({
   orderId:{
      type: String,
      default:()=> uuidv4(),
      unique: true
   },
   orderedItems:[{
      Product:{
         type: Schema.Types.ObjectId,
         ref: "Product",
         required: true
      },
      quantity:{
         type: Number,
         required: true
      },
      price:{
         type: Number,
         required: true
      }

   }],
   totalPrice:{
      type: Number,
      required: true
   },
   discount:{
      type: Number,
      default:0
   },
   finalAmount:{
      type: Number,
      required: true
   },
   address:{
      type:Schema.Types.ObjectId,
      ref:"User",
      required: true
   },
   invoiceDate:{
      type: Date
   },
   status:{
      type: String,
      enum:["pending","shipped","delivered","cancelled","returned","refunded","processing"],
   },
   createdOn:{
      type: Date,
      default: Date.now,
      required:true
   },
   coupenApplied:{
      type: String,
      default: false
   }
})   

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;