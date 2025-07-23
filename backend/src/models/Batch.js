const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: { type: String, required: true, maxlength: 200 },
    author: { type: String, default: 'Visitante' },
    createdAt: { type: Date, default: Date.now }
});

const BatchSchema = new mongoose.Schema({
    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo'
    }],
    name: {
        type: String,
        trim: true,
        maxlength: 200,
        default: 'Upload Recente'
    },
    // NOVO: Campo para a descrição do lote
    description: {
        type: String,
        trim: true,
        maxlength: 1000, // Aumentei o limite para uma descrição de lote
        default: ''
    },
    // NOVO: Array para comentários do lote
    comments: [commentSchema], 
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Batch', BatchSchema);