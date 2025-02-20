const User = require("../../models/userSchema")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")
const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');


const loadLogin = (req, res) => {
   if (req.session.admin) {
      return res.redirect('/admin/');
   }
   res.render('admin-login')
}

const login = async (req, res) => {
   try {
      const { email, password } = req.body;
      
      const admin = await User.findOne({ email, isAdmin: true });

      if (admin) {
          const passwordMatch = await bcrypt.compare(password, admin.password);
          if (passwordMatch) {
              req.session.admin = true; 
              return res.redirect('/admin'); 
          } 
          else if(!email || !password){
              return res.render('admin-login', { message: 'Please enter email and password' });

          }
          else {
              return res.render('admin-login', { message: 'Incorrect password' }); 
          }
      } else {
          return res.render('admin-login', { message: 'Please enter valid email and password' }); 
      }
  } catch (error) {
      console.log("Login error:", error);
      return res.render('admin-login', { message: 'An error occurred, please try again' }); 
  }
}

const loadDashboard = async (req, res) => { 
    try {
       if (req.session.admin) {
          return res.render('dashboard')
       }
       return res.redirect('/admin/login')
    } catch (err) {
       console.log(err)
       res.redirect('/admin/login')
    }
}

const logout = async (req, res) => {
   try {
      req.session.admin = false
         // if (err) {
         //    console.log("Error destroying session", err);
         //    return res.redirect("/pageerror")
         // }
         res.render("admin-login",{message:"Successfully logged out"})
      
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