const express = require('express');
const multer = require('multer');
const { storage, cloudinary } = require('../config/cloudinary');
const Photo = require('../models/Photo');
const Batch = require('../models/Batch'); // Importe o modelo Batch
const router = express.Router();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por arquivo
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg|webp)/)) {
            return cb(new Error('Apenas imagens são permitidas (JPEG, PNG, JPG, WEBP)'), false);
        }
        cb(null, true);
    }
}).array('images', 10); // Permitir até 10 arquivos no campo 'images'

router.post('/upload', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo enviado'
            });
        }

        const uploadedPhotoIds = [];
        const failedUploads = [];

        // NOVO: Cria um novo lote. 
        // A descrição do lote pode vir no corpo da requisição (se enviada pelo frontend).
        const batchDescription = req.body.batchDescription || ''; // Pega a descrição do lote se existir

        const newBatch = new Batch({
            description: batchDescription // Define a descrição inicial do lote
        }); 

        for (const file of req.files) {
            try {
                const newPhoto = new Photo({
                    url: file.path,
                    public_id: file.filename,
                    description: '', 
                    comments: []
                });
                await newPhoto.save();
                uploadedPhotoIds.push(newPhoto._id);
            } catch (dbError) {
                console.error(`Erro ao salvar no DB para ${file.filename}:`, dbError);
                await cloudinary.uploader.destroy(file.filename).catch(console.error);
                failedUploads.push({ filename: file.originalname, error: dbError.message });
            }
        }

        newBatch.photos = uploadedPhotoIds;
        await newBatch.save();

        if (uploadedPhotoIds.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Nenhuma foto pôde ser salva. Verifique os erros.',
                details: failedUploads
            });
        }

        res.status(201).json({
            success: true,
            message: `${uploadedPhotoIds.length} foto(s) enviada(s) e agrupada(s) com sucesso!`,
            batchId: newBatch._id,
            ...(failedUploads.length > 0 && {
                warnings: `${failedUploads.length} arquivo(s) falharam no upload ou processamento.`,
                failed: failedUploads
            })
        });

    } catch (error) {
        console.error('Erro no upload multi-arquivos:', error);

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.filename) {
                    await cloudinary.uploader.destroy(file.filename).catch(console.error);
                }
            }
        }

        let statusCode = 500;
        let errorMessage = 'Erro no servidor';

        if (error.message.includes('File too large')) {
            statusCode = 413;
            errorMessage = 'Um ou mais arquivos excedem o limite de 5MB.';
        } else if (error.message.includes('image')) {
            statusCode = 415;
            errorMessage = 'Apenas formatos de imagem (JPEG, PNG, JPG, WEBP) são permitidos.';
        } else if (error.message.includes('Unexpected field')) {
             statusCode = 400;
             errorMessage = 'Nome do campo de upload incorreto. Esperado "images".';
        } else if (error.message.includes('Too many files')) {
            statusCode = 413;
            errorMessage = 'Número máximo de 10 arquivos excedido.';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            ...(process.env.NODE_ENV === 'development' && {
                details: error.message
            })
        });
    }
});

router.get('/photos', async (req, res) => {
    try {
        const batches = await Batch.find()
            .populate('photos')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: batches.length,
            batches
        });
    } catch (error) {
        console.error('Erro ao buscar lotes de fotos:', error);
        res.status(500).json({
            success: false,
            batches: [],
            error: 'Erro ao carregar lotes de fotos'
        });
    }
});

// Deletar foto individualmente agora também a remove do lote
router.delete('/photos/:id', async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Foto não encontrada'
            });
        }

        // Remove a foto do lote correspondente
        await Batch.updateMany(
            { photos: req.params.id },
            { $pull: { photos: req.params.id } }
        );

        // Deleta lotes vazios
        await Batch.deleteMany({ photos: { $size: 0 } });

        await cloudinary.uploader.destroy(photo.public_id);
        await Photo.deleteOne({ _id: req.params.id });

        res.json({
            success: true,
            message: 'Foto deletada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar foto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao deletar foto'
        });
    }
});

// Adicionar comentário à FOTO individual
router.post('/photos/:id/comments', async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Foto não encontrada' });
        }

        photo.comments.push({
            text: req.body.text,
            author: req.body.author || 'Visitante'
        });

        await photo.save();
        res.json({ success: true, photo: photo });
    } catch (error) {
        console.error('Erro ao adicionar comentário à foto:', error);
        res.status(500).json({ success: false, error: 'Erro ao adicionar comentário à foto' });
    }
});

// Editar descrição da FOTO individual
router.patch('/photos/:id', async (req, res) => {
    try {
        const photo = await Photo.findByIdAndUpdate(
            req.params.id,
            { description: req.body.description },
            { new: true }
        );

        if (!photo) {
            return res.status(404).json({ success: false, error: 'Foto não encontrada' });
        }

        res.json({ success: true, photo: photo });
    } catch (error) {
        console.error('Erro ao atualizar descrição da foto:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar descrição da foto' });
    }
});

// NOVO: Editar descrição do LOTE
router.patch('/batches/:id/description', async (req, res) => {
    try {
        const batch = await Batch.findByIdAndUpdate(
            req.params.id,
            { description: req.body.description },
            { new: true }
        );

        if (!batch) {
            return res.status(404).json({ success: false, error: 'Lote não encontrado' });
        }

        res.json({ success: true, batch: batch });
    } catch (error) {
        console.error('Erro ao atualizar descrição do lote:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar descrição do lote' });
    }
});

// NOVO: Adicionar comentário ao LOTE
router.post('/batches/:id/comments', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ success: false, error: 'Lote não encontrado' });
        }

        batch.comments.push({
            text: req.body.text,
            author: req.body.author || 'Visitante'
        });

        await batch.save();
        res.json({ success: true, batch: batch });
    } catch (error) {
        console.error('Erro ao adicionar comentário ao lote:', error);
        res.status(500).json({ success: false, error: 'Erro ao adicionar comentário ao lote' });
    }
});

module.exports = router;