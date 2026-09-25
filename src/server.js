import express from 'express';
import cors from 'cors';
import prisma from './prisma.js';
import swaggerUi from 'swagger-ui-express';

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. CONFIGURAÇÃO DA DOCUMENTAÇÃO SWAGGER
// ==========================================
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "DevShowcase API",
    version: "1.0.0",
    description: "API robusta para gestão de portfólios e projetos (Etapa Final)."
  },
  paths: {
    "/api/projects": {
      get: {
        summary: "Lista projetos com filtro de tecnologia e paginação",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "tech", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Sucesso" } }
      }
    },
    "/api/projects/{id}/feedbacks": {
      post: {
        summary: "Cadastra nota (1 a 5) e comentário, atualizando a média do projeto",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Feedback criado" }, "400": { description: "Erro de validação" }, "404": { description: "Projeto não encontrado" } }
      }
    },
    "/api/projects/{id}/upvote": {
      put: {
        summary: "Incrementa as curtidas (upvotes) do projeto",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Curtida adicionada" }, "404": { description: "Projeto não encontrado" } }
      }
    }
  }
};
// Rota para aceder ao Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ==========================================
// 2. NOVOS ENDPOINTS DA TAREFA FINAL
// ==========================================

// GET /api/projects (Filtro por tecnologia e paginação)
app.get('/api/projects', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tech = req.query.tech;

    const skip = (page - 1) * limit;

    const onde = tech ? {
      technologies: {
        some: { name: { contains: tech } }
      }
    } : {};

    const projects = await prisma.project.findMany({
      where: onde,
      skip: skip,
      take: limit,
      include: { profile: true, technologies: true, feedbacks: true }
    });

    const total = await prisma.project.count({ where: onde });

    res.json({
      dados: projects,
      paginacao: { paginaAtual: page, limite: limit, totalProjetos: total }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/feedbacks (Cadastrar nota e recalcular média)
app.post('/api/projects/:id/feedbacks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validação da nota (400 Bad Request)
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'A nota (rating) deve ser um número entre 1 e 5.' });
    }

    const projetoExistente = await prisma.project.findUnique({ where: { id: parseInt(id) } });
    if (!projetoExistente) {
      return res.status(404).json({ error: 'Projeto não encontrado para deixar feedback.' });
    }

    // Criar o feedback
    await prisma.feedback.create({
      data: {
        rating: parseInt(rating),
        comment: comment || "",
        projectId: parseInt(id)
      }
    });

    // Recalcular a nota média
    const todosFeedbacks = await prisma.feedback.findMany({ where: { projectId: parseInt(id) } });
    const somaNotas = todosFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    const media = somaNotas / todosFeedbacks.length;

    // Atualizar projeto com a média
    const projetoAtualizado = await prisma.project.update({
      where: { id: parseInt(id) },
      data: { averageRating: media }
    });

    res.status(201).json({ message: 'Feedback registado com sucesso!', projeto: projetoAtualizado });
  } catch (error) {
    next(error); // Passa para o tratador global
  }
});

// PUT /api/projects/:id/upvote (Incrementar curtidas)
app.put('/api/projects/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;

    const projetoExistente = await prisma.project.findUnique({ where: { id: parseInt(id) } });
    if (!projetoExistente) {
      return res.status(404).json({ error: 'Projeto não encontrado para curtir.' });
    }

    const projetoAtualizado = await prisma.project.update({
      where: { id: parseInt(id) },
      data: { upvotes: { increment: 1 } }
    });

    res.json({ message: 'Upvote adicionado com sucesso!', projeto: projetoAtualizado });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// 3. TRATAMENTO GLOBAL DE EXCEÇÕES
// ==========================================

// Rota não encontrada (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({ error: 'A rota que tentou aceder não existe. Verifique a URL.' });
});

// Manipulador global de erros (Internal Server Error)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    error: 'Ocorreu um erro interno no servidor.', 
    detalhes: err.message 
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor a rodar na porta ${PORT}`);
  console.log(`📄 Documentação interativa disponível em http://localhost:${PORT}/api-docs`);
});