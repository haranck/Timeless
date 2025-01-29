const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth, adminAuth, isBlocked } = require("../middlewares/auth")
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const cartController = require("../controllers/user/cartController");


router.get('/', isBlocked, userController.loadHompage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//shoopp

router.get("/shop", userController.loadShoppingPage)
router.post("/filter",isBlocked , userController.filterProducts)

//product management

router.get('/productDetails', userAuth, productController.productDetails)


//google auth

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.session.passport.user
    res.redirect('/')
})

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get('/logout', userController.logout)

//profile mgt

router.get("/forgot-password", profileController.getForgotPassPage) /// ? ? ? ? ? ? 
router.post("/forgot-email-valid", profileController.forgotEmailValid)
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp)
router.get("/reset-password", profileController.getResetPassPage)
router.post("/resend-forgot-otp", profileController.resendtOTP)
router.post("/reset-password", profileController.postNewPassword)
router.get('/userProfile', userAuth, profileController.userProfile)
router.get('/change-email', userAuth, profileController.changeEmail)
router.post('/change-email', userAuth, profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth, profileController.verifyEmailOtp)
router.post("/update-email", userAuth, profileController.updateEmail)
router.get('/change-password', userAuth, profileController.changePassword)
router.post('/change-password', userAuth, profileController.changePasswordValid)
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp)


//address management

router.get("/addAddress", userAuth, profileController.addAddress)
router.post("/addAddress", userAuth, profileController.postAddAddress)


// Cart Management
router.get("/cart", userAuth, cartController.getCartPage);
router.post("/addToCart", userAuth, cartController.addToCart);





module.exports = router;