const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.uploadFotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto enviada.' });
    }
    if (req.files.length > 8) {
      return res.status(400).json({ error: 'Máximo de 8 fotos permitido.' });
    }
    const bucket = process.env.S3_BUCKET_NAME;
    const { userId, pedidoId } = req.body;
    if (!userId || !pedidoId) {
      return res.status(400).json({ error: 'userId e pedidoId são obrigatórios no body.' });
    }
    // Limpa a pasta do pedido antes de inserir novas imagens
    const prefix = `User/${userId}/pedidos/${pedidoId}/`;
    const listParams = {
      Bucket: bucket,
      Prefix: prefix
    };
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    if (listedObjects.Contents.length > 0) {
      const deleteParams = {
        Bucket: bucket,
        Delete: { Objects: listedObjects.Contents.map(obj => ({ Key: obj.Key })) }
      };
      await s3.deleteObjects(deleteParams).promise();
    }

    // Salva as imagens como imagem1, imagem2, ...
    const uploadedUrls = [];
    let idx = 1;
    for (const file of req.files) {
      const key = `User/${userId}/pedidos/${pedidoId}/imagem${idx}${getFileExtension(file.originalname)}`;
      const params = {
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      const data = await s3.upload(params).promise();
      uploadedUrls.push(data.Location);
      idx++;
    }

    // Atualiza o pedido no DynamoDB com as URLs das imagens
    const pedidoService = require('../services/pedidoService');
    await pedidoService.updatePedido(pedidoId, { fotos: uploadedUrls });

    res.status(200).json({ urls: uploadedUrls });

// Função auxiliar para pegar a extensão do arquivo
function getFileExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot !== -1 ? filename.substring(dot) : '';
}
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
