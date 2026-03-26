const mongoose = require('mongoose');

// DB 1: Read-Only Main Waitlist
const userSchema = new mongoose.Schema({
    email: String,
    walletAddress: String,
    xUsername: String, 
    referral: String,
    score: Number
}, { collection: 'users' }); 

// DB 2: The VIP Shortlist Vault
const shortlistSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Wallet Address
    email: { type: String }, // Added so you can contact them later!
    X: { type: String }, 
    referal: { type: String },
    score: { type: Number, default: 0 },
    whitelisted: { type: String, default: "basic" } 
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Shortlist: mongoose.model('Shortlist', shortlistSchema)
};