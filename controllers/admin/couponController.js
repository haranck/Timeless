const Coupon = require("../../models/couponSchema");

const getCouponPage = async (req, res) => {
    try {
        const coupons = await Coupon.find({})
        res.render("coupon", { coupons })
    } catch (error) {
        console.log("error in coupon page", error)
        return res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const addCoupon = async (req, res) => {
    try {
        const { couponCode, couponType, discount, minPurchase,maxPurchase, expiryDate,  } = req.body;

        // Validate input fields
        if (!couponCode || !couponType || !discount || !minPurchase || !expiryDate || !maxPurchase) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!",
                missingFields: {
                    couponCode: !couponCode,
                    couponType: !couponType,
                    discount: !discount,
                    minPurchase: !minPurchase,
                    maxPurchase:!maxPurchase,
                    expiryDate: !expiryDate,
                
                }
            });
        }

        if (couponType !== 'percentage' && couponType !== 'fixed') {
            return res.status(400).json({
                success: false,
                message: "Invalid coupon type. Must be 'percentage' or 'fixed'."
            });
        }

        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists!"
            });
        }

        const parsedDiscount = parseFloat(discount);
        const parsedMinPurchase = parseFloat(minPurchase);
        const parsedMaxPurchase = parseFloat(maxPurchase);

        if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Discount must be a positive number"
            });
        }

        if (isNaN(parsedMinPurchase) || parsedMinPurchase < 0) {
            return res.status(400).json({
                success: false,
                message: "Minimum purchase must be a non-negative number"
            });
        }
        if(isNaN(parsedMaxPurchase) || parsedMaxPurchase < 0){
            return res.status(400).json({
                success: false,
                message: "Maximum purchase must be a non-negative number"
            })
        }

        const parsedExpiryDate = new Date(expiryDate);
        if (parsedExpiryDate < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be in the future"
            });
        }
        if (active !== 'yes' && active !== 'no') {
            return res.status(400).json({
                success: false,
                message: "Invalid active status. Must be 'yes' or 'no'."
            });
        }

        const newCoupon = new Coupon({
            couponCode,
            couponType,
            couponDiscount: parsedDiscount,
            couponMinAmount: parsedMinPurchase,
            couponMaxAmount:parsedMaxPurchase,
            couponValidity: parsedExpiryDate,
            isActive:
        });

        await newCoupon.save();

        res.status(201).json({
            success: true,
            message: "Coupon added successfully",
            coupon: newCoupon
        });

    } catch (error) {
        console.error("Detailed error in add coupon:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            errorDetails: error.message
        });
    }
}
const toggleCoupon = async (req, res) => {
    try {
        const coupenId = req.params.id
        const {isActive} = req.body

        const couponToToggle = await Coupon.findById(coupenId)

        if(!couponToToggle){
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            })
        }
        couponToToggle.isActive = isActive

        await couponToToggle.save()
        
        res.status(200).json({
            success: true,
            message: `Coupon ${isActive ? 'activated' : 'inactivated'} successfully`,
            isActive: couponToToggle.isActive
        })
    } catch (error) {
        console.log("error toggling coupon", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            errorDetails: error.message
        })
    }
}

module.exports = {
    getCouponPage,
    addCoupon,
    toggleCoupon

}