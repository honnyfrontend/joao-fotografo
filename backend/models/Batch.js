const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
    description: { type: String, maxlength: 1000 },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    comments: [{
        author: { type: String, default: 'Autor' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Batch', BatchSchema);