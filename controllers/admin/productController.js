const product =  require('../../models/productSchema')
const User =  require("../../models/userSchema")
const Category =require('../../models/categorySchema')
const fs = require("fs")
const path = require('path')
const sharp = require('sharp')
const { addCategory } = require('./categoryController')
const Product = require('../../models/productSchema')


const getProductAddPage = async(req,res) =>{
   try {
      
      const category =  await Category.find({isListed:true})
      res.render('product-add',{cat:category})

   } catch (error) {
      res.redirect('/pageerror')
   }
}

                                                                                
const addProducts = async(req,res) =>{
   try {
      console.log("product adding")
      const products =req.body
      const productExists = await product.findOne({
         productName:products.produtsName
      })
      console.log("body", req.body)
      if(!productExists){
         const images = []
         if(req.files&& req.files.length>0){
            for(let i=0;i<req.files.length;i++){
               const originalImagePath = req.files[i].path;

               const resizedImagePath = path.join("public","uploads","product-images",req.files[i].filename)

               await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
              images.push(req.files[i].filename)
            }
          }
         // else{
         //    console.log("yes")
         // }     
         // console.log("images saved")
         const categoryId = await Category.findOne({name:products.category})                                  
         if(!categoryId){
            return res.status(400).json({message:"Category not found"})
         }
         

         const newProduct = new product({
            productName:products.productName,
            description:products.description,
            category:categoryId._id,
            regularPrice:products.regularPrice,
            discountPrice:products.discountPrice,
            salePrice:products.salePrice,
            createdAt:Date.now(),
            productImages:images,
            isListed:products.isListed,
            quantity:products.quantity,
            size:products.size,
            status:"available"
         })
      await newProduct.save();
      return res.redirect('/admin/products')          ////         ////          ////         ////          ////
      }
      else{
         
         const category =  await Category.find({isListed:true})
         return res.render('product-add',{cat:category, message:"product already exists"})
      }


   } catch (error) {
      console.log("error adding product",error)
      res.redirect('/pageerror')
   }
}

const getAllProducts = async (req, res) => {
   try {
      // Extract search query and pagination details
      const search = req.query.search || "";
      const page = Math.max(1, parseInt(req.query.page)) || 1; // Ensure page is a valid positive number
      const limit = 5;

      // Fetch products based on search query and pagination
      const productData = await Product.find({
         $or: [
            { productName: { $regex: new RegExp(".*" + search + ".*", "i") } } // Case-insensitive search
         ]
      })
         .limit(limit)
         .skip((page - 1) * limit)
         .populate('category') // Ensure this matches the schema's `ref` field
         .exec();

      // Count total products matching the search query
      const count = await Product.find({
         $or: [
            { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
         ]
      }).countDocuments();

      // Fetch categories for filtering (optional)
      const category = await Category.find({ isListed: true });

      // Render the products page with data
      res.render('products', {
         data: productData,
         currentPage: page,
         totalPages: Math.ceil(count / limit),
         cat: category,
         searchTerm: search
      });

   } catch (error) {
      console.error("Error in getAllProducts:", error); // Log the error for debugging
      res.redirect('/pageerror');
   }
};

const toggleProductList = async (req, res) => {
   try {
      const productId = req.params.id;
      const { isListed } = req.body;

      // Find the product
      const productToToggle = await Product.findById(productId);

      if (!productToToggle) {
         return res.status(404).json({ 
            error: 'Product not found',
            success: false 
         });
      }

      // Update the isListed status
      productToToggle.isListed = isListed;
      await productToToggle.save();

      // Respond with the updated product status
      res.json({
         message: `Product ${isListed ? 'listed' : 'unlisted'} successfully`,
         isListed: productToToggle.isListed,
         success: true
      });

   } catch (error) {
      console.error("Error toggling product list status:", error);
      res.status(500).json({ 
         error: 'Failed to toggle product status',
         success: false 
      });
   }
};

const getEditProduct = async(req,res)=>{
   try {
      const id =req.query.id
      const product = await Product.findOne({_id:id})
      const category = await Category.find({})
      // console.log(product)
      res.render("edit-product",{
         product:product,
         cat:category
      })
   } catch (error) {
      res.redirect("/pageerror")
   }
}

const editProduct = async (req,res) =>{
   try {
      const id = req.params.id
      console.log(id)
      const product = await Product.findOne({_id:id})
      const data = req.body
      // const category =  await Category.findOne({name:data.category})
      const existingProduct = await Product.findOne({
         productName:data.productName,
         _id:{$ne:id}
      })
      if(existingProduct){
         return res.status(400).json({error:"Product with this name already  exists"})
      }

      const images = []
      if(req.files && req.files.length>0){
         for(let i=0 ;i<req.files.length;i++){
            images.push(req.files[i].filename)
         }
      }

      const updateFields ={
         productName:data.productName,
         description:data.description,
         category: data.category || product.category,
         regularPrice:data.regularPrice,
         salePrice:data.salePrice,
         quantity:data.quantity,

      }
      if(req.files.length>0){
         updateFields.$push={productImage:{$each:images}}
      }
      
      await Product.findByIdAndUpdate(id,updateFields,{new:true})
      res.redirect("/admin/products")

   } catch (error) {
      console.log(error)
      res.redirect("/pageerror")
   }
}

const deleteSingleImage = async (req,res) =>{
   try {
      const {imageNameToServer,productIdToServer} = req.body
      console.log(imageNameToServer, productIdToServer)
      const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
      const imagePath = path.join("public","uploads","re-image",imageNameToServer)
      if(fs.existsSync(imagePath)){
         await fs.unlinkSync(imagePath)
         console.log(`image ${imageNameToServer} deleted successfully`)
      }else{
         console.log(`image ${imageNameToServer} not found`)
      }

      res.send({status:true})
   } catch (error) {
      console.log(error)
      res.redirect("/pageerror")
   }
}

module.exports = {
   getProductAddPage,
   addProducts,
   getAllProducts,
   toggleProductList,
   getEditProduct,
   editProduct,
   deleteSingleImage
}                                             