const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");




const productDetails = async(req,res)=>{
    try {
        
        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId).populate("category")
        const findCategory = product.category

        const relatedProducts = await Product.find({
            category:findCategory,
            _id:{$ne:productId} //exclude the current product
        }).limit(4)


        res.render("product-details",{
            product:product,
            user:userData,
            quantity:product.quantity,
            category:findCategory,
            relatedProducts:relatedProducts
        })

    } catch (error) {
        console.log("error in product details",error)
        res.redirect("/pageNotFound")
    }

}
module.exports = {
    productDetails
}