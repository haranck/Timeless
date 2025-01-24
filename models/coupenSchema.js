const mongoose = require('mongoose');
const {Schema} = mongoose.Schema;

const coupenSchema = new Schema({
   name:{
      type: String,
      required: true,
      unique: true
   },
   createdOn:{
      type: Date,
      default: Date.now,
      required: true
   },
   expiredOn:{
      type: Date,
      required: true
   },
   offerPrice:{
      type: Number,
      required: true
   },
   minimumPrice:{
      type: Number,
      required: true
   },
   isList:{
      type: Boolean,
      default: true
   },
   userId:[{
      type: Schema.Types.ObjectId,
      ref: "User"
   }]
})   

const Coupen = mongoose.model('Coupen', coupenSchema);
module.exports = Coupen;