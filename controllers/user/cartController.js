const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const mongodb = require("mongodb");

const getCartPage = async (req, res) => {
    try {
        console.log("Cart page loaded");
        const userId = req.session.user; 
        // Modify the populate to match how you're accessing it in the template
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price' // Select the fields you need
            });

        if (!cart || cart.items.length === 0) {
            return res.render("cart", { cart: { items: [] } }); // Pass empty cart instead of null
        }

        // Transform the data to match your template
        const transformedCart = {
            items: cart.items.map(item => ({
                product: {
                    name: item.productId.name,
                    price: item.productId.price
                },
                quantity: item.quantity,
                totalPrice: item.totalPrice
            })),
            totalPrice: cart.cartTotal
        };

        res.render("cart", { cart: transformedCart });
    } catch (error) {
        console.error("Error in cart page:", error);
        res.status(500).redirect("/pageNotFound");
    }
};
const addToCart = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        const { productId, quantity,price,totalPrice } = req.body;
        const userId = req.session.user;

        // Input validation
        if (!productId) {
            return res.status(400).json({ 
                success: false,
                message: "Product ID is required" 
            });
        }

        // Find product and get its price
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found" 
            });
        }

        // Ensure product price exists
        if (!product.price || isNaN(product.price)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid product price" 
            });
        }

        // Convert quantity to number and validate
        const itemQuantity = parseInt(quantity) || 1;
        
        // Find or create cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                cartTotal: 0
            });
        }

        // Calculate item price and total
        const itemPrice = Number(product.price);
        const itemTotalPrice = itemPrice * itemQuantity;

        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex > -1) {
            // Update existing item
            cart.items[existingItemIndex].quantity += itemQuantity;
            cart.items[existingItemIndex].price = itemPrice;
            cart.items[existingItemIndex].totalPrice = 
                cart.items[existingItemIndex].quantity * itemPrice;
        } else {
            // Add new item
            cart.items.push({
                productId,
                quantity: itemQuantity,
                price: itemPrice,
                totalPrice: itemTotalPrice
            });
        }

        // Calculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => {
            return total + (Number(item.totalPrice) || 0);
        }, 0);

        await cart.save();

        // Send success response
        res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            cartTotal: cart.cartTotal,
            itemsCount: cart.items.length
        });

    } catch (error) {
        console.error("Error in add to cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add product to cart"
        });
        throw new Error(error);
    }
};

module.exports = {
    getCartPage,
    addToCart
}