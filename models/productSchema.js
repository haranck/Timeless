const mongoose = require('mongoose');
const {Schema} = mongoose

const productSchema = new Schema({
   productName: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate product names
   },
   regularPrice: {
      type: Number,
      required: true,
   },
   salePrice: {
      type: Number,
      required: true,
   },
   description: {
      type: String,
      required: true,
   },
   category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
   },
   quantity: {
      type: Number,
      default: 0, // Corrected from `default: true`
   },
   productImages: [{ // Changed `images` to `productImages` for consistency
      type: String,
      required: true,
   }],
   createdAt: {
      type: Date,
      default: Date.now,
   },
   isListed: {
      type: Boolean,
      default: false,
   },
   status: {
      type: String,
      enum: ["available", "out of stock", "Discontinued"],
      required: true,
      default: "available",
   },
}, { timestamps: true });


// const productSchema = new Schema({
//    productName:{
//       type: String,
//       required: true
//    },
//    regularPrice:{
//       type: Number,
//       required: true
//    },
//    salePrice:{
//       type: Number,
//       required: true
//    },
//    description:{
//       type: String,
//       required: true
//    },
//    category:{
//       type: Schema.Types.ObjectId,
//       ref: "Category",
//       required: true
//    },
//    // productOffer:{
//    //    type: Number,
//    //    default:true
//    // },
//    quantity:{
//       type: Number,
//       default: true
//    },
//    images:[{
//       type: String,
//       required: true
//    }],
//    createdAt:{
//       type: Date,
//       default: Date.now
//    },
//    isBlocked:{
//       type: Boolean,
//       default: false
//    },
//    status:{
//       type: String,
//       enum:["availble","out of stock","Discontinued"],
//       required: true,
//       default: "availble"
//    },
// },{timestamps: true})

const Product = mongoose.model('Product', productSchema);
module.exports = Product;