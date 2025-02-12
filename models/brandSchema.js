const mongoose = require('mongoose');
const {Schema} = mongoose.Schema;

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
   createdAt:{
      type: Date,
      default: Date.now
   }
})
const brand = mongoose.model('Brand', brandSchema);   
module.exports = brand;