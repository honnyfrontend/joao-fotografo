const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Conexão com MongoDB (remova as opções obsoletas)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => console.error('❌ Erro MongoDB:', err));

// Lista de origens permitidas (ATUALIZE COM SUA URL REAL)
const allowedOrigins = [
    'https://joao-fotografo.onrender.com', // ← URL DO SEU FRONTEND
    'https://joao-fotografo-profissional.onrender.com', // URL do backend (opcional)
    'http://localhost:3000',
    'http://localhost:5173'
];

// Configuração do CORS (versão simplificada e segura)
app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origem (ex: Postman, mobile apps)
        if (!origin) return callback(null, true);
        
        // Verifica se a origem está na lista
        if (allowedOrigins.some(allowed => origin.match(new RegExp(allowed.replace('*', '.*'))))) {
            console.log(`✅ CORS permitido para: ${origin}`);
            return callback(null, true);
        } else {
            console.log(`❌ Origem bloqueada: ${origin}`);
            return callback(new Error('Acesso bloqueado por política de CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Restante do seu código...
app.use(express.json());
app.use('/api', require('./routes/uploadRoutes'));

app.get('/', (req, res) => {
    res.send('API da Galeria de Fotos Online');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});