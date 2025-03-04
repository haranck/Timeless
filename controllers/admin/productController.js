const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const fs = require("fs")
const path = require('path')
const sharp = require('sharp')
const { addCategory } = require('./categoryController')
const Product = require('../../models/productSchema')
const { isBlocked } = require('../../middlewares/auth')
const Brand = require('../../models/brandSchema')


const getProductAddPage = async (req, res) => {
   try {

      const category = await Category.find({ isListed: true })
      const brand = await Brand.find({ isBlocked: false })
      res.render('product-add', { cat: category, brand: brand })

   } catch (error) {
      res.redirect('/pageerror')
   }
}


const addProducts = async (req, res) => {
   try {
      const products = req.body;
      
      // Check if product exists using the correct field name
      const productExists = await product.findOne({
         productName: products.productName  // Fixed field name
      });

      if (!productExists) {
         const images = [];
         
         // Process images if any were uploaded
         if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
               const originalImagePath = req.files[i].path;
               const resizedImagePath = path.join("public", "uploads", "product-images", `resized-${req.files[i].filename}`);

               try {
                  // Resize and save image
                  await sharp(originalImagePath)
                     .resize({ width: 440, height: 440 })
                     .toFile(resizedImagePath);
                  
                  images.push(req.files[i].filename);
               } catch (imgError) {
                  console.error("Error processing image:", imgError);
                  // Continue with other images even if one fails
               }
            }
         }

         // Validate category
         const categoryId = await Category.findOne({ name: products.category });
         if (!categoryId) {
            const category = await Category.find({ isListed: true });
            const brand = await Brand.find({ isBlocked: false });
            return res.render('product-add', { 
               cat: category, 
               brand: brand, 
               message: "Category not found"
            });
         }
         
         // Validate brand
         const brandId = await Brand.findOne({ brandName: products.brand });
         if (!brandId) {
            const category = await Category.find({ isListed: true });
            const brand = await Brand.find({ isBlocked: false });
            return res.render('product-add', { 
               cat: category, 
               brand: brand, 
               message: "Brand not found"
            });
         }

         // Validate required fields - server side validation
         if (!products.productName || !products.description || !products.regularPrice) {
            const category = await Category.find({ isListed: true });
            const brand = await Brand.find({ isBlocked: false });
            return res.render('product-add', { 
               cat: category, 
               brand: brand, 
               message: "All required fields must be filled"
            });
         }

         // Validate image count
         if (images.length < 3) {
            const category = await Category.find({ isListed: true });
            const brand = await Brand.find({ isBlocked: false });
            return res.render('product-add', { 
               cat: category, 
               brand: brand, 
               message: "At least 3 product images are required"
            });
         }

         // Create new product
         const newProduct = new product({
            productName: products.productName,
            description: products.description,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice || products.regularPrice, // Default to regular price if sale price is not provided
            discountPrice: products.discountPrice,
            createdAt: Date.now(),
            productImages: images,
            isListed: products.isListed !== undefined ? products.isListed : true, // Default to true if not specified
            quantity: products.quantity || 0, // Default to 0 if not specified
            brand: brandId._id,
            status: "available",
         });

         await newProduct.save();
         return res.redirect('/admin/products');
      } else {
         const category = await Category.find({ isListed: true });
         const brand = await Brand.find({ isBlocked: false });
         return res.render('product-add', { 
            cat: category,
            brand: brand, 
            message: "Product already exists"
         });
      }
   } catch (error) {
      console.log("Error adding product", error);
      
      // Provide more detailed error message
      const category = await Category.find({ isListed: true }).catch(e => []);
      const brand = await Brand.find({ isBlocked: false }).catch(e => []);
      
      return res.render('product-add', { 
         cat: category,
         brand: brand, 
         message: "Error adding product: " + error.message
      });
   }
};

const getAllProducts = async (req, res) => {
   try {

      const search = req.query.search || "";
      const page = Math.max(1, parseInt(req.query.page)) || 1;
      const limit = 5


      const productData = await Product.find({
         $or: [
            { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            
         ]
      })
         .limit(limit)
         .skip((page - 1) * limit)
         .populate('category') // Ensure this matches the schema's `ref` field
         .exec();


      const count = await Product.find({
         $or: [
            { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
         ]
      }).countDocuments();


      const category = await Category.find({ isListed: true });
      const brand = await Brand.find({ isBlocked: false });


      res.render('products', {
         data: productData,
         currentPage: page,
         totalPages: Math.ceil(count / limit),
         cat: category,
         searchTerm: search,
         brand: brand
      });

   } catch (error) {
      console.error("Error in getAllProducts:", error);
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
      productToToggle.isListed = isListed;
      await productToToggle.save({validateBeforeSave:false});


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

const getEditProduct = async (req, res) => {
   try {
      const id = req.query.id;
      if (!id) {
          return res.redirect('/admin/products');
      }

      const product = await Product.findById(id).populate('category');
      if (!product) {
          return res.redirect('/admin/products');
      }

      const categories = await Category.find({});
      
      res.render("edit-product", {
          product,
          cat: categories,
          message: ''
      });
  } catch (error) {
      console.error("Error in getEditProduct:", error);
      res.redirect("/admin/products");
  }
}

const editProduct = async (req, res) => {
   try {
      const id = req.params.id;
      const data = req.body;
      let deletedImages = [];
      
      try {
         deletedImages = data.deletedImages ? JSON.parse(data.deletedImages) : [];
      } catch (error) {
         console.error('Error parsing deletedImages:', error);
      }

      if (!data.productName || !data.category || !data.regularPrice || !data.salePrice) {
         return res.status(400).json({
            success: false, 
            message: 'Product Name, Category, Regular Price, and Sale Price are required'
         });
      }

      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
         return res.status(404).json({
            success: false, 
            message: "Product not found"
         });
      }

      const regularPrice = parseFloat(data.regularPrice);
      const salePrice = parseFloat(data.salePrice);
      
      if (isNaN(regularPrice) || isNaN(salePrice) || regularPrice <= 0 || salePrice <= 0) {
         return res.status(400).json({
            success: false, 
            message: 'Invalid price values'
         });
      }
      
      const categoryId = await Category.findOne({ name: data.category });
      if (!categoryId) {
         return res.status(400).json({
            success: false, 
            message: 'Category not found'
         });
      }

      // Handle remaining images after deletion
      const remainingImages = existingProduct.productImages.filter(
         image => !deletedImages.includes(image)
      );

      // Process uploaded files (req.files) - ONLY if not using cropped images
      const newImages = [];
      if (req.files && req.files.length > 0 && !Object.keys(data).some(key => key.startsWith('croppedImage'))) {
         for (let i = 0; i < req.files.length; i++) {
            const originalImagePath = req.files[i].path;
            const resizedImagePath = path.join("public", "uploads", "product-images", `resized-${req.files[i].filename}`);

            await sharp(originalImagePath)
               .resize({ width: 440, height: 440 })
               .toFile(resizedImagePath);

            newImages.push(`resized-${req.files[i].filename}`);
         }
      }

      // Process cropped images (base64 data)
      const croppedImages = [];
      for (let i = 1; i <= 4; i++) {
         const croppedImageKey = `croppedImage${i}`;
         if (data[croppedImageKey]) {
            const base64Data = data[croppedImageKey].replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `cropped-${Date.now()}-${i}.jpg`;
            const filepath = path.join("public", "uploads", "product-images", filename);
            
            await fs.promises.writeFile(filepath, buffer);
            croppedImages.push(filename);
         }
      }

      // Combine remaining and new images
      const updatedImages = [...remainingImages, ...newImages, ...croppedImages];

      // Validate total image count 
      if (updatedImages.length < 3 || updatedImages.length > 4) {
         return res.status(400).json({
            success: false, 
            message: 'You must have between 3 and 4 images'
         });
      }

      // Update product details
      existingProduct.productName = data.productName;
      existingProduct.description = data.description;
      existingProduct.category = categoryId._id;
      existingProduct.regularPrice = regularPrice;
      existingProduct.salePrice = salePrice;
      existingProduct.quantity = data.quantity;
      existingProduct.size = data.size;
      existingProduct.isListed = data.isListed === 'true';
      existingProduct.productImages = updatedImages;

      // Save the updated product
      await existingProduct.save();

      // Delete old images
      for (const imageName of deletedImages) {
         try {
            const imagePath = path.join("public", "uploads", "product-images", imageName);
            await fs.promises.unlink(imagePath);
         } catch (unlinkError) {
            console.error(`Error deleting image ${imageName}:`, unlinkError);
         }
      }

      return res.status(200).json({
         success: true, 
         message: "Product updated successfully"
      });

   } catch (error) {
      console.error("Error editing product:", error);
      return res.status(500).json({
         success: false, 
         message: error.message
      });
   }
}


const deleteSingleImage = async (req, res) => {
   try {
      const { imageNameToServer, productIdToServer } = req.body

      //Finding  exist cheytha product
      const product = await Product.findById(productIdToServer)
      if (!product) {
         return res.status(404).send({ status: false, message: 'Product not found' })
      }


      // Remove the image from the product's images array
      const imageRemoved = await Product.findByIdAndUpdate(
         productIdToServer,
         { $pull: { productImages: imageNameToServer } },
         { new: true }
      )

      if (!imageRemoved) {
         console.error('Failed to remove image from product')
         return res.status(400).send({ status: false, message: 'Failed to remove image from product' })
      }

      console.log('Product images after deletion:', imageRemoved.productImages)


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
const addProductOffer = async (req, res) => {
   try {
       const { productId, offerPercentage,endDate } = req.body;
       
       const product = await Product.findByIdAndUpdate(productId, {
           productOffer: offerPercentage,
         //   offerStartDate: startDate,
           offerEndDate: endDate
       }, { new: true });

       if (!product) {
           return res.status(404).json({ success: false, message: 'Product not found' });
       }

       res.json({ success: true, product });
   } catch (error) {
       console.error('Error adding product offer:', error);
       res.status(500).json({ success: false, message: 'Failed to add offer' });
   }
};

const deleteProductOffer = async (req, res) => {
   try {
       const { productId } = req.body;
       
       const product = await Product.findByIdAndUpdate(productId, {
           productOffer: 0,
         //   offerStartDate: null,
           offerEndDate: null
       }, { new: true });

       if (!product) {
           return res.status(404).json({ success: false, message: 'Product not found' });
       }

       res.json({ success: true, product });
   } catch (error) {
       console.error('Error deleting product offer:', error);
       res.status(500).json({ success: false, message: 'Failed to delete offer' });
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
   deleteProduct,
   addProductOffer,
   deleteProductOffer
}                                             