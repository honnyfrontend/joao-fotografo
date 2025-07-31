const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    description: { type: String, maxlength: 500 },
    comments: [{
        author: { type: String, default: 'Autor' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Photo', PhotoSchema);