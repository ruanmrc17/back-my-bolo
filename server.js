// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar ao MongoDB:', err));

const alunoSchema = new mongoose.Schema({
  nome: String,
  matricula: String,
  pontos: { type: Number, default: 0 }
});

const Aluno = mongoose.model('Aluno', alunoSchema, 'alunos');

// Middleware de Autenticação
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'Nenhum token fornecido.' });

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decodificado) => {
    if (err) return res.status(401).json({ error: 'Token inválido ou expirado.' });
    req.usuario = decodificado;
    next();
  });
};

// --------------------------------------------------------
// ROTAS
// --------------------------------------------------------

// 🔑 Rota de LOGIN Genérica (O front já checou a senha 123)
app.post('/login', (req, res) => {
  // Gera um token genérico (crachá de administrador) válido por 1 dia
  const token = jwt.sign(
    { role: 'admin' }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );

  res.json({ mensagem: 'Login bem sucedido!', token });
});


// Demais rotas
app.post('/alunos', async (req, res) => {
  const novoAluno = new Aluno(req.body);
  await novoAluno.save();
  res.json(novoAluno);
});

app.get('/alunos', verificarToken, async (req, res) => {
  const alunos = await Aluno.find();
  res.json(alunos);
});

app.put('/alunos/:id', verificarToken, async (req, res) => {
  const alunoAtualizado = await Aluno.findByIdAndUpdate(
    req.params.id, 
    { pontos: req.body.pontos }, 
    { new: true }
  );
  res.json(alunoAtualizado);
});

app.listen(5000, () => {
  console.log('🚀 Servidor rodando na porta 5000 (http://localhost:5000)');
});