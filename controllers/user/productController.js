const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");



const productDetails = async (req, res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId)
            .populate("category")
            .populate({
                path: "brand",
                select: "brandName"
            })
        // console.log("Product data:", JSON.stringify(product, null, 2))
        const findCategory = product.category
        const findBrand = product.brand

        const relatedProducts = await Product.find({
            category: findCategory,
            _id: { $ne: productId }
        }).limit(4)


        res.render("product-details", {
            product: product,
            user: userData,
            quantity: product.quantity,
            category: findCategory,
            brand: findBrand,
            relatedProducts: relatedProducts
        })

    } catch (error) {
        console.log("error in product details", error)
        res.redirect("/pageNotFound")
    }

}
module.exports = {
    productDetails
}