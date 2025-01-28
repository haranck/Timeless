const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth, adminAuth, isBlocked } = require("../middlewares/auth")
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')


router.get('/', isBlocked, userController.loadHompage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//shoopp

router.get("/shop", userController.loadShoppingPage)
router.get("/filter",isBlocked , userController.filterProduct)

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



module.exports = router;