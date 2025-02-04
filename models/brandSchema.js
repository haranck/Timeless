const mongoose = require('mongoose');
const {Schema} = mongoose

const brandSchema = new Schema({
   brandName:{
      type: String,
      required: true
   },
   isBlocked:{
      type: Boolean,
      default: false
   },
   brandImage:{
      type: String,
      required: true
   },
   products:[{
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
   }],
   createdAt:{
      type: Date,
      default: Date.now
   }
})
const brand = mongoose.model('Brand', brandSchema);   
module.exports = brand;