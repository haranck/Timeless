const User = require('../../models/userSchema')
const  nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')



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
        console.log("info",info)
        return true

    } catch (error) {
        console.log("error",error)
        return false
    }
}


const forgotEmailValid = async (req, res) => {
    try {
        
        const {email} = req.body

        const findUser = await User.findOne({email:email})
        if(findUser){
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp);
            if(emailSent){
                req.session.userOtp = otp
                req.session.userData = {email}
                // res.render('verify-otp')  ////////////////
                res.render("forgotPass-otp")
                console.log('otp sent', otp);
            }else{
                res.json({success:false, message:"Failed to send OTP. Please try again."})
            }
        }else{
            res.render('forgot-password', {message:"User with this email not found"})
        }

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp
        if(enteredOtp === req.session.userOtp){
            res.json({
                success:true, 
                message:"OTP verified successfully",
                redirectUrl:"/reset-password"
            })
        }else{
            res.json({
                success:false, 
                message:"Invalid OTP. Please try again."
            })
        }
    } catch (error) {
        res.status(500).json({success:false, message:"Internal server error"})
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
        if(emailSent){
            console.log("Resent otp sent",otp)
            res.status(200).json({success:true, message:"OTP resent successfully"})
        }
    } catch (error) {
        console.log("Error resending otp", error)
        res.status(500).json({success:false, message:"Internal server error"})
    }
}

const postNewPassword = async (req, res) => {
    try {
        const {newPass1,newPass2} =req.body
        const email = req.session.email
        if(newPass1 === newPass2){
            const hashedPassword = await bcrypt.hash(newPass1, 10);
            const user = await User.findOneAndUpdate({email:email}, {password:hashedPassword})
            res.render("login")
        }else{
            res.render("reset-password", {success:false, message:"Passwords do not match"})
        }
     } catch (error) {
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendtOTP,
    postNewPassword
}