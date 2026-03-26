require('dotenv').config();
const express = require('express');
const connectDB = require('./db');
const { User, Shortlist } = require('./schema');

const app = express();
app.use(express.json());
app.set('view engine', 'ejs');

connectDB();

// ==========================================
// 🔒 GLOBAL SECURITY MIDDLEWARE (BASIC AUTH)
// ==========================================
const globalAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (username === 'admin' && password === process.env.ADMIN_SECRET) {
        return next(); 
    }

    res.set('WWW-Authenticate', 'Basic realm="Pacific Pods Vault"');
    res.status(401).send('Authentication required. Nice try, bot.');
};

app.use(globalAuth);

// ==========================================
// FRONTEND ROUTES (The UI)
// ==========================================
app.get('/admin', (req, res) => res.render('admin'));
app.get('/admin/shortlist', (req, res) => res.render('shortlist'));

// ==========================================
// BACKEND API ROUTES (The Data)
// ==========================================

app.get('/api/admin/users', async (req, res) => {
    try {
        // Now accepting 3 distinct search fields
        const { minScore, walletAddress, xUsername, email, randomCount, page = 1 } = req.query;
        let dbQuery = {};

        if (minScore) dbQuery.score = { $gte: Number(minScore) };
        
        // 3 Separate Search Filters
        if (walletAddress) dbQuery.walletAddress = { $regex: walletAddress, $options: "i" };
        if (xUsername) dbQuery.xUsername = { $regex: xUsername, $options: "i" };
        if (email) dbQuery.email = { $regex: email, $options: "i" };

        if (randomCount && Number(randomCount) > 0) {
            const users = await User.aggregate([
                { $match: dbQuery }, 
                { $sample: { size: Number(randomCount) } } 
            ]);
            return res.json({ success: true, users, totalPages: 1, currentPage: 1, totalUsers: users.length });
        }

        const limit = 100;
        const skip = (Number(page) - 1) * limit;

        const totalUsers = await User.countDocuments(dbQuery);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(dbQuery).sort({ score: -1 }).skip(skip).limit(limit).lean();

        res.json({ success: true, users, totalPages, currentPage: Number(page), totalUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/move-to-shortlist', async (req, res) => {
    try {
        const { walletAddress, whitelistTier } = req.body;
        
        const rawUser = await User.findOne({ walletAddress }).lean();
        if (!rawUser) return res.status(404).json({ error: "User not found." });

        const alreadyExists = await Shortlist.findOne({ name: rawUser.walletAddress });
        if (alreadyExists) return res.status(400).json({ error: "Already shortlisted!" });

        await Shortlist.create({
            name: rawUser.walletAddress,
            email: rawUser.email, // Passing the email over!
            X: rawUser.xUsername,
            referal: rawUser.referral || "None",
            score: rawUser.score || 0,
            whitelisted: whitelistTier || "basic"
        });

        res.json({ success: true, message: "Added to Shortlist!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- VAULT ROUTES ---
app.get('/api/admin/vault-data', async (req, res) => {
    try {
        const winners = await Shortlist.find({}).sort({ score: -1 }).lean();
        res.json({ success: true, users: winners });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/vault-tier', async (req, res) => {
    try {
        const { walletAddress, newTier } = req.body;
        await Shortlist.updateOne({ name: walletAddress }, { $set: { whitelisted: newTier } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/vault-remove', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        await Shortlist.deleteOne({ name: walletAddress }); 
        res.json({ success: true, message: "Removed from vault." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('🚀 Admin Server running on port 3000'));