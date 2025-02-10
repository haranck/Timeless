const User = require('../../models/userSchema');
const Wallet = require("../../models/walletSchema")

const addMoney = async (req, res) => {
    try {
        const { amount } = req.body
        const userId = req.session.user

        if(!userId){
            return res.status(401).json({success:false,message:"Unauthorised"})
        }

        let wallet = await Wallet.findOne({ userId: userId })


        // if(!wallet || wallet.balance<amount){
        //     return res.status(400).json({ success:false,message: 'Insufficient balance' });
        // }
        // wallet.balance -= amount;
        // wallet.transactions.push({ type: 'debit', amount, description: 'Order Payment' });

        // await wallet.save();
        // return res.status(200).json({ success:true,message: 'Money added successfully' });

        if(!wallet){
            wallet = new Wallet({
                userId: userId,
                balance:0,
                transactions:[]
            })
        }

        wallet.balance += Number(amount)
        wallet.transactions.push({
            type: 'credit',
            amount:Number(amount),
            description:"Wallet Recharge"
        })
        await wallet.save()
        return res.status(200).json({success:true,message:"Money added successfully"})

    } catch (error) {
        console.log("error in add money", error)
        return res.status(500).json({ success:false,message: 'Internal Server Error' });
        
    }
}

module.exports ={
    addMoney
}