require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Conexão com MongoDB (versão atualizada)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro de conexão MongoDB:', err));

// Configuração de CORS completa
const allowedOrigins = [
  'https://joao-fotografo.onrender.com',
  'https://joao-fotografo-profissional.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Acesso bloqueado por política de CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas de API
const router = express.Router();

// Rota GET /photos (exemplo)
router.get('/photos', async (req, res) => {
  try {
    // Substitua por sua lógica real de banco de dados
    const photos = [
      { id: 1, url: 'photo1.jpg', title: 'Foto 1' },
      { id: 2, url: 'photo2.jpg', title: 'Foto 2' }
    ];
    res.json(photos);
  } catch (error) {
    console.error('Erro ao buscar fotos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota POST /upload (exemplo)
router.post('/upload', async (req, res) => {
  try {
    // Lógica de upload aqui
    console.log('Dados recebidos:', req.body);
    res.json({ 
      success: true, 
      message: 'Upload recebido com sucesso',
      data: req.body 
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Falha no processamento do upload' });
  }
});

// Prefixo para todas as rotas da API
app.use('/api', router);

// Rota de teste
app.get('/', (req, res) => {
  res.send('API da Galeria de Fotos Online - Utilize /api para as rotas');
});

// Middleware para erros 404
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    availableRoutes: ['/api/photos', '/api/upload']
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🛡️  CORS permitido para: ${allowedOrigins.join(', ')}`);
});