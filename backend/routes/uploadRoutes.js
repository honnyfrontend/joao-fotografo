const express = require('express');
const multer = require('multer');
const { storage, cloudinary } = require('../config/cloudinary');
const Photo = require('../models/Photo');
const Batch = require('../models/Batch');
const router = express.Router();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg|webp)/)) {
            return cb(new Error('Apenas imagens são permitidas (JPEG, PNG, JPG, WEBP)'), false);
        }
        cb(null, true);
    }
}).array('images', 10);

const handleError = (res, error, defaultMessage) => {
    console.error('--- ERRO DE REQUISIÇÃO ---');
    console.error(error);
    let status = 500;
    let message = defaultMessage;

    if (error.message.includes('File too large')) {
        status = 413;
        message = 'Arquivo muito grande (limite: 5MB)';
    } else if (error.message.includes('image')) {
        status = 415;
        message = 'Apenas imagens são permitidas';
    } else if (error.name === 'CastError' && error.kind === 'ObjectId') {
        status = 400;
        message = 'ID inválido.';
    } else if (error.message.includes('not found')) {
        status = 404;
        message = 'Recurso não encontrado.';
    }

    return res.status(status).json({ success: false, error: message });
};

router.post('/upload', async (req, res) => {
    console.log('Recebida requisição POST /api/upload');
    try {
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) {
                    console.error('Erro no multer upload:', err);
                    return reject(err);
                }
                resolve();
            });
        });

        if (!req.files?.length) {
            console.log('Nenhum arquivo enviado na requisição de upload.');
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        }
        console.log(`Recebidos ${req.files.length} arquivos para upload.`);
        console.log('Dados do corpo para o lote:', req.body.batchDescription);

        const batch = new Batch({
            description: req.body.batchDescription || ''
        });

        const results = await Promise.allSettled(
            req.files.map(file =>
                Photo.create({
                    url: file.path,
                    public_id: file.filename
                })
            )
        );

        const successfulUploads = results.filter(r => r.status === 'fulfilled').map(r => r.value._id);
        const failedUploads = results.filter(r => r.status === 'rejected').map(r => r.reason);

        batch.photos = successfulUploads;
        await batch.save();
        console.log(`Lote criado com ID: ${batch._id}. Fotos: ${successfulUploads.length} sucesso, ${failedUploads.length} falhas.`);

        const response = {
            success: true,
            message: `${successfulUploads.length} foto(s) enviada(s) com sucesso!`,
            batchId: batch._id
        };

        if (failedUploads.length) {
            response.warnings = `${failedUploads.length} upload(s) falharam`;
            response.failed = failedUploads.map(f => f.message);
        }

        res.status(201).json(response);

    } catch (error) {
        handleError(res, error, 'Erro no upload de arquivos');
    }
});

router.get('/photos', async (req, res) => {
    console.log('Recebida requisição GET /api/photos');
    try {
        const batches = await Batch.find()
            .populate({
                path: 'photos',
                populate: { path: 'comments' }
            })
            .sort({ createdAt: -1 });

        console.log(`Encontrados ${batches.length} lotes.`);
        res.json({ success: true, batches });
    } catch (error) {
        handleError(res, error, 'Erro ao buscar fotos');
    }
});

router.route('/photos/:id')
    .delete(async (req, res) => {
        console.log(`Recebida requisição DELETE /api/photos/${req.params.id}`);
        try {
            const photo = await Photo.findByIdAndDelete(req.params.id);
            if (!photo) {
                console.log(`Foto com ID ${req.params.id} não encontrada para deleção.`);
                return res.status(404).json({ success: false, error: 'Foto não encontrada' });
            }

            await cloudinary.uploader.destroy(photo.public_id);
            console.log(`Foto Cloudinary ${photo.public_id} deletada.`);

            await Batch.updateMany(
                { photos: req.params.id },
                { $pull: { photos: req.params.id } }
            );
            console.log(`Foto ${req.params.id} removida dos lotes.`);

            res.json({ success: true, message: 'Foto deletada com sucesso' });
        } catch (error) {
            handleError(res, error, 'Erro ao deletar foto');
        }
    })
    .patch(async (req, res) => {
        console.log(`Recebida requisição PATCH /api/photos/${req.params.id}`);
        console.log('Corpo da requisição:', req.body);
        try {
            if (req.body.description === undefined) {
                return res.status(400).json({ success: false, error: 'O campo "description" é obrigatório para atualização.' });
            }

            const photo = await Photo.findByIdAndUpdate(
                req.params.id,
                { description: req.body.description },
                { new: true, runValidators: true }
            );

            if (!photo) {
                console.log(`Foto com ID ${req.params.id} não encontrada para atualização.`);
                return res.status(404).json({ success: false, error: 'Foto não encontrada' });
            }

            console.log(`Descrição da foto ${photo._id} atualizada.`);
            res.json({ success: true, message: 'Descrição da foto atualizada', photo });
        } catch (error) {
            handleError(res, error, 'Erro ao atualizar foto');
        }
    });

router.post('/photos/:id/comments', async (req, res) => {
    console.log(`Recebida requisição POST /api/photos/${req.params.id}/comments`);
    console.log('Corpo do comentário:', req.body);
    try {
        const { text, author } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: 'O texto do comentário é obrigatório.' });
        }

        const photo = await Photo.findByIdAndUpdate(
            req.params.id,
            { $push: { comments: { text, author: author || 'Visitante' } } },
            { new: true }
        );

        if (!photo) {
            console.log(`Foto com ID ${req.params.id} não encontrada para adicionar comentário.`);
            return res.status(404).json({ success: false, error: 'Foto não encontrada.' });
        }
        console.log(`Comentário adicionado à foto ${photo._id}.`);
        res.status(200).json({ success: true, message: 'Comentário adicionado com sucesso.', photo });
    } catch (error) {
        handleError(res, error, 'Erro ao adicionar comentário à foto.');
    }
});

router.route('/batches/:id/description')
    .patch(async (req, res) => {
        console.log(`Recebida requisição PATCH /api/batches/${req.params.id}/description`);
        console.log('Corpo da requisição:', req.body);
        try {
            if (req.body.description === undefined) {
                return res.status(400).json({ success: false, error: 'O campo "description" é obrigatório para atualização do lote.' });
            }

            const batch = await Batch.findByIdAndUpdate(
                req.params.id,
                { description: req.body.description },
                { new: true, runValidators: true }
            );

            if (!batch) {
                console.log(`Lote com ID ${req.params.id} não encontrado para atualização.`);
                return res.status(404).json({ success: false, error: 'Lote não encontrado' });
            }

            console.log(`Descrição do lote ${batch._id} atualizada.`);
            res.json({ success: true, message: 'Descrição do lote atualizada', batch });
        } catch (error) {
            handleError(res, error, 'Erro ao atualizar lote');
        }
    });

router.delete('/batches/:id', async (req, res) => {
    console.log(`Recebida requisição DELETE /api/batches/${req.params.id}`);
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            console.log(`Lote com ID ${req.params.id} não encontrado para deleção.`);
            return res.status(404).json({ success: false, error: 'Lote não encontrado' });
        }

        for (const photoId of batch.photos) {
            const photo = await Photo.findById(photoId);
            if (photo) {
                await cloudinary.uploader.destroy(photo.public_id);
                await Photo.findByIdAndDelete(photoId);
                console.log(`Deletada foto ${photo._id} (Cloudinary ID: ${photo.public_id}) do lote ${batch._id}`);
            }
        }

        await Batch.findByIdAndDelete(req.params.id);
        console.log(`Lote ${req.params.id} e suas fotos associadas deletados com sucesso.`);

        res.json({ success: true, message: 'Coleção (lote) e todas as suas fotos deletadas com sucesso!' });
    } catch (error) {
        handleError(res, error, 'Erro ao deletar coleção (lote)');
    }
});

module.exports = router;