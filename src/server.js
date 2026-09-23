import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Helper para validar URLs
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==========================================
// 1. ENDPOINTS DE PERFIL (PROFILES)
// ==========================================

// POST /api/profiles - Cadastro de perfil com validação
app.post('/api/profiles', async (req, res) => {
  const { name, email, bio } = req.body;

  if (!name || name.trim() === '' || !email || email.trim() === '') {
    return res.status(400).json({ error: 'Nome e email são obrigatórios e não podem estar vazios.' });
  }

  try {
    const profile = await prisma.profile.create({
      data: { name, email, bio },
    });
    return res.status(201).json(profile);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar perfil. Verifique se o email já está cadastrado.' });
  }
});

// GET /api/profiles/:id - Buscar perfil por id
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: Number(id) },
      include: { projects: true },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// ==========================================
// 2. ENDPOINTS DE TECNOLOGIAS (TECHNOLOGIES)
// ==========================================

// POST /api/technologies - Cadastro de tecnologia com validação
app.post('/api/technologies', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'O nome da tecnologia é obrigatório.' });
  }

  try {
    const technology = await prisma.technology.create({
      data: { name },
    });
    return res.status(201).json(technology);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar tecnologia.' });
  }
});

// GET /api/technologies - Listagem de todas as tecnologias
app.get('/api/technologies', async (req, res) => {
  try {
    const technologies = await prisma.technology.findMany();
    return res.json(technologies);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar tecnologias.' });
  }
});

// ==========================================
// 3. ENDPOINTS DE PROJETOS (PROJECTS)
// ==========================================

// POST /api/projects - Cadastro de projeto com validações
app.post('/api/projects', async (req, res) => {
  const { title, description, url, profileId, technologyIds } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'O título do projeto é obrigatório.' });
  }

  if (url && !isValidUrl(url)) {
    return res.status(400).json({ error: 'A URL informada não é válida.' });
  }

  if (!profileId) {
    return res.status(400).json({ error: 'O profileId é obrigatório.' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        title,
        description,
        url,
        profileId: Number(profileId),
        technologies: technologyIds ? {
          connect: technologyIds.map((id) => ({ id: Number(id) }))
        } : undefined
      },
      include: { technologies: true }
    });
    return res.status(201).json(project);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar projeto. Verifique se o perfil e tecnologias existem.' });
  }
});

// GET /api/projects - Listagem de projetos
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        profile: true,
        technologies: true,
        feedbacks: true,
      },
    });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar projetos.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});