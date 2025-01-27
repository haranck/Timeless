const express = require('express');
const router = express.Router();
const multer = require('multer')
const path = require('path')
const adminController = require('../controllers/admin/adminController')
const { userAuth, adminAuth } = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/products'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Not an image! Please upload an image.'), false)
    }
}


const uploads = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB file 
    }
})

router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/', adminAuth, adminController.loadDashboard)            /////
router.get('/logout', adminController.logout)
router.get('/customers', adminAuth, customerController.customerInfo)

router.get('/blockedCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockedCustomer', adminAuth, customerController.customerunBlocked)

router.get('/category', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.patch('/toggleCategory/:id', adminAuth, categoryController.toggleCategory)

router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory)

//product mgt

router.get("/addProducts", adminAuth, productController.getProductAddPage)
router.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
router.patch('/toggle-list/:id', adminAuth, productController.toggleProductList)
router.patch('/toggleCategory/:id', adminAuth, categoryController.toggleCategory)
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct)
router.post('/deleteImage', adminAuth, productController.deleteSingleImage)

module.exports = router