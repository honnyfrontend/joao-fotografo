const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importe o pacote cors
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const uploadRoutes = require('./routes/uploadRoutes'); // Suas rotas para upload e manipulação de fotos

const app = express();

// --- Conexão com o MongoDB Atlas ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => console.error('❌ Erro de conexão ao MongoDB:', err));

// --- Middlewares ---
app.use(express.json()); // Permite que o Express parseie requisições com corpo JSON

// Configuração do CORS
// ATENÇÃO: Para desenvolvimento, 'app.use(cors());' é prático,
// pois permite requisições de qualquer origem.
// PARA PRODUÇÃO, RECOMENDA-SE ESPECIFICAR AS ORIGENS PERMITIDAS PARA SEGURANÇA.
app.use(cors()); 

// Exemplo de configuração mais restritiva para produção (descomente e ajuste se for o caso):
/*
app.use(cors({
    origin: 'http://seusite.com', // Substitua pelo domínio real do seu frontend
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos permitidos (se você usar autenticação, por exemplo)
}));
*/

// --- Rotas da Aplicação ---
// Todas as rotas definidas em uploadRoutes.js serão prefixadas com /api
app.use('/api', uploadRoutes); 

// Rota básica para testar se o servidor está funcionando
app.get('/', (req, res) => {
    res.send('Servidor da Galeria de Fotos está rodando!');
});

// --- Início do Servidor ---
const PORT = process.env.PORT || 3000; // Define a porta, usando 3000 como padrão se não estiver no .env
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse a API em: http://localhost:${PORT}/api`);
});