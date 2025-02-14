
const getDiscountPrice = (product) => {
    let productOffer = product.productOffer || 0;
    let categoryOffer = product.category?.categoryOffer || 0;
 
    let maxOffer = Math.max(productOffer, categoryOffer);
    let discountedPrice = product.salePrice - (product.salePrice * maxOffer) / 100;
 
   return {
     ...product.toObject(),
     finalPrice: Math.round(discountedPrice),
     appliedOffer: maxOffer,
     regularPrice: product.regularPrice
   };
 }

  module.exports = { getDiscountPrice };