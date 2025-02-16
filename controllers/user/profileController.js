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
        const email = req.session.email
        console.log("resending otp", otp)
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


const changeEmail = async (req, res) => {

    try {

        const { email } = req.body
        const userExists = await User.findOne({ email: email })
        if (userExists) {
            res.render("change-email", { message: "User with this email already exists" })
        }
        res.render("change-email")
    } catch (error) {
        res.redirect('/pageNotFound')
    }

}

const changeEmailValid = async (req, res) => {
    try {
        const { email } = req.body
        const userExists = await User.findOne({ email: email })
        if (userExists) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render("change-email-otp")
                console.log("email sent", email)
                console.log("otp sent", otp);
            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again." })
            }


        } else {
            res.render("change-email", { message: "User with this email not found" })
        }


    } catch (error) {

        res.redirect('/pageNotFound')

    }
}

const verifyEmailOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp
        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData
            res.render("new-email", {
                userData: req.session.userData
            })
        } else {
            res.render("change-email-otp", { message: "Invalid OTP", userData: req.session.userData })
        }

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const updateEmail = async (req, res) => {

    try {

        const newEmail = req.body.newEmail
        const userId = req.session.user
        await User.findByIdAndUpdate(userId, { email: newEmail },{new:true})
        res.redirect("/userProfile")


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changePassword = async (req, res) => {
    try {

        res.render("change-password")


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changePasswordValid = async (req, res) => {

    try {

        const { email } = req.body
        const userExists = await User.findOne({ email: email })
        if (userExists) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render("change-password-otp")

                console.log("otp sent", otp);
            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again." })
            }

        } else {
            res.render("change-password", { message: "User with this email not found" })
        }

    } catch (error) {
        console.log("Error changing password", error)
        res.redirect('/pageNotFound')
    }

}

const verifyChangePassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp
        
        if (enteredOtp === req.session.userOtp) {
            res.json({
                success: true,
                message: "OTP verified successfully",
                redirectUrl: "/reset-password"
            })
        } else {
            res.json({
                success: false,
                message: "Invalid OTP"
            })
        }
    } catch (error) {
        console.log("Error verifying OTP", error)
        res.redirect('/pageNotFound')
    }
}

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
        const userId = req.session.user
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body
        const userAddress = await Address.findOne({ userId: userId })

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
            })
            await newAddress.save()
            
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
            })
            await userAddress.save()
        }
        res.redirect("/address")
    } catch (error) {
        console.error("Error in postAddAddress:", error)
        res.redirect("/pageNotFound")
    }
}



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

        res.redirect("/address")


    } catch (error) {
        console.log("Error editing address", error)
        res.redirect('/pageNotFound')
    }
}

const deleteAddress = async (req, res) => {

    try {

        const addressId = req.query.id
        const findAddress = await Address.findOne({
            "address._id": addressId,
        })

        if (!findAddress) {
            return res.redirect("/pageNotFound")
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
        res.redirect("/address")

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
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    getAllAddresses,
    editAddress,
    postEditAddress,
    deleteAddress
}