const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas no início da aplicação

const app = express();

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro MongoDB:', err));

const allowedOrigins = [
    'https://joao-fotografo.onrender.com', // ← URL DO SEU FRONTEND
    'https://joao-fotografo-profissional.onrender.com', // URL do backend (opcional)
    'http://localhost:3000',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Esta é a parte importante. Se 'origin' for null, vamos permitir para o Live Server.
        // No entanto, o ideal é que o Live Server envie uma origem http://
        if (!origin) { 
            console.log('CORS: Requisição com origem "null" detectada. Verificando allowedOrigins...');
            // Se sua intenção é permitir 'null' (apenas para testar localmente), 
            // você pode adicionar 'null' explicitamente ao array:
            // if (allowedOrigins.includes('null')) { return callback(null, true); }
            // Ou, se o seu Live Server realmente envia null (o que é incomum), você pode permitir aqui.
            // Mas a melhor prática é que o Live Server envie um 'http://' válido.
            // Por agora, vamos garantir que você não abra 'file:///'
            // Se você AINDA está vendo null mesmo com Live Server, então seu Live Server está mal configurado ou você não o está usando corretamente.

            // Vamos ser mais rigorosos aqui. Se você está vendo 'null', é porque não está no Live Server HTTP
            // ou tem alguma configuração estranha.
            // Por isso, a instrução principal é **NÃO** ter 'null' como origem.
            const msg = `CORS Política: Origem 'null' não permitida. Por favor, use um servidor HTTP para o frontend (Ex: Live Server).`;
            console.error(msg);
            return callback(new Error(msg), false);
        }
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `A política CORS para este site não permite acesso do origin especificado: ${origin}`;
            console.error(msg);
            return callback(new Error(msg), false);
        }
        console.log(`CORS: Origem ${origin} permitida.`);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Rotas
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api', uploadRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('API da Galeria de Fotos Online. Acesse /api para as rotas.');
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('--- ERRO INTERNO DO SERVIDOR ---');
    console.error(err.stack); // Mostra o stack trace completo do erro
    res.status(500).json({ success: false, error: 'Erro interno no servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});