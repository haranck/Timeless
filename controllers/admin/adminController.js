const User = require("../../models/userSchema")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")


const loadLogin = (req, res) => {
   if (req.session.admin) {
      return res.redirect('/admin/')
   }
   res.render('admin-login')
}

const login = async (req, res) => {
   try {
      const { email, password } = req.body
      const admin = await User.findOne({ email, isAdmin: true })

      if (admin) {

         const passwordMatch = bcrypt.compare(password, admin.password)
         if (passwordMatch) {
            req.session.admin = true
            return res.redirect('/admin')

         } else {
            return res.redirect('/admin/login')
         }


      } else {
         return res.redirect('/admin/login')
      }
   } catch (error) {


      console.log("login error", error);
      return res.redirect('/admin/login')

   }
}

const loadDashboard = async (req, res) => {
   // if(req.session.admin){
   //    try {
   //       res.render('dashboard')
   //    } catch (error) {
   //       res.render('/pageerror')
   //    }
   // }
   try {
      if (req.session.admin) {
         return res.render('dashboard')
      }
      return res.redirect('/admin/login')
   } catch (err) {
      console.log(err)
   }
}
const logout = async (req, res) => {
   try {
      req.session.destroy(err => {
         if (err) {
            console.log("Error destroying session", err);
            return res.redirect("/pageerror")
         }
         res.redirect("/admin/login")
      })
   } catch (error) {
      console.log("unexpected error during logout ", error)
      res.redirect('/pageerror')
   }
}

module.exports = {
   loadLogin,
   login,
   loadDashboard,
   logout
}