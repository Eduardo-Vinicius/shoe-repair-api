const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', pedidoController.listPedidos);
router.get('/kanban/status', pedidoController.listPedidosStatus);
router.get('/:id', pedidoController.getPedido);
router.post('/', pedidoController.createPedido);
router.put('/:id', pedidoController.updatePedido);
// Nova rota para atualização parcial do pedido (PATCH)
router.patch('/:id', pedidoController.patchPedido);
router.delete('/:id', pedidoController.deletePedido);
// Nova rota para atualizar apenas o status do pedido
router.patch('/:id/status', pedidoController.updatePedidoStatus);
// Nova rota para gerar PDF do pedido
router.post('/document/pdf', pedidoController.generatePedidoPdf);
// Nova rota para listar PDFs salvos de um pedido
router.get('/:id/pdfs', pedidoController.listPedidoPdfs);
// Novas rotas para WhatsApp
router.post('/:id/enviar-pdf-whatsapp', pedidoController.enviarPdfWhatsApp);
router.post('/:id/enviar-detalhes-whatsapp', pedidoController.enviarDetalhesWhatsApp);

module.exports = router;
