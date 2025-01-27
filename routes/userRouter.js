const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth, adminAuth, isBlocked } = require("../middlewares/auth")
const productController = require('../controllers/user/productController')



router.get('/', isBlocked, userController.loadHompage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//shoopp

router.get("/shop", userController.loadShoppingPage)

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


module.exports = router;