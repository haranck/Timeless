const couponSchema = require("../../models/coupenSchema");


const getCouponPage = async (req,res)=>{
    try {
        res.render("coupon")
    } catch (error) {
        console.log("error in coupon page", error)
        return res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const addCoupon = async (req,res)=>{
    try {
        const {couponCode,couponType,discount,minPurchase,expiryDate} = req.body

        if (!couponCode || !couponType || !discount || !minPurchase || !expiryDate) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const newCoupon = new Coupon({
            couponCode,
            couponType,
            discount,
            minPurchase,
            expiryDate
        })

        await newCoupon.save()
        res.status(200).json({ success: true, message: "Coupon added successfully" })

    } catch (error) {
        console.log("error in add coupon", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

module.exports = {
    getCouponPage,
    addCoupon
}