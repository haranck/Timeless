const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const mongodb = require("mongodb");
const Wishlist = require('../../models/wishlistSchema')
const { getDiscountPrice, getDiscountPriceCart } = require("../../helpers/offerHelper");

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
        let cart = await Cart.findOne({ userId }).populate({path:"items.productId",populate:{path:"category"}});

        const processedData = cart.items.map(item => ({...item, productId:getDiscountPriceCart(item.productId)}))
        cart.items = processedData;

        cart.items = cart.items.filter(item => item.productId);
        
        if (!cart) {
            return res.render("cart", { 
                cart: {
                    items: [],
                    totalPrice: 0,
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
       
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        if (!productId) {
            return res.status(400).json({ 
                success: false,
                message: "Product ID is required" 
            });
        }
        
        const product = await Product.findById(productId).populate("category");
        
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found" 
            });
        }

        // let validFinalPrice = product.salePrice || product.regularPrice||0

        // if (validFinalPrice <= 0) {
        //     return res.status(400).json({ 
        //         success: false,
        //         message: "Invalid product price" 
        //     });
        // }
        
        const itemQuantity = parseInt(quantity) || 1;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                cartTotal: 0
            });
        }

        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex > -1) {

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

            
            const {finalPrice,appliedOffer,regularPrice} = getDiscountPrice(product);

            // console.log("finalPrice",finalPrice,"appliedOffer",appliedOffer,"regularPrice",regularPrice);

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPrice =  newQuantity * finalPrice;
              
        } else {

            const {finalPrice,appliedOffer,regularPrice} = getDiscountPrice(product);

            cart.items.push({
                productId,
                quantity: itemQuantity,
                price: finalPrice,
                totalPrice: finalPrice * itemQuantity
            });
        }

        cart.cartTotal = cart.items.reduce((total, item) => {
            return total + (Number(item.totalPrice) || 0);
        }, 0);

        await cart.save();
        

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
        
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = req.session.user;  
        const productId = req.params.productId;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        cart.items.splice(itemIndex, 1);

        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

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