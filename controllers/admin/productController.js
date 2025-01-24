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

const editProduct = async (req, res) => {
   try {
      const id = req.params.id
      const data = req.body
      const files = req.files

      console.log('Edit Product Request:', {
         productId: id,
         body: JSON.stringify(data),
         files: files ? files.map(f => ({
            fieldname: f.fieldname,
            filename: f.filename, 
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size
         })) : 'No files',
         fileCount: files ? files.length : 0
      })

      // Validate required fields
      if (!data.productName || !data.category) {
         return res.status(400).json({
            status: false, 
            message: 'Product Name and Category are required'
         })
      }

      // Find the existing product
      const existingProduct = await Product.findById(id)
      if(!existingProduct){
         return res.status(404).json({status:false, message:"Product not found"})
      }

      // Prepare update fields
      const updateFields = {
         productName: data.productName,
         description: data.description || existingProduct.description,
         category: data.category,
         regularPrice: data.regularPrice || existingProduct.regularPrice,
         salePrice: data.salePrice || existingProduct.salePrice,
         quantity: data.quantity || existingProduct.quantity,
      }

      // Handle image uploads
      if(files && files.length > 0){
         // Validate file types and sizes
         const validImageTypes = ['image/jpeg', 'image/png', 'image/gif']
         const maxFileSize = 5 * 1024 * 1024 // 5MB

         const validFiles = files.filter(file => {
            const isValidType = validImageTypes.includes(file.mimetype)
            const isValidSize = file.size <= maxFileSize
            
            if (!isValidType) {
               console.warn(`Invalid file type: ${file.originalname}`)
            }
            if (!isValidSize) {
               console.warn(`File too large: ${file.originalname}`)
            }
            
            return isValidType && isValidSize
         })

         console.log('Image Validation:', {
            totalFiles: files.length,
            validFiles: validFiles.length,
            validFileNames: validFiles.map(f => f.filename)
         })

         if (validFiles.length > 0) {
            // Generate image names
            const images = validFiles.map(file => file.filename)
            
            // Directly set or push images
            if (!existingProduct.productImages || existingProduct.productImages.length === 0) {
               updateFields.productImages = images;
            } else {
               // Ensure we don't exceed a reasonable number of images (e.g., 10)
               const totalImages = existingProduct.productImages.length + images.length;
               const maxAllowedImages = 10;
               
               if (totalImages > maxAllowedImages) {
                  return res.status(400).json({
                     status: false, 
                     message: `Maximum ${maxAllowedImages} images allowed per product`
                  })
               }

               // Push new images
               updateFields.$push = { 
                  productImages: { 
                     $each: images,
                     // Optional: limit total images if needed
                     $slice: -maxAllowedImages 
                  } 
               }
            }
         } else {
            return res.status(400).json({
               status: false, 
               message: 'No valid images uploaded. Check file types and sizes.'
            })
         }
      }
      
      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(
         id, 
         updateFields, 
         { 
            new: true,  // Return the updated document
            runValidators: true  // Run model validations
         }
      )
      
      console.log('Product Update Result:', {
         productId: updatedProduct._id,
         totalImages: updatedProduct.productImages ? updatedProduct.productImages.length : 0,
         newImages: updateFields.$push ? updateFields.$push.productImages.$each : (updateFields.productImages || 'No new images')
      })

      // Always return JSON for AJAX requests
      return res.status(200).json({
         status: true, 
         message: 'Product updated successfully', 
         product: updatedProduct
      })

   } catch (error) {
      console.error('Comprehensive Error in editProduct:', {
         name: error.name,
         message: error.message,
         stack: error.stack
      })
      
      // Detailed JSON error response
      return res.status(500).json({
         status: false, 
         message: error.message || 'Internal server error', 
         errorDetails: {
            name: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
         }
      })
   }
}

const deleteSingleImage = async (req,res) =>{
   try {
      const {imageNameToServer, productIdToServer} = req.body
      console.log('Attempting to delete image:', imageNameToServer, 'for product:', productIdToServer)

      // Find the existing product
      const product = await Product.findById(productIdToServer)
      if (!product) {
         return res.status(404).send({status: false, message: 'Product not found'})
      }

      console.log('Current product images before deletion:', product.productImages)

      // Remove the image from the product's images array
      const imageRemoved = await Product.findByIdAndUpdate(
         productIdToServer, 
         { $pull: { productImages: imageNameToServer } }, 
         { new: true }
      )

      if (!imageRemoved) {
         console.error('Failed to remove image from product')
         return res.status(400).send({status: false, message: 'Failed to remove image from product'})
      }

      console.log('Product images after deletion:', imageRemoved.productImages)

      // Delete the image file from the server
      // Try multiple potential paths
      const imagePaths = [
         path.join("public", "uploads", "re-image", imageNameToServer),
         path.join("public", "uploads", "products", imageNameToServer),
         path.join("uploads", "re-image", imageNameToServer),
         path.join("uploads", "products", imageNameToServer)
      ]

      let imageDeleted = false
      for (const imagePath of imagePaths) {
         try {
            if (fs.existsSync(imagePath)) {
               fs.unlinkSync(imagePath)
               console.log(`Image ${imageNameToServer} deleted from ${imagePath}`)
               imageDeleted = true
               break
            }
         } catch (fileError) {
            console.error(`Error deleting image from ${imagePath}:`, fileError)
         }
      }

      if (!imageDeleted) {
         console.log(`Image file ${imageNameToServer} not found in any of the checked paths`)
      }

      res.send({
         status: true, 
         message: 'Image deleted successfully',
         remainingImages: imageRemoved.productImages || []
      })
   } catch (error) {
      console.error('Comprehensive error in deleteSingleImage:', error)
      console.error('Error details:', {
         name: error.name,
         message: error.message,
         stack: error.stack
      })
      res.status(500).send({
         status: false, 
         message: 'Internal server error', 
         errorDetails: error.message
      })
   }
}

const deleteProduct = async (req, res) => {
   try {
      const productId = req.params.id;

      // Find the product first to check if it exists
      const product = await Product.findById(productId);
      
      if (!product) {
         return res.status(404).json({
            status: false,
            message: 'Product not found'
         });
      }

      // Delete product images from file system if they exist
      if (product.productImages && product.productImages.length > 0) {
         const fs = require('fs');
         const path = require('path');
         
         product.productImages.forEach(imageName => {
            const imagePath = path.join(__dirname, '../../public/uploads/products', imageName);
            
            // Check if file exists before attempting to delete
            if (fs.existsSync(imagePath)) {
               try {
                  fs.unlinkSync(imagePath);
                  console.log(`Deleted image: ${imageName}`);
               } catch (error) {
                  console.error(`Error deleting image ${imageName}:`, error);
               }
            }
         });
      }

      // Delete the product from the database
      await Product.findByIdAndDelete(productId);

      // Return success response
      return res.status(200).json({
         status: true,
         message: 'Product deleted successfully'
      });

   } catch (error) {
      console.error('Error deleting product:', {
         name: error.name,
         message: error.message,
         stack: error.stack
      });

      return res.status(500).json({
         status: false,
         message: error.message || 'Internal server error',
         errorDetails: process.env.NODE_ENV === 'development' ? { 
            name: error.name, 
            stack: error.stack 
         } : undefined
      });
   }
};

module.exports = {
   getProductAddPage,
   addProducts,
   getAllProducts,
   toggleProductList,
   getEditProduct,
   editProduct,
   deleteSingleImage,
   deleteProduct
}                                             