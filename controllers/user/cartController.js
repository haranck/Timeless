const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const mongodb = require("mongodb");


const getCartPage = async (req, res) => {
    try {
        const userId = req.session.user; 
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if(!cart || cart.items.length === 0){
            return res.render("cart", { cart: null });
        }
        res.render("cart", { cart });

    } catch (error) {
        console.log("error in cart page", error)
        res.redirect("/pageNotFound")
    }
}

const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.query.params;
        const userId = req.session.user;
        const product = await Product.findById(productId)
        if(!product){
            return res.status(404).json({ message: "Product not found" })

        }

        let cart = await Cart.findOne({ userId })
        if(!cart){
            cart = await Cart.findOne({ userId })
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId)

        if(existingItemIndex> -1){
            const existingItem = cart.items[existingItemIndex]
            existingItem.quantity += parseInt(quantity)
            existingItem.totalPrice = existingItem.quantity * product.price
            
        }else{
            cart.items.push({
                productId,
                quantity: parseInt(quantity),
                price: product.price,
                totalPrice: product.price * quantity
            })
        }
        cart.cartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0)
        await cart.save()
        res.redirect("/cart")
        

    } catch (error) {
        console.log("error in add to cart", error)
        res.redirect("/pageNotFound")
        
    }
}

module.exports = {
    getCartPage,
    addToCart
}