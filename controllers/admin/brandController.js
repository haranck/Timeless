const Brand = require('../../models/brandSchema')
const Product = require('../../models/productSchema')



const getBrandPage = async (req,res) =>{
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page - 1) * limit
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands / limit)
        const reversedBrand = brandData.reverse()


        res.render('brands', {
            data:reversedBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands
        })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const addBrand = async (req,res) =>{
    try {
        const brand = req.body.name
        const findBrand = await Brand.findOne({brand})
        if(!findBrand){
            const image = req.file.filename

            const newBrand = new Brand({brandName:brand,brandImage:image})
            
            await newBrand.save()
            res.redirect('/admin/brands')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const blockBrand = async (req,res) =>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/brands')
    } catch (error) {
       res.redirect('/pageNotFound')
    }
}

const unblockBrand= async (req,res) =>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/brands')
    } catch (error) {
       res.redirect('/pageNotFound')
    }
}

const deleteBrand = async (req,res) =>{
    try {
        const {id} = req.query
        if(!id){
            return res.status(404).redirect('/pageNotFound')
        }
        await Brand.deleteOne({_id:id})
        res.redirect('/admin/brands')
    } catch (error) {
        console.log("error in delete brand",error)
        return res.status(500).redirect('/pageNotFound')
    }
}

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand
}