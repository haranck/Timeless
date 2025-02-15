const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose')
const env = require('dotenv').config()
const { getDiscountPrice } = require("../../helpers/offerHelper");


// const getDiscountPrice = (product) => {
//    let productOffer = product.productOffer || 0;
//    let categoryOffer = product.category?.categoryOffer || 0;

//    let maxOffer = Math.max(productOffer, categoryOffer);
//    let discountedPrice = product.salePrice - (product.salePrice * maxOffer) / 100;

//   return {
//     ...product.toObject(),
//     finalPrice: discountedPrice,
//     appliedOffer: maxOffer,
//     regularPrice: product.regularPrice
//   };
// }

const loadHompage = async (req, res) => {
   try {
      const user = req.session.user;
      const categories = await Category.find({ isListed: true })
      const brands = await Brand.find({isBlocked:false})   
      let productData = await Product.find({
         isListed: true,
         category: { $in: categories.map(category => category._id) }, 
         quantity: { $gt: 0 }
      })
      .populate("category")
      .sort({ createdOn: -1 }).limit(8)

      const processedProducts = productData.map(getDiscountPrice)

      if (user) {
         const userData = await User.findById(user);

         return res.render('home', { user: userData, products: processedProducts ,brands:brands});
      } else {
         return res.render('home', { products: processedProducts,brands:brands})
      }
      
   } catch (error) {
      console.log('error loading home page');
      res.status(500).send('Internal server error');
   }
}

const loadSignup = async (req, res) => {
   try {
      return res.render('signup');
   } catch (error) {
      console.log('error loading signup page');
      res.status(500).send('Internal server error');
   }
}

function generateOtp() {
   return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
   try {
      const transporter = nodemailer.createTransport({
         service: 'gmail',
         port: 587,
         secure: false,
         requireTLS: true,
         auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
         }
      });

      const info = await transporter.sendMail({
         from: process.env.NODEMAILER_EMAIL,
         to: email,
         subject: "Email Verification",
         text: `Your OTP is ${otp}`,
         html: `<b>Your OTP is ${otp}</b>`
      });

      return info.accepted.length > 0;

   } catch (error) {
      console.log("Error sending email:", error);
      return false;
   }
}

const signup = async (req, res) => {
   const { name, email, phone, password } = req.body;

   try {
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
         return res.render('signup', { message: "User already exists with this email" });
      }
      const otp = generateOtp();

      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
         return res.json('email not sent');
      }
      req.session.userOtp = otp
      req.session.userData = { name, phone, email, password }
      res.render('verify-otp')
      console.log('otp sent', otp);

   } catch (error) {
      console.log("Error saving user:", error);
      throw new Error

   }
}

const verifyOtp = async (req, res) => {
   const { otp } = req.body;
   try {
      if (!req.session.userOtp || !req.session.userData) {
         return res.status(400).json({
            success: false,
            message: "Session expired. Please try again."
         });
      }

      if (otp.toString() === req.session.userOtp.toString()) {
         const { name, phone, email, password } = req.session.userData;
         const hashedPassword = await bcrypt.hash(password, 10);

         const saveUserData = new User({
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword
         });

         await saveUserData.save();
         // req.session.user = saveUserData._id;


         // Clear OTP session data after successful verification
         delete req.session.userOtp;
         delete req.session.userData;

         return res.json({
            success: true,
            message: "Email verified successfully!",
            redirectUrl: "/login"
         });
      } else {
         return res.status(400).json({
            success: false,
            message: "Invalid OTP. Please try again."
         });
      }
   } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({
         success: false,
         message: "An error occurred. Please try again."
      });
   }
}

const resendOtp = async (req, res) => {
   try {
      if (!req.session.userData || !req.session.userData.email) {
         return res.status(400).json({
            success: false,
            message: "Session expired. Please try again."
         });
      }

      const { email } = req.session.userData;
      const otp = generateOtp();

      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
         req.session.userOtp = otp;
         console.log("New OTP sent:", otp);
         return res.json({
            success: true,
            message: "OTP sent successfully!"
         });
      } else {
         return res.status(400).json({
            success: false,
            message: "Failed to send OTP. Please try again."
         });
      }
   } catch (error) {
      console.error('Error resending OTP:', error);
      return res.status(500).json({
         success: false,
         message: "An error occurred. Please try again."
      });
   }
}

const loadLogin = async (req, res) => {
   try {
      if (!req.session.user) {
         return res.render('login');
      } else {
         return res.redirect('/');
      }
   } catch (error) {
      res.redirect('/signup');
   }
}

const login = async (req, res) => {
   try {
      const { email, password } = req.body;
      const findUser = await User.findOne({ email: email });
      if (!findUser) {
         return res.render('login', { message: 'User not found' });
      }
      if (findUser.isblocked) {
         return res.render('login', { message: 'User is blocked' });
      }
      if(findUser.isAdmin){
         return res.render('login', { message: 'Admin login not allowed' });
      }

      const passwordMatch = await bcrypt.compare(password, findUser.password);


      if (!passwordMatch) {
         return res.render('login', { message: 'Password does not match' });
      }
      req.session.user = findUser._id;
      res.redirect('/');

   } catch (error) {
      console.log('error login user', error);
      res.render('login', { message: 'Login failed' });
   }
}

const logout = async (req, res) => {
   try {
      req.session.destroy((err) => {
         if (err) {
            console.log('session destruction error', err);
            return res.redirect('/')
         }
         return res.redirect('/login')
      })
   } catch (error) {
      console.log("logout error", error);
      res.redirect('/pageNotFound')
   }
}
const loadShoppingPage = async (req, res) => {
   try {

      const user = req.session.user;
      const categories = await Category.find({ isListed: true })   
      const brands = await Brand.find({isBlocked:false})
      const userData = await User.findOne({ _id: user });
      const brandIds = brands.map(brand => brand._id.toString());
      const categoryIds = categories.filter(category => category.isListed).map(category => category._id);
      const page = parseInt(req.query.page) || 1;
      const limit = 9
      const skip = (page - 1) * limit;
      const query = {
         isListed: true,
         category: { $in: categoryIds },
         quantity: { $gt: 0 },
         // brand: { $in: brandIds }
      }
      // console.log(query)
      const products = await Product.find(query) 
      .populate('category')
      .sort({ createdAt: 1 }).skip(skip).limit(limit)

      const processedProducts = products.map(getDiscountPrice);

      const totalProducts = await Product.countDocuments({
         isListed: true,
         category: { $in: categoryIds },
         quantity: { $gt: 0 },
         // brand: { $in: brandIds }
      })

      const totalPages = Math.ceil(totalProducts / limit);
      const categoriesWithIds = categories.map(category => ({
         _id: category._id.toString(),
         name: category.name,
         description: category.description,
      }));
      const brandsWithIds = brands.map(brand => ({
         _id: brand._id.toString(),
         brandName: brand.brandName,
         brandImage: brand.brandImage
      }));

      res.render('shop', {
         user: userData,
         products: processedProducts,
         categories: categoriesWithIds,
         brands: brandsWithIds,
         category: categories, 
         brand: brands,
         totalProducts: totalProducts,
         currentPage: page,
         totalPages: totalPages
      })

   } catch (error) {
      console.log("load Shop Page error", error);
      throw new Error

   }
}

const filterProducts = async (req, res) => {
   try {
       const { categories, priceRange,searchQuery, sortBy, page = 1 } = req.body;
       const limit = 12; // Products per page
       const skip = (page - 1) * limit;

       let filter = {};

       const listedCategories = await Category.find({ isListed:true}).lean()
       const filteredCategories = listedCategories.filter((cat)=>categories.includes(cat._id.toString()))
       console.log(listedCategories)
       if (filteredCategories && filteredCategories.length > 0) {
           filter.category = { $in: filteredCategories , $ne: null};
       }else{
         filter.category = { $in: listedCategories , $ne: null};
       }

       if (priceRange) {
           const [min, max] = priceRange.split('-').map(Number);
           filter.salePrice = max ? { $gte: min, $lte: max } : { $gte: min };
       }
       if(searchQuery){
           filter.productName = { $regex: searchQuery, $options: 'i' };
       }
       console.log(filter)
       let query = Product.find({isListed:true}).populate('category').find(filter).skip(skip).limit(limit);

       if (sortBy) {
           switch (sortBy) {
               case 'price-low-high':
                   query = query.sort({ salePrice: 1 });
                   break;
               case 'price-high-low':
                   query = query.sort({ salePrice: -1 });
                   break;
               case 'new-arrivals':
                   query = query.sort({ createdAt: -1 });
                   break;
               case 'a-z':
                   query = query.sort({ productName: 1 });
                   break;
               case 'z-a':
                   query = query.sort({ productName: -1 });
                   break;
           }
       }

       const products = await query.exec();
       const processedProducts = products.map(getDiscountPrice);
       const totalProducts = await Product.countDocuments(filter);

       res.json({
           success: true,
           products: processedProducts,
           totalPages: Math.ceil(totalProducts / limit),
           currentPage: page
       });

   } catch (error) {
       console.log("error filtering products", error);
       res.status(500).json({ success: false, message: "Internal server error" });
   }
};

module.exports = {
   loadHompage,
   loadSignup,
   signup,
   verifyOtp,
   resendOtp,
   loadLogin,
   login,
   logout,
   loadShoppingPage,
   filterProducts

}