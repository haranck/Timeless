const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const Wallet = require('../../models/walletSchema')


function generateOtp() {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp

}

const getForgotPassPage = async (req, res) => {
    try {
        res.render('forgot-password')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const sendVerificationEmail = async (email, otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Your Otp for password reset',
            text: `Your OTP is ${otp}. `,
            html: `<b>Your OTP is ${otp}</b>`
        };
        const info = await transporter.sendMail(mailOptions);
        // return info.response;
        return true

    } catch (error) {
        console.log("error", error)
        return false
    }
}

const forgotEmailValid = async (req, res) => {
    try {

        const { email } = req.body

        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp
                req.session.userData = { email }
                
                res.render("forgotPass-otp")
                console.log('otp sent', otp);
            } else {
                res.render("forgot-password", { message: "Failed to send OTP. Please try again." })
            }
        } else {
            res.render("forgot-password", { message: "User with this email not found" })
        }

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp 
        if (enteredOtp === req.session.userOtp) {
            if (!req.session.userData) {
                return res.json({
                    success: false,
                    message: "Session expired. Please try again."
                })
            }
            
            res.json({
                success: true,
                message: "OTP verified successfully",
                redirectUrl: "/reset-password"
            })
        } else {
            res.json({
                success: false,
                message: "Invalid OTP. Please try again."
            })
        }
    } catch (error) {
        console.error("Error in verifyForgotPassOtp:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}


const getResetPassPage = (req, res) => {
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const resendtOTP = async (req, res) => {
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.userData?.email

        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        // console.log("resending otp", otp)

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resent otp sent", otp)
            res.status(200).json({ success: true, message: "OTP resent successfully" })
        }
    } catch (error) {
        console.log("Error resending otp", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body
        const email = req.session.userData?.email 
        
        if (!email) {
            return res.render("reset-password", { message: "Session expired. Please try again." })
        }

        if (newPass1 === newPass2) {
            const hashedPassword = await bcrypt.hash(newPass1, 10);
            const user = await User.findOneAndUpdate(
                { email: email }, 
                { password: hashedPassword },
                { new: true } 
            )
            
            if (!user) {
                return res.render("reset-password", { message: "User not found" })
            }

            req.session.userData = null
            req.session.userOtp = null

            return res.render("login", {success: true, message: "Password updated successfully. Please login." })
        } else {
            return res.render("reset-password", { message: "Passwords do not match" })
        }
    } catch (error) {
        console.error("Error in postNewPassword:", error)
        res.render("reset-password", { message: "An error occurred. Please try again." })
    }
}


const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect("/login");
        }

        const addressData = await Address.findOne({ userId: userId });
        const walletData = await Wallet.findOne({ userId: userId }) || { transactions: [] };

        walletData.transactions = walletData.transactions.sort((a, b) => b.createdAt - a.createdAt);

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ user_id: userId });
        const orders = await Order.find({ user_id: userId })
            .populate("order_items.productId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("profile", { 
            user: userData, 
            userAddress: addressData, 
            orders, 
            wallet: walletData, // Transactions now sorted in descending order
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.error("Error in userProfile:", error);
        res.redirect('/pageNotFound');
    }
};


const changePassword = async (req, res) => {
    try {

        res.render("change-password")


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyCurrentPassword = async (req, res) => {
    try {
        const userId = req.session.user;
        const { currentPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password is required' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const updatePassword = async (req, res) => {
    try {
        const userId = req.session.user;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password is required' 
            });
        }

        // Validate password
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await User.findByIdAndUpdate(userId, { 
            password: hashedPassword 
        });

        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};


const getAllAddresses = async (req, res) => {
    try {
        const userId = req.session.user
        const addressData = await Address.findOne({ userId: userId })

        let userAddress = null
        if (addressData && addressData.address) {
            userAddress = addressData.address
        }

        res.render("address", { userAddress: userAddress ,user: req.session.userData})
    } catch (error) {
        console.error("Error in getAllAddresses:", error)
        res.redirect("/pageNotFound")
    }
}



const addAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressData = await Address.findOne({ userId: userId })

        let userAddress = null
        if (addressData && addressData.address) {
            userAddress = addressData.address
        }

        res.render("add-address", { userAddress: userAddress })
    } catch (error) {
        console.error("Error in addAddress:", error)
        res.redirect("/pageNotFound")
    }
}


const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const userAddress = await Address.findOne({ userId: userId });

        if (!userAddress) {
            const newAddress = new Address({
                userId: userId,
                address: [
                    {
                        addressType,
                        name,
                        city,
                        landMark,
                        state,
                        pincode,
                        phone,
                        altPhone: altPhone || "N/A",
                    },
                ],
            });
            await newAddress.save();
        } else {
            userAddress.address.push({
                addressType,
                name,
                city,
                landMark,
                state,
                pincode,
                phone,
                altPhone: altPhone || "N/A",
            });
            await userAddress.save();
        }
        res.json({ success: true, message: "Address added successfully!" });
    } catch (error) {
        console.error("Error in postAddAddress:", error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
};




const editAddress = async (req, res) => {

    try {

        const addressId = req.query.id
        const user = req.session.user
        const currAddress = await Address.findOne({
            "address._id": addressId,
        })

        if (!currAddress) {
            return res.redirect("/pageNotFound")
        }
        const addressData = currAddress.address.find(item => {
            return item._id.toString() === addressId.toString()
        })

        if (!addressData) {
            return res.redirect("/pageNotFound")
        }

        res.render("editAddress", {
            user: user,
            address: addressData
        })

    } catch (error) {
        console.log("Error editing address", error)
        res.redirect('/pageNotFound')
    }
}

const postEditAddress = async (req, res) => {
    try {

        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({
            "address._id": addressId,
        })

        if (!findAddress) {
            return res.redirect("/pageNotFound")
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$": {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        landMark: data.landMark,
                        state: data.state,
                        pincode: data.pincode,
                        phone: data.phone,
                        altPhone: data.altPhone
                    }
                }
            }

        )

        return res.status(200).json({ success: true, message: "Address updated successfully" })


    } catch (error) {
        console.log("Error editing address", error)
        res.redirect('/pageNotFound')
    }
}

const deleteAddress = async (req, res) => {

    try {
        const addressId = req.body.addressId;
        console.log("Deleting address", addressId)

        if (!addressId) {
            return res.status(400).json({ success: false, message: "Invalid address ID" })
        }
        const findAddress = await Address.findOne({
            "address._id": addressId,
        })

        if (!findAddress) {
            return res.status(400).json({ success: false, message: "Address not found" })
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $pull: {
                    address: {
                        _id: addressId
                    }
                }
            }
        )
        
        return res.status(200).json({ success: true, message: "Address deleted successfully" })

    } catch (error) {
        console.log("Error deleting address", error)
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendtOTP,
    postNewPassword,
    userProfile,
    changePassword,
    addAddress,
    postAddAddress,
    getAllAddresses,
    editAddress,
    postEditAddress,
    deleteAddress,
    verifyCurrentPassword,
    updatePassword
}