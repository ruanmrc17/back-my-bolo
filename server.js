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

// --------------------------------------------------------
// SCHEMAS (Modelos de Dados)
// --------------------------------------------------------

// 1. Schema de Alunos (Já existia)
const alunoSchema = new mongoose.Schema({
  nome: String,
  matricula: String,
  pontos: { type: Number, default: 0 }
});
const Aluno = mongoose.model('Aluno', alunoSchema, 'alunos');

// 2. 🆕 NOVO: Schema de Transações Financeiras (Administração)
const transacaoSchema = new mongoose.Schema({
  tipo: String,       // Vai guardar 'custo' ou 'recebido'
  nome: String,       // Nome do produto ou custo (ex: Bolo de Cenoura, Farinha)
  quantidade: Number, // Quantidade do item
  valor: Number,      // Preço ou valor unitário
  data: String        // Data no formato 'YYYY-MM-DD'
});
const Transacao = mongoose.model('Transacao', transacaoSchema, 'transacoes');


// --------------------------------------------------------
// MIDDLEWARE (Segurança)
// --------------------------------------------------------
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

// 🔑 Rota de LOGIN Genérica
app.post('/login', (req, res) => {
  const token = jwt.sign(
    { role: 'admin' }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );
  res.json({ mensagem: 'Login bem sucedido!', token });
});


// --- ROTAS DE ALUNOS ---
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
    req.body, 
    { new: true }
  );
  res.json(alunoAtualizado);
});

app.delete('/alunos/:id', verificarToken, async (req, res) => {
  try {
    await Aluno.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Aluno excluído com sucesso!' });
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao excluir aluno.' });
  }
});


// --- 🆕 NOVAS ROTAS DE ADMINISTRAÇÃO (FINANÇAS) ---

// Rota para SALVAR um novo custo ou valor recebido
app.post('/transacoes', verificarToken, async (req, res) => {
  try {
    const novaTransacao = new Transacao(req.body);
    await novaTransacao.save();
    res.json(novaTransacao);
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao salvar transação financeira.' });
  }
});

// Rota para BUSCAR todos os custos e valores recebidos
app.get('/transacoes', verificarToken, async (req, res) => {
  try {
    const transacoes = await Transacao.find();
    res.json(transacoes);
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao buscar transações financeiras.' });
  }
});

// Rota para DELETAR uma transação (caso cadastre errado)
app.delete('/transacoes/:id', verificarToken, async (req, res) => {
  try {
    await Transacao.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Registro financeiro excluído com sucesso!' });
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao excluir registro financeiro.' });
  }
});

// Rota para ATUALIZAR (EDITAR) uma transação
app.put('/transacoes/:id', verificarToken, async (req, res) => {
  try {
    const transacaoAtualizada = await Transacao.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    res.json(transacaoAtualizada);
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao atualizar registro financeiro.' });
  }
});

// Rota para DELETAR TODAS as transações de um MÊS específico
app.delete('/transacoes/mes/:anoMes', verificarToken, async (req, res) => {
  try {
    // O anoMes vai chegar como "YYYY-MM". Vamos apagar tudo que começa com essa data.
    const resultado = await Transacao.deleteMany({
      data: { $regex: '^' + req.params.anoMes }
    });
    res.json({ mensagem: `Registros apagados com sucesso!`, deletados: resultado.deletedCount });
  } catch (erro) {
    res.status(500).json({ error: 'Erro ao excluir os registros do mês.' });
  }
});

// --------------------------------------------------------
// INICIANDO O SERVIDOR
// --------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta 5000 (http://localhost:5000)');
});