const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const mongodb = require("mongodb");

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
        const cart = await Cart.findOne({ userId }).populate("items.productId");// product details populate cheythedukkunnu

        // If cart is empty, return a default structure
       
        if (!cart) {
            return res.render("cart", {
                cart: {
                    items: [],
                    totalPrice: 0
                }
            });
        }

        // Calculate total price
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        res.render("cart", {user:req.session.userData, cart });

    } catch (error) {
        console.error("Error loading cart:", error);
        res.status(500).send("Failed to load cart");
    }
};

const addToCart = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        const { productId, quantity } = req.body;
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
        console.log("product",product);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found" 
            });
        }
        console.log("salePrice",product.salePrice)
        // Ensure product price exists
        if (!product.salePrice) {
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


        // find the item in the cart
        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex > -1) {

            //get current quantity
            let newQuantity = cart.items[existingItemIndex].quantity + itemQuantity;

            if(newQuantity >5){
                return res.status(400).json({ 
                    success: false,
                    message: "You can only order up to 5 items" 
                });
            }
            if(newQuantity > product.quantity){
                return res.status(400).json({ 
                    success: false,
                    message: "You can not order more than available stock" 
                });
            }
            if(newQuantity <1){
                return res.status(400).json({ 
                    success: false,
                    message: "You can not order less than 1 item" 
                });
            }

            // Update existing item
            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPrice =  newQuantity * product.salePrice;
               
        } else {

            // Add new item
            cart.items.push({
                productId,
                quantity: itemQuantity,
                price: product.salePrice,
                totalPrice: product.salePrice * itemQuantity
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

const removeCartItem = async (req, res) => {
    try {
        const userId = req.session.user;  // Assuming user session is stored
        const productId = req.params.productId;

        // Find the cart
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Find the item index
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        // Remove item from cart
        cart.items.splice(itemIndex, 1);

        // Recalculate cart total
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Save updated cart
        await cart.save();

        return res.status(200).json({ success: true, message: "Item removed from cart" });

    } catch (error) {
        console.error("Error removing item:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

module.exports = {
    loadCart,
    addToCart,
    removeCartItem
}