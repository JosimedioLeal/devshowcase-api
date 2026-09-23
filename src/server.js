import express from 'express';
import prisma from './prisma.js';

const app = express();
app.use(express.json());

// 1. ROTAS DE PERFIL (PROFILE)
app.post('/profiles', async (req, res) => {
  try {
    const { name, email, bio } = req.body;
    const profile = await prisma.profile.create({
      data: { name, email, bio },
    });
    return res.status(201).json(profile);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar perfil. Verifique se o e-mail é único.' });
  }
});

app.get('/profiles', async (req, res) => {
  const profiles = await prisma.profile.findMany({
    include: { projects: true },
  });
  return res.json(profiles);
});

// 2. ROTAS DE PROJETO (PROJECT)
app.post('/projects', async (req, res) => {
  try {
    const { title, description, repoUrl, profileId, technologies } = req.body;

    const techConnectOrCreate = technologies ? technologies.map((tech) => ({
      where: { name: tech },
      create: { name: tech },
    })) : [];

    const project = await prisma.project.create({
      data: {
        title,
        description,
        repoUrl,
        profileId,
        technologies: {
          connectOrCreate: techConnectOrCreate.map((t) => ({
            where: t.where,
            create: t.create,
          })),
        },
      },
      include: { technologies: true, profile: true },
    });

    return res.status(201).json(project);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/projects', async (req, res) => {
  const projects = await prisma.project.findMany({
    include: {
      profile: true,
      technologies: true,
      feedbacks: true,
    },
  });
  return res.json(projects);
});

app.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, repoUrl } = req.body;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { title, description, repoUrl },
    });

    return res.json(updatedProject);
  } catch (error) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }
});

// 3. ROTAS DE FEEDBACK
app.post('/projects/:id/feedbacks', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, author } = req.body;

    const feedback = await prisma.feedback.create({
      data: {
        comment,
        author,
        projectId: id,
      },
    });

    return res.status(201).json(feedback);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao adicionar feedback.' });
  }
});

// node src/server.js
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor a executar em http://localhost:${PORT}`);
});