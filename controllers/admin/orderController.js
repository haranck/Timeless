const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')


const getOrdersPage= async (req, res) => {
    try {
        res.render('order-mgt')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    getOrdersPage
}