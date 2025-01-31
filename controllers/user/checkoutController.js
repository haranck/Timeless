const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')


const loadCheckout = async (req, res) => {
    try {

        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        const user = await User.findById(userId);
        const address = await Address.findOne({ userId: userId });

        let userAddress = null
        if (address && address.address) {
            userAddress = address.address
        }

        res.render("checkout", {
            cart,
            user,
            userAddress: userAddress
        });

    } catch (error) {
        console.log("error in checkout", error)
        res.redirect("/pageNotFound")
    }
}

const postCheckout = async (req, res) => {
    try {

    } catch (error) {

    }
}

// const editCheckoutAddress = async (req, res) => {
//     try {
//         const userId = req.session.user
//         const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body
//         const userAddress = await Address.findOne({ userId: userId })
//         if (!userAddress) {
//             return res.redirect("/pageNotFound")
//         }
//         userAddress.address.push({
//             addressType,
//             name,
//             city,
//             landMark,
//             state,
//             pincode,
//             phone,
//             altPhone
//         })
//         await userAddress.save()
//         res.render("checkout",{
//             userAddress:userAddress
//         })
//     } catch (error) {
//         console.log("error in editCheckoutAddress", error)
//         res.redirect("/pageNotFound")
//     }
// }

const editCheckoutAddress = async (req, res) => {
    try {
        const { address_id, name, city, pincode, phone } = req.body;

        if (!address_id || address_id.length !== 24) {
            console.log("Invalid Address ID:", address_id);
            return res.status(400).json({ error: "Invalid address ID" });
        }

        await Address.findByIdAndUpdate(address_id, { name, city, pincode, phone });

        res.redirect('/checkout'); // Reload the checkout page with updated address
    } catch (error) {
        console.log("error in editCheckoutAddress", error)
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    loadCheckout,
    postCheckout,
    editCheckoutAddress
}