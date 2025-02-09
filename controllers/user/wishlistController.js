const Wishlist = require("../../models/wishlistSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")


const loadWishlist = async (req,res)=>{
    try {
        const userId = req.session.user
        const wishlist = await Wishlist.findOne({userId}).populate("items.productId")

        if(!wishlist){
            return res.render("wishlist", {user:req.session.userData,wishlist:[]})
        }

        res.render("wishlist", {user:req.session.userData,wishlist})
    } catch (error) {
        console.log("error in load wishlist", error)
        res.redirect("/userProfile")
    }
}
const addToWishlist = async (req,res)=>{
    try {
        const userId = req.session.user
        const {productId} = req.body
        let wishlist = await Wishlist.findOne({userId})

        if (!wishlist) {
            wishlist = new Wishlist({ userId: userId, items: [] });
        }

        const existingItemIndex = wishlist.items.findIndex(item => item.productId.toString() === productId);
        if(existingItemIndex === -1){
            wishlist.items.push({productId})
            await wishlist.save()
        }

        res.status(200).json({success:true, message:"Added to wishlist"})
    } catch (error) {
        console.log("error in add to wishlist", error)
        res.status(500).json({success:false, message:"Internal server error"})
    }
}

const removeWishlistItem = async (req,res)=>{
    try {
        const userId = req.session.user
        const productId = req.params.productId
        const wishlist = await Wishlist.findOneAndUpdate(
            {userId},
            {$pull:{items:{productId}}},
            {new:true}
        ).populate("items.productId")

        if(!wishlist){
            return res.status(404).json({success:false, message:"Wishlist not found"})
        }
        res.status(200).json({success:true, message:"Removed from wishlist"})

    } catch (error) {
        console.log("error in remove wishlist item", error)
        res.status(500).json({success:false, message:"Internal server error"})
    }
}

module.exports={
    loadWishlist,
    addToWishlist,
    removeWishlistItem
}