const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')


const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        const user = await User.findById(userId);
        const addressDoc = await Address.findOne({ userId: userId });

        let userAddress = [];
        if (addressDoc && addressDoc.address) {
            userAddress = addressDoc.address;
        }
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        res.render("checkout", {
            cart,
            user,
            userAddress
        });

    } catch (error) {
        console.log("error in checkout", error);
        res.redirect("/pageNotFound");
    }
}

// const postCheckout = async (req, res) => {
//     try {

//     } catch (error) {

//     }
// }

const editCheckoutAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const {
            address_id,
            name,
            addressType,
            city,
            state,
            landMark,
            pincode,
            phone,
            altPhone
        } = req.body;

        if (!address_id) {
            console.log("Invalid Address ID:", address_id);
            return res.status(400).json({ error: "Invalid address ID" });
        }

        const address = await Address.findOne({ userId: userId, "address._id": address_id });// If the user has multiple saved addresses, this ensures we fetch the correct document.
        if (!address) {
            return res.status(404).json({ error: "Address not found" });
        }

        // Find and update the specific address in the array
        const addressIndex = address.address.findIndex(addr => addr._id.toString() === address_id);
        if (addressIndex === -1) {
            return res.status(404).json({ error: "Address not found in array" });
        }

        address.address[addressIndex] = {
            ...address.address[addressIndex],
            name,
            addressType,
            city,
            state,
            landMark,
            pincode,
            phone,
            altPhone
        };

        await address.save();
        res.redirect('/checkout');
    } catch (error) {
        console.log("error in editCheckoutAddress", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const addCheckoutAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const {
            name,
            addressType,
            city,
            state,
            landMark,
            pincode,
            phone,
            altPhone
        } = req.body;

        // Check if user already has an address document
        let addressDoc = await Address.findOne({ userId });

        if (addressDoc) {
            // If exists, add new address to array
            addressDoc.address.push({
                name,
                addressType,
                city,
                state,
                landMark,
                pincode,
                phone,
                altPhone
            });
            await addressDoc.save();
        } else {
            // If no address document exists, create new one
            addressDoc = new Address({
                userId,
                address: [{
                    name,
                    addressType,
                    city,
                    state,
                    landMark,
                    pincode,
                    phone,
                    altPhone
                }]
            });
            await addressDoc.save();
        }

        // Redirect back to checkout page
        res.redirect('/checkout');
    } catch (error) {
        console.log("error in addCheckoutAddress", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { shippingAddress, paymentMethod, totalAmount, orderedItems } = req.body;

        console.log(userId)

        const cleanedTotal = parseFloat(totalAmount.replace(/\D/g, ''));

        if (isNaN(cleanedTotal)) {
            return res.status(400).json({ success: false, error: "Invalid total amount" });
        }
        
        if(!userId||!shippingAddress||!paymentMethod||!totalAmount||!orderedItems){
            return res.status(400).json({ success: false, error: "Please fill all the fields" });
        }

        console.log(cleanedTotal)

        //format ordered items according to the schema
        console.log(orderedItems)
        const formattedItems = orderedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            productName: item.productName,

        }));

        // Create new order
        const newOrder = new Order({
            user_id:userId,
            address_id:shippingAddress,
            payment_method: paymentMethod,
            finalAmount:cleanedTotal,
            order_items:formattedItems,
            status:"pending",
            total:cleanedTotal
        });
                                                               
        // Save the order
        await newOrder.save();

        // Clear the user's cart after successful order
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        return res.status(200).json({ 
            success: true, 
            message: 'Order placed successfully' 
        });
        
    } catch (error) {
        console.error('Order placement error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to place order. Please try again." 
        });
    }
}

module.exports = {
    loadCheckout,
    editCheckoutAddress,
    addCheckoutAddress,
    placeOrder
}
